import React from "react";
import {
  HashRouter as Router,
  NavLink,
  Redirect,
  Route,
  Switch
} from "react-router-dom";

import Document from "./containers/document/index";
import Documents from "./containers/documents/index";
import Topics from "./containers/topics/index";

import "./App.css";

type AppProps = {
  socket: WebSocket; 
};

function App(props: AppProps) {
  const { socket } = props;

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

    return () => { socket.removeEventListener("message", onMessage) };
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

    return () => { socket.removeEventListener("message", onMessage) };
  }, [socket]);

  return (
    <Router>
      <Switch>
        <Route path="/document/:id">
          <Document 
            documents={documents}
            socket={socket}
            topics={topics} />
        </Route>
        <main className="App">
          <nav className="Nav">
            <img className="Logo" src="logo.svg" alt="logo" height="100"/>
            <h1 className="Title">Spectator</h1>
            <ul className="Nav__Links">
              <li>
                <NavLink to="/documents" className="Nav__Link" activeClassName="Nav__Link--active">Documents</NavLink> 
              </li>
              <li>
                <NavLink to="/topics" className="Nav__Link" activeClassName="Nav__Link--active">Topics</NavLink>
              </li>
            </ul>
          </nav>
          <Route path="/topics">
            <Topics topics={topics} />
          </Route>
          <Route path="/documents">
            <Documents documents={documents} />
          </Route>
          <Route path="/">
            <Redirect to="/documents" />
          </Route>
        </main>
      </Switch>
    </Router>
  );
}

export default App;
