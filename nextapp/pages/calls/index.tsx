
import { io } from "socket.io-client";
import { SetStateAction, useState } from 'react';

const socket = io("ws://localhost:8080");

export default function CallCreator() {
    const [id, setId] = useState('');

    socket.on("connected", (val) => {
        console.log("connected")
        setId(val);
    })

    const handleChange = (change: { target: { value: SetStateAction<string>; }; }) => {
        setId(change.target.value)
    };

    const createRoom = () => {
        socket.emit("create-room", {sdp: "TEST"});

        socket.once("room-created", (val) => {
            window.open(`/calls/${val}`, '_self');
        })
    }

    const joinRoom = () => {
        socket.emit("validate-room", id);

        socket.once("room-validated", (val) => {
            if(val) window.open(`/calls/${id}`, '_self');
            else console.log("Not a valid room id.");
        });
    }

    return (
        <div>
        <main>
            <h1>
            Your room id: {}
            </h1>

            <button onClick={createRoom}>Create Room</button>

            <input value={id} onChange={handleChange}></input>
            <button onClick={joinRoom}>Join Room</button>
        </main>
        </div>
    )
}