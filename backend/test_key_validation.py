
import base64
import os

from app.encryption import get_encryption_key

# Save the current environment value without printing it.
original_key = os.environ.get("FILE_ENCRYPTION_KEY")

try:
    # Test 1: Missing key
    os.environ.pop("FILE_ENCRYPTION_KEY", None)

    try:
        get_encryption_key()
        print("FAIL: Missing key was accepted")
    except RuntimeError:
        print("PASS: Missing key was rejected")

    # Test 2: Invalid Base64
    os.environ["FILE_ENCRYPTION_KEY"] = "not-valid-base64!!!"

    try:
        get_encryption_key()
        print("FAIL: Invalid Base64 was accepted")
    except RuntimeError:
        print("PASS: Invalid Base64 was rejected")

    # Test 3: Valid Base64 but wrong key length
    os.environ["FILE_ENCRYPTION_KEY"] = base64.b64encode(
        b"short-key"
    ).decode("ascii")

    try:
        get_encryption_key()
        print("FAIL: Incorrect key length was accepted")
    except RuntimeError:
        print("PASS: Incorrect key length was rejected")

finally:
    # Restore the original environment value.
    if original_key is None:
        os.environ.pop("FILE_ENCRYPTION_KEY", None)
    else:
        os.environ["FILE_ENCRYPTION_KEY"] = original_key
{
  "detail": "Unable to decrypt file. Check the encryption key."
}