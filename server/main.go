package main

import (
	"fmt"
	"log"
	"net/http"
	"os"

	"familygraph/config"
	"familygraph/handler"
	"familygraph/middleware"
	"familygraph/pkg"
	"familygraph/store"
)

func main() {
	cfg := config.Load()

	// Initialize subsystems
	pkg.InitCrypto(cfg.CryptoKey)
	middleware.InitJWT(cfg.JWTSecret)

	if err := store.Init(cfg.DataDir); err != nil {
		log.Fatalf("Failed to initialize database: %v", err)
	}

	// Ensure upload directories exist
	for _, dir := range []string{cfg.UploadDir, cfg.UploadDir + "/photos", cfg.UploadDir + "/avatars"} {
		os.MkdirAll(dir, 0755)
	}

	// --- Routes ---
	mux := http.NewServeMux()

	// Public endpoints (no auth required)
	mux.HandleFunc("POST /api/v1/user/login", handler.UserLogin(cfg.WXAppID, cfg.WXSecret))
	mux.HandleFunc("GET /api/v1/family/share/{code}", handler.FamilyGetByShareCode)

	// Protected endpoints (JWT required)
	protected := http.NewServeMux()

	// User
	protected.HandleFunc("PUT /api/v1/user/profile", handler.UserUpdateProfile)
	protected.HandleFunc("POST /api/v1/user/avatar", handler.UserUploadAvatar)

	// Family
	protected.HandleFunc("POST /api/v1/family", handler.FamilyCreate)
	protected.HandleFunc("GET /api/v1/family/{id}", handler.FamilyGetDetail)
	protected.HandleFunc("DELETE /api/v1/family/{id}", handler.FamilyDelete)
	protected.HandleFunc("POST /api/v1/family/{id}/invite-code", handler.FamilyGenInviteCode)
	protected.HandleFunc("POST /api/v1/family/{id}/share-link", handler.FamilyGenShareLink)

	// Person
	protected.HandleFunc("POST /api/v1/person", handler.PersonCreate)
	protected.HandleFunc("PUT /api/v1/person/{id}", handler.PersonUpdate)
	protected.HandleFunc("DELETE /api/v1/person/{id}", handler.PersonDelete)
	protected.HandleFunc("GET /api/v1/person/{id}", handler.PersonGetDetail)
	protected.HandleFunc("GET /api/v1/person", handler.PersonList)
	protected.HandleFunc("POST /api/v1/person/avatar", handler.PersonUploadAvatar)

	// Relationship
	protected.HandleFunc("POST /api/v1/relationship", handler.RelationshipCreate)
	protected.HandleFunc("DELETE /api/v1/relationship/{id}", handler.RelationshipDelete)
	protected.HandleFunc("GET /api/v1/relationship/title", handler.RelationshipComputeTitle)
	protected.HandleFunc("GET /api/v1/relationship/graph", handler.RelationshipGetGraph)

	// Photo
	protected.HandleFunc("POST /api/v1/photo/upload", handler.PhotoUpload)
	protected.HandleFunc("DELETE /api/v1/photo/{id}", handler.PhotoDelete)
	protected.HandleFunc("GET /api/v1/photo/{id}", handler.PhotoDetail)
	protected.HandleFunc("GET /api/v1/photo", handler.PhotoList)
	protected.HandleFunc("POST /api/v1/photo/{id}/tag", handler.PhotoAddTag)
	protected.HandleFunc("DELETE /api/v1/photo/tag/{tagId}", handler.PhotoRemoveTag)

	// Member
	protected.HandleFunc("POST /api/v1/member/join", handler.MemberApplyJoin)
	protected.HandleFunc("POST /api/v1/member/review", handler.MemberReviewJoin)
	protected.HandleFunc("GET /api/v1/member/validate-invite", handler.MemberValidateInvite)
	protected.HandleFunc("GET /api/v1/member/requests", handler.MemberListRequests)
	protected.HandleFunc("POST /api/v1/member/leave", handler.MemberLeave)
	protected.HandleFunc("PUT /api/v1/member/{id}/role", handler.MemberChangeRole)
	protected.HandleFunc("GET /api/v1/member/self", handler.MemberGetSelf)
	protected.HandleFunc("GET /api/v1/member", handler.MemberList)
	protected.HandleFunc("PUT /api/v1/member/{id}/title-map", handler.MemberUpdateTitleMap)

	// History
	protected.HandleFunc("GET /api/v1/history", handler.HistoryList)
	protected.HandleFunc("POST /api/v1/history/{id}/rollback", handler.HistoryRollback)

	// Note
	protected.HandleFunc("PUT /api/v1/note", handler.NoteUpsert)
	protected.HandleFunc("GET /api/v1/note", handler.NoteGet)

	// Titlemap
	protected.HandleFunc("POST /api/v1/titlemap", handler.TitlemapCreate)
	protected.HandleFunc("PUT /api/v1/titlemap/{id}", handler.TitlemapUpdate)
	protected.HandleFunc("DELETE /api/v1/titlemap/{id}", handler.TitlemapDelete)
	protected.HandleFunc("GET /api/v1/titlemap/{id}", handler.TitlemapGet)
	protected.HandleFunc("GET /api/v1/titlemap", handler.TitlemapList)

	// Admin
	protected.HandleFunc("POST /api/v1/admin/set-storage-unlimited", handler.AdminSetStorageUnlimited)
	protected.HandleFunc("POST /api/v1/admin/cleanup", handler.AdminCleanup)

	// Mount protected routes behind auth middleware
	mux.Handle("/api/v1/", middleware.Auth(protected))

	// Apply global middleware
	var h http.Handler = mux
	h = middleware.CORS(h)
	h = middleware.Recovery(h)
	h = middleware.Logger(h)

	addr := fmt.Sprintf(":%s", cfg.Port)
	log.Printf("FamilyGraph API server starting on %s", addr)
	if err := http.ListenAndServe(addr, h); err != nil {
		log.Fatalf("Server failed: %v", err)
	}
}
