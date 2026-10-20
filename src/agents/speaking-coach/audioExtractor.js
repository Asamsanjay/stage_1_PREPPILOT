/**
 * Client-Side Audio Extraction Utility
 * 
 * Safely extracts the audio track from a locally recorded video Blob using
 * the browser's Web Audio API and encodes it into a compact, standardized
 * 16kHz mono WAV Blob or lightweight audio blob.
 * 
 * Privacy Rule:
 * The video track is completely discarded on the client device.
 * Only the extracted audio is sent for AI analysis after explicit user consent.
 */

/**
 * Encodes an AudioBuffer into a 16-bit mono PCM WAV Blob at target sample rate (default 16kHz).
 * @param {AudioBuffer} audioBuffer 
 * @param {number} targetSampleRate 
 * @returns {Blob}
 */
function encodeWav(audioBuffer, targetSampleRate = 16000) {
  const numberOfChannels = 1;
  const originalSampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0);

  // Simple downsampling/resampling to targetSampleRate (e.g. 16kHz for speech recognition)
  const ratio = originalSampleRate / targetSampleRate;
  const newLength = Math.round(channelData.length / ratio);
  const result = new Float32Array(newLength);

  let offsetResult = 0;
  let offsetBuffer = 0;
  while (offsetResult < result.length) {
    const nextOffsetBuffer = Math.round((offsetResult + 1) * ratio);
    let accum = 0;
    let count = 0;
    for (let i = offsetBuffer; i < nextOffsetBuffer && i < channelData.length; i++) {
      accum += channelData[i];
      count++;
    }
    result[offsetResult] = count > 0 ? accum / count : 0;
    offsetResult++;
    offsetBuffer = nextOffsetBuffer;
  }

  // Convert Float32Array (-1.0 to 1.0) to 16-bit PCM buffer
  const buffer = new ArrayBuffer(44 + result.length * 2);
  const view = new DataView(buffer);

  // RIFF identifier
  writeString(view, 0, 'RIFF');
  // file length
  view.setUint32(4, 36 + result.length * 2, true);
  // RIFF type
  writeString(view, 8, 'WAVE');
  // format chunk identifier
  writeString(view, 12, 'fmt ');
  // format chunk length
  view.setUint32(16, 16, true);
  // sample format (1 = PCM)
  view.setUint16(20, 1, true);
  // channel count
  view.setUint16(22, numberOfChannels, true);
  // sample rate
  view.setUint32(24, targetSampleRate, true);
  // byte rate (sampleRate * numberOfChannels * bytesPerSample)
  view.setUint32(28, targetSampleRate * numberOfChannels * 2, true);
  // block align
  view.setUint16(32, numberOfChannels * 2, true);
  // bits per sample
  view.setUint16(34, 16, true);
  // data chunk identifier
  writeString(view, 36, 'data');
  // data chunk length
  view.setUint32(40, result.length * 2, true);

  // Write PCM samples clamped to 16-bit
  let offset = 44;
  for (let i = 0; i < result.length; i++, offset += 2) {
    const s = Math.max(-1, Math.min(1, result[i]));
    view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
  }

  return new Blob([view], { type: 'audio/wav' });
}

function writeString(view, offset, string) {
  for (let i = 0; i < string.length; i++) {
    view.setUint8(offset + i, string.charCodeAt(i));
  }
}

/**
 * Extracts only the audio from a recorded video/audio Blob.
 * 
 * @param {Blob} videoBlob - The recorded video blob from IndexedDB
 * @returns {Promise<{ audioBlob: Blob, mimeType: string, sizeBytes: number }>}
 */
export async function extractAudioFromRecording(videoBlob) {
  if (!videoBlob || !(videoBlob instanceof Blob)) {
    throw new Error('Valid recording Blob is required for audio extraction.');
  }

  // If already an audio-only blob, return directly
  if (videoBlob.type.startsWith('audio/')) {
    return {
      audioBlob: videoBlob,
      mimeType: videoBlob.type,
      sizeBytes: videoBlob.size
    };
  }

  // Use Web Audio API to decode audio from the media container
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) {
    throw new Error('Web Audio API is not supported in this browser. Unable to safely extract audio.');
  }

  const audioCtx = new AudioCtx();
  try {
    const arrayBuffer = await videoBlob.arrayBuffer();
    const audioBuffer = await audioCtx.decodeAudioData(arrayBuffer);

    if (audioBuffer.length === 0 || audioBuffer.numberOfChannels === 0) {
      throw new Error('No audio channels or audio data detected in recording.');
    }

    const wavBlob = encodeWav(audioBuffer, 16000);
    return {
      audioBlob: wavBlob,
      mimeType: 'audio/wav',
      sizeBytes: wavBlob.size
    };
  } catch (err) {
    console.error('[audioExtractor] Extraction error:', err);
    throw new Error(
      'Could not extract audio from recording on this device. PrepPilot policy prevents uploading video files without audio separation. (' +
      (err.message || 'Decoding failed') + ')'
    );
  } finally {
    if (audioCtx.state !== 'closed') {
      try {
        await audioCtx.close();
      } catch (_e) {}
    }
  }
}

/**
 * Converts a Blob to a Base64 string for secure JSON transmission.
 * @param {Blob} blob 
 * @returns {Promise<string>}
 */
export function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => {
      const dataUrl = reader.result;
      if (typeof dataUrl === 'string') {
        const base64 = dataUrl.split(',')[1] || '';
        resolve(base64);
      } else {
        reject(new Error('Failed to convert Blob to base64.'));
      }
    };
    reader.onerror = (e) => reject(e);
    reader.readAsDataURL(blob);
  });
}
