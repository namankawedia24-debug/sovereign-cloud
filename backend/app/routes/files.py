from fastapi import APIRouter, Depends, UploadFile, File as FastAPIFile, HTTPException
from sqlalchemy.orm import Session
from pathlib import Path
import shutil
import hashlib

from app.database import SessionLocal
from app.models import File
from app.models import User
from app.security import get_current_user
from app.policies import get_policy
from app.encryption import encrypt_data, decrypt_data
from app.audit import log_event

from app.policy_checks import check_file_policy

from fastapi.responses import FileResponse, Response
from urllib.parse import quote

router = APIRouter(prefix="/files", tags=["Files"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


STORAGE_DIR = Path("storage")
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB


@router.post("/upload")
def upload_file(
    uploaded_file: UploadFile = FastAPIFile(...),
    classification: str = "PUBLIC",
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    classification = classification.upper()

    if classification not in {"PUBLIC", "CONFIDENTIAL", "RESTRICTED"}:
        raise HTTPException(
            status_code=400,
            detail="Classification must be PUBLIC, CONFIDENTIAL, or RESTRICTED"
        )

    policy = get_policy(classification)

    storage_region = policy["allowed_storage_region"]

    # 1. Validate filename
    if not uploaded_file.filename:
        raise HTTPException(
            status_code=400,
            detail="Filename is required"
        )

    # 2. Create user's storage directory
    user_storage_dir = STORAGE_DIR / str(current_user.id)
    user_storage_dir.mkdir(parents=True, exist_ok=True)

    # 3. Prevent unsafe filenames
    safe_filename = Path(uploaded_file.filename).name

    file_path = user_storage_dir / safe_filename

    # 4. Save the uploaded file
    # Read the uploaded content
    file_data = uploaded_file.file.read()

    # Calculate the hash of the original file content
    file_hash = hashlib.sha256(file_data).hexdigest()

    original_size = len(file_data)

    if policy["encryption_required"]:
        file_data = encrypt_data(file_data)

    with file_path.open("wb") as buffer:
        buffer.write(file_data)

    file_size = original_size

    if file_size > MAX_FILE_SIZE:
        file_path.unlink()
        raise HTTPException(
            status_code=413,
            detail="File size exceeds 10 MB limit"
        )

    # 6. Store metadata in database
    new_file = File(
        owner_id=current_user.id,
        filename=safe_filename,
        storage_path=str(file_path),
        size=file_size,
        content_type=uploaded_file.content_type,
        classification=classification,
        storage_region=storage_region,
        file_hash=file_hash
    )

    db.add(new_file)
    db.commit()
    db.refresh(new_file)


    log_event(
        db=db,
        action="FILE_UPLOAD",
        resource_type="FILE",
        status="SUCCESS",
        user_id=current_user.id,
        resource_id=new_file.id,
        details=f"Uploaded file with classification {classification}",
    )


    return {
        "message": "File uploaded successfully",
        "file_id": new_file.id,
        "filename": new_file.filename,
        "size": new_file.size,
        "content_type": new_file.content_type,
        "classification": new_file.classification,
        "storage_region": new_file.storage_region,
        "file_hash": new_file.file_hash
    }

@router.get("/")
def list_files(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    files = (
        db.query(File)
        .filter(File.owner_id == current_user.id)
        .all()
    )

    return [
        {
            "id": file.id,
            "filename": file.filename,
            "size": file.size,
            "content_type": file.content_type,
            "classification": file.classification,
            "created_at": file.created_at,
            "storage_region": file.storage_region
        }
        for file in files
    ]

@router.get("/{file_id}/download")
def download_file(
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Find the file in the database
    file = (
        db.query(File)
        .filter(File.id == file_id)
        .first()
    )

    if file is None:
        raise HTTPException(
            status_code=404,
            detail="File not found"
        )

    # 2. Check file ownership

    if file.owner_id != current_user.id:
        log_event(
            db=db,
            action="FILE_ACCESS_DENIED",
            resource_type="FILE",
            status="FAILURE",
            user_id=current_user.id,
            resource_id=file.id,
            details="User attempted to download another user's file",
        )

        raise HTTPException(
            status_code=403,
            detail="You do not have permission to access this file"
        )

    # 3. Check that the actual file exists
    file_path = Path(file.storage_path)

    if not file_path.exists():
        raise HTTPException(
            status_code=404,
            detail="Physical file not found"
        )



    # 4. Read the stored file
    stored_data = file_path.read_bytes()

    # 5. Decrypt if required
    if file.classification in {"CONFIDENTIAL", "RESTRICTED"}:
        try:
            file_data = decrypt_data(stored_data)
        except Exception:
            raise HTTPException(
                status_code=500,
                detail="Unable to decrypt file. Check the encryption key."
            )
    else:
        file_data = stored_data

    # 6. Verify file integrity
    calculated_hash = hashlib.sha256(file_data).hexdigest()

    if not file.file_hash:
        raise HTTPException(
            status_code=409,
            detail="File integrity hash is missing. Re-upload this file."
        )

    if calculated_hash != file.file_hash:
        raise HTTPException(
            status_code=409,
            detail="File integrity verification failed. File may have been modified."
        )


    log_event(
        db=db,
        action="FILE_DOWNLOAD",
        resource_type="FILE",
        status="SUCCESS",
        user_id=current_user.id,
        resource_id=file.id,
        details="File downloaded and integrity verified",
    )


    # 7. Return the verified original file
    from urllib.parse import quote
    from fastapi.responses import Response

    return Response(
        content=file_data,
        media_type=file.content_type or "application/octet-stream",
        headers={
            "Content-Disposition": (
                f"attachment; filename*=UTF-8''{quote(file.filename)}"
            )
        }
    )


    # 5. Return PUBLIC files without decryption
    return FileResponse(
        path=file_path,
        filename=file.filename,
        media_type=file.content_type or "application/octet-stream"
    )


@router.delete("/{file_id}")
def delete_file(
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Find the file in the database
    file = (
        db.query(File)
        .filter(File.id == file_id)
        .first()
    )

    if file is None:
        raise HTTPException(
            status_code=404,
            detail="File not found"
        )

    # 2. Check ownership

    if file.owner_id != current_user.id:
        log_event(
            db=db,
            action="FILE_DELETE_DENIED",
            resource_type="FILE",
            status="FAILURE",
            user_id=current_user.id,
            resource_id=file.id,
            details="User attempted to delete another user's file",
        )

        raise HTTPException(
            status_code=403,
            detail="You do not have permission to delete this file"
        )


    # 3. Delete the physical file
    file_path = Path(file.storage_path)

    if file_path.exists():
        file_path.unlink()

    # 4. Delete metadata from PostgreSQL
    db.delete(file)
    db.commit()


    log_event(
        db=db,
        action="FILE_DELETE",
        resource_type="FILE",
        status="SUCCESS",
        user_id=current_user.id,
        resource_id=file_id,
        details="File deleted successfully",
    )

    return {
        "message": "File deleted successfully",
        "file_id": file_id
    }


@router.post("/{file_id}/share")
def share_file(
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # 1. Find the file
    file = (
        db.query(File)
        .filter(File.id == file_id)
        .first()
    )

    if file is None:
        raise HTTPException(
            status_code=404,
            detail="File not found"
        )

    # 2. Check ownership
    if file.owner_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to share this file"
        )

    # 3. Retrieve the policy
    policy = get_policy(file.classification)
    sharing_rule = policy["external_sharing"]

    # 4. Enforce the sharing policy
    if sharing_rule == "DISABLED":
        raise HTTPException(
            status_code=403,
            detail="Sharing is disabled for RESTRICTED files"
        )

    if sharing_rule == "RESTRICTED":
        raise HTTPException(
            status_code=403,
            detail="Additional authorization is required to share this file"
        )

    return {
        "message": "Sharing permitted by policy",
        "file_id": file.id,
        "classification": file.classification
    }


@router.get("/{file_id}/policy-check")
def check_file_policy_endpoint(
    file_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    file = (
        db.query(File)
        .filter(File.id == file_id)
        .first()
    )

    if file is None:
        raise HTTPException(
            status_code=404,
            detail="File not found"
        )

    if file.owner_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You do not have permission to check this file"
        )

    violations = check_file_policy(file)


    for violation in violations:
        log_event(
            db=db,
            action="POLICY_VIOLATION",
            resource_type="FILE",
            status="FAILURE",
            user_id=current_user.id,
            resource_id=file.id,
            details=(
                f"Rule: {violation['rule']}; "
                f"{violation['message']}"
            ),
        )


    return {
        "file_id": file.id,
        "classification": file.classification,
        "storage_region": file.storage_region,
        "compliant": len(violations) == 0,
        "violations": violations
    }
