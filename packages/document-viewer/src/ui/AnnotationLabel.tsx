import React from "react";

import { IconButton, Paper } from "@material-ui/core";
import { Close } from "@material-ui/icons";
import { makeStyles } from "@material-ui/core/styles";

import { topicToColor } from "./annotationColors";

const useStyles = makeStyles(theme => ({
  root: {
    position: "relative",
    display: "flex",
    alignItems: "center",
    background: theme.palette.background.paper,
    padding: theme.spacing(0, 0.5, 0, 1),
    width: "180px",
  },
  dot: {
    flex: "0 0 auto",
    width: "8px",
    height: "8px",
    borderRadius: "100%",
  },
  text: {
    cursor: "pointer",
    flex: "1 1 auto",
    fontSize: "12px",
    padding: theme.spacing(0.125, 0.5, 0, 1),
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  action: {
    flex: "0 0 auto",
    padding: 0,
  },
}));

type AnnotationLabelProps = {
  onDelete?: (event: React.MouseEvent) => void;
  topic: string;
};

const AnnotationLabel = (
  props: AnnotationLabelProps & React.HTMLAttributes<HTMLDivElement>
): JSX.Element => {
  const { onClick, onDelete, topic, ...rest } = props;
  const classes = useStyles();

  return (
    <Paper square className={classes.root} {...rest}>
      <span className={classes.dot} style={{ background: topicToColor(topic) }} />
      <span className={classes.text} onClick={onClick}>
        {topic}
      </span>
      {onDelete && (
        <IconButton className={classes.action} onClick={onDelete}>
          <Close fontSize="small" />
        </IconButton>
      )}
    </Paper>
  );
};

export default AnnotationLabel;
