import React from "react";
import {
  HashRouter as Router,
  Switch,
  Route
} from "react-router-dom";

import Document from "./containers/document/index";
import Documents from "./containers/documents/index";

import "./App.css";

function App() {

  const [documents, setDocuments] = React.useState<any>([]);

  React.useEffect(() => {
    async function fetchDocuments() {
      let response = await fetch("/documents");
      let docs = await response.json();

      setDocuments(docs);
    }

    fetchDocuments();
  }, []);

  return (
    <Router>
      <main className="App">
        <Switch>
          <Route path="/document/:id">
            <Document documents={documents} />
          </Route>
          <Route path="/">
            <Documents documents={documents} />
          </Route>
        </Switch>
      </main>
    </Router>
  );
}

export default App;
