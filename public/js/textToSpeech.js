/**
 * Text-to-Speech Wrapper
 * Handles text-to-speech functionality using Web Speech API
 */

class TextToSpeechWrapper {
  constructor() {
    // Check for Speech Synthesis support
    if (!('speechSynthesis' in window)) {
      this.supported = false;
      console.error('Speech Synthesis is not supported in this browser');
      return;
    }

    this.supported = true;
    this.synthesis = window.speechSynthesis;
    this.currentUtterance = null;

    // Default configuration
    this.config = {
      rate: 1.0,    // Speed (0.1 to 10)
      pitch: 1.0,   // Pitch (0 to 2)
      volume: 1.0,  // Volume (0 to 1)
      lang: 'en-US'
    };
  }

  /**
   * Speak the given text
   * @param {string} text - The text to speak
   * @param {object} options - Optional configuration overrides
   */
  speak(text, options = {}) {
    if (!this.supported) {
      console.error('Speech synthesis not supported');
      return false;
    }

    if (!text || text.trim() === '') {
      console.warn('No text provided to speak');
      return false;
    }

    // Cancel any ongoing speech
    this.stop();

    // Create new utterance
    this.currentUtterance = new SpeechSynthesisUtterance(text);

    // Apply configuration
    this.currentUtterance.rate = options.rate || this.config.rate;
    this.currentUtterance.pitch = options.pitch || this.config.pitch;
    this.currentUtterance.volume = options.volume || this.config.volume;
    this.currentUtterance.lang = options.lang || this.config.lang;

    // Event handlers
    this.currentUtterance.onstart = () => {
      console.log('Speech started');
    };

    this.currentUtterance.onend = () => {
      console.log('Speech ended');
      this.currentUtterance = null;
    };

    this.currentUtterance.onerror = (event) => {
      console.error('Speech error:', event.error);
      this.currentUtterance = null;
    };

    // Speak the text
    try {
      this.synthesis.speak(this.currentUtterance);
      return true;
    } catch (error) {
      console.error('Error speaking text:', error);
      return false;
    }
  }

  /**
   * Stop any ongoing speech
   */
  stop() {
    if (!this.supported) {
      return;
    }

    try {
      this.synthesis.cancel();
      this.currentUtterance = null;
    } catch (error) {
      console.error('Error stopping speech:', error);
    }
  }

  /**
   * Pause ongoing speech
   */
  pause() {
    if (!this.supported) {
      return;
    }

    try {
      this.synthesis.pause();
    } catch (error) {
      console.error('Error pausing speech:', error);
    }
  }

  /**
   * Resume paused speech
   */
  resume() {
    if (!this.supported) {
      return;
    }

    try {
      this.synthesis.resume();
    } catch (error) {
      console.error('Error resuming speech:', error);
    }
  }

  /**
   * Check if speech synthesis is supported
   */
  isSupported() {
    return this.supported;
  }

  /**
   * Check if currently speaking
   */
  isSpeaking() {
    return this.supported && this.synthesis.speaking;
  }
}
