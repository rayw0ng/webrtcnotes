'use strict';

const socket = io();
const socket2 = io();

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
    socket.emit('offer', pc.localDescription);
    console.log('send offer', pc.localDescription);
  } catch (err) {
    console.error(err);
  }
}
socket2.on('offer', async (sdp) => {
  await pc2.setRemoteDescription(sdp);
  console.log('receive offer', sdp);
  await pc2.setLocalDescription();
  socket2.emit('answer', pc2.localDescription);
  console.log('send answer', pc2.localDescription);
});
socket.on('answer', async (sdp) => {
  console.log('receive answer', sdp);
  await pc.setRemoteDescription(sdp);
});
// associated tracks with stream before
pc.ontrack = ({ streams }) => {
  remoteVideo.srcObject = streams[0];
};
pc.onicecandidate = ({ candidate }) => {
  if (candidate !== null) {
    socket.emit('ice', candidate);
    console.log('send candidate', candidate);
  }
};
socket.on('ice', async (ice) => {
  await pc.addIceCandidate(ice);
})
pc2.onicecandidate = ({ candidate }) => {
  if (candidate !== null) {
    socket2.emit('ice', candidate);
    console.log('send candidate', candidate);
  }
};
socket2.on('ice', async (ice) => {
  await pc2.addIceCandidate(ice);
})
start();

