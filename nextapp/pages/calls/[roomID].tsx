import { useRouter } from 'next/router'

import { io } from "socket.io-client";
import { SetStateAction, useEffect, useRef, useState } from 'react';

const socket = io("ws://localhost:8080");

export default function Call() {
    const router = useRouter();
    const { roomID } = router.query;
    
    const [peer, setPeer] = useState<any>();
    const localRef = useRef(null);

    const [remoteStreams, setRemoteStreams] = useState([]);
    const [connectedPeers, setConnectedPeers] = useState([]);

    useEffect(() => {
        if(!router.isReady) return;

        let webcam : MediaStream;

        // Function to get and set the webcam to the local video
        const initCam = async () => {
            webcam = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            (localRef.current! as HTMLVideoElement).srcObject = webcam;
        }
        initCam();

        // Import PeerJS only on client side as it needs access to the window and navigator objects
        import("peerjs").then(({ default: Peer }) => {
    
            // Create a Peer and save it to the state
            const peer = new Peer();
            setPeer(peer);
        
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
            
                call.on('stream', (stream) => {
                    // Ensure this isn't called twice
                    if(connectedPeers.includes(call.peer)) return;
                    setConnectedPeers([]);

                    console.log(connectedPeers)

                    console.log("Received stream from: " + call.peer);
                    
                    setRemoteStreams([...remoteStreams, stream])

                    console.log(remoteStreams.length);

                });
            });

            // On join, create a call to every other peer in the room
            socket.on("id-dump", (ids) => {
                console.log("Received ID Dump");
                console.log(ids);
    
                ids.forEach(async ([userID, peerID] : [string, string]) => {
    
                    console.log("Sent offer to: " + peerID);
                    
                    // Create a call to the peerID
                    const call = peer.call(peerID, webcam);
    
                    call.on('stream', (stream: MediaProvider) => {

                        // Ensure this isn't called twice
                        if(connectedPeers.includes(peerID)) return;
                        setConnectedPeers([...connectedPeers, peerID]);

                        console.log("Received stream from: " + peerID);
                        
                        setRemoteStreams([...remoteStreams, stream])

                        console.log(remoteStreams.length);
                    });
                });
            });
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
                    remoteStreams.map((stream, index) => {
                        return (
                            <video autoPlay key={stream.id} ref={(video) => {
                                console.log(remoteStreams);
                                video!.srcObject = stream;
                            }}></video>
                        )
                    })
                }
            </main>
        </div>
    );
}