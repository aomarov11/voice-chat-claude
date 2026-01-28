/**
 * Text-to-Speech Wrapper
 * Handles text-to-speech functionality using OpenAI TTS API
 * Falls back to Web Speech API if needed
 */

class TextToSpeechWrapper {
  constructor() {
    this.supported = true; // Always supported since we use OpenAI TTS
    this.currentAudio = null;
    this.useOpenAI = true; // Use OpenAI TTS by default

    // Web Speech API fallback
    this.synthesis = window.speechSynthesis;
    this.currentUtterance = null;
    this.iosUnlocked = false;

    // Default configuration
    this.config = {
      rate: 1.0,    // Speed (0.1 to 10)
      pitch: 1.0,   // Pitch (0 to 2)
      volume: 1.0,  // Volume (0 to 1)
      lang: 'en-US'
    };

    // Web Speech API voices (fallback)
    if (window.speechSynthesis) {
      this.voices = [];
      this.loadVoices();

      if (window.speechSynthesis.onvoiceschanged !== undefined) {
        window.speechSynthesis.onvoiceschanged = () => {
          this.loadVoices();
        };
      }
    }
  }

  /**
   * Load available voices (important for iOS)
   */
  loadVoices() {
    this.voices = this.synthesis.getVoices();
    console.log('Loaded voices:', this.voices.length);
  }

  /**
   * Unlock iOS audio (must be called from user gesture)
   */
  unlockIOSAudio() {
    if (this.iosUnlocked) return;

    // iOS requires speaking something (even silence) from a user gesture
    const utterance = new SpeechSynthesisUtterance('');
    utterance.volume = 0;
    this.synthesis.speak(utterance);
    this.iosUnlocked = true;
    console.log('iOS audio unlocked');
  }

  /**
   * Speak the given text using OpenAI TTS API
   * @param {string} text - The text to speak
   * @param {object} options - Optional configuration including language
   * @returns {Promise<boolean>} - Success status
   */
  async speak(text, options = {}) {
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

    // Use OpenAI TTS API
    if (this.useOpenAI) {
      try {
        console.log('🔊 Using OpenAI TTS API');
        console.log('📝 Text:', text.substring(0, 100));
        console.log('🌍 Language:', options.language);

        // Get audio blob from API
        const audioBlob = await API.textToSpeech(text, options.language || 'en');

        console.log('✅ Received audio blob from server, size:', audioBlob.size);
        console.log('📦 Blob type:', audioBlob.type);

        // Create audio URL
        const audioUrl = URL.createObjectURL(audioBlob);
        console.log('🔗 Created audio URL:', audioUrl);

        // Create audio element
        this.currentAudio = new Audio(audioUrl);

        // Event handlers
        this.currentAudio.onplay = () => {
          console.log('🎵 Speech started (OpenAI TTS)');
        };

        this.currentAudio.onended = () => {
          console.log('✅ Speech ended (OpenAI TTS)');
          URL.revokeObjectURL(audioUrl);
          this.currentAudio = null;
        };

        this.currentAudio.onerror = (error) => {
          console.error('❌ Audio playback error:', error);
          console.error('Error details:', this.currentAudio.error);
          URL.revokeObjectURL(audioUrl);
          this.currentAudio = null;
        };

        // Play audio
        console.log('▶️ Playing audio...');
        try {
          await this.currentAudio.play();
          console.log('✅ Audio playback started successfully');
          return true;
        } catch (playError) {
          console.error('❌ Audio.play() failed:', playError);
          console.error('Play error name:', playError.name);
          console.error('Play error message:', playError.message);

          // Show user-friendly error on mobile
          if (playError.name === 'NotAllowedError') {
            alert('Audio playback blocked. Please enable audio permissions or tap to hear responses.');
          }

          // Fall back to Web Speech API
          console.log('🔄 Falling back to Web Speech API');
          return this.speakWithWebSpeech(text, options);
        }
      } catch (error) {
        console.error('❌ OpenAI TTS error:', error);
        console.error('Error stack:', error.stack);
        console.log('🔄 Falling back to Web Speech API');
        // Fall back to Web Speech API
        return this.speakWithWebSpeech(text, options);
      }
    } else {
      // Use Web Speech API
      return this.speakWithWebSpeech(text, options);
    }
  }

  /**
   * Speak using Web Speech API (fallback)
   * @param {string} text - The text to speak
   * @param {object} options - Optional configuration
   * @returns {boolean} - Success status
   */
  speakWithWebSpeech(text, options = {}) {
    if (!this.synthesis) {
      console.error('Web Speech API not available');
      return false;
    }

    // Ensure iOS audio is unlocked
    if (!this.iosUnlocked) {
      this.unlockIOSAudio();
    }

    // iOS/Safari sometimes needs a delay before speaking
    if (this.synthesis.paused) {
      this.synthesis.resume();
    }

    // Cancel any queued speech
    this.synthesis.cancel();

    // Create new utterance
    this.currentUtterance = new SpeechSynthesisUtterance(text);

    // Apply configuration
    this.currentUtterance.rate = options.rate || this.config.rate;
    this.currentUtterance.pitch = options.pitch || this.config.pitch;
    this.currentUtterance.volume = options.volume || this.config.volume;
    this.currentUtterance.lang = options.lang || this.config.lang;

    // Try to use a good voice
    if (this.voices.length > 0) {
      const preferredVoice = this.voices.find(voice =>
        voice.lang.startsWith('en') && !voice.name.includes('Google')
      );
      if (preferredVoice) {
        this.currentUtterance.voice = preferredVoice;
      }
    }

    // Event handlers
    this.currentUtterance.onstart = () => {
      console.log('Speech started (Web Speech API)');
    };

    this.currentUtterance.onend = () => {
      console.log('Speech ended (Web Speech API)');
      this.currentUtterance = null;
    };

    this.currentUtterance.onerror = (event) => {
      console.error('Speech error:', event.error);
      this.currentUtterance = null;
    };

    // Speak the text
    try {
      setTimeout(() => {
        this.synthesis.speak(this.currentUtterance);
      }, 100);
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
      // Stop OpenAI TTS audio
      if (this.currentAudio) {
        this.currentAudio.pause();
        this.currentAudio.currentTime = 0;
        this.currentAudio = null;
      }

      // Stop Web Speech API
      if (this.synthesis) {
        this.synthesis.cancel();
        this.currentUtterance = null;
      }
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
    if (!this.supported) return false;

    // Check OpenAI audio
    if (this.currentAudio && !this.currentAudio.paused) {
      return true;
    }

    // Check Web Speech API
    if (this.synthesis && this.synthesis.speaking) {
      return true;
    }

    return false;
  }
}
