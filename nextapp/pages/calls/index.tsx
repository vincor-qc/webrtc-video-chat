import { io } from "socket.io-client";
import { SetStateAction, useState } from 'react';

const socket = io("ws://localhost:8080");

export default function CallCreator() {

    const [createId, setCreateId] = useState('');
    const [joinId, setJoinId] = useState('');

    const createIdChange = (change: { target: { value: SetStateAction<string>; }; }) => {
        setCreateId(change.target.value);
    }
    
    const joinIdChange = (change: { target: { value: SetStateAction<string>; }; }) => {
        setJoinId(change.target.value);
    }

    const createRoom = () => {
        if(createId.length == 0) return alert("Please enter a valid room id");

        socket.emit("create-room", createId);
        
        window.open(`/calls/${createId}`, '_self');
    }

    const joinRoom = () => {
        window.open(`/calls/${joinId}`, '_self')
    }

    return (
        <div>
        <main>
            <input value={createId} onChange={createIdChange}></input>
            <button onClick={createRoom}>Create Room</button>

            <input value={joinId} onChange={joinIdChange}></input>
            <button onClick={joinRoom}>Join Room</button>
        </main>
        </div>
    )
}