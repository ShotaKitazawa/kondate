package main

import (
	"context"
	"embed"
	"flag"
	"io/fs"
	"log/slog"
	"net/http"
	"os"

	"github.com/ShotaKitazawa/kondate/internal/api"
	"github.com/ShotaKitazawa/kondate/internal/database"
	"github.com/ShotaKitazawa/kondate/internal/handler"
	"github.com/ShotaKitazawa/kondate/internal/middleware"
)

//go:embed all:static
var staticFiles embed.FS

func main() {
	disableOIDC := flag.Bool("disable-oidc", false, "disable OIDC authentication (local development only)")
	flag.Parse()

	ctx := context.Background()

	dbPath := getenv("DB_PATH", "/data/app.db")
	db, err := database.Open(dbPath)
	if err != nil {
		slog.Error("open database", "error", err)
		os.Exit(1)
	}
	defer func() { _ = db.Close() }()

	var (
		sec        api.SecurityHandler
		oidcIssuer string
		oidcCfg    *handler.OIDCConfig
	)
	if *disableOIDC {
		slog.Warn("OIDC authentication disabled — do not use in production")
		sec = middleware.NoopSecurityHandler{}
	} else {
		oidcIssuer = mustGetenv("OIDC_ISSUER")
		oidcAudience := mustGetenv("OIDC_AUDIENCE")
		oidcClientID := mustGetenv("OIDC_CLIENT_ID")
		sec, err = middleware.NewOIDCSecurityHandler(ctx, oidcIssuer, oidcAudience)
		if err != nil {
			slog.Error("create auth handler", "error", err)
			os.Exit(1)
		}
		oidcCfg = &handler.OIDCConfig{
			Issuer:   oidcIssuer,
			ClientID: oidcClientID,
			Audience: oidcAudience,
		}
	}

	h := handler.New(db, oidcIssuer, oidcCfg)
	srv, err := api.NewServer(h, sec)
	if err != nil {
		slog.Error("create server", "error", err)
		os.Exit(1)
	}

	sub, err := fs.Sub(staticFiles, "static")
	if err != nil {
		slog.Error("create static sub fs", "error", err)
		os.Exit(1)
	}

	mux := http.NewServeMux()
	mux.Handle("/api/", authHeaderMiddleware(srv, *disableOIDC))
	mux.Handle("/", http.FileServer(http.FS(sub)))

	addr := getenv("ADDR", ":8080")
	slog.Info("starting server", "addr", addr)
	if err := http.ListenAndServe(addr, mux); err != nil {
		slog.Error("server error", "error", err)
		os.Exit(1)
	}
}

func authHeaderMiddleware(next http.Handler, disableOIDC bool) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		auth := r.Header.Get("Authorization")
		// When OIDC is disabled (dev mode), inject a dummy bearer token so that
		// ogen's generated security check (which requires the header to be present)
		// passes through to NoopSecurityHandler without returning 401.
		if disableOIDC && auth == "" {
			r = r.Clone(r.Context())
			r.Header.Set("Authorization", "Bearer local")
			auth = "Bearer local"
		}
		if auth != "" {
			r = r.WithContext(handler.WithAuthHeader(r.Context(), auth))
		}
		next.ServeHTTP(w, r)
	})
}

func getenv(key, fallback string) string {
	if v := os.Getenv(key); v != "" {
		return v
	}
	return fallback
}

func mustGetenv(key string) string {
	v := os.Getenv(key)
	if v == "" {
		slog.Error("required env var not set", "key", key)
		os.Exit(1)
	}
	return v
}
