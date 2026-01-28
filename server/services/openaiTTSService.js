/**
 * OpenAI Text-to-Speech Service
 * Handles text-to-speech using OpenAI's TTS API
 */

const OpenAI = require('openai');
const fs = require('fs');
const path = require('path');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Convert text to speech using OpenAI TTS API
 * @param {string} text - The text to convert to speech
 * @param {string} language - The detected language (e.g., 'en', 'ru')
 * @returns {Promise<Buffer>} - Audio buffer
 */
async function textToSpeech(text, language = 'en') {
  try {
    console.log('Generating speech for text:', text.substring(0, 50) + '...');
    console.log('Language:', language);

    // Select voice based on language
    // OpenAI supports: alloy, echo, fable, onyx, nova, shimmer
    // All voices support multiple languages including Russian
    let voice = 'alloy'; // Default voice

    // You can customize voice selection based on language preference
    if (language === 'ru') {
      voice = 'nova'; // Nova sounds good in Russian
    }

    // Call OpenAI TTS API
    const mp3 = await openai.audio.speech.create({
      model: 'tts-1', // tts-1 is faster, tts-1-hd is higher quality
      voice: voice,
      input: text,
      response_format: 'mp3',
      speed: 1.0 // Can be 0.25 to 4.0
    });

    // Convert response to buffer
    const buffer = Buffer.from(await mp3.arrayBuffer());

    console.log('Speech generated successfully, size:', buffer.length);

    return buffer;
  } catch (error) {
    console.error('Error generating speech:', error);
    throw new Error(`TTS failed: ${error.message}`);
  }
}

module.exports = {
  textToSpeech
};
