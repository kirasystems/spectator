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

  return (
    <div className="Home">
      <button onClick={handleDashboardOpen}>Import</button>

      {uppy && <DashboardModal 
                uppy={uppy}
                closeModalOnClickOutside={true}
                open={dashboardVisible}
                onRequestClose={handleDashboardClose} />}

      {<ol className="Document-List">
        {documents.map((document: DocumentType) => (
          <li
            key={document.id}
            className="Document-Item">
            <Link to={`/document/${document.id}`}>{document.name}</Link>
          </li>
        ))}
      </ol>}
    </div>
  );
};

export default Documents;