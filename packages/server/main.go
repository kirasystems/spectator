package main

import (
	"encoding/json"
	"fmt"
	"log"
	"net/http"
	"os"
	"time"

	"github.com/tus/tusd/pkg/filestore"
	tusd "github.com/tus/tusd/pkg/handler"

	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
)

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

func documentsHandler(w http.ResponseWriter, r *http.Request) {
	documents := DocumentSummaries{
		DocumentSummary{ID: 1, Name: "document.pdf"},
	}

	w.Header().Set("Content-Type", "application/json; charset=UTF-8")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(documents); err != nil {
		panic(err)
	}
}

func documentHandler(w http.ResponseWriter, r *http.Request) {
	params := mux.Vars(r)
	documentID := params["documentId"]
	fmt.Printf("Received document handler with documentID %v \n", documentID)

	document := Document{
		ID:   1,
		Name: "document.pdf",
		Pages: []Page{
			Page{
				OriginalHeight: 1000,
				OriginalWidth:  1000,
				ImageURL:       "/document/1/page/1/image",
				TokensURL:      "/document/1/page/1/tokens",
			},
		},
	}

	w.Header().Set("Content-Type", "application/json; charset=UTF-8")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(document); err != nil {
		panic(err)
	}
}

func tokensHandler(w http.ResponseWriter, r *http.Request) {
	params := mux.Vars(r)
	documentID := params["documentId"]
	pageNumber := params["pageNumber"]
	fmt.Printf("Received tokens handler with document ID %v and page number %v\n", documentID, pageNumber)

	tokens := Tokens{
		Token{CharacterStart: 1, CharacterEnd: 2, Line: 1, BoundingBox: BoundingBox{Top: 1, Left: 1, Bottom: 2, Right: 2}},
		Token{CharacterStart: 2, CharacterEnd: 3, Line: 2, BoundingBox: BoundingBox{Top: 2, Left: 1, Bottom: 3, Right: 2}},
		Token{CharacterStart: 3, CharacterEnd: 4, Line: 3, BoundingBox: BoundingBox{Top: 3, Left: 1, Bottom: 4, Right: 2}},
	}

	w.Header().Set("Content-Type", "application/json; charset=UTF-8")
	w.WriteHeader(http.StatusOK)
	if err := json.NewEncoder(w).Encode(tokens); err != nil {
		panic(err)
	}
}

func imageHandler(w http.ResponseWriter, r *http.Request) {
	// not implemented
}

func indexHandler(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "./client/build/index.html")
}

func loggingMiddleware(next http.Handler) http.Handler {
	return handlers.CombinedLoggingHandler(os.Stdout, next)
}

func main() {
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
		panic(fmt.Errorf("Unable to create handler: %s", err))
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
