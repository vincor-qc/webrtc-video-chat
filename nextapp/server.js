const server = require('socket.io')(8080, {
  cors: {
    origin: ['http://localhost:3000']
  }
});


const rooms = {};

console.log("Server started");

server.on("connection", (socket) => {

  socket.on("join-room", roomID => {
    if(!rooms[roomID]) {
      rooms[roomID] = [];
      console.log("Room created: " + roomID);
    }

    if(rooms[roomID].length == 10) return socket.emit("room-full");

    socket.emit("all-users", rooms[roomID]);

    rooms[roomID].push(socket.id);

    console.log("User joined room: " + roomID);
  })

  socket.on("sending-signal", payload => {
    server.to(payload.userToSignal).emit('user-joined', { signal: payload.signal, callerID: payload.callerID });
  });

  socket.on("returning-signal", payload => {
    server.to(payload.callerID).emit('receiving-returned-signal', { signal: payload.signal, id: socket.id });
  });
});