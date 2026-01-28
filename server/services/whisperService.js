/**
 * OpenAI Whisper Service
 * Handles speech-to-text transcription using OpenAI's Whisper API
 */

const OpenAI = require('openai');
const fs = require('fs');

// Initialize OpenAI client
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Transcribe audio file using Whisper API with auto language detection
 * @param {string} audioFilePath - Path to the audio file
 * @returns {Promise<{text: string, language: string}>} - Transcribed text and detected language
 */
async function transcribeAudio(audioFilePath) {
  try {
    console.log('Transcribing audio file:', audioFilePath);

    // Create a read stream from the file
    const audioStream = fs.createReadStream(audioFilePath);

    // Call Whisper API with verbose_json to get language detection
    const transcription = await openai.audio.transcriptions.create({
      file: audioStream,
      model: 'whisper-1',
      // Removed language parameter to enable auto-detection
      response_format: 'verbose_json'
    });

    console.log('Transcription successful:', transcription.text);
    console.log('Detected language:', transcription.language);

    // Clean up the temporary file
    try {
      fs.unlinkSync(audioFilePath);
      console.log('Temporary audio file deleted');
    } catch (cleanupError) {
      console.error('Error deleting temporary file:', cleanupError);
    }

    return {
      text: transcription.text,
      language: transcription.language
    };
  } catch (error) {
    console.error('Error transcribing audio:', error);

    // Clean up the temporary file even on error
    try {
      if (fs.existsSync(audioFilePath)) {
        fs.unlinkSync(audioFilePath);
      }
    } catch (cleanupError) {
      console.error('Error deleting temporary file:', cleanupError);
    }

    throw new Error(`Transcription failed: ${error.message}`);
  }
}

module.exports = {
  transcribeAudio
};
