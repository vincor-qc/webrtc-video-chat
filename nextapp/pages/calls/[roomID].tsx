import { useRouter } from 'next/router'

import { io } from "socket.io-client";
import { SetStateAction, useEffect, useRef, useState } from 'react';

const socket = io("ws://localhost:8080");

export default function Call() {

    // Placeholder system to keep track of the current room ID
    // TODO: Replace with a proper system
    const router = useRouter();
    const { roomID } = router.query;
    
    // The local stream
    const localRef = useRef(null);

    // RemoteStreams keeps track of [UsersID, MediaStream]
    // ConnectedPeers keep track of which peers are currently connected, to ensure that a peer doesn't get added twice
    const [remoteStreams, setRemoteStreams] = useState<any>([]);
    const connectedPeers = useRef<any>([]);

    // Use effect ensure that the PeerJS functions are only called once on the client side
    useEffect(() => {
        if(!router.isReady) return;

        let webcam : MediaStream;

        // Get and set the local video
        const initCam = async () => {
            webcam = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            (localRef.current! as HTMLVideoElement).srcObject = webcam;
        }
        initCam();

        // Imports PeerJS and sets up all the functions inside
        // Must be done inside the useEffect to ensure that it only runs on the client side
        // TODO: Replace with a better system
        import("peerjs").then(({ default: Peer }) => {
    
            // Create a Peer and save it to the state
            const peer = new Peer();
        
            // When the peer is ready, try to join the room with the roomID + peerID
            peer.on('open', (peerID) => {
                console.log("Peer ID: " + peerID);
                socket.emit("join-room", roomID, peerID);
            });

            // Triggered whem a new peer joins the room
            peer.on('call', async (call) => {       
                console.log("Received Call");

                // Answer the call, providing our mediaStream
                call.answer(webcam);
            
                // This is called when the peer sends us their video
                call.on('stream', (stream) => {
                    if(connectedPeers.current.includes(call.peer)) return;
                    connectedPeers.current.push(call.peer);    
                    setRemoteStreams((prev: any) => [...prev, [call.peer, stream]]);
                });
            });

            // On join, create a call to every other peer in the room
            socket.on("id-dump", (ids) => {

                // We receive the entire list of peers connected so far
                // We need to send a call to each of those peers
                ids.forEach(async ([userID, peerID] : [string, string]) => {
                    
                    // Create a call to the peerID
                    const call = peer.call(peerID, webcam);
    
                    // This is called when the peer sends us their video
                    call.on('stream', (stream: MediaProvider) => {
                        if(connectedPeers.current.includes(call.peer)) return console.log("RETURN");
                        connectedPeers.current.push(call.peer);       
                        setRemoteStreams((prev: any) => [...prev, [call.peer, stream]]);
                    });
                });
            });

            // When a user closes their tab or leaves the room, remove their video
            // Also removes them from the connectedPeers list
            socket.on("user-disconnected", (peerID) => {
                setRemoteStreams((prev: any) => prev.filter((stream: any) => stream[0] !== peerID));
                connectedPeers.current = connectedPeers.current.filter((id: string) => id !== peerID);
            })

            // End of Peer Functions
        });
    }, [router.isReady]);

    return (
        <div>
            <main>
                <h1>Room with id {roomID}</h1>

                <div>
                    <video autoPlay ref={localRef}></video>
                </div>

                {
                    remoteStreams.map((stream: any, index: any) => {
                        return (
                            <RemoteVideo key={index} stream={stream[1]} />
                        )
                    })
                }
            </main>
        </div>
    );
}

const RemoteVideo = (props : any) => {
    const remoteRef = useRef(null);

    useEffect(() => {
        (remoteRef.current! as HTMLVideoElement).srcObject = props.stream;
    }, [props.stream]);

    return (
        <video autoPlay ref={remoteRef}></video>
    )
}