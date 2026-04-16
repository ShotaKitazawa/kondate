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
	jwks        keyfunc.Keyfunc
	audience    string
	issuer      string
	allowedSubs map[string]struct{}
}

// NewOIDCSecurityHandler creates a SecurityHandler that validates OIDC JWT tokens.
// issuer is the OIDC issuer URL (e.g. "https://example.auth0.com/").
// audience is the API audience.
// allowedSubs is the list of allowed subject identifiers (e.g. "google-oauth2|12345").
// Only users whose sub claim is in the list are granted access.
func NewOIDCSecurityHandler(ctx context.Context, issuer, audience string, allowedSubs []string) (*OIDCSecurityHandler, error) {
	issuer = strings.TrimSuffix(issuer, "/") + "/"
	jwksURL := strings.TrimSuffix(issuer, "/") + "/.well-known/jwks.json"
	k, err := keyfunc.NewDefaultCtx(ctx, []string{jwksURL})
	if err != nil {
		return nil, fmt.Errorf("create keyfunc: %w", err)
	}
	subs := make(map[string]struct{}, len(allowedSubs))
	for _, s := range allowedSubs {
		subs[s] = struct{}{}
	}
	return &OIDCSecurityHandler{
		jwks:        k,
		audience:    audience,
		issuer:      issuer,
		allowedSubs: subs,
	}, nil
}

// HandleBearerAuth validates the Bearer token and checks the sub claim against the allowlist.
func (h *OIDCSecurityHandler) HandleBearerAuth(ctx context.Context, _ api.OperationName, t api.BearerAuth) (context.Context, error) {
	token, err := jwt.Parse(t.Token, h.jwks.Keyfunc,
		jwt.WithAudience(h.audience),
		jwt.WithIssuer(h.issuer),
		jwt.WithValidMethods([]string{"RS256"}),
	)
	if err != nil || !token.Valid {
		return ctx, &unauthorizedError{err: err}
	}

	claims, ok := token.Claims.(jwt.MapClaims)
	if !ok {
		return ctx, &unauthorizedError{err: fmt.Errorf("invalid claims type")}
	}
	sub, _ := claims["sub"].(string)
	if sub == "" {
		return ctx, &unauthorizedError{err: fmt.Errorf("missing sub claim")}
	}
	if _, allowed := h.allowedSubs[sub]; !allowed {
		return ctx, &forbiddenError{}
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

type forbiddenError struct{}

func (e *forbiddenError) Error() string   { return "forbidden" }
func (e *forbiddenError) StatusCode() int { return http.StatusForbidden }
