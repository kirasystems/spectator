package internal

import (
	"net/http"
	"os"

	"github.com/gorilla/handlers"
	"github.com/gorilla/mux"
)

func loggingMiddleware(next http.Handler) http.Handler {
	return handlers.CombinedLoggingHandler(os.Stdout, next)
}

func NewRouter(uploadDir, webBuildDir string) (http.Handler, error) {
	r := mux.NewRouter()

	uploadURLPrefix := "/files/"
	uploadHandler, err := NewUploadHandler(uploadDir, uploadURLPrefix)

	if err != nil {
		return nil, err
	}

	r.Use(loggingMiddleware) // comment if you don't want all the logging

	r.HandleFunc("/documents", GetDocumentsHandler).Methods(http.MethodGet)
	r.HandleFunc("/document/{documentId}", GetDocumentHandler).Methods(http.MethodGet)
	r.HandleFunc("/document/{documentId}", DeleteDocumentHandler).Methods(http.MethodDelete)
	r.HandleFunc("/document/{documentId}/annotations", GetAnnotationsHandler).Methods(http.MethodGet)
	r.HandleFunc("/document/{documentId}/annotations", PostAnnotationsHandler).Methods(http.MethodPost)
	r.HandleFunc("/document/{documentId}/annotation/{annotationId}", DeleteAnnotationHandler).Methods(http.MethodDelete)
	r.HandleFunc("/document/{documentId}/page/{pageNumber}/tokens", GetTokensHandler).Methods(http.MethodGet)
	r.HandleFunc("/document/{documentId}/page/{pageNumber}/image", GetImageHandler).Methods(http.MethodGet)

	r.HandleFunc("/topics", GetTopicsHandler).Methods(http.MethodGet)
	r.HandleFunc("/topics", PostTopicsHandler).Methods(http.MethodPost)
	r.HandleFunc("/topic/{topicId}", DeleteTopicHandler).Methods(http.MethodDelete)

	r.HandleFunc("/ws", WebSocketHandler).Methods(http.MethodGet)

	r.HandleFunc("/index.html", IndexHandler).Methods(http.MethodGet)
	r.PathPrefix(uploadURLPrefix).Handler(http.StripPrefix(uploadURLPrefix, uploadHandler))
	r.PathPrefix("/").Handler(http.FileServer(http.Dir(webBuildDir))).Methods(http.MethodGet)
	r.HandleFunc("/", IndexHandler).Methods(http.MethodGet)

	r.NotFoundHandler = r.NewRoute().HandlerFunc(http.NotFound).GetHandler()

	return r, nil
}
