package database

import (
	"database/sql"
	_ "embed"

	_ "modernc.org/sqlite"
)

//go:embed schema.sql
var schemaSQL string

// Open opens a SQLite database at dsn and runs schema migrations.
func Open(dsn string) (*sql.DB, error) {
	db, err := sql.Open("sqlite", dsn)
	if err != nil {
		return nil, err
	}
	db.SetMaxOpenConns(1) // SQLite is single-writer

	if err := migrate(db); err != nil {
		_ = db.Close()
		return nil, err
	}
	return db, nil
}

func migrate(db *sql.DB) error {
	if _, err := db.Exec(schemaSQL); err != nil {
		return err
	}
	return applyColumnMigrations(db)
}

// applyColumnMigrations adds new columns to existing tables when they are missing.
// This handles ALTER TABLE for databases created before schema updates.
func applyColumnMigrations(db *sql.DB) error {
	type colMigration struct {
		table  string
		column string
		def    string
	}
	migrations := []colMigration{
		{"shopping_items", "note", "TEXT"},
		{"shopping_items", "sort_order", "INTEGER NOT NULL DEFAULT 0"},
	}
	for _, m := range migrations {
		rows, err := db.Query("PRAGMA table_info(" + m.table + ")")
		if err != nil {
			return err
		}
		found := false
		for rows.Next() {
			var cid, notNull, pk int
			var name, ctype string
			var dflt any
			if err := rows.Scan(&cid, &name, &ctype, &notNull, &dflt, &pk); err != nil {
				_ = rows.Close()
				return err
			}
			if name == m.column {
				found = true
			}
		}
		if err := rows.Close(); err != nil {
			return err
		}
		if !found {
			if _, err := db.Exec("ALTER TABLE " + m.table + " ADD COLUMN " + m.column + " " + m.def); err != nil {
				return err
			}
		}
	}
	return nil
}
