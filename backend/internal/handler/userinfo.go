package handler

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"

	"github.com/ShotaKitazawa/kondate/internal/api"
)

type contextKey string

const authHeaderKey contextKey = "authorization"

// WithAuthHeader stores the Authorization header value in the context.
func WithAuthHeader(ctx context.Context, authHeader string) context.Context {
	return context.WithValue(ctx, authHeaderKey, authHeader)
}

func (h *Handler) GetUserInfo(ctx context.Context) (api.GetUserInfoRes, error) {
	if h.oidcIssuer == "" {
		name := api.OptNilString{}
		name.SetTo("Local User")
		return &api.UserInfo{Sub: "local", Name: name}, nil
	}

	authHeader, _ := ctx.Value(authHeaderKey).(string)
	token := strings.TrimPrefix(authHeader, "Bearer ")
	if token == "" {
		return &api.ErrorResponse{Message: "unauthorized"}, nil
	}

	userinfoURL := strings.TrimSuffix(h.oidcIssuer, "/") + "/userinfo"
	req, err := http.NewRequestWithContext(ctx, http.MethodGet, userinfoURL, nil)
	if err != nil {
		return nil, fmt.Errorf("create userinfo request: %w", err)
	}
	req.Header.Set("Authorization", "Bearer "+token)

	resp, err := http.DefaultClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("call userinfo endpoint: %w", err)
	}
	defer func() { _ = resp.Body.Close() }()

	if resp.StatusCode == http.StatusUnauthorized {
		return &api.ErrorResponse{Message: "unauthorized"}, nil
	}
	if resp.StatusCode != http.StatusOK {
		return nil, fmt.Errorf("userinfo endpoint returned %d", resp.StatusCode)
	}

	body, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read userinfo response: %w", err)
	}

	var claims struct {
		Sub  string `json:"sub"`
		Name string `json:"name"`
	}
	if err := json.Unmarshal(body, &claims); err != nil {
		return nil, fmt.Errorf("parse userinfo response: %w", err)
	}

	result := &api.UserInfo{Sub: claims.Sub}
	if claims.Name != "" {
		result.Name.SetTo(claims.Name)
	}
	return result, nil
}
