'use strict';

const nodeStatic = require('node-static');
const http = require('http');
const { Server } = require('socket.io');

const fileServer = new (nodeStatic.Server)();
const app = http.createServer((req, res) => {
  fileServer.serve(req, res);
}).listen(8000);

let room = 'foo';
const io = new Server(app);
io.on('connection', (socket) => {
  socket.join(room);
  console.log(`${socket.id} joined ${room}`);
  socket.emit('joined');

  socket.on('message', (msg) => {
    if (msg.type === 'sdp') {
      console.log(`${socket.id} send ${msg.data.type}`);
    } else {
      console.log(`${socket.id} send candidate`);
    }
    socket.to(room).emit('message', msg);
  });

  socket.on('ignore', (ignore, type, makingOffer, state) => {
    console.log(`${socket.id} ignore offer: ${ignore} message type: ${type} makeingOffer: ${makingOffer} state: ${state}`);
  });
});
