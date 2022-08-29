import React, { useState, useRef, useImperativeHandle, useEffect, forwardRef } from 'react';
import logo from './logo.svg';
import './App.css';

import firebase from 'firebase/compat/app';
import 'firebase/compat/firestore';
import { collection, doc, setDoc, addDoc, getDoc, getDocs, updateDoc, onSnapshot, deleteDoc} from 'firebase/firestore'

// Firebase Configuration
const firebaseConfig = {
  // Firebase Config
};

// Initialize Firebase
const app = firebase.initializeApp(firebaseConfig);
const firestore = firebase.firestore();

// ICE servers
const servers = {
  iceServers: [
    {
      urls: ['stun:stun.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

// Initialize Global Resources outside App
let pc = new RTCPeerConnection(servers);
let localStream: MediaStream;
let remoteStream: MediaStream;

// Adds stream to remote on connection
pc.ontrack = event => {
  event.streams[0].getTracks().forEach(track => {
    remoteStream.addTrack(track);
  });
}

pc.onconnectionstatechange = event => {
  console.log(event);
  console.log(pc.connectionState);

  if(pc.connectionState === 'disconnected') {

    pc.close()
    pc = new RTCPeerConnection(servers);

    remoteStream = new MediaStream();
  }
}

function App() {
  // Get all react elements and store them
  const webcamRef = useRef(null);
  const remoteRef = useRef(null);
  const [callValue, setCallValue] = useState('');
  const [callId, setCallId] = useState('None'); 

  const handleChange = (event: { target: { value: React.SetStateAction<string>; }; }) => {
    setCallValue(event.target.value);
  };
  
  const openWebcam = async () => {
    
    // Queries the user for permission to use the webcam
    localStream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: true,
    });

    // Create a placeholder MediaStream
    remoteStream = new MediaStream();
  
  
    // Adds the webcam to the local stream
    localStream.getTracks().forEach(track => {
      pc.addTrack(track, localStream);
    });

    // Sets the streams as the source for the React video elements
    let wcVid = webcamRef.current! as HTMLVideoElement;
    let rmVid = remoteRef.current! as HTMLVideoElement;
    rmVid.srcObject = remoteStream;
    wcVid.srcObject = localStream;
  };



  const startCall = async () => {

    // Create variables for easier access to the firestore database
    const callDoc = doc(collection(firestore, 'calls'));
    const offerCandidates = collection(callDoc, 'offerCandidates');
    const answerCandidates = collection(callDoc, 'answerCandidates');

    setCallValue(callDoc.id);
    setCallId(callDoc.id)

    pc.onicecandidate = async event => {
      event.candidate && await addDoc(offerCandidates, event.candidate.toJSON());
    };
  
    // Create the offer (sdp +type) and set it as local description
    const offerDescription = await pc.createOffer();
    await pc.setLocalDescription(offerDescription);
  
    const offer = {
      sdp: offerDescription.sdp,
      type: offerDescription.type,
    }
  
    // Add the offer to the database
    await setDoc(callDoc, offer);

    // Listens for an answer, and on a response, sets it as the remote description
    onSnapshot(callDoc, async (snapshot: { data: () => any; }) => {
      const data = snapshot.data();

      if(!pc.currentRemoteDescription && data.type === "answer") {

        const answer = {
          sdp: data.sdp,
          type: data.type
        }

        const answerDescription = new RTCSessionDescription(answer);
        await pc.setRemoteDescription(answerDescription);
      }
    });

    // Listens for candidates and adds them to the peer connection
    onSnapshot(answerCandidates, (snapshot: { docChanges: () => any[]; }) => {
      snapshot.docChanges().forEach((change: { type: string; doc: { data: () => any; }; }) => {
        if(change.type === 'added') {
          let data = change.doc.data();
          pc.addIceCandidate(new RTCIceCandidate(data));
        }
      });
    });
  };
  
  const answerCall = async () => {
    // Create variables for easier access to the firestore database
    const callDoc = doc(firestore, 'calls', callValue);
    const offerCandidates = collection(callDoc, 'offerCandidates');
    const answerCandidates = collection(callDoc, 'answerCandidates');

    pc.onicecandidate = async event => {
      event.candidate && await addDoc(answerCandidates, event.candidate.toJSON());
    };

    // Tries to get the sdp offer with the ID from the database
    const callData = (await getDoc(callDoc)).data();

    // Returns if an offer with the entered ID is not found.
    if(callData === undefined) return console.error("No offer with ID found.");
    setCallId(callData.id);
  
    const offerDescription = {
      sdp: callData.sdp,
      type: callData.type,
    }

    // Sets the offer as the remote description
    await pc.setRemoteDescription(new RTCSessionDescription(offerDescription));
  
    // Creates an answer and sets it as the local description
    const answerDescription = await pc.createAnswer();
    await pc.setLocalDescription(answerDescription);
  
    const answer = {
      sdp: answerDescription.sdp,
      type: answerDescription.type,
    }
  
    // Update the database with the answer
    await updateDoc(callDoc, answer);

    // Listens for candidates and adds them to the peer connection
    onSnapshot(offerCandidates, (snapshot: { docChanges: () => any[]; }) => {
      
      snapshot.docChanges().forEach((change: { type: string; doc: { data: () => any; }; }) => {
        if(change.type === 'added') {
          let data = change.doc.data();
          pc.addIceCandidate(new RTCIceCandidate(data));
        }
      });
    });
  };

  // If the user is the call creator, close the call, otherwise, simply leave the call
  const closeCall = async () => {
    pc.close()
    pc = new RTCPeerConnection(servers);
  };


  return (
    <div className="App">
      <header className="App-header">
      <h2>Call ID: {callId}</h2>
        <div>
          <span>
            <h3>Local Stream</h3>
            <video autoPlay id="webcamVideo" ref={webcamRef} ></video>
          </span>
          <span>
            <h3>Remote Stream</h3>
            <video autoPlay id="remoteVideo" ref={remoteRef}></video>
          </span>


        </div>

        <button id="webcamButton" onClick={openWebcam}>Start webcam</button>
        <h2>2. Create a new Call</h2>
        <button id="callButton" onClick={startCall}>Create Call (offer)</button>

        <h2>3. Join a Call</h2>
        <p>Answer the call from a different browser window or device</p>
        
        <input id="callInput" onChange={handleChange} value={callValue}/>
        <button id="answerButton" onClick={answerCall}>Answer</button>

        <h2>4. Hangup</h2>

        <button id="hangupButton" onClick={closeCall}>Hangup</button>
      </header>
    </div>
  );
}

export default App;
