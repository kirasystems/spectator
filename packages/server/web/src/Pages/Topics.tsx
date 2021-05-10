import React from "react";

import {
  Box,
  Button,
  IconButton,
  List,
  ListItem,
  TextField,
  Typography,
  makeStyles,
} from "@material-ui/core";

import DeleteIcon from "@material-ui/icons/Delete";

import { Topic } from "../types";

const useStyles = makeStyles((theme) => ({
  input: {
    marginRight: theme.spacing(2),
  },
  listItem: {
    display: "flex",
    alignItems: "center",
    paddingLeft: 0,
    paddingRight: 0,
  },
}));

type TopicsProps = {
  topics: Topic[];
};

const Topics = (props: TopicsProps) => {
  const { topics } = props;

  const classes = useStyles();

  const [topic, setTopic] = React.useState<string>("");

  const handleTopicCreate = React.useCallback(() => {
    if (topic === "") return;

    fetch("/topics", {
      method: "post",
      body: JSON.stringify({ topic: topic }),
    })
      .then((response: any) => {
        if (!response.ok) {
          throw new Error(response.statusText);
        }

        console.log("Topic created:", response);
        setTopic("");
      })
      .catch((error: any) => {
        console.error("Topic create:", error);
      });
  }, [topic]);

  const handleTopicDelete = React.useCallback((topicId: number) => {
    fetch("/topic/" + topicId, {
      method: "delete",
    })
      .then((response: any) => {
        if (!response.ok) {
          throw new Error(response.statusText);
        }

        console.log("Topic deleted:", response);
      })
      .catch((error: any) => {
        console.error("Topic delete:", error);
      });
  }, []);

  const handleTopicChange = React.useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      setTopic(event.target.value);
    },
    [setTopic]
  );

  return (
    <Box marginTop={5} marginLeft={3} marginRight={3} width="100%">
      <Box marginBottom={2}>
        <Typography variant="h5">Topics</Typography>
      </Box>

      {topics.length === 0 && (
        <Typography variant="body1">No topics...</Typography>
      )}

      <List>
        {topics.map((topic: Topic) => (
          <ListItem key={topic.id} className={classes.listItem}>
            <Box marginRight={2}>
              <Typography>{topic.topic}</Typography>
            </Box>
            <IconButton
              onClick={() => {
                if (
                  window.confirm(
                    "Are you sure you want to delete this topic? It will delete all the annotations of this topic in all documents."
                  )
                ) {
                  handleTopicDelete(topic.id);
                }
              }}
            >
              <DeleteIcon />
            </IconButton>
          </ListItem>
        ))}
      </List>
      <Box display="flex" alignItems="center">
        <TextField
          className={classes.input}
          onChange={handleTopicChange}
          value={topic}
        />
        <Button variant="contained" onClick={handleTopicCreate}>
          Add
        </Button>
      </Box>
    </Box>
  );
};

export default Topics;
