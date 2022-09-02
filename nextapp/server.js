const server = require('socket.io')(8080, {
  cors: {
    origin: ['http://localhost:3000']
  }
});


const rooms = {};

console.log("Server started");

server.on("connection", (socket) => {

  socket.on("create-room", (id) => {
    rooms[id] = [];
    console.log("Room created with ID: " + id);
  });


  // Calls from joined room
  socket.on("join-room", (roomID, peerID) => {
    if(!rooms[roomID]) return;
    

    server.to(socket.id).emit("id-dump", rooms[roomID]);
    rooms[roomID].push([socket.id, peerID]);

    socket.join(roomID);

    console.log(`Client with ID ${socket.id} joined room with ID: ${roomID}`);
  });
});