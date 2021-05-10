import React from "react";
import {
  HashRouter as Router,
  NavLink,
  Redirect,
  Route,
  Switch,
} from "react-router-dom";

import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemIcon,
  ListItemText,
  Typography,
  makeStyles,
} from "@material-ui/core";

import DescriptionIcon from "@material-ui/icons/Description";
import AssignmentIcon from "@material-ui/icons/Assignment";

import Document from "./Pages/Document/Document";
import Documents from "./Pages/Documents";
import Topics from "./Pages/Topics";

const useStyles = makeStyles((theme) => ({
  nav: {
    marginTop: theme.spacing(1),
  },
  drawer: {
    width: "200px",
  },
}));

type AppProps = {
  socket: WebSocket;
};

function App(props: AppProps) {
  const { socket } = props;

  const classes = useStyles();

  const [documents, setDocuments] = React.useState<any>([]);
  const [topics, setTopics] = React.useState<any>([]);

  React.useEffect(() => {
    async function fetchTopics() {
      let response = await fetch("/topics");
      let topics = await response.json();

      setTopics(topics);
    }

    function onMessage(message: MessageEvent) {
      let data = JSON.parse(message.data);
      if (data.type === "topicsChanged") {
        fetchTopics();
      }
    }

    fetchTopics();
    socket.addEventListener("message", onMessage);

    return () => {
      socket.removeEventListener("message", onMessage);
    };
  }, [socket]);

  React.useEffect(() => {
    async function fetchDocuments() {
      let response = await fetch("/documents");
      let docs = await response.json();

      setDocuments(docs);
    }

    function onMessage(message: MessageEvent) {
      let data = JSON.parse(message.data);
      if (data.type === "documentsChanged") {
        fetchDocuments();
      }
    }

    fetchDocuments();
    socket.addEventListener("message", onMessage);

    return () => {
      socket.removeEventListener("message", onMessage);
    };
  }, [socket]);

  return (
    <Router>
      <Switch>
        <Route path="/document/:id">
          <Document documents={documents} socket={socket} topics={topics} />
        </Route>
        <Box component="main" display="flex">
          <Drawer className={classes.drawer} variant="permanent" anchor="left">
            <img className="Logo" src="logo.svg" alt="logo" height="100" />
            <Typography variant="subtitle1" align="center">
              Spectator
            </Typography>
            <List component="nav" className={classes.nav}>
              <ListItem
                button
                component={NavLink}
                to="/documents"
                activeStyle={{ backgroundColor: "rgba(0, 0, 0, 0.04)" }}
              >
                <ListItemIcon>
                  <DescriptionIcon />
                </ListItemIcon>
                <ListItemText
                  primaryTypographyProps={{ variant: "body1" }}
                  primary={"Documents"}
                />
              </ListItem>
              <ListItem
                button
                component={NavLink}
                to="/topics"
                activeStyle={{ backgroundColor: "rgba(0, 0, 0, 0.04)" }}
              >
                <ListItemIcon>
                  <AssignmentIcon />
                </ListItemIcon>
                <ListItemText
                  primaryTypographyProps={{ variant: "body1" }}
                  primary={"Topics"}
                />
              </ListItem>
            </List>
          </Drawer>
          <Route path="/topics">
            <Topics topics={topics} />
          </Route>
          <Route path="/documents">
            <Documents documents={documents} />
          </Route>
          <Route path="/">
            <Redirect to="/documents" />
          </Route>
        </Box>
      </Switch>
    </Router>
  );
}

export default App;
