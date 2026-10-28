from app.encryption import encrypt_data, decrypt_data

original_data = b"This is a confidential test document."

encrypted_data = encrypt_data(original_data)
decrypted_data = decrypt_data(encrypted_data)

print("Original:", original_data)
print("Encrypted:", encrypted_data)
print("Decrypted:", decrypted_data)

assert encrypted_data != original_data
assert decrypted_data == original_data

print("Encryption and decryption test passed!")