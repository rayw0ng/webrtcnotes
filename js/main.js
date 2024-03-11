'use strict';

const socket = io();
const config = {
  //   iceservers: [
  //     { urls: 'stun:freestun.net:5350' },
  //     {
  //       urls: 'turns:freestun.tel:5350',
  //       username: 'free', credential: 'free'
  //     }],
};
const pc = new RTCPeerConnection(config);
const localVideo = document.getElementById('localVideo');
const remoteVideo = document.getElementById('remoteVideo');
const input = document.getElementById('input');

async function start() {
  try {
    const stream = await navigator.mediaDevices
      .getUserMedia({
        video: true,
        audio: false
      }
      );
    // trigger negotiationneeded event
    for (const track of stream.getTracks()) {
      pc.addTrack(track, stream);
    }
    localVideo.srcObject = stream;
  } catch (err) {
    console.error(err);
  }
}

const chunkSize = 64000;
input.onchange = (e) => {
  const inputFile = e.target.files[0];
  input.value = null;
  let chunkCount = 0;
  let fileReader = new FileReader();
  const dc = pc.createDataChannel('channel');

  function sendChunk() {
    const start = chunkSize * chunkCount;
    const end = Math.min(inputFile.size, start + chunkSize);
    fileReader.readAsArrayBuffer(inputFile.slice(start, end));
  }

  fileReader.onloadend = () => {
    dc.send(fileReader.result);
    chunkCount++;
    if (chunkSize * chunkCount < inputFile.size) {
      sendChunk();
    }
    console.log('send ', chunkCount);
  }

  dc.onopen = () => {
    console.log('data channel open');
    dc.send(JSON.stringify({
      name: inputFile.name,
      size: inputFile.size
    }));
    console.log('start send ', inputFile);
    sendChunk();
  }
}

pc.ondatachannel = (e) => {
  const dc = e.channel;
  let fileInfo;
  let buffer;
  let bytesReceived;
  let isDownloading = false;

  dc.onmessage = (msg) => {
    if (isDownloading) {
      bytesReceived += msg.data.byteLength;
      console.log('downloaded ', bytesReceived);
      buffer.push(msg.data);
      if (bytesReceived === fileInfo.size) {
        isDownloading = false;
        console.log('download finished');
        const blob = new Blob(buffer);
        let anchor = document.createElement('a');
        anchor.href = URL.createObjectURL(blob);
        anchor.download = fileInfo.name;
        anchor.click();
      }
    } else {
      fileInfo = JSON.parse(msg.data.toString());
      buffer = [];
      bytesReceived = 0;
      isDownloading = true;
      console.log('start downloading ', msg);
    }
  }
}

// associated tracks with stream before
pc.ontrack = ({ streams }) => {
  remoteVideo.srcObject = streams[0];
};

let makingOffer = false;
pc.onnegotiationneeded = async () => {
  try {
    makingOffer = true;
    await pc.setLocalDescription();
    socket.emit('message', {
      type: 'sdp',
      data: pc.localDescription
    });
    console.log('send sdp', pc.localDescription);
  } catch (err) {
    console.error(err);
  } finally {
    makingOffer = false;
  }
};

pc.oniceconnectionstatechange = () => {
  if (pc.iceConnectionState === 'failed') {
    pc.restartIce();
  }
};

pc.onicecandidate = ({ candidate }) => {
  if (candidate !== null) {
    socket.emit('message', {
      type: 'ice',
      data: candidate
    });
    console.log('send candidate', candidate);
  }
};

socket.on('joined', async () => {
  await start();
});

let ignoreOffer = false;
socket.on('message', async ({ type, data }) => {
  console.log(`receive ${type}`, data);
  try {
    if (type === 'sdp') {
      const description = data;
      const offerCollision =
        description.type === 'offer' &&
        (makingOffer || (pc.signalingState !== 'stable' && pc.signalingState !== 'have-local-offer'));

      ignoreOffer = offerCollision;
      socket.emit('ignore', ignoreOffer, description.type, makingOffer, pc.signalingState);
      if (ignoreOffer) {
        return;
      }

      await pc.setRemoteDescription(description);
      if (description.type === 'offer') {
        await pc.setLocalDescription();
        socket.emit('message', ({
          type: 'sdp',
          data: pc.localDescription,
        }));
      }
    } else if (type === 'ice') {
      const candidate = data;
      try {
        await pc.addIceCandidate(candidate);
      } catch (err) {
        if (!ignoreOffer) {
          throw err;
        }
      }
    }
  } catch (err) {
    console.error(err);
  }
});


