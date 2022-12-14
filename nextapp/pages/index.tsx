import type { NextPage } from 'next'
import Head from 'next/head'
import Image from 'next/image'
import styles from '../styles/Home.module.css'
import { SetStateAction, useEffect, useRef, useState } from 'react'

const Home: NextPage = () => {
  const [peer, setPeer] = useState<any>();

  useEffect(() => {

    // Import PeerJS only on client side as it needs access to the window and navigator objects
    import("peerjs").then(({ default: Peer }) => {

      // Create a Peer and save it to the state
      const peer = new Peer();
      setPeer(peer);

      
      peer.on('open', (id) => {
        console.log('My peer ID is: ' + id);
      });
      
      peer.on('call', async (call) => {
        const webcam = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

        (localRef.current! as HTMLVideoElement).srcObject = webcam;

        // Answer the call, providing our mediaStream
        call.answer(webcam);
    
        call.on('stream', function(stream) {
          (remoteRef.current! as HTMLVideoElement).srcObject = stream;
        });
      });
      
    })
  }, [])
  
  const localRef = useRef(null);
  const remoteRef = useRef(null);

  const [inputId, setInputId] = useState('');

  const handleChange =(event: { target: { value: SetStateAction<string> } }) => {
    setInputId(event.target.value);
  }

  const createCall = () => {

  }

  const answerCall = async () => {
    const webcam = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });

    (localRef.current! as HTMLVideoElement).srcObject = webcam;

    const call = peer.call(inputId, webcam);

    call.on('stream', function(stream: MediaProvider) {
      (remoteRef.current! as HTMLVideoElement).srcObject = stream;
    });
  }

  return (
    <div className={styles.container}>
      <Head>
        <title>Create Next App</title>
        <meta name="description" content="Generated by create next app" />
        <link rel="icon" href="/favicon.ico" />
      </Head>

      <main className={styles.main}>
        <button>Create Call</button>
      
        <div>
          <input value={inputId} onChange={handleChange}></input>
          <button onClick={answerCall}>Join Call</button>
        </div>

        <div>
          <h1>Local Stream</h1>
          <video autoPlay ref={localRef}></video>
        </div>

        <div>
          <h1>Remote Stream</h1>
          <video autoPlay ref={remoteRef}></video>
        </div>
      </main>
    </div>
  )
}

export default Home
