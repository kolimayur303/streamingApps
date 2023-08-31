const express = require('express');
const http = require('http');
const socketIo = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = socketIo(server);

//Store room information
const rooms = {};

// Serve your HTML and other static files
app.use(express.static(__dirname + '/public'));

// Socket.io connection handling
io.on('connection', (socket) => {
    console.log('A user connected');

    // Handle offer message
    socket.on('offer', (offer) => {
        // Broadcast the offer to all other connected clients
        socket.broadcast.emit('offer', offer);
    });

    // Handle answer message
    socket.on('answer', (answer) => {
        // Broadcast the answer to all other connected clients
        socket.broadcast.emit('answer', answer);
    });

    // Handle ice candidate message
    socket.on('ice-candidate', (candidate) => {
        // Broadcast the ice candidate to all other connected clients
        socket.broadcast.emit('ice-candidate', candidate);
    });

    // Handle room creation and joining
    socket.on('create-room', (roomName) => {
        if (!rooms[roomName]) {
            rooms[roomName] = [];
        }
        socket.join(roomName);
        rooms[roomName].push(socket.id);
        console.log(`User ${socket.id} created and joined room ${roomName}`);
    });

    socket.on('join-room', (roomName) => {
        if (rooms[roomName]) {
            socket.join(roomName);
            rooms[roomName].push(socket.id);
            console.log(`User ${socket.id} joined room ${roomName}`);
            socket.emit('participants', rooms[roomName]);
        } else {
            socket.emit('room-not-found');
        }
    });

    // Handle offer and answer
    socket.on('offer', (offer, targetSocketId) => {
        socket.to(targetSocketId).emit('offer', offer, socket.id);
    });

    socket.on('answer', (answer, targetSocketId) => {
        socket.to(targetSocketId).emit('answer', answer, socket.id);
    });

    // Handle ICE candidates
    socket.on('ice-candidate', (candidate, targetSocketId) => {
        socket.to(targetSocketId).emit('ice-candidate', candidate, socket.id);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
        console.log(`User ${socket.id} disconnected`);

        // Remove user from room when disconnected
        for (const roomName in rooms) {
            if (rooms[roomName].includes(socket.id)) {
                rooms[roomName] = rooms[roomName].filter(id => id !== socket.id);
                socket.leave(roomName);
                console.log(`User ${socket.id} left room ${roomName}`);
                break;
            }
        }
    });

    // Handle stream broadcasting
    socket.on('broadcast', (stream) => {
        const room = Object.keys(socket.rooms).filter(item => item !== socket.id)[0];
        socket.to(room).emit('receive-stream', stream, socket.id);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
