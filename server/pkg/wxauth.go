package pkg

import (
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"net/url"
)

// WXSession holds the response from WeChat jscode2session API.
type WXSession struct {
	OpenID     string `json:"openid"`
	SessionKey string `json:"session_key"`
	UnionID    string `json:"unionid"`
	ErrCode    int    `json:"errcode"`
	ErrMsg     string `json:"errmsg"`
}

// Code2Session exchanges a WeChat temporary code for an openid.
func Code2Session(appID, secret, code string) (*WXSession, error) {
	u := fmt.Sprintf(
		"https://api.weixin.qq.com/sns/jscode2session?appid=%s&secret=%s&js_code=%s&grant_type=authorization_code",
		url.QueryEscape(appID), url.QueryEscape(secret), url.QueryEscape(code),
	)

	resp, err := http.Get(u)
	if err != nil {
		return nil, fmt.Errorf("request wechat api: %w", err)
	}
	defer resp.Body.Close()

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read response: %w", err)
	}

	var session WXSession
	if err := json.Unmarshal(body, &session); err != nil {
		return nil, fmt.Errorf("parse response: %w", err)
	}

	if session.ErrCode != 0 {
		return nil, fmt.Errorf("wechat error %d: %s", session.ErrCode, session.ErrMsg)
	}

	return &session, nil
}
