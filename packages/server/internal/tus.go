package internal

import (
	"fmt"
	"log"
	"os"

	"github.com/tus/tusd/pkg/filestore"
	tusd "github.com/tus/tusd/pkg/handler"
)

func NewUploadHandler(uploadDir, urlPrefix string) (*tusd.Handler, error) {
	store := filestore.FileStore{
		Path: uploadDir,
	}

	composer := tusd.NewStoreComposer()
	store.UseIn(composer)

	uploadHandler, err := tusd.NewHandler(tusd.Config{
		BasePath:              urlPrefix,
		StoreComposer:         composer,
		NotifyCompleteUploads: true,
	})

	if err != nil {
		return nil, fmt.Errorf("Unable to create the upload handler: %w", err)
	}

	go func() {
		for {
			event := <-uploadHandler.CompleteUploads

			log.Printf("File received: %v\n", event.Upload.ID)
			log.Printf("Filename received: %v\n", event.Upload.MetaData["filename"])

			log.Println("Start processing")

			err := ProcessDocument(uploadDir, event.Upload.ID, event.Upload.MetaData["filename"])

			if err != nil {
				log.Fatalf("Process document error: %v", err)
				continue
			}

			log.Println("Done processing")

			os.Remove(fmt.Sprintf("%s/%s", uploadDir, event.Upload.ID))
			os.Remove(fmt.Sprintf("%s/%s.info", uploadDir, event.Upload.ID))
		}
	}()

	return uploadHandler, nil
}
