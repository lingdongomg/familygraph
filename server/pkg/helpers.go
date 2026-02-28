package pkg

import (
	"crypto/rand"
	"math/big"
)

const codeChars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

// GenerateCode generates a random alphanumeric code of the given length.
func GenerateCode(length int) string {
	code := make([]byte, length)
	for i := range code {
		n, _ := rand.Int(rand.Reader, big.NewInt(int64(len(codeChars))))
		code[i] = codeChars[n.Int64()]
	}
	return string(code)
}
