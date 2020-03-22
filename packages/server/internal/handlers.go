package internal

import (
	"encoding/json"
	"fmt"
	"net/http"
	"strconv"

	"github.com/gorilla/mux"
)

func GetDocumentsHandler(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query("SELECT document_id, name, COALESCE(pages, 0) AS pages, processed FROM documents")
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	defer rows.Close()

	documents := DocumentSummaries{}

	for rows.Next() {
		var documentSummary DocumentSummary

		err = rows.Scan(&documentSummary.ID, &documentSummary.Name, &documentSummary.Pages, &documentSummary.Processed)
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

func GetDocumentHandler(w http.ResponseWriter, r *http.Request) {
	params := mux.Vars(r)
	documentID, _ := strconv.Atoi(params["documentId"])

	var document Document

	err := db.QueryRow("SELECT document_id, name FROM documents WHERE document_id = ?", documentID).Scan(&document.ID, &document.Name)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	rows, err := db.Query("SELECT page, height, width FROM document_pages WHERE document_id = ? ORDER BY page", documentID)
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

		page.ImageURL = fmt.Sprintf("/document/%d/page/%d/image", documentID, pageNumber)
		page.TokensURL = fmt.Sprintf("/document/%d/page/%d/tokens", documentID, pageNumber)

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

func DeleteDocumentHandler(w http.ResponseWriter, r *http.Request) {
	params := mux.Vars(r)
	documentID, _ := strconv.Atoi(params["documentId"])

	_, err := db.Exec("DELETE FROM documents WHERE document_id = ?", documentID)

	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.WriteHeader(http.StatusOK)

	Broadcast(`{"type":"documentsChanged"}`)
}

func PostAnnotationsHandler(w http.ResponseWriter, r *http.Request) {
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
	_, err = db.Exec(`INSERT INTO annotations (document_id, character_start, character_end, page_start, page_end, text, top_px, left_px, topic_id)
								    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		documentID, annotation.CharacterStart, annotation.CharacterEnd, annotation.PageStart, annotation.PageEnd,
		text, annotation.Top, annotation.Left, annotation.TopicID)

	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.WriteHeader(http.StatusOK)

	Broadcast(fmt.Sprintf(`{"type":"annotationsChanged", "documentId":%d}`, documentID))
}

func GetAnnotationsHandler(w http.ResponseWriter, r *http.Request) {
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

func DeleteAnnotationHandler(w http.ResponseWriter, r *http.Request) {
	params := mux.Vars(r)
	documentID, _ := strconv.Atoi(params["documentId"])
	annotationID, _ := strconv.Atoi(params["annotationId"])

	_, err := db.Exec("DELETE FROM annotations WHERE document_id = ? AND annotation_id = ?", documentID, annotationID)

	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.WriteHeader(http.StatusOK)

	Broadcast(fmt.Sprintf(`{"type":"annotationsChanged", "documentId":%d}`, documentID))
}

func GetTokensHandler(w http.ResponseWriter, r *http.Request) {
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

func GetImageHandler(w http.ResponseWriter, r *http.Request) {
	params := mux.Vars(r)
	documentID, _ := strconv.Atoi(params["documentId"])
	pageNumber, _ := strconv.Atoi(params["pageNumber"])

	var imageBlob []byte
	err := db.QueryRow("SELECT image FROM document_pages WHERE document_id = ? AND page = ?", documentID, pageNumber).Scan(&imageBlob)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.Header().Set("Content-Type", "image/png")
	w.WriteHeader(http.StatusOK)
	_, err = w.Write(imageBlob)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
}

func GetTopicsHandler(w http.ResponseWriter, r *http.Request) {
	rows, err := db.Query("SELECT topic_id, topic FROM topics")
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
	defer rows.Close()

	topics := Topics{}

	for rows.Next() {
		var topic Topic

		err = rows.Scan(&topic.TopicID, &topic.Topic)
		if err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		topics = append(topics, topic)
	}

	w.Header().Set("Content-Type", "application/json; charset=UTF-8")
	w.WriteHeader(http.StatusOK)
	err = json.NewEncoder(w).Encode(topics)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}
}

func PostTopicsHandler(w http.ResponseWriter, r *http.Request) {
	var topic Topic
	err := json.NewDecoder(r.Body).Decode(&topic)
	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	_, err = db.Exec("INSERT INTO topics (topic) VALUES (?)", topic.Topic)

	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.WriteHeader(http.StatusOK)

	Broadcast(`{"type":"topicsChanged"}`)
}

func DeleteTopicHandler(w http.ResponseWriter, r *http.Request) {
	params := mux.Vars(r)
	topicID, _ := strconv.Atoi(params["topicId"])

	_, err := db.Exec("DELETE FROM topics WHERE topic_id = ?", topicID)

	if err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	w.WriteHeader(http.StatusOK)

	Broadcast(`{"type":"topicsChanged"}`)
}

func IndexHandler(w http.ResponseWriter, r *http.Request) {
	http.ServeFile(w, r, "./client/build/index.html")
}
