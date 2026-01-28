/**
 * Google Cloud Text-to-Speech Service
 * Handles text-to-speech using Google Cloud TTS API with native Russian voices
 */

const { TextToSpeechClient } = require('@google-cloud/text-to-speech');
const fs = require('fs');
const path = require('path');

// Initialize Google Cloud TTS client
let client;

function initializeClient() {
  if (client) return client;

  try {
    // Option 1: Use JSON credentials from environment variable
    if (process.env.GOOGLE_CLOUD_CREDENTIALS) {
      const credentials = JSON.parse(process.env.GOOGLE_CLOUD_CREDENTIALS);
      client = new TextToSpeechClient({
        credentials: credentials
      });
      console.log('Google Cloud TTS initialized with credentials from env variable');
    }
    // Option 2: Use credentials file path (GOOGLE_APPLICATION_CREDENTIALS)
    else if (process.env.GOOGLE_APPLICATION_CREDENTIALS) {
      client = new TextToSpeechClient({
        keyFilename: process.env.GOOGLE_APPLICATION_CREDENTIALS
      });
      console.log('Google Cloud TTS initialized with credentials file');
    }
    // Option 3: Default (will use gcloud CLI auth if available)
    else {
      client = new TextToSpeechClient();
      console.log('Google Cloud TTS initialized with default credentials');
    }

    return client;
  } catch (error) {
    console.error('Error initializing Google Cloud TTS:', error);
    throw new Error('Failed to initialize Google Cloud TTS client');
  }
}

/**
 * Convert text to speech using Google Cloud TTS API
 * @param {string} text - The text to convert to speech
 * @param {string} language - The detected language (e.g., 'en', 'ru', 'russian', 'english')
 * @returns {Promise<Buffer>} - Audio buffer
 */
async function textToSpeech(text, language = 'en') {
  try {
    console.log('Google TTS: Generating speech for text:', text.substring(0, 50) + '...');
    console.log('Google TTS: Language:', language);

    const ttsClient = initializeClient();

    // Map language codes to Google Cloud language codes and select appropriate voice
    let languageCode = 'en-US';
    let voiceName = 'en-US-Neural2-C'; // Default female English voice

    // Normalize language input
    const lang = language.toLowerCase();

    if (lang === 'ru' || lang === 'russian') {
      languageCode = 'ru-RU';
      voiceName = 'ru-RU-Wavenet-C'; // High-quality native Russian female voice
      // Alternatives:
      // 'ru-RU-Wavenet-A' - female
      // 'ru-RU-Wavenet-B' - male
      // 'ru-RU-Wavenet-C' - female (softer)
      // 'ru-RU-Wavenet-D' - male
      // 'ru-RU-Wavenet-E' - female
    } else if (lang === 'en' || lang === 'english') {
      languageCode = 'en-US';
      voiceName = 'en-US-Neural2-C'; // High-quality English female voice
      // Alternatives:
      // 'en-US-Neural2-A' - male
      // 'en-US-Neural2-C' - female
      // 'en-US-Neural2-D' - male
      // 'en-US-Neural2-F' - female
    }

    console.log('Google TTS: Using voice:', voiceName);

    // Construct the request
    const request = {
      input: { text: text },
      voice: {
        languageCode: languageCode,
        name: voiceName
      },
      audioConfig: {
        audioEncoding: 'MP3',
        speakingRate: 1.0, // 0.25 to 4.0
        pitch: 0.0, // -20.0 to 20.0
        volumeGainDb: 0.0 // -96.0 to 16.0
      }
    };

    // Perform the text-to-speech request
    const [response] = await ttsClient.synthesizeSpeech(request);

    console.log('Google TTS: Speech generated successfully, size:', response.audioContent.length);

    return response.audioContent;
  } catch (error) {
    console.error('Google TTS Error:', error);
    throw new Error(`Google TTS failed: ${error.message}`);
  }
}

module.exports = {
  textToSpeech
};
