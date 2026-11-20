from app.encryption import encrypt_data, decrypt_data
from app.audit import log_event

from app.azure_storage import (
    get_container_client,
    get_replica_container_client,
)
import uuid

from pydantic import BaseModel, EmailStr
from app.models import FilePermission

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

import logging

logger = logging.getLogger(__name__)

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

    
    # 2. Prevent unsafe filenames
    safe_filename = Path(uploaded_file.filename).name

    # 3. Generate a unique Azure blob name
    blob_name = f"{current_user.id}/{uuid.uuid4().hex}_{safe_filename}"


    
    # 4. Read and validate the uploaded content
    file_data = uploaded_file.file.read()
    original_size = len(file_data)

    if original_size > MAX_FILE_SIZE:
        raise HTTPException(
            status_code=413,
            detail="File size exceeds 10 MB limit"
        )

    # 5. Calculate the hash of the original file
    file_hash = hashlib.sha256(file_data).hexdigest()

    # 6. Encrypt when required by policy
    if policy["encryption_required"]:
        file_data = encrypt_data(file_data)

    
    # 7. Upload to primary Azure Storage
    container_client = get_container_client()
    blob_client = container_client.get_blob_client(blob_name)

    try:
        blob_client.upload_blob(file_data, overwrite=False)

    except Exception:
        logger.exception("Primary Azure upload failed")
        raise HTTPException(
            status_code=502,
            detail="Primary storage upload failed"
        )

    # 8. Replicate encrypted data when policy requires it
    if policy["replication_required"]:
        try:
            replica_container = get_replica_container_client()
            replica_blob = replica_container.get_blob_client(blob_name)

            replica_blob.upload_blob(
                file_data,
                overwrite=False
            )

            logger.info(
                "File replicated successfully: %s",
                blob_name
            )

        except Exception:
            logger.exception("Replica upload failed")

            # Avoid leaving a primary-only copy when
            # replication is required by policy.
            try:
                blob_client.delete_blob(
                    delete_snapshots="include"
                )
            except Exception:
                logger.exception(
                    "Primary cleanup failed after replica error"
                )

            raise HTTPException(
                status_code=502,
                detail="Replication failed. Upload not completed."
            )

    file_size = original_size


    file_size = original_size


    # 6. Store metadata in database
    new_file = File(
        owner_id=current_user.id,
        filename=safe_filename,
        storage_path=blob_name,
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
    

@router.get("/shared-with-me")
def shared_with_me(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    shared_files = (
        db.query(File, User)
        .join(
            FilePermission,
            File.id == FilePermission.file_id
        )
        .join(
            User,
            File.owner_id == User.id
        )
        .filter(
            FilePermission.user_id == current_user.id,
            FilePermission.permission == "READ",
            File.classification != "RESTRICTED"
        )
        .all()
    )

    return [
        {
            "id": file.id,
            "filename": file.filename,
            "classification": file.classification,
            "size": file.size,
            "storage_region": file.storage_region,
            "shared_by": owner.name,
            "shared_by_email": owner.email,
            "shared_at": None
        }
        for file, owner in shared_files
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

    
    # 2. Check owner or shared-user permission

    is_owner = file.owner_id == current_user.id

    shared_permission = (
        db.query(FilePermission)
        .filter(
            FilePermission.file_id == file.id,
            FilePermission.user_id == current_user.id,
            FilePermission.permission == "READ"
        )
        .first()
    )

    # Restricted files are owner-only
    is_authorized = is_owner or (
        file.classification != "RESTRICTED"
        and shared_permission is not None
    )

    if not is_authorized:
        log_event(
            db=db,
            action="FILE_ACCESS_DENIED",
            resource_type="FILE",
            status="FAILURE",
            user_id=current_user.id,
            resource_id=file.id,
            details="Unauthorized file download attempt",
        )

        raise HTTPException(
            status_code=403,
            detail="You do not have permission to access this file"
        )


    
    # 3. Retrieve the file from Azure Blob Storage
    container_client = get_container_client()
    blob_client = container_client.get_blob_client(file.storage_path)

    try:
        stored_data = blob_client.download_blob().readall()
    except Exception:
        raise HTTPException(
            status_code=404,
            detail="File not found in Azure Blob Storage"
        )


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


        
    # 3. Delete the file from Azure Blob Storage
    container_client = get_container_client()
    blob_client = container_client.get_blob_client(file.storage_path)

    try:
        blob_client.delete_blob()
    except Exception:
        raise HTTPException(
            status_code=502,
            detail="Failed to delete file from Azure Blob Storage"
        )


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

class ShareFileRequest(BaseModel):
    email: EmailStr

@router.post("/{file_id}/share")
def share_file(
    file_id: int,
    request: ShareFileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Find the file
    file = db.query(File).filter(File.id == file_id).first()

    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    # Only the owner can share
    if file.owner_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Only the file owner can share this file"
        )

    # Check classification policy
    policy = get_policy(file.classification)

    if policy["external_sharing"] == "DISABLED":
        raise HTTPException(
            status_code=403,
            detail="Restricted files cannot be shared"
        )

    # Find registered recipient
    recipient = db.query(User).filter(
        User.email == str(request.email)
    ).first()

    if not recipient:
        raise HTTPException(
            status_code=404,
            detail="Recipient must have a registered account"
        )

    if recipient.id == current_user.id:
        raise HTTPException(
            status_code=400,
            detail="You already own this file"
        )

    # Avoid duplicate permissions
    existing = db.query(FilePermission).filter(
        FilePermission.file_id == file.id,
        FilePermission.user_id == recipient.id
    ).first()

    if existing:
        raise HTTPException(
            status_code=409,
            detail="File is already shared with this user"
        )

    # Grant read permission
    permission = FilePermission(
        file_id=file.id,
        user_id=recipient.id,
        permission="READ"
    )

    db.add(permission)
    db.commit()

    log_event(
        db=db,
        action="FILE_SHARED",
        resource_type="FILE",
        status="SUCCESS",
        user_id=current_user.id,
        resource_id=file.id,
        details=f"Read access granted to user ID {recipient.id}"
    )

    return {
        "message": "File shared successfully",
        "file_id": file.id,
        "shared_with": recipient.email,
        "permission": "READ"
    }


@router.delete("/{file_id}/share")
def revoke_file_access_by_email(
    file_id: int,
    request: ShareFileRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    file = db.query(File).filter(File.id == file_id).first()

    if not file:
        raise HTTPException(status_code=404, detail="File not found")

    if file.owner_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Only the file owner can revoke access"
        )

    recipient = db.query(User).filter(
        User.email == str(request.email)
    ).first()

    if not recipient:
        raise HTTPException(
            status_code=404,
            detail="Recipient not found"
        )

    permission = db.query(FilePermission).filter(
        FilePermission.file_id == file_id,
        FilePermission.user_id == recipient.id
    ).first()

    if not permission:
        raise HTTPException(
            status_code=404,
            detail="No sharing permission found"
        )

    db.delete(permission)
    db.commit()

    log_event(
        db=db,
        action="FILE_ACCESS_REVOKED",
        resource_type="FILE",
        status="SUCCESS",
        user_id=current_user.id,
        resource_id=file_id,
        details=f"Access revoked for user ID {recipient.id}"
    )

    return {"message": "File access revoked successfully"}


@router.delete("/{file_id}/share/{user_id}")
def revoke_file_access(
    file_id: int,
    user_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Find the file
    file = db.query(File).filter(
        File.id == file_id
    ).first()

    if not file:
        raise HTTPException(
            status_code=404,
            detail="File not found"
        )

    # Only the owner can revoke access
    if file.owner_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="Only the file owner can revoke access"
        )

    # Find the sharing permission
    permission = db.query(FilePermission).filter(
        FilePermission.file_id == file_id,
        FilePermission.user_id == user_id
    ).first()

    if not permission:
        raise HTTPException(
            status_code=404,
            detail="No sharing permission found for this user"
        )

    # Remove the permission
    db.delete(permission)
    db.commit()

    # Record the action
    log_event(
        db=db,
        action="FILE_ACCESS_REVOKED",
        resource_type="FILE",
        status="SUCCESS",
        user_id=current_user.id,
        resource_id=file_id,
        details=f"Access revoked for user ID {user_id}"
    )

    return {
        "message": "File access revoked successfully",
        "file_id": file_id,
        "revoked_user_id": user_id
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
