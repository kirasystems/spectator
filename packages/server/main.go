package main

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
	"net/http"
	"os"
	"os/exec"
	"path"
	"path/filepath"
	"strconv"
	"strings"
	"time"

	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"

	_ "github.com/mattn/go-sqlite3"
	"github.com/tus/tusd/pkg/filestore"
	tusd "github.com/tus/tusd/pkg/handler"
)

const uploadPath = "./uploads"

// Global connection pool
var db *sql.DB

// Annotation struct holds the minimal set of data we need to describe an annotation/highlight
type Annotation struct {
	AnnotationID   uint   `json:"annotationId"`
	CharacterStart uint   `json:"characterStart"`
	CharacterEnd   uint   `json:"characterEnd"`
	PageStart      uint   `json:"pageStart"`
	PageEnd        uint   `json:"pageEnd"`
	Top            uint   `json:"top"`
	Left           uint   `json:"left"`
	TopicID        uint   `json:"topicId"`
	Topic          string `json:"topic"`
}

// Page struct holds the minimal set of data we need to describe a page in a document
type Page struct {
	//PageNumber     uint			`json:"pageNumber"`
	OriginalHeight uint   `json:"originalHeight"`
	OriginalWidth  uint   `json:"originalWidth"`
	ImageURL       string `json:"imageURL"`
	TokensURL      string `json:"tokensURL"`
}

// Document struct holds the minimal set of data we need to describe a document
type Document struct {
	ID    uint   `json:"id"`
	Name  string `json:"name"`
	Pages []Page `json:"pages"`
}

// DocumentSummary will be used for the /documents route
type DocumentSummary struct {
	ID   uint   `json:"id"`
	Name string `json:"name"`
}

// DocumentSummaries represents a collection of DocumentSummary
type DocumentSummaries []DocumentSummary

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
	CharacterEnd   uint        `json:"characterEnd"`
	Line           uint        `json:"line"`
	BoundingBox    BoundingBox `json:"boundingBox"`
}

// Tokens represents a collection of DocumentSummary
type Tokens []Token

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

func insertDocument(pagesPath, documentName string, pageCount uint) error {
	tx, err := db.Begin()
	if err != nil {
		return fmt.Errorf("Cannot make transaction: %w", err)
	}

	// Create document in DB
	statement, _ := db.Prepare("INSERT INTO documents (name, pages) VALUES (?, ?);")
	if err != nil {
		if rollbackErr := tx.Rollback(); rollbackErr != nil {
			return fmt.Errorf("Unable to rollback: %w", rollbackErr)
		}
		return fmt.Errorf("Unable to prepare insert doc to db: %w", err)
	}

	log.Println("Inserting document in the database")
	result, err := statement.Exec(documentName, pageCount)
	if err != nil {
		if rollbackErr := tx.Rollback(); rollbackErr != nil {
			return fmt.Errorf("Unable to rollback: %w", rollbackErr)
		}
		return fmt.Errorf("Unable to insert doc to db: %w", err)
	}

	docID, _ := result.LastInsertId()

	// Process pages
	var b strings.Builder
	for i := uint(0); i < pageCount; i++ {
		pageFile := fmt.Sprintf("%s/page-%d", pagesPath, i)
		err = parsePage(pageFile, &b, uint(docID), i+1, tx)
		if err != nil {
			if rollbackErr := tx.Rollback(); rollbackErr != nil {
				return fmt.Errorf("unable to rollback: %w", rollbackErr)
			}
			return fmt.Errorf("Unable to parse page: %w", err)
		}
	}

	// Finalize document data
	statement, err = tx.Prepare("UPDATE documents SET text = ? WHERE document_id = ?;")
	if err != nil {
		if rollbackErr := tx.Rollback(); rollbackErr != nil {
			return fmt.Errorf("Unable to rollback: %w", rollbackErr)
		}
		return fmt.Errorf("Unable to prepare update to document: %w", err)
	}

	_, err = statement.Exec(b.String(), docID)
	if err != nil {
		if rollbackErr := tx.Rollback(); rollbackErr != nil {
			return fmt.Errorf("Unable to rollback: %w", rollbackErr)
		}
		return fmt.Errorf("Unable to update db document: %w", err)
	}

	err = tx.Commit()
	if err != nil {
		return fmt.Errorf("Unable to commit transaction: %w", err)
	}

	return nil
}

func processDocument(fileID, fileName string) error {

	filePath := uploadPath + "/" + fileID
	tmpPath := filePath + "-tmp"

	log.Printf("Creating temporary folder %s\n", tmpPath)

	err := os.MkdirAll(tmpPath, 0755)

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

	err = insertDocument(tmpPath, fileName, pageCount)
	if err != nil {
		return fmt.Errorf("Error insert document: %v", err)
	}

	return nil
}

func documentsHandler(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query("SELECT document_id, name FROM documents")
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	defer rows.Close()

	documents := DocumentSummaries{}

	for rows.Next() {
		var documentSummary DocumentSummary

		err = rows.Scan(&documentSummary.ID, &documentSummary.Name)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		documents = append(documents, documentSummary)
	}

	w.Header().Set("Content-Type", "application/json; charset=UTF-8")
	w.WriteHeader(http.StatusOK)
	err = json.NewEncoder(w).Encode(documents)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
}

func documentHandler(w http.ResponseWriter, r *http.Request) {
	params := mux.Vars(r)
	documentID := params["documentId"]

	var document Document

	err := db.QueryRow("SELECT document_id, name FROM documents WHERE document_id = ?", documentID).Scan(&document.ID, &document.Name)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	rows, err := db.Query("SELECT page, height, width FROM document_pages ORDER BY page")
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	defer rows.Close()

	pages := []Page{}

	for rows.Next() {
		var pageNumber int
		var page Page

		err = rows.Scan(&pageNumber, &page.OriginalHeight, &page.OriginalWidth)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		page.ImageURL = fmt.Sprintf("/document/%s/page/%d/image", documentID, pageNumber)
		page.TokensURL = fmt.Sprintf("/document/%s/page/%d/tokens", documentID, pageNumber)

		pages = append(pages, page)
	}

	document.Pages = pages

	w.Header().Set("Content-Type", "application/json; charset=UTF-8")
	w.WriteHeader(http.StatusOK)
	err = json.NewEncoder(w).Encode(document)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
}

func annotationHandler(w http.ResponseWriter, r *http.Request) {
	params := mux.Vars(r)
	documentID, _ := strconv.Atoi(params["documentId"])

	var annotation Annotation
	err := json.NewDecoder(r.Body).Decode(&annotation)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	var text string
	err = db.QueryRow("SELECT substr(text, ?, ?) FROM documents WHERE document_id = ?",
		annotation.CharacterStart, annotation.CharacterEnd-annotation.CharacterStart+1, documentID).Scan(&text)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	log.Printf("Annotation %d %d", annotation.CharacterStart, annotation.CharacterEnd)

	_, err = db.Exec(`INSERT INTO annotations (document_id, character_start, character_end, page_start, page_end, text, top_px, left_px, topic_id)
								    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		documentID, annotation.CharacterStart, annotation.CharacterEnd, annotation.PageStart, annotation.PageEnd,
		text, annotation.Top, annotation.Left, annotation.TopicID)

	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.WriteHeader(http.StatusOK)
}

func annotationsHandler(w http.ResponseWriter, r *http.Request) {
	params := mux.Vars(r)
	documentID, _ := strconv.Atoi(params["documentId"])

	rows, err := db.Query(`SELECT a.annotation_id, a.character_start, a.character_end, a.page_start, a.page_end, a.top_px, a.left_px, t.topic_id, t.topic
									       FROM annotations a
									       INNER JOIN topics t ON t.topic_id = a.topic_id
									       WHERE a.document_id = ?
									       ORDER BY a.character_start, a.character_end`, documentID)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	defer rows.Close()

	annotations := []Annotation{}

	for rows.Next() {
		var annotation Annotation

		err = rows.Scan(&annotation.AnnotationID, &annotation.CharacterStart, &annotation.CharacterEnd, &annotation.PageStart,
			&annotation.PageEnd, &annotation.Top, &annotation.Left, &annotation.TopicID, &annotation.Topic)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		annotations = append(annotations, annotation)
	}

	w.Header().Set("Content-Type", "application/json; charset=UTF-8")
	w.WriteHeader(http.StatusOK)
	err = json.NewEncoder(w).Encode(annotations)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
}

func tokensHandler(w http.ResponseWriter, r *http.Request) {
	params := mux.Vars(r)
	documentID, _ := strconv.Atoi(params["documentId"])
	pageNumber, _ := strconv.Atoi(params["pageNumber"])

	var tokensBlob []byte
	err := db.QueryRow("SELECT tokens FROM document_pages WHERE document_id = ? AND page = ?", documentID, pageNumber).Scan(&tokensBlob)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "application/json; charset=UTF-8")
	w.WriteHeader(http.StatusOK)
	_, err = w.Write(tokensBlob)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
}

func imageHandler(w http.ResponseWriter, r *http.Request) {
	params := mux.Vars(r)
	documentID, _ := strconv.Atoi(params["documentId"])
	pageNumber, _ := strconv.Atoi(params["pageNumber"])

	var imageBlob []byte
	err := db.QueryRow("SELECT image FROM document_pages WHERE document_id = ? AND page = ?", documentID, pageNumber).Scan(&imageBlob)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	ioutil.WriteFile("test.png", imageBlob, 0644)

	w.Header().Set("Content-Type", "image/png")
	w.WriteHeader(http.StatusOK)
	_, err = w.Write(imageBlob)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
}

func indexHandler(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "./client/build/index.html")
}

func loggingMiddleware(next http.Handler) http.Handler {
	return handlers.CombinedLoggingHandler(os.Stdout, next)
}

func main() {
	dbLocation := "./spectator.db"
	log.Printf("Connecting to %v", dbLocation)

	var err error
	db, err = sql.Open("sqlite3", dbLocation)
	if err != nil {
		panic(fmt.Errorf("Unable to connect to database: %v", err))
	}

	store := filestore.FileStore{
		Path: uploadPath,
	}

	composer := tusd.NewStoreComposer()
	store.UseIn(composer)

	uploadHandler, err := tusd.NewHandler(tusd.Config{
		BasePath:              "/files/",
		StoreComposer:         composer,
		NotifyCompleteUploads: true,
		// NotifyTerminatedUploads: true,
		// NotifyUploadProgress:    true,
		// NotifyCreatedUploads:    true,
	})
	if err != nil {
		panic(fmt.Errorf("Unable to create handler: %w", err))
	}

	go func() {
		for {
			event := <-uploadHandler.CompleteUploads
			log.Printf("File received: %v\n", event.Upload.ID)
			log.Printf("Filename received: %v\n", event.Upload.MetaData["filename"])

			log.Println("Start processing")

			err := processDocument(event.Upload.ID, event.Upload.MetaData["filename"])
			if err != nil {
				log.Fatalf("Process document error: %v", err)
				continue
			}

			log.Println("Done processing")

			os.Remove(fmt.Sprintf("%s/%s", uploadPath, event.Upload.ID))
			os.Remove(fmt.Sprintf("%s/%s.info", uploadPath, event.Upload.ID))
		}
	}()

	r := mux.NewRouter()
	r.Use(loggingMiddleware)

	r.HandleFunc("/documents", documentsHandler).Methods(http.MethodGet)
	r.HandleFunc("/document/{documentId}", documentHandler).Methods(http.MethodGet)
	r.HandleFunc("/document/{documentId}/annotations", annotationsHandler).Methods(http.MethodGet)
	r.HandleFunc("/document/{documentId}/annotations", annotationHandler).Methods(http.MethodPost)
	r.HandleFunc("/document/{documentId}/page/{pageNumber}/tokens", tokensHandler).Methods(http.MethodGet)
	r.HandleFunc("/document/{documentId}/page/{pageNumber}/image", imageHandler).Methods(http.MethodGet)

	r.HandleFunc("/index.html", indexHandler).Methods(http.MethodGet)
	r.PathPrefix("/files/").Handler(http.StripPrefix("/files/", uploadHandler))
	r.PathPrefix("/static/").Handler(http.StripPrefix("/static/", http.FileServer(http.Dir("./client/build/static")))).Methods(http.MethodGet)
	r.HandleFunc("/", indexHandler).Methods(http.MethodGet)

	r.NotFoundHandler = r.NewRoute().HandlerFunc(http.NotFound).GetHandler()

	log.Printf("Server will start on port 8000")
	srv := &http.Server{
		Handler:      r,
		Addr:         "127.0.0.1:8000",
		WriteTimeout: 15 * time.Second,
		ReadTimeout:  15 * time.Second,
	}

	log.Fatal(srv.ListenAndServe())
}
