// content.js

// Create the button element
const button = document.createElement('button');
button.textContent = 'Hold to Speak';
button.style.position = 'fixed';
button.style.bottom = '20px';
button.style.right = '20px';
button.style.zIndex = 9999;
button.style.padding = '10px 15px';
button.style.backgroundColor = '#4285F4';
button.style.color = 'white';
button.style.border = 'none';
button.style.borderRadius = '5px';
button.style.cursor = 'pointer';
button.style.fontSize = '14px';
button.style.userSelect = 'none';
document.body.appendChild(button);

let mediaRecorder;
let audioChunks = [];

// Function to start recording
async function startRecording() {
  try {
    // Request microphone access
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    mediaRecorder = new MediaRecorder(stream);
    audioChunks = [];

    mediaRecorder.addEventListener('dataavailable', event => {
      if (event.data.size > 0) {
        audioChunks.push(event.data);
      }
    });

    mediaRecorder.addEventListener('stop', () => {
      const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
      processAudio(audioBlob);
      // Stop all tracks to release the microphone
      stream.getTracks().forEach(track => track.stop());
    });

    mediaRecorder.start();
  } catch (err) {
    console.error('Error accessing microphone:', err);
    alert('Error accessing microphone: ' + err.message);
  }
}

// Function to process the audio blob: send to Whisper API then copy result
function processAudio(audioBlob) {
  // Get the API key from storage
  chrome.storage.sync.get('openaiApiKey', async (data) => {
    const apiKey = data.openaiApiKey;
    if (!apiKey) {
      alert('Please set your OpenAI API key in the extension popup.');
      return;
    }

    // Prepare the FormData for the API call
    const formData = new FormData();
    // Create a File from the audio blob
    const audioFile = new File([audioBlob], 'audio.webm', { type: 'audio/webm' });
    formData.append('file', audioFile);
    formData.append('model', 'whisper-1');

    // Add a prompt to the request to guide the transcription:
    // - The request is related to crypto, specifically Solana.
    // - The user may be asking to open the current coin on sites such as Photon, Bullx, GMGN, pump, pump.fun, trojan, dexscreener, or Neo.
    // - The user may also be asking to trade tokens.
    // - IMPORTANT: When the words "swap" or "trade" are used, ignore any numbers indicating amounts.
    //   For example, "swap 4 sol for this token" should be transcribed as "swap for sol for this token".
    formData.append(
      'prompt',
      'The request is related to crypto - specifically Solana. The user may be asking to open the current coin on another site such as Photon, Bullx, GMGN, pump, pump.fun, trojan, dexscreener, or Neo. ' +
      'The user may also be asking to trade tokens. IMPORTANT: When the words "swap" or "trade" are used, ignore any numbers indicating amounts. ' +
      'For example, if the user says "swap 4 sol for this token", transcribe it as "swap for sol for this token".'
    );

    try {
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`
          // Do not set Content-Type header when sending FormData.
        },
        body: formData
      });

      if (!response.ok) {
        const errMsg = await response.text();
        throw new Error(errMsg);
      }

      const json = await response.json();
      const transcript = json.text;
      console.log('Transcript:', transcript);

      // Copy the transcript to the clipboard
      await navigator.clipboard.writeText(transcript);
      alert('Transcription copied to clipboard:\n\n' + transcript);
    } catch (error) {
      console.error('Error during transcription:', error);
      alert('Error during transcription: ' + error.message);
    }
  });
}

// Add event listeners to the button for "hold to speak" behavior.
button.addEventListener('mousedown', () => {
  button.style.backgroundColor = '#3367D6'; // darken on press
  startRecording();
});

// Support touch events for mobile devices
button.addEventListener('touchstart', (e) => {
  e.preventDefault();
  button.style.backgroundColor = '#3367D6';
  startRecording();
});

// Stop recording when mouse or touch is released
button.addEventListener('mouseup', () => {
  button.style.backgroundColor = '#4285F4';
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
  }
});
button.addEventListener('mouseleave', () => {
  // In case the user moves the pointer away
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
    button.style.backgroundColor = '#4285F4';
  }
});
button.addEventListener('touchend', () => {
  button.style.backgroundColor = '#4285F4';
  if (mediaRecorder && mediaRecorder.state === 'recording') {
    mediaRecorder.stop();
  }
});
