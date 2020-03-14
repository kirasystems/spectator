import React from "react";

import { useHistory, useParams } from "react-router-dom";

import DocumentViewer from "document-viewer";
import "document-viewer/dist/style.css";

import { Document as DocumentType, Topic } from "../../types";

type DocumentProps = {
  documents: DocumentType[];
  socket: WebSocket;
  topics: Topic[]
};

const Document = (props: DocumentProps) => {
  const { documents, socket, topics } = props;

  const [document, setDocument] = React.useState<any>(null);
  const [annotations, setAnnotations] = React.useState<any>([]);

  const history = useHistory();
  const { id } = useParams();

  React.useEffect(() => {
    async function fetchDocument() {
      let response = await fetch("/document/" + id);
      let doc = await response.json();
      setDocument(doc);
    }

    fetchDocument();
  }, [id]);

  
  React.useEffect(() => {
    async function fetchAnnotations() {
      let response = await fetch("/document/" + id + "/annotations");
      let anns = await response.json();
      setAnnotations(anns);
    }

    function onMessage(message: MessageEvent) {
      let data = JSON.parse(message.data);
      let documentId = id && parseInt(id);

      if (data.type === "annotationsChanged" && data.documentId === documentId) {
        fetchAnnotations();
      }
    }

    fetchAnnotations();
    socket.addEventListener("message", onMessage);

    return () => { socket.removeEventListener("message", onMessage) };
  }, [socket, id]);

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

  const handleAnnotationCreate = React.useCallback((annotation: any) => {
    annotation.topicId = topics.find((topic) => topic.topic === annotation.topic)?.id
    
    fetch("/document/" + document.id + "/annotations", {
        method: "post",
        body: JSON.stringify(annotation)
      }).then((response: any) => {
        if (!response.ok) {
          throw new Error(response.statusText)
        }

        console.log("Annotation created:", response);
      }).catch((error: any) => {
        console.error("Annotation create:", error);
      });
  }, [document, topics]);

  const handleAnnotationDelete = React.useCallback((annotation: any) => {
    fetch("/document/" + document.id + "/annotation/" + annotation.annotationId, {
        method: "delete",
      }).then((response: any) => {
        if (!response.ok) {
          throw new Error(response.statusText)
        }

        console.log("Annotation deleted:", response);
      }).catch((error: any) => {
        console.error("Annotation delete:", error);
      });
  }, [document]);

  return (
    <div className="Viewer">
      {document && 
        <DocumentViewer 
          annotations={annotations}
          name={document?.name}
          onAnnotationCreate={handleAnnotationCreate}
          onAnnotationDelete={handleAnnotationDelete}
          onClose={() => history.push("/")}
          onNextDocument={() => nextDocumentId && history.push("/document/" + nextDocumentId)}
          onPreviousDocument={() => previousDocumentId && history.push("/document/" + previousDocumentId)}
          pages={document?.pages}
          topics={topics.map((topic) => topic.topic)}
        />
      }
    </div>
  );
};

export default Document;