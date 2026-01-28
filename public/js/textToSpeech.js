/**
 * Text-to-Speech Wrapper
 * Handles text-to-speech functionality using OpenAI TTS API
 * Falls back to Web Speech API if needed
 */

class TextToSpeechWrapper {
  constructor() {
    this.supported = true; // Always supported since we use OpenAI TTS
    this.currentAudio = null;

    // Detect mobile devices - use Web Speech API on mobile to avoid autoplay issues
    this.isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent) ||
                    ('ontouchstart' in window) ||
                    (navigator.maxTouchPoints > 0);

    // Use Web Speech API on mobile, Google Cloud TTS on desktop
    this.useOpenAI = !this.isMobile;

    console.log('🎵 TTS Mode:', this.isMobile ? 'Web Speech API (mobile)' : 'Google Cloud TTS (desktop)');

    // Web Speech API fallback
    this.synthesis = window.speechSynthesis;
    this.currentUtterance = null;
    this.iosUnlocked = false;
    this.audioUnlocked = false; // Track if audio context is unlocked

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
   * Unlock audio playback for mobile browsers
   * Must be called during a user interaction (touch/click)
   * This allows audio to play later without user interaction
   */
  async unlockAudioPlayback() {
    if (this.audioUnlocked) {
      console.log('Audio already unlocked');
      return;
    }

    console.log('🔓 Unlocking audio playback...');

    try {
      // Create a silent audio blob (1 second of silence, WAV format)
      const sampleRate = 22050;
      const duration = 0.1; // 100ms of silence
      const numSamples = sampleRate * duration;
      const buffer = new ArrayBuffer(44 + numSamples * 2);
      const view = new DataView(buffer);

      // WAV header
      const writeString = (offset, string) => {
        for (let i = 0; i < string.length; i++) {
          view.setUint8(offset + i, string.charCodeAt(i));
        }
      };

      writeString(0, 'RIFF');
      view.setUint32(4, 36 + numSamples * 2, true);
      writeString(8, 'WAVE');
      writeString(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, 1, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * 2, true);
      view.setUint16(32, 2, true);
      view.setUint16(34, 16, true);
      writeString(36, 'data');
      view.setUint32(40, numSamples * 2, true);

      // Write silence (zeros)
      for (let i = 0; i < numSamples; i++) {
        view.setInt16(44 + i * 2, 0, true);
      }

      // Create blob and audio element
      const blob = new Blob([buffer], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.volume = 0.01; // Very quiet

      // Play the silent audio to unlock the audio context
      await audio.play();
      console.log('✅ Audio playback unlocked successfully');

      // Clean up
      URL.revokeObjectURL(url);
      this.audioUnlocked = true;

      // Also unlock iOS speech synthesis
      this.unlockIOSAudio();
    } catch (error) {
      console.error('❌ Failed to unlock audio:', error);
      // Try iOS unlock as fallback
      this.unlockIOSAudio();
    }
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
        console.log('🔓 Audio unlocked:', this.audioUnlocked);

        try {
          await this.currentAudio.play();
          console.log('✅ Audio playback started successfully');
          return true;
        } catch (playError) {
          console.error('❌ Audio.play() failed:', playError);
          console.error('Play error name:', playError.name);
          console.error('Play error message:', playError.message);
          console.error('Was audio unlocked?', this.audioUnlocked);

          // Show user-friendly error on mobile
          if (playError.name === 'NotAllowedError') {
            console.error('🚫 Audio blocked by browser autoplay policy');
            alert('Audio playback blocked by browser. Try tapping the button again, or check browser audio settings.');
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
   * @returns {Promise<boolean>} - Success status
   */
  speakWithWebSpeech(text, options = {}) {
    return new Promise((resolve) => {
      if (!this.synthesis) {
        console.error('Web Speech API not available');
        resolve(false);
        return;
      }

      console.log('🗣️ Using Web Speech API');
      console.log('📝 Text:', text.substring(0, 100));
      console.log('🌍 Language option:', options.language);

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

      // Wait a bit for cancel to take effect
      setTimeout(() => {
        // Create new utterance
        this.currentUtterance = new SpeechSynthesisUtterance(text);

        // Map language codes
        let lang = 'en-US';
        if (options.language) {
          const detectedLang = options.language.toLowerCase();
          if (detectedLang === 'ru' || detectedLang === 'russian') {
            lang = 'ru-RU';
          } else if (detectedLang === 'en' || detectedLang === 'english') {
            lang = 'en-US';
          }
        }

        // Apply configuration
        this.currentUtterance.rate = options.rate || this.config.rate;
        this.currentUtterance.pitch = options.pitch || this.config.pitch;
        this.currentUtterance.volume = options.volume || this.config.volume;
        this.currentUtterance.lang = lang;

        console.log('🔊 Speaking with language:', lang);

        // Try to find a good voice for the language
        if (this.voices.length > 0) {
          const voicesForLang = this.voices.filter(voice =>
            voice.lang.startsWith(lang.split('-')[0])
          );

          if (voicesForLang.length > 0) {
            // Prefer local/native voices over network voices
            const localVoice = voicesForLang.find(v => v.localService);
            this.currentUtterance.voice = localVoice || voicesForLang[0];
            console.log('🎤 Using voice:', this.currentUtterance.voice.name);
          }
        }

        // Event handlers
        this.currentUtterance.onstart = () => {
          console.log('✅ Speech started (Web Speech API)');
        };

        this.currentUtterance.onend = () => {
          console.log('✅ Speech ended (Web Speech API)');
          this.currentUtterance = null;
          resolve(true);
        };

        this.currentUtterance.onerror = (event) => {
          console.error('❌ Speech error:', event.error);
          this.currentUtterance = null;
          resolve(false);
        };

        // Speak the text
        try {
          this.synthesis.speak(this.currentUtterance);
          console.log('📢 Speech queued');
        } catch (error) {
          console.error('❌ Error speaking text:', error);
          resolve(false);
        }
      }, 50);
    });
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
