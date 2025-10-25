from Crypto.Cipher import AES
import base64

SECRET_KEY = b"1234567890123456"  # mesma do JS
IV = b"6543210987654321"          # mesma do JS

def unpad_pkcs7(data_bytes):
    pad_len = data_bytes[-1]
    return data_bytes[:-pad_len]

def decrypt(cipher_base64):
    cipher_bytes = base64.b64decode(cipher_base64)
    cipher = AES.new(SECRET_KEY, AES.MODE_CBC, IV)
    decrypted = cipher.decrypt(cipher_bytes)
    return unpad_pkcs7(decrypted).decode("utf-8")

# teste com o valor do console
print(decrypt("2ROW/0X0yNzZNDKwXejZMQ=="))