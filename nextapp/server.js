const server = require('socket.io')(8080, {
  cors: {
    origin: ['http://localhost:3000']
  }
});


const rooms = {};

console.log("Server started");

server.on("connection", (socket) => {
  let room;

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
    room = roomID;

    console.log(`Client with ID ${socket.id} joined room with ID: ${roomID}`);
  });

  socket.on('disconnect', () => {
    if(!room) return;

    console.log(rooms[room].find((entry) => entry[0] === socket.id));
    server.to(room).emit('user-disconnected', rooms[room].find((entry) => entry[0] === socket.id)[1]);
    rooms[room] = rooms[room].filter((entry) => entry[0] !== socket.id)
    console.log(rooms[room]);

    console.log(`Client with ID ${socket.id} disconnected`);
  })
});