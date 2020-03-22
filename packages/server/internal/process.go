package internal

import (
	"database/sql"
	"encoding/csv"
	"encoding/json"
	"fmt"
	"image"
	_ "image/png"
	"io"
	"io/ioutil"
	"log"
	"os"
	"os/exec"
	"path"
	"path/filepath"
	"strconv"
	"strings"
)

func parseTokens(tokenFile string, b *strings.Builder) ([]Token, error) {
	file, err := os.Open(tokenFile)
	if err != nil {
		return nil, fmt.Errorf("Unable to read page file: %w", err)
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
			return nil, fmt.Errorf("Unable to read record from tsv: %w", err)
		}

		left, err := strconv.Atoi(record[6])
		if err != nil {
			return nil, fmt.Errorf("Unable to read record from tsv: %w", err)
		}

		top, err := strconv.Atoi(record[7])
		if err != nil {
			return nil, fmt.Errorf("Unable to read record from tsv: %w", err)
		}

		width, err := strconv.Atoi(record[8])
		if err != nil {
			return nil, fmt.Errorf("Unable to read record from tsv: %w", err)
		}

		height, err := strconv.Atoi(record[9])
		if err != nil {
			return nil, fmt.Errorf("Unable to read record from tsv: %w", err)
		}

		conf, err := strconv.Atoi(record[10])
		if err != nil {
			return nil, fmt.Errorf("Unable to read record from tsv: %w", err)
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
		charCount += uint(len(word)) + 1 // for space
	}

	return pageTokens, nil
}

func parseImage(imgFile string) (int, int, []byte, error) {

	img, err := os.Open(imgFile)
	if err != nil {
		return -1, -1, nil, fmt.Errorf("Unable to open image: %w", err)
	}

	imgConfig, _, err := image.DecodeConfig(img)
	if err != nil {
		return -1, -1, nil, fmt.Errorf("Unable to read image config: %w", err)
	}

	pageWidth, pageHeight := imgConfig.Width, imgConfig.Height
	img.Seek(0, 0)
	imgBuf, err := ioutil.ReadAll(img)
	if err != nil {
		return -1, -1, nil, fmt.Errorf("Unable to read image bytes: %w", err)
	}

	return pageWidth, pageHeight, imgBuf, nil
}

func parsePage(pageFile string, b *strings.Builder, docID, pageID uint, tx *sql.Tx) error {
	pageTokens, err := parseTokens(pageFile+".tsv", b)
	if err != nil {
		return fmt.Errorf("Unable to create tokens: %w", err)
	}

	binaryPageTokens, err := json.Marshal(pageTokens)
	if err != nil {
		return fmt.Errorf("Unable to marshal tokens: %w", err)
	}

	pageWidth, pageHeight, imgBuf, err := parseImage(pageFile + ".png")
	if err != nil {
		return fmt.Errorf("Unable to parse page image: %w", err)
	}

	statement, err := tx.Prepare("INSERT INTO document_pages (document_id, page, height, width, image, image_format, tokens) VALUES (?, ?, ?, ?, ?, ?, ?);")
	if err != nil {
		return fmt.Errorf("Unable to prepare statement: %w", err)
	}

	log.Printf("Inserting page %d in the database\n", pageID)

	_, err = statement.Exec(docID, pageID, pageHeight, pageWidth, imgBuf, "png", binaryPageTokens)
	if err != nil {
		return fmt.Errorf("Unable to insert page to database: %w", err)
	}

	return nil
}

func insertDocumentData(documentID uint, pagesPath string, pageCount uint) error {
	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("Cannot make transaction: %w", err)
	}

	log.Printf("Adding %d pages to document id %d\n", pageCount, documentID)
	_, err = tx.Exec("UPDATE documents SET pages = ? WHERE document_id = ?", pageCount, documentID)
	if err != nil {
		if rollbackErr := tx.Rollback(); rollbackErr != nil {
			return fmt.Errorf("Unable to rollback: %w", rollbackErr)
		}
		return fmt.Errorf("Unable to update doc to db: %w", err)
	}

	// Process pages
	var b strings.Builder
	for i := uint(0); i < pageCount; i++ {
		pageFile := fmt.Sprintf("%s/page-%d", pagesPath, i)
		err = parsePage(pageFile, &b, documentID, i+1, tx)
		if err != nil {
			if rollbackErr := tx.Rollback(); rollbackErr != nil {
				return fmt.Errorf("Unable to rollback: %w", rollbackErr)
			}
			return fmt.Errorf("Unable to parse page: %w", err)
		}
	}

	// Finalize document data
	_, err = tx.Exec("UPDATE documents SET text = ?, processed = TRUE WHERE document_id = ?", b.String(), documentID)
	if err != nil {
		if rollbackErr := tx.Rollback(); rollbackErr != nil {
			return fmt.Errorf("Unable to rollback: %w", rollbackErr)
		}
		return fmt.Errorf("Unable to update db document: %w", err)
	}

	tx.Commit()

	return nil
}

func ProcessDocument(uploadPath, fileID, fileName string) error {
	filePath := uploadPath + "/" + fileID
	tmpPath := filePath + "-tmp"

	log.Printf("Adding document %s in the database", fileName)

	res, err := db.Exec("INSERT INTO documents (name) VALUES (?)", fileName)
	if err != nil {
		return fmt.Errorf("Unable to insert document: %v", err)
	}

	Broadcast(`{"type":"documentsChanged"}`)

	documentID, err := res.LastInsertId()
	if err != nil {
		return fmt.Errorf("Unable to get the ID of the inserted document: %v", err)
	}

	log.Printf("Creating temporary folder %s\n", tmpPath)

	err = os.MkdirAll(tmpPath, 0755)

	if err != nil {
		return fmt.Errorf("Unable to create temporary folder: %v", err)
	}

	defer os.RemoveAll(tmpPath)

	log.Println("Converting the document to PNGs")
	cmd := exec.Command(
		"magick",
		"-density", "600",
		filePath,
		"-set", "colorspace", "RGB",
		"-alpha", "off",
		"-resize", "2481x3508",
		tmpPath+"/page-%d.png",
	)

	stdout, err := cmd.Output()

	if err != nil {
		return fmt.Errorf("Error magick: %s %v", string(stdout), err)
	}

	files, err := ioutil.ReadDir(tmpPath)
	if err != nil {
		return err
	}

	pageCount := uint(0)
	for _, file := range files {
		pageName := file.Name()
		pagePath := fmt.Sprintf("%s/%s", tmpPath, file.Name())

		if filepath.Ext(pageName) == "png" {
			continue
		}

		log.Printf("OCRing %s\n", pagePath)

		cmd := exec.Command(
			"tesseract",
			pagePath,
			fmt.Sprintf("%s/%s", tmpPath, strings.TrimSuffix(pageName, path.Ext(pageName))),
			"-l", "eng",
			"tsv",
		)

		stdout, err := cmd.Output()

		if err != nil {
			return fmt.Errorf("Error tesseract: %s %v", string(stdout), err)
		}

		pageCount++
	}

	err = insertDocumentData(uint(documentID), tmpPath, pageCount)
	if err != nil {
		return fmt.Errorf("Error insert document: %v", err)
	}

	Broadcast(`{"type":"documentsChanged"}`)

	return nil
}
