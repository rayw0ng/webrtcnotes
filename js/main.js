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


