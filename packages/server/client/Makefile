link:
	echo "Linking the document-viewer and react"
	cd ../../document-viewer/node_modules/react; yarn link
	cd ../../document-viewer/node_modules/react; yarn link
	yarn link "document-viewer"; yarn link "react"; yarn link "react-dom"

unlink:
	echo "Unlink dependencies from document-viewer"
	yarn unlink "react-dom"
	yarn unlink "react"
	yarn unlink "document-viewer"