import { useRouter } from 'next/router'

import { io } from "socket.io-client";
import { SetStateAction, useEffect, useState } from 'react';

const socket = io("ws://localhost:8080");

socket.once("sdp-dump", (sdps) => {
    console.log("SDP DUMP");
    console.log(sdps);
})

socket.on("new-sdp", (sdp) => {
    console.log(sdp);
})

export default function Call() {
    const router = useRouter();
    const { id } = router.query;

    // Ensure Socket emits only once on load
    useEffect(() => {
        socket.emit("join-room", id, {sdp: "TEST"})
    });

    return (
        <div>
            <main>
                <h1>Room with id {id}</h1>

                <video autoPlay></video>
            </main>
        </div>
    );
}