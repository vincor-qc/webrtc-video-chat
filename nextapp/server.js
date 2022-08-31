const server = require('socket.io')(8080, {
  cors: {
    origin: ['http://localhost:3000']
  }
});


const idStore = {};

console.log("Server started");

server.on("connection", (socket) => {
  const id = socket.id;

  // Calls from creation page
  socket.on("validate-room", roomid => {
    if (idStore[roomid]) {
      socket.emit("room-validated", true);
    } else {
      socket.emit("room-validated", false);
    }
  })

  socket.on("create-room", () => {
    idStore[id] = [];
    socket.emit("room-created", id);

    console.log("Room created with ID: " + id); 
  })


  // Calls from joined room
  socket.on("join-room", (roomid) => {

    if(!idStore[roomid]) return;
    

    server.to(id).emit("id-dump", idStore[roomid]);
    idStore[roomid].push(socket.id);

    socket.join(roomid);

    console.log(`Client with ID: ${id} joined room with ID: ${roomid}`);
  });

  socket.on("offer", (recipient, offer) => {
    server.to(recipient).emit("offer", id, offer);

    console.log(`Offer sent from client ${id} to recipient ${recipient}`);
  });

  socket.on("answer", (recipient, answer) => {
    server.to(recipient).emit("answer", id, answer);

    console.log(`Answer sent from client ${id} to recipient ${recipient}`);
  });

  socket.on("candidate", (recipient, candidate) => {
    server.to(recipient).emit("candidate", id, candidate);

    console.log(`Candidate sent from client ${id} to recipient ${recipient}`);
  });
});