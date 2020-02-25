package main

import (
	"encoding/csv"
	"encoding/json"
	"fmt"
	"image"
	_ "image/png"
	"io"
	"io/ioutil"
	"log"
	"os"
	"strconv"
	"strings"

	"database/sql"

	_ "github.com/mattn/go-sqlite3"
)

// BoundingBox struct represents where the token is on the page with (top/left/right/bottom)
type BoundingBox struct {
	Top    uint `json:"top"`
	Left   uint `json:"left"`
	Right  uint `json:"right"`
	Bottom uint `json:"bottom"`
}

// Token struct represents a string of contiguous characters between two spaces
type Token struct {
	//Text           string   Not needed, for frontend
	CharacterStart uint        `json:"characterStart"`
	CharacterEnd   uint        `json:"characerEnd"`
	Line           uint        `json:"line"`
	BoundingBox    BoundingBox `json:"boundingBox"`
}

/*
CREATE TABLE document_pages (
    document_page_id INTEGER PRIMARY KEY AUTOINCREMENT,
    document_id              REFERENCES documents (document_id) ON DELETE CASCADE
                             NOT NULL,
    page             INTEGER NOT NULL,
    height           INTEGER NOT NULL,
    width            INTEGER NOT NULL,
    image            BLOB    NOT NULL,
    image_format     STRING  NOT NULL,
    tokens           BLOB    NOT NULL
);

CREATE TABLE documents (
    document_id INTEGER PRIMARY KEY AUTOINCREMENT,
    name        TEXT,
    pages       INTEGER,
    text        TEXT
);

*/

func parseTokens(tokenFile string, b *strings.Builder) ([]Token, error) {
	file, err := os.Open(tokenFile)
	if err != nil {
		return nil, fmt.Errorf("unable to read page file: %w", err)
	}
	r := csv.NewReader(file)
	r.Comma = '\t'
	record, _ := r.Read() // remove header

	inLine := true
	lineCount := uint(0)
	pageTokens := []Token{}
	charCount := uint(b.Len())
	for {
		record, err = r.Read()
		if err == io.EOF {
			break
		}
		if err != nil {
			return nil, fmt.Errorf("unable to read record from tsv: %w", err)
		}
		left, err := strconv.Atoi(record[6])
		if err != nil {
			return nil, fmt.Errorf("unable to read record from tsv: %w", err)
		}
		top, err := strconv.Atoi(record[7])
		if err != nil {
			return nil, fmt.Errorf("unable to read record from tsv: %w", err)
		}
		width, err := strconv.Atoi(record[8])
		if err != nil {
			return nil, fmt.Errorf("unable to read record from tsv: %w", err)
		}
		height, err := strconv.Atoi(record[9])
		if err != nil {
			return nil, fmt.Errorf("unable to read record from tsv: %w", err)
		}
		conf, err := strconv.Atoi(record[10])
		if err != nil {
			return nil, fmt.Errorf("unable to read record from tsv: %w", err)
		}
		if conf == -1 {
			if inLine {
				lineCount++
				inLine = false
			}
			continue
		}
		word := record[11]
		inLine = true
		bb := BoundingBox{Top: uint(top), Left: uint(left), Right: uint(left + width), Bottom: uint(top + height)}
		tok := Token{BoundingBox: bb, Line: lineCount, CharacterStart: charCount, CharacterEnd: charCount + uint(len(word))}
		pageTokens = append(pageTokens, tok)
		b.WriteString(word)
		b.WriteRune(' ')
		charCount += uint(len(word))
	}
	return pageTokens, nil
}

func parseImage(imgFile string) (int, int, []byte, error) {
	img, err := os.Open(imgFile)
	if err != nil {
		return -1, -1, nil, fmt.Errorf("unable to open image: %w", err)
	}
	imgConfig, _, err := image.DecodeConfig(img)
	if err != nil {
		return -1, -1, nil, fmt.Errorf("unable to read image config: %w", err)
	}
	pageWidth, pageHeight := imgConfig.Width, imgConfig.Height
  img.Seek(0,0)
	imgBuf, err := ioutil.ReadAll(img)
	if err != nil {
		return -1, -1, nil, fmt.Errorf("unable to read image bytes: %w", err)
	}
	return pageWidth, pageHeight, imgBuf, nil
}

func parsePage(pageFile string, b *strings.Builder, docID, pageID uint, tx *sql.Tx) error {
	pageTokens, err := parseTokens(pageFile+".tsv", b)
	if err != nil {
		return fmt.Errorf("unable to create tokens: %w", err)
	}
	binaryPageTokens, err := json.Marshal(pageTokens)
	if err != nil {
		return fmt.Errorf("unable to marshal tokens: %w", err)
	}
	pageWidth, pageHeight, imgBuf, err := parseImage(pageFile + ".png")
	if err != nil {
		return fmt.Errorf("unable to parse page image: %w", err)
	}

	statement, err := tx.Prepare("INSERT INTO document_pages (document_id, page, height, width, image, image_format, tokens) VALUES (?, ?, ?, ?, ?, ?, ?);")
	if err != nil {
		return fmt.Errorf("unable to prepare statement: %w", err)
	}
	_, err = statement.Exec(docID, pageID, pageHeight, pageWidth, imgBuf, "png", binaryPageTokens)
	if err != nil {
		return fmt.Errorf("unable to insert page to database: %w", err)
	}
	return nil
}

func buildDoc(path, docname, dbLoc string, pageCount uint) error {
	db, err := sql.Open("sqlite3", dbLoc)
	if err != nil {
		return fmt.Errorf("unable to connect to database: %w", err)
	}
	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("cannot make transactions: %w", err)
	}

	// Create document in DB
	statement, _ := db.Prepare("INSERT INTO documents (name, pages) VALUES (?, ?);")
	if err != nil {
		if rollbackErr := tx.Rollback(); rollbackErr != nil {
			return fmt.Errorf("unable to rollback: %w", rollbackErr)
		}
		return fmt.Errorf("unable to prepare insert doc to db: %w", err)
	}
	result, err := statement.Exec(docname, pageCount)
	if err != nil {
		if rollbackErr := tx.Rollback(); rollbackErr != nil {
			return fmt.Errorf("unable to rollback: %w", rollbackErr)
		}
		return fmt.Errorf("unable to insert doc to db: %w", err)
	}
	docID, _ := result.LastInsertId()

	// Process pages
	var b strings.Builder
	for i := uint(0); i < pageCount; i++ {
		pageFile := fmt.Sprintf("%s/%s/page-%d", path, docname, i)
		err = parsePage(pageFile, &b, uint(docID), i+1, tx)
		if err != nil {
			if rollbackErr := tx.Rollback(); rollbackErr != nil {
				return fmt.Errorf("unable to rollback: %w", rollbackErr)
			}
			return fmt.Errorf("unable to parse page: %w", err)
		}
	}

	// Finalize document data
	statement, err = tx.Prepare("UPDATE documents SET text = ? WHERE document_id = ?;")
	if err != nil {
		if rollbackErr := tx.Rollback(); rollbackErr != nil {
			return fmt.Errorf("unable to rollback: %w", rollbackErr)
		}
		return fmt.Errorf("unable to prepare update to document: %w", err)
	}
	_, err = statement.Exec(b.String(), docID)
	if err != nil {
		if rollbackErr := tx.Rollback(); rollbackErr != nil {
			return fmt.Errorf("unable to rollback: %w", rollbackErr)
		}
		return fmt.Errorf("unable to update db document: %w", err)
	}
	err = tx.Commit()
	if err != nil {
		return fmt.Errorf("unable to commit transaction: %w", err)
	}
	return nil
}

func main() {
	//var b strings.Builder
	dir := os.Args[1]
	filename := os.Args[2]
	pg := os.Args[3]
	pageCount, _ := strconv.Atoi(pg)
	dbLoc := os.Args[4]
	if err := buildDoc(dir, filename, dbLoc, uint(pageCount)); err != nil {
		log.Fatalf("unable to build spectator doc: %v", err)
	}
}
