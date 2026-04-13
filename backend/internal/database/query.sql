-- name: ListBlocks :many
SELECT id, created_at, archived_at FROM blocks ORDER BY rowid ASC;

-- name: GetBlock :one
SELECT id, created_at, archived_at FROM blocks WHERE id = ?;

-- name: GetCurrentBlock :one
SELECT id, created_at, archived_at FROM blocks WHERE archived_at IS NULL ORDER BY rowid DESC LIMIT 1;

-- name: CreateBlock :one
INSERT INTO blocks (id) VALUES (?) RETURNING id, created_at, archived_at;

-- name: GetOldestNonArchivedBlock :one
SELECT id, created_at, archived_at FROM blocks WHERE archived_at IS NULL ORDER BY created_at ASC LIMIT 1;

-- name: GetNewestArchivedBlock :one
SELECT id, created_at, archived_at FROM blocks WHERE archived_at IS NOT NULL ORDER BY rowid DESC LIMIT 1;

-- name: GetLatestBlock :one
SELECT id, created_at, archived_at FROM blocks ORDER BY rowid DESC LIMIT 1;

-- name: ArchiveBlock :exec
UPDATE blocks SET archived_at = datetime('now') WHERE id = ?;

-- name: UnarchiveBlock :exec
UPDATE blocks SET archived_at = NULL WHERE id = ?;

-- name: DeleteBlock :exec
DELETE FROM blocks WHERE id = ?;

-- name: GetDayEntriesByBlock :many
SELECT id, block_id, date, note, lunch, dinner FROM day_entries WHERE block_id = ? ORDER BY date ASC;

-- name: GetDayEntry :one
SELECT id, block_id, date, note, lunch, dinner FROM day_entries WHERE id = ?;

-- name: CreateDayEntry :one
INSERT INTO day_entries (id, block_id, date) VALUES (?, ?, ?) RETURNING id, block_id, date, note, lunch, dinner;

-- name: UpdateDayEntry :one
UPDATE day_entries SET note = ?, lunch = ?, dinner = ? WHERE id = ? RETURNING id, block_id, date, note, lunch, dinner;

-- name: DeleteDayEntry :exec
DELETE FROM day_entries WHERE id = ?;

-- name: GetShoppingItemsByBlock :many
SELECT id, block_id, name, category, note, sort_order, checked, created_at FROM shopping_items WHERE block_id = ? ORDER BY sort_order ASC, created_at ASC;

-- name: GetShoppingItem :one
SELECT id, block_id, name, category, note, sort_order, checked, created_at FROM shopping_items WHERE id = ?;

-- name: GetMaxShoppingItemOrder :one
SELECT COALESCE(MAX(sort_order), -1) FROM shopping_items WHERE block_id = ?;

-- name: CreateShoppingItem :one
INSERT INTO shopping_items (id, block_id, name, category, sort_order) VALUES (?, ?, ?, 'food', ?) RETURNING id, block_id, name, category, note, sort_order, checked, created_at;

-- name: UpdateShoppingItem :one
UPDATE shopping_items SET name = ?, checked = ?, note = ? WHERE id = ? RETURNING id, block_id, name, category, note, sort_order, checked, created_at;

-- name: UpdateShoppingItemOrder :exec
UPDATE shopping_items SET sort_order = ? WHERE id = ?;

-- name: DeleteShoppingItem :exec
DELETE FROM shopping_items WHERE id = ?;
