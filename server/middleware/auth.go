package middleware

import (
	"context"
	"net/http"
	"strings"
	"time"

	"github.com/golang-jwt/jwt/v5"
)

type contextKey string

const OpenIDKey contextKey = "openid"

var jwtSecret []byte

// InitJWT sets the JWT signing key.
func InitJWT(secret string) {
	jwtSecret = []byte(secret)
}

// Claims is the JWT payload.
type Claims struct {
	UserID     string `json:"user_id"`
	OpenID     string `json:"openid"`
	OpenIDHash string `json:"openid_hash"`
	jwt.RegisteredClaims
}

// GenerateToken creates a signed JWT for the given user.
func GenerateToken(userID, openid, openidHash string) (string, error) {
	claims := Claims{
		UserID:     userID,
		OpenID:     openid,
		OpenIDHash: openidHash,
		RegisteredClaims: jwt.RegisteredClaims{
			ExpiresAt: jwt.NewNumericDate(time.Now().Add(7 * 24 * time.Hour)),
			IssuedAt:  jwt.NewNumericDate(time.Now()),
		},
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	return token.SignedString(jwtSecret)
}

// Auth is a middleware that validates the JWT and injects the openid into context.
func Auth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		authHeader := r.Header.Get("Authorization")
		tokenStr := strings.TrimPrefix(authHeader, "Bearer ")
		if tokenStr == "" || tokenStr == authHeader {
			w.Header().Set("Content-Type", "application/json; charset=utf-8")
			w.WriteHeader(http.StatusUnauthorized)
			w.Write([]byte(`{"code":-1,"message":"未授权","data":null}`))
			return
		}

		claims := &Claims{}
		token, err := jwt.ParseWithClaims(tokenStr, claims, func(t *jwt.Token) (interface{}, error) {
			return jwtSecret, nil
		})
		if err != nil || !token.Valid {
			w.Header().Set("Content-Type", "application/json; charset=utf-8")
			w.WriteHeader(http.StatusUnauthorized)
			w.Write([]byte(`{"code":-1,"message":"令牌无效或已过期","data":null}`))
			return
		}

		ctx := context.WithValue(r.Context(), OpenIDKey, claims.OpenID)
		next.ServeHTTP(w, r.WithContext(ctx))
	})
}

// GetOpenID extracts the openid from the request context.
func GetOpenID(r *http.Request) string {
	if v, ok := r.Context().Value(OpenIDKey).(string); ok {
		return v
	}
	return ""
}
