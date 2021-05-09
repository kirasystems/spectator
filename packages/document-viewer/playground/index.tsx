import "react-app-polyfill/ie11";
import React from "react";
import ReactDOM from "react-dom";
import DocumentViewer from "../src/index";

import { Server } from "miragejs";

import imagePage1 from "./test-documents/simple/images/1.png";
import imagePage2 from "./test-documents/simple/images/2.png";
import imagePage3 from "./test-documents/simple/images/3.png";
import standoffPage1 from "./test-documents/simple/standoffs/1.json";
import standoffPage2 from "./test-documents/simple/standoffs/2.json";
import standoffPage3 from "./test-documents/simple/standoffs/3.json";

const topics = ["topic-1", "topic-2"];

const annotations = [
  {
    characterStart: 0,
    characterEnd: 19,
    pageStart: 1,
    pageEnd: 2,
    top: 304,
    left: 301,
    topic: topics[0],
  },
  {
    characterStart: 19,
    characterEnd: 30,
    pageStart: 3,
    pageEnd: 3,
    top: 305,
    left: 338,
    topic: topics[1],
  },
];

const documentData = {
  name: "simple-document.pdf",
  pages: [
    {
      originalHeight: standoffPage1.height,
      originalWidth: standoffPage1.width,
      imageURL: imagePage1,
      tokensURL: "api/document/1/page/1/tokens",
    },
    {
      originalHeight: standoffPage2.height,
      originalWidth: standoffPage2.width,
      imageURL: imagePage2,
      tokensURL: "api/document/1/page/2/tokens",
    },
    {
      originalHeight: standoffPage3.height,
      originalWidth: standoffPage3.width,
      imageURL: imagePage3,
      tokensURL: "api/document/1/page/3/tokens",
    },
  ],
};

new Server({
  routes() {
    this.namespace = "/api";

    this.get("/document/1/page/1/tokens", () => standoffPage1.tokens);
    this.get("/document/1/page/2/tokens", () => standoffPage2.tokens);
    this.get("/document/1/page/3/tokens", () => standoffPage3.tokens);
  },
});

const App: React.FC = () => {
  return (
    <div className="App" style={{ height: "100%", width: "100%", margin: "0" }}>
      <DocumentViewer
        annotations={annotations}
        name={documentData.name}
        lazyLoadingWindow={5}
        onAnnotationCreate={annotation => console.log(annotation)}
        onAnnotationDelete={annotation => console.log(annotation)}
        onClose={() => console.log("Close")}
        onNextDocument={() => console.log("Next")}
        onPreviousDocument={() => console.log("Previous")}
        pages={documentData.pages}
        topics={topics}
      />
    </div>
  );
};

ReactDOM.render(<App />, document.getElementById("root"));
