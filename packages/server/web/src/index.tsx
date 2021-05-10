import React from "react";
import ReactDOM from "react-dom";
import {
  CssBaseline,
  StylesProvider,
  ThemeProvider,
  createMuiTheme,
} from "@material-ui/core";
import App from "./App";
import classGenerator from "./classGenerator";
import * as serviceWorker from "./serviceWorker";

var socket = new WebSocket("ws://127.0.0.1:8000/ws");

var theme = createMuiTheme({
  overrides: {
    MuiCssBaseline: {
      "@global": {
        html: {
          height: "100%",
          width: "100%",
        },
        body: {
          height: "100%",
          width: "100%",
        },
        "#root": {
          height: "100%",
          width: "100%",
        },
      },
    },
  },
});

ReactDOM.render(
  <React.StrictMode>
    <StylesProvider generateClassName={classGenerator}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App socket={socket} />
      </ThemeProvider>
    </StylesProvider>
  </React.StrictMode>,
  document.getElementById("root")
);

serviceWorker.unregister();
