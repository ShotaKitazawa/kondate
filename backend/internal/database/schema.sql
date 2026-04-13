CREATE TABLE IF NOT EXISTS blocks (
    id          TEXT PRIMARY KEY,
    created_at  DATETIME NOT NULL DEFAULT (datetime('now')),
    archived_at DATETIME
);

CREATE TABLE IF NOT EXISTS day_entries (
    id       TEXT PRIMARY KEY,
    block_id TEXT NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
    date     TEXT NOT NULL,
    note     TEXT,
    lunch    TEXT,
    dinner   TEXT,
    UNIQUE (block_id, date)
);

CREATE TABLE IF NOT EXISTS shopping_items (
    id         TEXT PRIMARY KEY,
    block_id   TEXT NOT NULL REFERENCES blocks(id) ON DELETE CASCADE,
    name       TEXT NOT NULL,
    category   TEXT NOT NULL DEFAULT 'food' CHECK (category IN ('food', 'other')),
    note       TEXT,
    sort_order INTEGER NOT NULL DEFAULT 0,
    checked    INTEGER NOT NULL DEFAULT 0,
    created_at DATETIME NOT NULL DEFAULT (datetime('now'))
);
