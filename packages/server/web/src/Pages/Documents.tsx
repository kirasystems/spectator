import React from "react";

import {
  Box,
  Button,
  IconButton,
  List,
  ListItem,
  Typography,
  makeStyles,
} from "@material-ui/core";

import DeleteIcon from "@material-ui/icons/Delete";

import Uppy from "@uppy/core";
import Tus from "@uppy/tus";
import { DashboardModal } from "@uppy/react";

import { Link } from "react-router-dom";

import { Document as DocumentType } from "../types";

import "@uppy/core/dist/style.css";
import "@uppy/dashboard/dist/style.css";

const useStyles = makeStyles((theme) => ({
  listItem: {
    display: "flex",
    alignItems: "center",
    paddingLeft: 0,
    paddingRight: 0,
  },
}));

type DocumentsProps = {
  documents: DocumentType[];
};

const Documents = (props: DocumentsProps) => {
  const { documents } = props;
  const classes = useStyles();

  const [uppy, setUppy] = React.useState<any>(null);

  const [dashboardVisible, setDashboardVisible] = React.useState(false);

  React.useEffect(() => {
    let newUppy = Uppy({
      restrictions: {
        allowedFileTypes: [".pdf"],
      },
    }).use(Tus, {
      endpoint: "/files/",
      resume: true,
      autoRetry: true,
      retryDelays: [0, 1000, 3000, 5000],
    });

    setUppy(newUppy);

    return () => {
      newUppy.close();
    };
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
    })
      .then((response: any) => {
        if (!response.ok) {
          throw new Error(response.statusText);
        }

        console.log("Document deleted:", response);
      })
      .catch((error: any) => {
        console.error("Document delete:", error);
      });
  }, []);

  return (
    <Box marginLeft={3} marginRight={3} marginTop={5} width="100%">
      <Box display="flex" marginBottom={2}>
        <Box marginRight={2}>
          <Typography variant="h5">Documents</Typography>
        </Box>
        <Button
          id="uppy-select-files"
          className="Import-Button"
          onClick={handleDashboardOpen}
          variant="contained"
        >
          Import
        </Button>
      </Box>

      {uppy && (
        <DashboardModal
          uppy={uppy}
          closeModalOnClickOutside={true}
          open={dashboardVisible}
          onRequestClose={handleDashboardClose}
        />
      )}

      {documents.length === 0 && (
        <Typography variant="body1">No documents...</Typography>
      )}

      {
        <List>
          {documents.map((document: DocumentType) => (
            <ListItem
              key={document.id}
              className={classes.listItem}
              component={Link}
              to={`/document/${document.id}`}
            >
              <Box marginRight={3}>
                <Typography variant="body1">{document.name}</Typography>
              </Box>
              <Box marginRight={3}>
                {document.processed ? (
                  <Typography variant="body2">
                    {document.pages + " pages"}
                  </Typography>
                ) : (
                  <Typography variant="body2">Processing...</Typography>
                )}
              </Box>
              <IconButton
                disabled={!document.processed}
                onClick={(event: React.MouseEvent) => {
                  event.preventDefault();
                  event.stopPropagation();
                  if (
                    window.confirm(
                      "Are you sure you want to delete this document?"
                    )
                  ) {
                    handleDocumentDelete(document.id);
                  }
                }}
              >
                <DeleteIcon />
              </IconButton>
            </ListItem>
          ))}
        </List>
      }
    </Box>
  );
};

export default Documents;
