import React from "react";

import {
  Box,
  Button,
  Card,
  CardActions,
  CardActionArea,
  CardContent,
  List,
  ListItem,
  Typography,
  makeStyles,
} from "@material-ui/core";

import { Annotation } from "../../../types";
import { ViewerRef } from "document-viewer";

const useStyles = makeStyles((theme) => ({
  title: {
    fontWeight: 600,
    whiteSpace: "normal",
  },
  card: {
    width: "100%",
  },
  cardContent: {
    width: "100%",
  },
  annotation: {
    whiteSpace: "normal",
  },
}));

type AnnotationsProps = {
  annotations: Annotation[];
  onAnnotationDelete: (annotation: Annotation) => void;
  viewerRef: ViewerRef;
};

const Annotations = (props: AnnotationsProps) => {
  const { annotations, onAnnotationDelete, viewerRef } = props;
  const classes = useStyles();

  const handleContentClick = (index: number) => {
    viewerRef?.current?.scrollToAnnotation(index);
  };

  return (
    <Box>
      <Typography variant="h5" className={classes.title} gutterBottom>
        Annotations
      </Typography>
      <List>
        {annotations.map((annotation, index) => (
          <ListItem disableGutters>
            <Card className={classes.card}>
              <CardActionArea onClick={() => handleContentClick(index)}>
                <CardContent className={classes.cardContent}>
                  <Typography variant="subtitle1" className={classes.title}>
                    {annotation.topic}
                  </Typography>
                  <Typography className={classes.annotation} variant="body1">
                    {annotation.text}
                  </Typography>
                </CardContent>
              </CardActionArea>
              <CardActions>
                <Button
                  size="small"
                  color="primary"
                  onClick={() => onAnnotationDelete(annotation)}
                >
                  Delete
                </Button>
              </CardActions>
            </Card>
          </ListItem>
        ))}
      </List>
    </Box>
  );
};

export default Annotations;
