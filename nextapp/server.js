const server = require('socket.io')(8080, {
  cors: {
    origin: ['http://localhost:3000']
  }
});


const sdpStore = {};

console.log("Server started");

server.on("connection", (socket) => {
  const id = socket.id;

  // Calls from creation page
  socket.on("validate-room", roomid => {
    if (sdpStore[roomid]) {
      socket.emit("room-validated", true);
    } else {
      socket.emit("room-validated", false);
    }
  })

  socket.on("create-room", () => {
    sdpStore[id] = {};
    socket.emit("room-created", id);

    console.log("Room created with ID: " + id); 
  })


  // Calls from joined room
  socket.on("join-room", (roomid, sdp) => {

    if(!sdpStore[roomid]) return;

    socket.to(id).emit("sdp-dump", sdpStore[roomid]);
    sdpStore[roomid][id] = sdp;

    socket.join(roomid);

    socket.to(roomid).emit("new-sdp", sdp);

    console.log(`Client with ID: ${id} joined room with ID: ${roomid}`);
  });
});