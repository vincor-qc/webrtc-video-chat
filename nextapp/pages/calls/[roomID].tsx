import { useRouter } from 'next/router'

import { io } from "socket.io-client";
import { SetStateAction, useEffect, useRef, useState } from 'react';

const Peer = require('simple-peer');

const socket = io("ws://localhost:8080");

export default function Call() {
    const router = useRouter();
    const { roomID } = router.query;

    const [peers, setPeers] = useState<any>([]);
    const localRef = useRef(null);
    const peersRef = useRef<any>([]);

    useEffect(() => {
        if(!router.isReady) return;

        navigator.mediaDevices.getUserMedia({ video: true, audio: true }).then((stream: any) => {
            (localRef.current! as HTMLVideoElement).srcObject = stream;

            socket.emit("join-room", roomID);
            socket.on("all-users", users => {
                console.log("All Users: " + users);

                const peers: any[] = [];
                users.forEach((userID: string) => {
                    const peer = createPeer(userID, socket.id, stream);

                    peersRef.current.push({
                        peerID: userID,
                        peer,
                    });
                    
                    peers.push(peer);
                });

                setPeers(peers);

                console.log(peers);
            })

            socket.on("user-joined", payload => {
                const peer = addPeer(payload.signal, payload.callerID, stream);
                peersRef.current.push({
                    peerID: payload.callerID,
                    peer,
                });

                setPeers((users: any) => [...users, peer]);

                console.log("User Joined: " + payload.callerID);
                console.log(peers);
            });

            socket.on("receiving-returning-signal", payload => {
                const item = peersRef.current.find((p: any) => p.peerID === payload.id);
                item.peer.signal(payload.signal);
            });

        });

    }, [router.isReady]);

    const createPeer = (userToSignal: string, callerID: string, stream: any) => {
        const peer = new Peer({
            initiator: true,
            trickle: false,
            stream,
        });

        peer.on("signal", (signal: any) => {
            socket.emit("sending-signal", { userToSignal, callerID, signal });
            console.log("Sent Signal to: " + userToSignal);
        });

        return peer;
    };

    const addPeer = (incomingSignal: any, callerID: string, stream: any) => {
        const peer = new Peer({
            initiator: false,
            trickle: false,
            stream,
        });

        peer.on("signal", (signal: any) => {
            socket.emit("returning-signal", { signal, callerID });
            console.log("Returning Signal to: " + callerID);
        });

        peer.signal(incomingSignal);

        return peer;
    };

    return (
        <div>
            <main>
                <h1>Room with id {roomID}</h1>

                <div>
                    <video autoPlay ref={localRef}></video>
                </div>

                {
                    peers.map((peer: any, index: number) => {
                        console.log(index)
                        return (
                            <Video key={index} peer={peer} />
                        );
                    })
                }
            </main>
        </div>
    );
}

const Video = (props: any) => {
    const ref = useRef(null);

    useEffect(() => {
        props.peer.on("stream", (stream: any) => {
            console.log("Stream: " + stream);

            (ref.current! as HTMLVideoElement).srcObject = stream;
        });
    }, []);

    return (
        <video autoPlay ref={ref}></video>
    );
};