/**
 * API Client
 * Handles communication with the backend API
 */

const API = {
  baseURL: '/api',

  /**
   * Send a message to Claude and get a response
   * @param {string} message - The user's message
   * @param {Array} conversationHistory - Array of previous messages
   * @returns {Promise<string>} - Claude's response
   */
  async sendMessageToClaude(message, conversationHistory = []) {
    try {
      const response = await fetch(`${this.baseURL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          conversationHistory: conversationHistory
        })
      });

      // Check if response is ok
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get response from server');
      }

      // Parse response
      const data = await response.json();

      // Validate response
      if (!data.reply) {
        throw new Error('Invalid response format from server');
      }

      return data.reply;
    } catch (error) {
      console.error('API Error:', error);

      // Provide user-friendly error messages
      if (error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to server');
      }

      throw error;
    }
  },

  /**
   * Transcribe audio using OpenAI Whisper API with language detection
   * @param {Blob} audioBlob - The audio blob to transcribe
   * @returns {Promise<{transcript: string, language: string}>} - The transcribed text and language
   */
  async transcribeAudio(audioBlob) {
    try {
      console.log('📤 Sending audio to transcription API, size:', audioBlob.size);

      // Create form data
      const formData = new FormData();
      formData.append('audio', audioBlob, 'recording.webm');

      // Send to backend
      const response = await fetch(`${this.baseURL}/transcribe`, {
        method: 'POST',
        body: formData
      });

      // Check if response is ok
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to transcribe audio');
      }

      // Parse response
      const data = await response.json();

      // Validate response
      if (!data.transcript) {
        throw new Error('Invalid response format from transcription service');
      }

      console.log('✅ Transcription received:', data.transcript);
      console.log('🌍 Language detected:', data.language);

      return {
        transcript: data.transcript,
        language: data.language
      };
    } catch (error) {
      console.error('Transcription API Error:', error);

      // Provide user-friendly error messages
      if (error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to transcription service');
      }

      throw error;
    }
  },

  /**
   * Convert text to speech using OpenAI TTS API
   * @param {string} text - The text to convert to speech
   * @param {string} language - The language code (e.g., 'en', 'ru')
   * @returns {Promise<Blob>} - Audio blob (MP3)
   */
  async textToSpeech(text, language = 'en') {
    try {
      console.log('🔊 Requesting TTS for text:', text.substring(0, 50) + '...');
      console.log('🌍 Language:', language);

      // Send to backend
      const response = await fetch(`${this.baseURL}/text-to-speech`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: text,
          language: language
        })
      });

      // Check if response is ok
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to generate speech');
      }

      // Get audio blob
      const audioBlob = await response.blob();

      console.log('✅ Audio received, size:', audioBlob.size);
      return audioBlob;
    } catch (error) {
      console.error('TTS API Error:', error);

      // Provide user-friendly error messages
      if (error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to TTS service');
      }

      throw error;
    }
  }
};
