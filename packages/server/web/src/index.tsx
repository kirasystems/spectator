import React from 'react';
import ReactDOM from 'react-dom';
import App from './App';
import * as serviceWorker from './serviceWorker';

var socket = new WebSocket("ws://127.0.0.1:8000/ws")

ReactDOM.render(<App socket={socket}/>, document.getElementById('root'));

serviceWorker.unregister();
