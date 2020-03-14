import React from "react";
import Uppy from "@uppy/core";
import Tus from "@uppy/tus";
import { DashboardModal } from "@uppy/react"

import { Link } from "react-router-dom";

import { Document as DocumentType } from "../../types";

import '@uppy/core/dist/style.css';
import '@uppy/dashboard/dist/style.css';

type DocumentsProps = {
  documents: DocumentType[];
};

const Documents = (props: DocumentsProps) => {
  const { documents } = props;

  const [uppy, setUppy] = React.useState<any>(null);

  const [dashboardVisible, setDashboardVisible] = React.useState(false);

  React.useEffect(() => {
    let newUppy = Uppy({
      restrictions: {
        allowedFileTypes: [".pdf"]
      }
    }).use(Tus, {
      endpoint: '/files/',
      resume: true,
      autoRetry: true,
      retryDelays: [0, 1000, 3000, 5000]
    });

    setUppy(newUppy);

    return () => { newUppy.close() }
  }, []);


  const handleDashboardOpen = React.useCallback(() => {
    setDashboardVisible(true);
  }, []);

  const handleDashboardClose = React.useCallback(() => {
    setDashboardVisible(false);
  }, []);

  const handleDocumentDelete = React.useCallback((documentId: number) => {
    fetch("/document/" + documentId, {
      method: "delete",
    }).then((response: any) => {
      if (!response.ok) {
        throw new Error(response.statusText)
      }

      console.log("Document deleted:", response);
    }).catch((error: any) => {
      console.error("Document delete:", error);
    });
  }, []);

  return (
    <div className="Page">
      <div className="Page__Header">
        <h1 className="Page__Title">Documents</h1>
        <button id="uppy-select-files" className="Import-Button" onClick={handleDashboardOpen}>Import</button>
      </div>
      
      {uppy && <DashboardModal 
                uppy={uppy}
                closeModalOnClickOutside={true}
                open={dashboardVisible}
                onRequestClose={handleDashboardClose}/>}

      {documents.length === 0 && 
        <p>No documents...</p>}

      {<ol className="Documents">
        {documents.map((document: DocumentType) => (
          <li key={document.id}>
            <Link to={`/document/${document.id}`} className={`Document${document.processed ? "" : " Document--Disabled"}`}>
              <div className="Document__Name">
                <h3>{document.name}</h3>
                {document.processed ?
                  <p>{document.pages + " pages"}</p> :
                  <p>Processing...</p>}
              </div>
              <button
                disabled={!document.processed}
                className="Document__Delete"
                onClick={(event: React.MouseEvent) => {
                  event.preventDefault();
                  event.stopPropagation();

                  if (window.confirm('Are you sure you want to delete this document?')) {
                    handleDocumentDelete(document.id);
                  }
                }}>
                Delete
              </button>
            </Link>
          </li>
        ))}
      </ol>}
    </div>
  );
};

export default Documents;