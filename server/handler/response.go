package handler

import (
	"encoding/json"
	"net/http"
)

// Response is the standard API response format, matching the cloud function's { code, message, data }.
type Response struct {
	Code    int         `json:"code"`
	Message string      `json:"message"`
	Data    interface{} `json:"data"`
}

// OK writes a success response.
func OK(w http.ResponseWriter, data interface{}) {
	writeJSON(w, http.StatusOK, Response{Code: 0, Message: "ok", Data: data})
}

// Fail writes an error response with the given message and code.
func Fail(w http.ResponseWriter, msg string, codes ...int) {
	code := -1
	if len(codes) > 0 {
		code = codes[0]
	}
	writeJSON(w, http.StatusOK, Response{Code: code, Message: msg, Data: nil})
}

// Unauthorized writes a 401 response.
func Unauthorized(w http.ResponseWriter) {
	writeJSON(w, http.StatusUnauthorized, Response{Code: -1, Message: "未授权", Data: nil})
}

func writeJSON(w http.ResponseWriter, status int, v interface{}) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)
	json.NewEncoder(w).Encode(v)
}

// DecodeJSON reads the request body into v.
func DecodeJSON(r *http.Request, v interface{}) error {
	defer r.Body.Close()
	return json.NewDecoder(r.Body).Decode(v)
}
