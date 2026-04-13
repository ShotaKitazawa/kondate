package handler

import (
	"context"
	"database/sql"
	"errors"

	"github.com/ShotaKitazawa/kondate/internal/api"
	"github.com/ShotaKitazawa/kondate/internal/database/sqlcgen"
	"github.com/google/uuid"
)

func (h *Handler) CreateShoppingItem(ctx context.Context, req *api.CreateShoppingItemRequest) (api.CreateShoppingItemRes, error) {
	maxOrderRaw, err := h.q.GetMaxShoppingItemOrder(ctx, req.BlockID.String())
	if err != nil {
		return nil, err
	}
	var nextOrder int64
	if v, ok := maxOrderRaw.(int64); ok {
		nextOrder = v + 1
	}
	item, err := h.q.CreateShoppingItem(ctx, sqlcgen.CreateShoppingItemParams{
		ID:        uuid.New().String(),
		BlockID:   req.BlockID.String(),
		Name:      req.Name,
		SortOrder: nextOrder,
	})
	if err != nil {
		return nil, err
	}
	result := dbShoppingToAPI(item)
	return &result, nil
}

func (h *Handler) UpdateShoppingItem(ctx context.Context, req *api.UpdateShoppingItemRequest, params api.UpdateShoppingItemParams) (api.UpdateShoppingItemRes, error) {
	current, err := h.q.GetShoppingItem(ctx, params.ID.String())
	if errors.Is(err, sql.ErrNoRows) {
		return &api.UpdateShoppingItemNotFound{}, nil
	}
	if err != nil {
		return nil, err
	}

	name := current.Name
	if req.Name.Set {
		name = req.Name.Value
	}

	checked := current.Checked
	if req.Checked.Set {
		if req.Checked.Value {
			checked = 1
		} else {
			checked = 0
		}
	}

	note := mergeOptNil(req.Note, current.Note)

	updated, err := h.q.UpdateShoppingItem(ctx, sqlcgen.UpdateShoppingItemParams{
		Name:    name,
		Checked: checked,
		Note:    note,
		ID:      params.ID.String(),
	})
	if err != nil {
		return nil, err
	}
	result := dbShoppingToAPI(updated)
	return &result, nil
}

func (h *Handler) ReorderShoppingItems(ctx context.Context, req *api.ReorderShoppingItemsRequest) (api.ReorderShoppingItemsRes, error) {
	tx, err := h.db.BeginTx(ctx, nil)
	if err != nil {
		return nil, err
	}
	defer func() { _ = tx.Rollback() }()

	qtx := sqlcgen.New(tx)
	for i, id := range req.Ids {
		if err := qtx.UpdateShoppingItemOrder(ctx, sqlcgen.UpdateShoppingItemOrderParams{
			SortOrder: int64(i),
			ID:        id.String(),
		}); err != nil {
			return nil, err
		}
	}

	if err := tx.Commit(); err != nil {
		return nil, err
	}
	return &api.ReorderShoppingItemsNoContent{}, nil
}

func (h *Handler) DeleteShoppingItem(ctx context.Context, params api.DeleteShoppingItemParams) (api.DeleteShoppingItemRes, error) {
	_, err := h.q.GetShoppingItem(ctx, params.ID.String())
	if errors.Is(err, sql.ErrNoRows) {
		return &api.DeleteShoppingItemNotFound{}, nil
	}
	if err != nil {
		return nil, err
	}
	if err := h.q.DeleteShoppingItem(ctx, params.ID.String()); err != nil {
		return nil, err
	}
	return &api.DeleteShoppingItemNoContent{}, nil
}
