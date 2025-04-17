import * as ws from "ws";
import * as fs from "fs";
import * as path from "path";

const wss = new ws.Server({ port: 8080 });

wss.on('connection', (socket) => {
  console.log('A client connected');
  socket.on('message', (message) => {
    console.log(`Received message: ${message}`);
  });
});

const storage = new FileSystemStorage();
