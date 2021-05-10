package internal

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
	Text           string `json:"text"`
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
	ID        uint   `json:"id"`
	Name      string `json:"name"`
	Pages     uint   `json:"pages"`
	Processed bool   `json:"processed"`
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

// Tokens represents a collection of Token
type Tokens []Token

// Topic struct represents a type of annotation
type Topic struct {
	TopicID uint   `json:"id"`
	Topic   string `json:"topic"`
}

// Topics represents a collection of Topic
type Topics []Topic
