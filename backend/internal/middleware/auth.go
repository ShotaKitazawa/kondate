package middleware

import (
	"context"
	"fmt"
	"net/http"
	"strings"

	"github.com/MicahParks/keyfunc/v3"
	"github.com/golang-jwt/jwt/v5"

	"github.com/ShotaKitazawa/kondate/internal/api"
)

// OIDCSecurityHandler implements api.SecurityHandler using OIDC JWKS.
type OIDCSecurityHandler struct {
	jwks     keyfunc.Keyfunc
	audience string
	issuer   string
}

// NewOIDCSecurityHandler creates a SecurityHandler that validates OIDC JWT tokens.
// issuer is the OIDC issuer URL (e.g. "https://example.auth0.com/").
// audience is the API audience.
func NewOIDCSecurityHandler(ctx context.Context, issuer, audience string) (*OIDCSecurityHandler, error) {
	issuer = strings.TrimSuffix(issuer, "/") + "/"
	jwksURL := strings.TrimSuffix(issuer, "/") + "/.well-known/jwks.json"
	k, err := keyfunc.NewDefaultCtx(ctx, []string{jwksURL})
	if err != nil {
		return nil, fmt.Errorf("create keyfunc: %w", err)
	}
	return &OIDCSecurityHandler{
		jwks:     k,
		audience: audience,
		issuer:   issuer,
	}, nil
}

// HandleBearerAuth validates the Bearer token.
func (h *OIDCSecurityHandler) HandleBearerAuth(ctx context.Context, _ api.OperationName, t api.BearerAuth) (context.Context, error) {
	token, err := jwt.Parse(t.Token, h.jwks.Keyfunc,
		jwt.WithAudience(h.audience),
		jwt.WithIssuer(h.issuer),
		jwt.WithValidMethods([]string{"RS256"}),
	)
	if err != nil || !token.Valid {
		return ctx, &unauthorizedError{err: err}
	}
	return ctx, nil
}

type unauthorizedError struct{ err error }

func (e *unauthorizedError) Error() string {
	if e.err != nil {
		return fmt.Sprintf("unauthorized: %v", e.err)
	}
	return "unauthorized"
}

func (e *unauthorizedError) StatusCode() int { return http.StatusUnauthorized }
