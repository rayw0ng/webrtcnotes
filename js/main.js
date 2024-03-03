'use strict';
const localVideo = document.getElementById('localVideo');

async function start() {
  try {
    const stream = await navigator.mediaDevices
      .getUserMedia({
        video: true,
        audio: false
      }
      );
    localVideo.srcObject = stream;
  } catch (err) {
    console.error(err);
  }
}

start();