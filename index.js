'use strict';

const nodeStatic = require('node-static');
const http = require('http');
const { Server } = require('socket.io');

const fileServer = new (nodeStatic.Server)();
const app = http.createServer((req, res) => {
  fileServer.serve(req, res);
}).listen(8000);

const io = new Server(app);
io.on('connection', (socket) => {
  socket.on('offer', (sdp) => {
    socket.broadcast.emit('offer', sdp);
  });
  socket.on('answer', (sdp) => {
    socket.broadcast.emit('answer', sdp);
  });
  socket.on('ice', (ice) => {
    socket.broadcast.emit('ice', ice);
  });
});
