package handler

import (
	"context"
	"database/sql"
	"errors"

	"github.com/ShotaKitazawa/kondate/internal/api"
	"github.com/ShotaKitazawa/kondate/internal/database/sqlcgen"
	"github.com/google/uuid"
)

func (h *Handler) ListBlocks(ctx context.Context) (api.ListBlocksRes, error) {
	blocks, err := h.q.ListBlocks(ctx)
	if err != nil {
		return nil, err
	}
	result := make(api.ListBlocksOKApplicationJSON, len(blocks))
	for i, b := range blocks {
		result[i] = api.BlockSummary{
			ID:        uuid.MustParse(b.ID),
			CreatedAt: b.CreatedAt,
		}
		if b.ArchivedAt != nil {
			result[i].ArchivedAt.SetTo(*b.ArchivedAt)
		}
	}
	return &result, nil
}

func (h *Handler) GetBlock(ctx context.Context, params api.GetBlockParams) (api.GetBlockRes, error) {
	b, err := h.q.GetBlock(ctx, params.ID.String())
	if errors.Is(err, sql.ErrNoRows) {
		return &api.GetBlockNotFound{}, nil
	}
	if err != nil {
		return nil, err
	}
	return h.loadBlock(ctx, b)
}

func (h *Handler) GetCurrentBlock(ctx context.Context) (api.GetCurrentBlockRes, error) {
	block, err := h.q.GetCurrentBlock(ctx)
	if errors.Is(err, sql.ErrNoRows) {
		block, err = h.q.CreateBlock(ctx, uuid.New().String())
	}
	if err != nil {
		return nil, err
	}
	return h.loadBlock(ctx, block)
}

func (h *Handler) CreateBlock(ctx context.Context) (api.CreateBlockRes, error) {
	block, err := h.q.CreateBlock(ctx, uuid.New().String())
	if err != nil {
		return nil, err
	}
	return h.loadBlock(ctx, block)
}

func (h *Handler) ArchiveBlockById(ctx context.Context, params api.ArchiveBlockByIdParams) (api.ArchiveBlockByIdRes, error) {
	oldest, err := h.q.GetOldestNonArchivedBlock(ctx)
	if errors.Is(err, sql.ErrNoRows) {
		return &api.ArchiveBlockByIdBadRequest{Message: "no non-archived blocks"}, nil
	}
	if err != nil {
		return nil, err
	}
	if oldest.ID != params.ID.String() {
		return &api.ArchiveBlockByIdBadRequest{Message: "only the oldest non-archived block can be archived"}, nil
	}
	if err := h.q.ArchiveBlock(ctx, params.ID.String()); err != nil {
		return nil, err
	}
	b, err := h.q.GetBlock(ctx, params.ID.String())
	if err != nil {
		return nil, err
	}
	return h.loadBlock(ctx, b)
}

func (h *Handler) UnarchiveBlock(ctx context.Context, params api.UnarchiveBlockParams) (api.UnarchiveBlockRes, error) {
	newest, err := h.q.GetNewestArchivedBlock(ctx)
	if errors.Is(err, sql.ErrNoRows) {
		return &api.UnarchiveBlockBadRequest{Message: "no archived blocks"}, nil
	}
	if err != nil {
		return nil, err
	}
	if newest.ID != params.ID.String() {
		return &api.UnarchiveBlockBadRequest{Message: "only the newest archived block can be unarchived"}, nil
	}
	if err := h.q.UnarchiveBlock(ctx, params.ID.String()); err != nil {
		return nil, err
	}
	b, err := h.q.GetBlock(ctx, params.ID.String())
	if err != nil {
		return nil, err
	}
	return h.loadBlock(ctx, b)
}

func (h *Handler) DeleteBlock(ctx context.Context, params api.DeleteBlockParams) (api.DeleteBlockRes, error) {
	latest, err := h.q.GetLatestBlock(ctx)
	if errors.Is(err, sql.ErrNoRows) {
		return &api.DeleteBlockNotFound{}, nil
	}
	if err != nil {
		return nil, err
	}
	if latest.ID != params.ID.String() {
		return &api.DeleteBlockBadRequest{Message: "only the latest block can be deleted"}, nil
	}
	if latest.ArchivedAt != nil {
		return &api.DeleteBlockBadRequest{Message: "cannot delete an archived block"}, nil
	}
	if err := h.q.DeleteBlock(ctx, params.ID.String()); err != nil {
		return nil, err
	}
	return &api.DeleteBlockNoContent{}, nil
}

// loadBlock fetches associated days and shopping items and builds the API response.
func (h *Handler) loadBlock(ctx context.Context, b sqlcgen.Block) (*api.Block, error) {
	dbDays, err := h.q.GetDayEntriesByBlock(ctx, b.ID)
	if err != nil {
		return nil, err
	}
	days := make([]api.DayEntry, len(dbDays))
	for i, d := range dbDays {
		days[i] = dbDayToAPI(d)
	}

	dbItems, err := h.q.GetShoppingItemsByBlock(ctx, b.ID)
	if err != nil {
		return nil, err
	}
	items := make([]api.ShoppingItem, len(dbItems))
	for i, s := range dbItems {
		items[i] = dbShoppingToAPI(s)
	}

	return dbBlockToAPI(b, days, items), nil
}
