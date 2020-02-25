import React from "react";

import { useHistory, useParams } from "react-router-dom";

import DocumentViewer from "document-viewer";
import "document-viewer/dist/style.css";

import { Document as DocumentType } from "../../types";

type DocumentProps = {
  documents: DocumentType[];
};

const Document = (props: DocumentProps) => {
  const { documents } = props;

  const [document, setDocument] = React.useState<any>(null);

  const history = useHistory();
  const { id } = useParams();

  React.useEffect(() => {
    async function fetchDocument() {
      let response = await fetch("/document/" + id);
      let doc = await response.json();
      setDocument(doc);
    }

    //fetchDocument();
    setDocument({name: "document.pdf",
                 pages: [
                  {
                    originalHeight: 1000,
                    originalWidth: 2000,
                    imageURL: "", 
                    tokensURL: ""
                  }
                 ]});
  }, [id]);

  const nextDocumentId = React.useMemo(() => {
    if (!id) return null;

    let documentId = parseInt(id);
    let index = documents.findIndex((document: DocumentType) => document.id === documentId);
    
    let nextDocumentIndex = index + 1;

    return nextDocumentIndex >= 0 && nextDocumentIndex < documents.length ? documents[nextDocumentIndex].id : null;
  }, [id, documents]);

  const previousDocumentId = React.useMemo(() => {
    if (!id) return null;

    let documentId = parseInt(id);
    let index = documents.findIndex((document: DocumentType) => document.id === documentId);
    
    let previousDocumentIndex = index - 1;

    return previousDocumentIndex >= 0 && previousDocumentIndex < documents.length ? documents[previousDocumentIndex].id : null;
  }, [id, documents]);

  return (
    <div className="Document">
      {document && 
        <DocumentViewer 
          annotations={[]}
          name={document?.name}
          onAnnotationCreate={() => console.log("Create")}
          onAnnotationDelete={() => console.log("Delete")}
          onClose={() => console.log("Close")}
          onNextDocument={() => nextDocumentId && history.push("/document/" + nextDocumentId)}
          onPreviousDocument={() => previousDocumentId && history.push("/document/" + previousDocumentId)}
          pages={document?.pages}
          topics={["a", "b", "c", "d"]}
        />
      }
    </div>
  );
};

export default Document;