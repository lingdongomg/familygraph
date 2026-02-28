package config

import "os"

type Config struct {
	Port       string
	DataDir    string
	UploadDir  string
	BaseURL    string
	JWTSecret  string
	WXAppID    string
	WXSecret   string
	CryptoKey  string
}

func Load() *Config {
	return &Config{
		Port:      getEnv("PORT", "8080"),
		DataDir:   getEnv("DATA_DIR", "data"),
		UploadDir: getEnv("UPLOAD_DIR", "uploads"),
		BaseURL:   getEnv("BASE_URL", "http://localhost:8080"),
		JWTSecret: getEnv("JWT_SECRET", "dev-secret-change-in-production"),
		WXAppID:   getEnv("WX_APPID", ""),
		WXSecret:  getEnv("WX_SECRET", ""),
		CryptoKey: getEnv("CRYPTO_KEY", "22f9c2560129fd419d98d32acb6fc3180189f57b322f16d311755302d51bea6d"),
	}
}

func getEnv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}
