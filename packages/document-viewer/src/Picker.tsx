import React from "react";
import clsx from "clsx";
import { Box } from "@material-ui/core";
import { makeStyles } from "@material-ui/core/styles";
import { Topic } from "./types";

const useStyles = makeStyles({
  root: {
    position: "fixed",
    top: "90px",
    right: "15px",
    width: "200px",
    background: "white",
    border: "solid 1px #E5E9EC",
    boxShadow: "0 1px 3px rgba(14, 15, 15, 0.3)",
  },
  header: {
    background: "#E5E9EC",
    borderBottom: "solid 1px #E5E9EC",
    padding: "12px 6px",
  },
  title: {
    margin: "0",
  },
  items: {
    overflow: "auto",
    maxHeight: "500px",
    padding: 0,
    margin: 0,
  },
  item: {
    cursor: "pointer",
    padding: "6px 12px",
    margin: "3px 0",
    listStyle: "none",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
});

type PickerProps = {
  topics: Topic[];
  onAnnotation: (topic: Topic) => void;
};

const Picker = (props: PickerProps): JSX.Element => {
  const { onAnnotation, topics } = props;

  const classes = useStyles();

  return (
    <Box className={clsx("Picker", classes.root)}>
      <div className={classes.header}>
        <h4 className={classes.title}>Fields</h4>
      </div>
      <ol className={classes.items}>
        {topics.map(topic => (
          <li
            key={topic}
            className={classes.item}
            onClick={(): void => {
              onAnnotation(topic);
            }}
          >
            {topic}
          </li>
        ))}
      </ol>
    </Box>
  );
};

export default Picker;
