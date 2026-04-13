package handler

import (
	"context"

	"github.com/ShotaKitazawa/kondate/internal/api"
)

func (h *Handler) GetOIDCConfig(ctx context.Context) (*api.OIDCConfig, error) {
	if h.oidcConfig == nil {
		return &api.OIDCConfig{Enabled: false}, nil
	}

	result := &api.OIDCConfig{Enabled: true}
	result.Issuer.SetTo(h.oidcConfig.Issuer)
	result.ClientID.SetTo(h.oidcConfig.ClientID)
	if h.oidcConfig.Audience != "" {
		result.Audience.SetTo(h.oidcConfig.Audience)
	}
	return result, nil
}
