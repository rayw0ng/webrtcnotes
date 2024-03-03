'use strict';
const pc = new RTCPeerConnection();
const pc2 = new RTCPeerConnection();
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
      pc2.addTrack(track, stream);
    }
    localVideo.srcObject = stream;

    await pc.setLocalDescription();
    await pc2.setRemoteDescription(pc.localDescription);
    await pc2.setLocalDescription();
    await pc.setRemoteDescription(pc2.localDescription);
  } catch (err) {
    console.error(err);
  }
}
// associated tracks with stream before
pc.ontrack = ({ streams }) => {
  remoteVideo.srcObject = streams[0];
};
pc.onicecandidate = ({ candidate }) => {
  if (candidate !== null) {
    pc2.addIceCandidate(candidate);
    console.log('send candidate', candidate);
  }
};
pc2.onicecandidate = ({ candidate }) => {
  if (candidate !== null) {
    pc.addIceCandidate(candidate);
    console.log('send candidate', candidate);
  }
};
start();