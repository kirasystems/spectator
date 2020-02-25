package main

import (
	"database/sql"
	"encoding/json"
	"fmt"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"strconv"
	"time"

	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"

	_ "github.com/mattn/go-sqlite3"
	"github.com/tus/tusd/pkg/filestore"
	tusd "github.com/tus/tusd/pkg/handler"
)

// Global connection pool
var db *sql.DB

// Annotation struct holds the minimal set of data we need to describe an annotation/highlight
type Annotation struct {
	CharacterStart uint   `json:"characterStart"`
	CharacterEnd   uint   `json:"characterEnd"`
	PageStart      uint   `json:"pageStart"`
	PageEnd        uint   `json:"pageEnd"`
	Top            uint   `json:"top"`
	Left           uint   `json:"left"`
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
	CharacterEnd   uint        `json:"characerEnd"`
	Line           uint        `json:"line"`
	BoundingBox    BoundingBox `json:"boundingBox"`
}

// Tokens represents a collection of DocumentSummary
type Tokens []Token

func checkErr(err error) {
	if err != nil {
		panic(err)
	}
}

func documentsHandler(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query("SELECT document_id, name FROM documents")
	checkErr(err)
	defer rows.Close()

	documents := DocumentSummaries{}

	for rows.Next() {
		var documentSummary DocumentSummary

		err = rows.Scan(&documentSummary.ID, &documentSummary.Name)
		checkErr(err)

		documents = append(documents, documentSummary)
	}

	w.Header().Set("Content-Type", "application/json; charset=UTF-8")
	w.WriteHeader(http.StatusOK)
	err = json.NewEncoder(w).Encode(documents)
	checkErr(err)
}

func documentHandler(w http.ResponseWriter, r *http.Request) {
	params := mux.Vars(r)
	documentID := params["documentId"]

	var document Document

	err := db.QueryRow("SELECT document_id, name FROM documents WHERE document_id = ?", documentID).Scan(&document.ID, &document.Name)
	checkErr(err)

	rows, err := db.Query("SELECT page, height, width FROM document_pages ORDER BY page")
	checkErr(err)
	defer rows.Close()

	pages := []Page{}

	for rows.Next() {
		var pageNumber int
		var page Page

		err = rows.Scan(&pageNumber, &page.OriginalHeight, &page.OriginalWidth)
		checkErr(err)

		page.ImageURL = fmt.Sprintf("/document/%s/page/%d/image", documentID, pageNumber)
		page.TokensURL = fmt.Sprintf("/document/%s/page/%d/tokens", documentID, pageNumber)

		pages = append(pages, page)
	}

	document.Pages = pages

	w.Header().Set("Content-Type", "application/json; charset=UTF-8")
	w.WriteHeader(http.StatusOK)
	err = json.NewEncoder(w).Encode(document)
	checkErr(err)
}

func tokensHandler(w http.ResponseWriter, r *http.Request) {
	params := mux.Vars(r)
	documentID, _ := strconv.Atoi(params["documentId"])
	pageNumber, _ := strconv.Atoi(params["pageNumber"])

	var tokensBlob []byte
	err := db.QueryRow("SELECT tokens FROM document_pages WHERE document_id = ? AND page = ?", documentID, pageNumber).Scan(&tokensBlob)
	checkErr(err)

	w.Header().Set("Content-Type", "application/json; charset=UTF-8")
	w.WriteHeader(http.StatusOK)
	_, err = w.Write(tokensBlob)
	checkErr(err)
}

func imageHandler(w http.ResponseWriter, r *http.Request) {
	params := mux.Vars(r)
	documentID, _ := strconv.Atoi(params["documentId"])
	pageNumber, _ := strconv.Atoi(params["pageNumber"])

	var imageBlob []byte
	err := db.QueryRow("SELECT image FROM document_pages WHERE document_id = ? AND page = ?", documentID, pageNumber).Scan(&imageBlob)
	checkErr(err)

	ioutil.WriteFile("test.png", imageBlob, 0644)

	w.Header().Set("Content-Type", "image/png")
	w.WriteHeader(http.StatusOK)
	_, err = w.Write(imageBlob)
	checkErr(err)
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

	// Create a new FileStore instance which is responsible for
	// storing the uploaded file on disk in the specified directory.
	// This path _must_ exist before tusd will store uploads in it.
	// If you want to save them on a different medium, for example
	// a remote FTP server, you can implement your own storage backend
	// by implementing the tusd.DataStore interface.
	store := filestore.FileStore{
		Path: "./uploads",
	}

	// A storage backend for tusd may consist of multiple different parts which
	// handle upload creation, locking, termination and so on. The composer is a
	// place where all those separated pieces are joined together. In this example
	// we only use the file store but you may plug in multiple.
	composer := tusd.NewStoreComposer()
	store.UseIn(composer)

	// Create a new HTTP handler for the tusd server by providing a configuration.
	// The StoreComposer property must be set to allow the handler to function.
	uploadHandler, err := tusd.NewHandler(tusd.Config{
		BasePath:                "/files/",
		StoreComposer:           composer,
		NotifyCompleteUploads:   true,
		NotifyTerminatedUploads: true,
		NotifyUploadProgress:    true,
		NotifyCreatedUploads:    true,
	})
	if err != nil {
		panic(fmt.Errorf("Unable to create handler: %w", err))
	}

	// Start another goroutine for receiving events from the handler whenever
	// an upload is completed. The event will contains details about the upload
	// itself and the relevant HTTP request.
	go func() {
		for {
			event := <-uploadHandler.CompleteUploads
			log.Printf("Upload %s finished\n", event.Upload.ID)
		}
	}()

	r := mux.NewRouter()
	//r.Use(loggingMiddleware)

	r.HandleFunc("/documents", documentsHandler).Methods(http.MethodGet)
	r.HandleFunc("/document/{documentId}", documentHandler).Methods(http.MethodGet)
	r.HandleFunc("/document/{documentId}/page/{pageNumber}/tokens", tokensHandler).Methods(http.MethodGet)
	r.HandleFunc("/document/{documentId}/page/{pageNumber}/image", imageHandler).Methods(http.MethodGet)

	r.HandleFunc("/index.html", indexHandler).Methods(http.MethodGet)
	r.PathPrefix("/files/").Handler(http.StripPrefix("/files/", uploadHandler)).Methods(http.MethodGet, http.MethodPost, http.MethodHead, http.MethodPatch)
	r.PathPrefix("/static/").Handler(http.StripPrefix("/static/", http.FileServer(http.Dir("./client/build/static")))).Methods(http.MethodGet)
	r.HandleFunc("/", indexHandler).Methods(http.MethodGet)

	//r.NotFoundHandler = r.NewRoute().HandlerFunc(http.NotFound).GetHandler()

	log.Printf("Server will start on port 8000")
	srv := &http.Server{
		Handler:      r,
		Addr:         "127.0.0.1:8000",
		WriteTimeout: 15 * time.Second,
		ReadTimeout:  15 * time.Second,
	}

	log.Fatal(srv.ListenAndServe())
}
