package handler

import (
	"database/sql"
	"time"

	"github.com/ShotaKitazawa/kondate/internal/api"
	"github.com/ShotaKitazawa/kondate/internal/database/sqlcgen"
	"github.com/google/uuid"
)

// OIDCConfig holds OIDC client parameters sourced from environment variables.
type OIDCConfig struct {
	Issuer   string
	ClientID string
	Audience string
}

// Handler implements api.Handler.
type Handler struct {
	db         *sql.DB
	q          *sqlcgen.Queries
	oidcIssuer string      // empty when --disable-oidc
	oidcConfig *OIDCConfig // nil when --disable-oidc
}

// New creates a Handler backed by db.
// oidcIssuer is the OIDC issuer URL; pass empty string when --disable-oidc.
func New(db *sql.DB, oidcIssuer string, oidcConfig *OIDCConfig) *Handler {
	return &Handler{db: db, q: sqlcgen.New(db), oidcIssuer: oidcIssuer, oidcConfig: oidcConfig}
}

// --- conversion helpers ---

func dbBlockToAPI(b sqlcgen.Block, days []api.DayEntry, items []api.ShoppingItem) *api.Block {
	result := &api.Block{
		ID:            uuid.MustParse(b.ID),
		CreatedAt:     b.CreatedAt,
		Days:          days,
		ShoppingItems: items,
	}
	if b.ArchivedAt != nil {
		result.ArchivedAt.SetTo(*b.ArchivedAt)
	}
	return result
}

func dbDayToAPI(d sqlcgen.DayEntry) api.DayEntry {
	date, _ := time.Parse("2006-01-02", d.Date)
	return api.DayEntry{
		ID:      uuid.MustParse(d.ID),
		BlockID: uuid.MustParse(d.BlockID),
		Date:    date,
		Note:    ptrToOptNilString(d.Note),
		Lunch:   ptrToOptNilString(d.Lunch),
		Dinner:  ptrToOptNilString(d.Dinner),
	}
}

// ptrToOptNilString converts a *string from DB to OptNilString.
// nil → {Set: true, Null: true}   (explicitly null in response)
// non-nil → {Set: true, Value: v} (has a value)
func ptrToOptNilString(p *string) api.OptNilString {
	if p == nil {
		return api.OptNilString{Set: true, Null: true}
	}
	o := api.OptNilString{}
	o.SetTo(*p)
	return o
}

func dbShoppingToAPI(s sqlcgen.ShoppingItem) api.ShoppingItem {
	return api.ShoppingItem{
		ID:        uuid.MustParse(s.ID),
		BlockID:   uuid.MustParse(s.BlockID),
		Name:      s.Name,
		Note:      ptrToOptNilString(s.Note),
		Checked:   s.Checked != 0,
		CreatedAt: s.CreatedAt,
	}
}
