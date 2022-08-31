import { useRouter } from 'next/router'

import { io } from "socket.io-client";
import { SetStateAction, useEffect, useRef, useState } from 'react';

const socket = io("ws://localhost:8080");

const servers = {
    iceServers: [
      {
        urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
      },
    ],
    iceCandidatePoolSize: 10,
};
  
let localStream: MediaStream | null = null;
let peerConnections : any = [];

export default function Call() {
    const [streams, setStreams] = useState<any>([]);

    const router = useRouter();
    const { id } = router.query;
    const localRef = useRef(null);


    const enableWebcam = async () => {
        localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        (localRef.current! as HTMLVideoElement).srcObject = localStream;

        socket.emit("join-room", id)

        socket.once("id-dump", async (ids) => {
            console.log("SDP DUMP");
            console.log(ids);   
        
            ids.forEach(async (id: string) => {
                console.log(id);

                peerConnections[id] = new RTCPeerConnection(servers);
                const pc = peerConnections[id];

                localStream!.getTracks().forEach(track => pc.addTrack(track, localStream));
        
                const offerDescription = await pc.createOffer();
                await pc.setLocalDescription(offerDescription);

                pc.onicecandidate = (event: { candidate: any; }) => {
                    if(event.candidate) {
                        socket.emit("ice-candidate", id, event.candidate);
                    }
                }
        
                socket.emit("offer", id, {
                    sdp: offerDescription.sdp,
                    type: offerDescription.type
                })
            })
                
        });
    
            
        socket.on("offer", async (id, sdp) => {
            console.log("Received offer");

            peerConnections[id] = new RTCPeerConnection(servers);
            const pc : RTCPeerConnection = peerConnections[id];
        
            await pc.setRemoteDescription(sdp);

            localStream!.getTracks().forEach(track => pc.addTrack(track, localStream!));

            pc.onicecandidate = (event: { candidate: any; }) => {
                if(event.candidate) {
                    socket.emit("candidate", id, event.candidate);
                }
            }

            const streamsCopy = streams;
            streamsCopy.push({key: id, val: new MediaStream()});
            setStreams(streamsCopy);

            console.log(streams);
    
            pc.ontrack = (event) => {
                event.streams[0].getTracks().forEach(track => {
                    streams[id].addTrack(track);
                });
            }
        
            const answerDescription = await pc.createAnswer();
            await pc.setLocalDescription(answerDescription);
        
            socket.emit("answer", id, {
                sdp: answerDescription.sdp,
                type: answerDescription.type
            })
        });
        
        socket.on("answer", async (id, sdp) => {
            const pc = peerConnections[id];
        
            await pc.setRemoteDescription(sdp);
    
            const streamsCopy = streams;
            streamsCopy.push({key: id, val: new MediaStream()});
            setStreams(streamsCopy);

            console.log(streams);
    
            pc.ontrack = (event: { streams: { getTracks: () => any[]; }[]; }) => {
                event.streams[0].getTracks().forEach(track => {
                    streams[id].addTrack(track);
                });
            }
        });
    
        socket.on("candidate", async (id, candidate) => {
            const pc = peerConnections[id];
            await pc.addIceCandidate(candidate);
        });
    };


    return (
        <div>
            <main>
                <h1>Room with id {id}</h1>

                <div>
                    <button onClick={enableWebcam}>Join Room!</button>
                    <video autoPlay ref={localRef}></video>
                </div>


                {
                    streams.map((stream : any) => {
                        console.log(stream.key);

                        return (
                            <div>
                                <video ref={video => video!.srcObject = stream!.val} key={Math.random()} autoPlay></video>
                            </div>
                        )
                    })
                }
            </main>
        </div>
    );
}