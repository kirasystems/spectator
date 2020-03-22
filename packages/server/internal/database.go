package internal

import (
	"database/sql"
	"log"

	_ "github.com/mattn/go-sqlite3"
)

// Global connection pool
var db *sql.DB

func InitDatabase(filePath string) error {
	log.Printf("Connecting to %v", filePath)

	var err error
	db, err = sql.Open("sqlite3", filePath)

	return err
}
