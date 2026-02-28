package pkg

import (
	"crypto/aes"
	"crypto/cipher"
	"crypto/rand"
	"crypto/sha256"
	"encoding/base64"
	"fmt"
	"strings"
)

var cryptoKey []byte

// InitCrypto sets up the AES-256-CBC key (SHA-256 of the raw key string).
func InitCrypto(rawKey string) {
	h := sha256.Sum256([]byte(rawKey))
	cryptoKey = h[:]
}

// Encrypt encrypts text with AES-256-CBC and returns "iv_base64:encrypted_base64".
func Encrypt(text string) string {
	if text == "" {
		return text
	}

	block, err := aes.NewCipher(cryptoKey)
	if err != nil {
		return text
	}

	iv := make([]byte, aes.BlockSize)
	if _, err := rand.Read(iv); err != nil {
		return text
	}

	plaintext := pkcs7Pad([]byte(text), aes.BlockSize)
	ciphertext := make([]byte, len(plaintext))
	mode := cipher.NewCBCEncrypter(block, iv)
	mode.CryptBlocks(ciphertext, plaintext)

	return base64.StdEncoding.EncodeToString(iv) + ":" + base64.StdEncoding.EncodeToString(ciphertext)
}

// Decrypt decrypts "iv_base64:encrypted_base64" back to plaintext.
func Decrypt(encryptedText string) (string, error) {
	if encryptedText == "" {
		return encryptedText, nil
	}

	parts := strings.SplitN(encryptedText, ":", 2)
	if len(parts) != 2 {
		return "", fmt.Errorf("invalid encrypted data format")
	}

	iv, err := base64.StdEncoding.DecodeString(parts[0])
	if err != nil {
		return "", fmt.Errorf("decode iv: %w", err)
	}

	ciphertext, err := base64.StdEncoding.DecodeString(parts[1])
	if err != nil {
		return "", fmt.Errorf("decode ciphertext: %w", err)
	}

	block, err := aes.NewCipher(cryptoKey)
	if err != nil {
		return "", fmt.Errorf("create cipher: %w", err)
	}

	mode := cipher.NewCBCDecrypter(block, iv)
	mode.CryptBlocks(ciphertext, ciphertext)

	plaintext, err := pkcs7Unpad(ciphertext)
	if err != nil {
		return "", err
	}

	return string(plaintext), nil
}

func pkcs7Pad(data []byte, blockSize int) []byte {
	padding := blockSize - len(data)%blockSize
	pad := make([]byte, padding)
	for i := range pad {
		pad[i] = byte(padding)
	}
	return append(data, pad...)
}

func pkcs7Unpad(data []byte) ([]byte, error) {
	if len(data) == 0 {
		return nil, fmt.Errorf("empty data")
	}
	padding := int(data[len(data)-1])
	if padding > len(data) || padding == 0 {
		return nil, fmt.Errorf("invalid padding")
	}
	return data[:len(data)-padding], nil
}

// HashOpenID returns the SHA-256 hex hash of an openid.
func HashOpenID(openid string) string {
	h := sha256.Sum256([]byte(openid))
	return fmt.Sprintf("%x", h)
}
