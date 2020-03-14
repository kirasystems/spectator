# Web Application Demo

The Web Application Demo is a combination of a Go server and a React application.

## Getting started

You will need the following dependencies:
 - [Go](https://golang.org/doc/install)
 - [Node/npm](https://nodejs.org/en/download/package-manager/)
 - [Yarn](https://yarnpkg.com/getting-started/install)
 - [Tesseract](https://github.com/tesseract-ocr/tesseract#installing-tesseract)
 - [ImageMagick](https://imagemagick.org/script/download.php)
 - [GhostScript](https://www.ghostscript.com/doc/9.23/Install.htm)
 - [SQLite](https://www.sqlite.org/download.html)

Once you have all these dependencies, you can run `make build` and then `make run`.
`make build` will create links with the document-viewer, react and react dom. To remove these links, `make unlink` in the `client` folder.
It will start a server listening to port `8080`.