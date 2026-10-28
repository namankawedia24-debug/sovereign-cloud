import os
import base64

from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from dotenv import load_dotenv

load_dotenv()


def get_encryption_key() -> bytes:
    encoded_key = os.getenv("FILE_ENCRYPTION_KEY")

    if not encoded_key:
        raise RuntimeError(
            "FILE_ENCRYPTION_KEY is missing from .env"
        )

    try:
        key = base64.b64decode(encoded_key, validate=True)
    except Exception as exc:
        raise RuntimeError(
            "FILE_ENCRYPTION_KEY must be valid Base64"
        ) from exc

    if len(key) != 32:
        raise RuntimeError(
            "AES-256 requires a 32-byte encryption key"
        )

    return key


def encrypt_data(data: bytes) -> bytes:
    key = get_encryption_key()
    aesgcm = AESGCM(key)

    # A fresh 12-byte nonce is generated for every encryption.
    nonce = os.urandom(12)

    ciphertext = aesgcm.encrypt(nonce, data, None)

    # Store nonce with ciphertext so decryption can recover it.
    return nonce + ciphertext


def decrypt_data(encrypted_data: bytes) -> bytes:
    key = get_encryption_key()
    aesgcm = AESGCM(key)

    if len(encrypted_data) < 28:
        raise ValueError("Encrypted data is invalid or incomplete")

    nonce = encrypted_data[:12]
    ciphertext = encrypted_data[12:]

    # AES-GCM verifies the authentication tag during decryption.
    return aesgcm.decrypt(nonce, ciphertext, None)