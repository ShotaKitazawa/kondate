package handler_test

import (
	"context"
	"testing"
	"time"

	"github.com/ShotaKitazawa/kondate/internal/api"
	"github.com/ShotaKitazawa/kondate/internal/database"
	"github.com/ShotaKitazawa/kondate/internal/handler"
	"github.com/google/uuid"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func newTestHandler(t *testing.T) *handler.Handler {
	t.Helper()
	db, err := database.Open("file::memory:?cache=shared&_foreign_keys=on")
	require.NoError(t, err)
	t.Cleanup(func() { _ = db.Close() })
	return handler.New(db, "", nil)
}

// --- GetCurrentBlock ---

func TestGetCurrentBlock_AutoCreatesWhenEmpty(t *testing.T) {
	h := newTestHandler(t)

	res, err := h.GetCurrentBlock(context.Background())

	require.NoError(t, err)
	block, ok := res.(*api.Block)
	require.True(t, ok, "expected *api.Block, got %T", res)
	assert.NotEqual(t, uuid.Nil, block.ID)
	assert.WithinDuration(t, time.Now(), block.CreatedAt, 5*time.Second)
	assert.False(t, block.ArchivedAt.Set)
	assert.Empty(t, block.Days)
	assert.Empty(t, block.ShoppingItems)
}

func TestGetCurrentBlock_ReturnsExistingBlock(t *testing.T) {
	h := newTestHandler(t)

	res1, err := h.GetCurrentBlock(context.Background())
	require.NoError(t, err)
	block1 := res1.(*api.Block)

	res2, err := h.GetCurrentBlock(context.Background())
	require.NoError(t, err)
	block2 := res2.(*api.Block)

	assert.Equal(t, block1.ID, block2.ID, "should return the same block")
}

// --- CreateBlock ---

func TestCreateBlock_CreatesNewBlock(t *testing.T) {
	h := newTestHandler(t)

	res1, err := h.GetCurrentBlock(context.Background())
	require.NoError(t, err)
	existing := res1.(*api.Block)

	res2, err := h.CreateBlock(context.Background())
	require.NoError(t, err)
	newBlock, ok := res2.(*api.Block)
	require.True(t, ok, "expected *api.Block, got %T", res2)

	assert.NotEqual(t, existing.ID, newBlock.ID)
	assert.Empty(t, newBlock.Days)
	assert.Empty(t, newBlock.ShoppingItems)
	// existing block is NOT archived
	assert.False(t, existing.ArchivedAt.Set)
}

// --- ArchiveBlockById ---

func TestArchiveBlockById_ArchivesOldestNonArchived(t *testing.T) {
	h := newTestHandler(t)

	res1, err := h.GetCurrentBlock(context.Background())
	require.NoError(t, err)
	block := res1.(*api.Block)

	res2, err := h.ArchiveBlockById(context.Background(), api.ArchiveBlockByIdParams{ID: block.ID})
	require.NoError(t, err)
	archived, ok := res2.(*api.Block)
	require.True(t, ok, "expected *api.Block, got %T", res2)

	assert.True(t, archived.ArchivedAt.Set)
	assert.False(t, archived.ArchivedAt.Null)
}

func TestArchiveBlockById_RejectsNonOldest(t *testing.T) {
	h := newTestHandler(t)

	h.GetCurrentBlock(context.Background()) //nolint
	res2, err := h.CreateBlock(context.Background())
	require.NoError(t, err)
	newerBlock := res2.(*api.Block)

	res, err := h.ArchiveBlockById(context.Background(), api.ArchiveBlockByIdParams{ID: newerBlock.ID})
	require.NoError(t, err)
	_, ok := res.(*api.ArchiveBlockByIdBadRequest)
	assert.True(t, ok, "expected bad request, got %T", res)
}

// --- UnarchiveBlock ---

func TestUnarchiveBlock_UnarchivesNewestArchived(t *testing.T) {
	h := newTestHandler(t)

	res1, err := h.GetCurrentBlock(context.Background())
	require.NoError(t, err)
	block := res1.(*api.Block)

	h.ArchiveBlockById(context.Background(), api.ArchiveBlockByIdParams{ID: block.ID}) //nolint

	res2, err := h.UnarchiveBlock(context.Background(), api.UnarchiveBlockParams{ID: block.ID})
	require.NoError(t, err)
	unarchived, ok := res2.(*api.Block)
	require.True(t, ok, "expected *api.Block, got %T", res2)

	assert.False(t, unarchived.ArchivedAt.Set)
}

// --- DeleteBlock ---

func TestDeleteBlock_DeletesLatestBlock(t *testing.T) {
	h := newTestHandler(t)

	res1, err := h.GetCurrentBlock(context.Background())
	require.NoError(t, err)
	block := res1.(*api.Block)

	res2, err := h.DeleteBlock(context.Background(), api.DeleteBlockParams{ID: block.ID})
	require.NoError(t, err)
	_, ok := res2.(*api.DeleteBlockNoContent)
	assert.True(t, ok, "expected no content, got %T", res2)
}

func TestDeleteBlock_RejectsNonLatest(t *testing.T) {
	h := newTestHandler(t)

	res1, err := h.GetCurrentBlock(context.Background())
	require.NoError(t, err)
	oldBlock := res1.(*api.Block)

	h.CreateBlock(context.Background()) //nolint

	res, err := h.DeleteBlock(context.Background(), api.DeleteBlockParams{ID: oldBlock.ID})
	require.NoError(t, err)
	_, ok := res.(*api.DeleteBlockBadRequest)
	assert.True(t, ok, "expected bad request, got %T", res)
}

// --- CreateDay ---

func TestCreateDay_Success(t *testing.T) {
	h := newTestHandler(t)
	res, err := h.GetCurrentBlock(context.Background())
	require.NoError(t, err)
	block := res.(*api.Block)

	date := time.Date(2026, 4, 11, 0, 0, 0, 0, time.UTC)
	dayRes, err := h.CreateDay(context.Background(), &api.CreateDayRequest{
		BlockID: block.ID,
		Date:    date,
	})

	require.NoError(t, err)
	day, ok := dayRes.(*api.DayEntry)
	require.True(t, ok, "expected *api.DayEntry, got %T", dayRes)
	assert.NotEqual(t, uuid.Nil, day.ID)
	assert.Equal(t, block.ID, day.BlockID)
	assert.Equal(t, date, day.Date)
	_, hasNote := day.Note.Get()
	assert.False(t, hasNote)
	_, hasLunch := day.Lunch.Get()
	assert.False(t, hasLunch)
	_, hasDinner := day.Dinner.Get()
	assert.False(t, hasDinner)
}

// --- UpdateDay ---

func TestUpdateDay_Success(t *testing.T) {
	h := newTestHandler(t)
	res, _ := h.GetCurrentBlock(context.Background())
	block := res.(*api.Block)

	dayRes, _ := h.CreateDay(context.Background(), &api.CreateDayRequest{
		BlockID: block.ID,
		Date:    time.Date(2026, 4, 11, 0, 0, 0, 0, time.UTC),
	})
	day := dayRes.(*api.DayEntry)

	note := api.OptNilString{}
	note.SetTo("外食")
	lunch := api.OptNilString{}
	lunch.SetTo("カレー")
	dinner := api.OptNilString{}
	dinner.SetTo("サラダ")

	updRes, err := h.UpdateDay(context.Background(), &api.UpdateDayRequest{
		Note:   note,
		Lunch:  lunch,
		Dinner: dinner,
	}, api.UpdateDayParams{ID: day.ID})

	require.NoError(t, err)
	upd, ok := updRes.(*api.DayEntry)
	require.True(t, ok, "expected *api.DayEntry, got %T", updRes)
	assert.Equal(t, "外食", upd.Note.Value)
	assert.Equal(t, "カレー", upd.Lunch.Value)
	assert.Equal(t, "サラダ", upd.Dinner.Value)
}

func TestUpdateDay_NotFound(t *testing.T) {
	h := newTestHandler(t)

	res, err := h.UpdateDay(context.Background(), &api.UpdateDayRequest{}, api.UpdateDayParams{
		ID: uuid.New(),
	})

	require.NoError(t, err)
	_, ok := res.(*api.UpdateDayNotFound)
	assert.True(t, ok, "expected *api.UpdateDayNotFound, got %T", res)
}

func TestUpdateDay_ClearsFieldWhenNull(t *testing.T) {
	h := newTestHandler(t)
	res, _ := h.GetCurrentBlock(context.Background())
	block := res.(*api.Block)

	dayRes, _ := h.CreateDay(context.Background(), &api.CreateDayRequest{
		BlockID: block.ID,
		Date:    time.Date(2026, 4, 11, 0, 0, 0, 0, time.UTC),
	})
	day := dayRes.(*api.DayEntry)

	note := api.OptNilString{}
	note.SetTo("外食")
	h.UpdateDay(context.Background(), &api.UpdateDayRequest{Note: note}, api.UpdateDayParams{ID: day.ID}) //nolint

	clearNote := api.OptNilString{}
	clearNote.Null = true
	clearNote.Set = true
	updRes, err := h.UpdateDay(context.Background(), &api.UpdateDayRequest{Note: clearNote}, api.UpdateDayParams{ID: day.ID})

	require.NoError(t, err)
	upd := updRes.(*api.DayEntry)
	assert.True(t, upd.Note.Null)
}

// --- DeleteDay ---

func TestDeleteDay_Success(t *testing.T) {
	h := newTestHandler(t)
	res, _ := h.GetCurrentBlock(context.Background())
	block := res.(*api.Block)

	dayRes, _ := h.CreateDay(context.Background(), &api.CreateDayRequest{
		BlockID: block.ID,
		Date:    time.Date(2026, 4, 11, 0, 0, 0, 0, time.UTC),
	})
	day := dayRes.(*api.DayEntry)

	delRes, err := h.DeleteDay(context.Background(), api.DeleteDayParams{ID: day.ID})

	require.NoError(t, err)
	_, ok := delRes.(*api.DeleteDayNoContent)
	assert.True(t, ok, "expected *api.DeleteDayNoContent, got %T", delRes)
}

func TestDeleteDay_NotFound(t *testing.T) {
	h := newTestHandler(t)

	res, err := h.DeleteDay(context.Background(), api.DeleteDayParams{ID: uuid.New()})

	require.NoError(t, err)
	_, ok := res.(*api.DeleteDayNotFound)
	assert.True(t, ok, "expected *api.DeleteDayNotFound, got %T", res)
}

// --- CreateShoppingItem ---

func TestCreateShoppingItem_Success(t *testing.T) {
	h := newTestHandler(t)
	res, _ := h.GetCurrentBlock(context.Background())
	block := res.(*api.Block)

	itemRes, err := h.CreateShoppingItem(context.Background(), &api.CreateShoppingItemRequest{
		BlockID: block.ID,
		Name:    "豚肉",
	})

	require.NoError(t, err)
	item, ok := itemRes.(*api.ShoppingItem)
	require.True(t, ok, "expected *api.ShoppingItem, got %T", itemRes)
	assert.NotEqual(t, uuid.Nil, item.ID)
	assert.Equal(t, "豚肉", item.Name)
	assert.False(t, item.Checked)
}

// --- UpdateShoppingItem ---

func TestUpdateShoppingItem_ChecksItem(t *testing.T) {
	h := newTestHandler(t)
	res, _ := h.GetCurrentBlock(context.Background())
	block := res.(*api.Block)

	itemRes, _ := h.CreateShoppingItem(context.Background(), &api.CreateShoppingItemRequest{
		BlockID: block.ID,
		Name:    "シャンプー",
	})
	item := itemRes.(*api.ShoppingItem)

	checked := true
	updRes, err := h.UpdateShoppingItem(context.Background(), &api.UpdateShoppingItemRequest{
		Checked: api.OptBool{Value: checked, Set: true},
	}, api.UpdateShoppingItemParams{ID: item.ID})

	require.NoError(t, err)
	upd, ok := updRes.(*api.ShoppingItem)
	require.True(t, ok)
	assert.True(t, upd.Checked)
}

func TestUpdateShoppingItem_NotFound(t *testing.T) {
	h := newTestHandler(t)

	res, err := h.UpdateShoppingItem(context.Background(), &api.UpdateShoppingItemRequest{}, api.UpdateShoppingItemParams{
		ID: uuid.New(),
	})

	require.NoError(t, err)
	_, ok := res.(*api.UpdateShoppingItemNotFound)
	assert.True(t, ok, "expected *api.UpdateShoppingItemNotFound, got %T", res)
}

// --- DeleteShoppingItem ---

func TestDeleteShoppingItem_Success(t *testing.T) {
	h := newTestHandler(t)
	res, _ := h.GetCurrentBlock(context.Background())
	block := res.(*api.Block)

	itemRes, _ := h.CreateShoppingItem(context.Background(), &api.CreateShoppingItemRequest{
		BlockID: block.ID,
		Name:    "玉ねぎ",
	})
	item := itemRes.(*api.ShoppingItem)

	delRes, err := h.DeleteShoppingItem(context.Background(), api.DeleteShoppingItemParams{ID: item.ID})

	require.NoError(t, err)
	_, ok := delRes.(*api.DeleteShoppingItemNoContent)
	assert.True(t, ok, "expected *api.DeleteShoppingItemNoContent, got %T", delRes)
}

// --- GetCurrentBlock includes days and shopping items ---

func TestGetCurrentBlock_IncludesDaysAndShoppingItems(t *testing.T) {
	h := newTestHandler(t)
	res, _ := h.GetCurrentBlock(context.Background())
	block := res.(*api.Block)

	h.CreateDay(context.Background(), &api.CreateDayRequest{ //nolint
		BlockID: block.ID,
		Date:    time.Date(2026, 4, 11, 0, 0, 0, 0, time.UTC),
	})
	h.CreateShoppingItem(context.Background(), &api.CreateShoppingItemRequest{ //nolint
		BlockID: block.ID,
		Name:    "じゃがいも",
	})

	res2, err := h.GetCurrentBlock(context.Background())
	require.NoError(t, err)
	block2 := res2.(*api.Block)
	assert.Len(t, block2.Days, 1)
	assert.Len(t, block2.ShoppingItems, 1)
}
