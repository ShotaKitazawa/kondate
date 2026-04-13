package middleware

import (
	"context"

	"github.com/ShotaKitazawa/kondate/internal/api"
)

// NoopSecurityHandler accepts all requests without authentication.
// Use only in local development with --disable-oidc.
type NoopSecurityHandler struct{}

func (NoopSecurityHandler) HandleBearerAuth(ctx context.Context, _ api.OperationName, _ api.BearerAuth) (context.Context, error) {
	return ctx, nil
}
