package handler

import (
	"context"
	"database/sql"
	"errors"
	"strings"

	"github.com/ShotaKitazawa/kondate/internal/api"
	"github.com/ShotaKitazawa/kondate/internal/database/sqlcgen"
	"github.com/google/uuid"
)

func (h *Handler) CreateDay(ctx context.Context, req *api.CreateDayRequest) (api.CreateDayRes, error) {
	day, err := h.q.CreateDayEntry(ctx, sqlcgen.CreateDayEntryParams{
		ID:      uuid.New().String(),
		BlockID: req.BlockID.String(),
		Date:    req.Date.Format("2006-01-02"),
	})
	if err != nil {
		if strings.Contains(err.Error(), "UNIQUE constraint failed") {
			return &api.CreateDayBadRequest{Message: "その日付はすでに存在します"}, nil
		}
		return nil, err
	}
	result := dbDayToAPI(day)
	return &result, nil
}

func (h *Handler) UpdateDay(ctx context.Context, req *api.UpdateDayRequest, params api.UpdateDayParams) (api.UpdateDayRes, error) {
	current, err := h.q.GetDayEntry(ctx, params.ID.String())
	if errors.Is(err, sql.ErrNoRows) {
		return &api.UpdateDayNotFound{}, nil
	}
	if err != nil {
		return nil, err
	}

	// Merge: use request value if Set, otherwise keep existing
	note := mergeOptNil(req.Note, current.Note)
	lunch := mergeOptNil(req.Lunch, current.Lunch)
	dinner := mergeOptNil(req.Dinner, current.Dinner)

	updated, err := h.q.UpdateDayEntry(ctx, sqlcgen.UpdateDayEntryParams{
		Note:   note,
		Lunch:  lunch,
		Dinner: dinner,
		ID:     params.ID.String(),
	})
	if err != nil {
		return nil, err
	}
	result := dbDayToAPI(updated)
	return &result, nil
}

func (h *Handler) DeleteDay(ctx context.Context, params api.DeleteDayParams) (api.DeleteDayRes, error) {
	_, err := h.q.GetDayEntry(ctx, params.ID.String())
	if errors.Is(err, sql.ErrNoRows) {
		return &api.DeleteDayNotFound{}, nil
	}
	if err != nil {
		return nil, err
	}
	if err := h.q.DeleteDayEntry(ctx, params.ID.String()); err != nil {
		return nil, err
	}
	return &api.DeleteDayNoContent{}, nil
}

// mergeOptNil returns the new value if Set, otherwise preserves the existing *string.
func mergeOptNil(new api.OptNilString, existing *string) *string {
	if !new.Set {
		return existing
	}
	if new.Null {
		return nil
	}
	return &new.Value
}
