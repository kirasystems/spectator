package main

import (
	"log"
	"net/http"
	"time"

	"github.com/spectator/server/internal"
)

const databasePath = "./spectator.db"
const uploadDir = "./uploads"
const webBuildDir = "./web/build"

func main() {
	
	internal.InitDatabase(databasePath)

	r, err := internal.NewRouter(uploadDir, webBuildDir)

	if err != nil {
		panic(err)
	}

	log.Printf("Server will start on port 8000")
	srv := &http.Server{
		Handler:      r,
		Addr:         "127.0.0.1:8000",
		WriteTimeout: 15 * time.Second,
		ReadTimeout:  15 * time.Second,
	}

	log.Fatal(srv.ListenAndServe())
}
