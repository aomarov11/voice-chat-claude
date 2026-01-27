/**
 * Speech Recognition Wrapper
 * Handles speech-to-text functionality using Web Speech API
 */

class SpeechRecognitionWrapper {
  constructor() {
    // Check for Web Speech API support
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      this.supported = false;
      console.error('Web Speech API is not supported in this browser');
      return;
    }

    this.supported = true;
    this.recognition = new SpeechRecognition();

    // Configure recognition
    this.recognition.lang = 'en-US';
    this.recognition.continuous = true;  // Keep listening until we explicitly stop
    this.recognition.interimResults = true;  // Get interim results while speaking
    this.recognition.maxAlternatives = 1;

    // Callback handlers
    this.onResult = null;
    this.onError = null;
    this.onEnd = null;
    this.onStart = null;

    // Track collected transcript
    this.collectedTranscript = '';
    this.isRecording = false;
    this.isStarting = false;  // Track if start() was called but onstart hasn't fired yet
    this.pendingStop = false;  // Track if stop was requested while starting

    // Setup event listeners
    this.setupEventListeners();
  }

  setupEventListeners() {
    this.recognition.onstart = () => {
      console.log('✅ Speech recognition started successfully');
      console.log('Recognition state - continuous:', this.recognition.continuous, 'interimResults:', this.recognition.interimResults);
      this.isStarting = false;  // No longer starting
      this.isRecording = true;
      this.collectedTranscript = '';  // Reset collected transcript

      // If stop was requested while starting, stop immediately
      if (this.pendingStop) {
        console.log('Stop was pending, stopping immediately');
        this.pendingStop = false;
        this.recognition.stop();
        return;
      }

      if (this.onStart) {
        this.onStart();
      }
    };

    this.recognition.onresult = (event) => {
      console.log('📝 onresult fired - results count:', event.results.length);

      // Build the full transcript from all results
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = 0; i < event.results.length; i++) {
        const result = event.results[i];
        const transcript = result[0].transcript;
        const confidence = result[0].confidence;

        console.log(`Result ${i}: isFinal=${result.isFinal}, transcript="${transcript}", confidence=${confidence}`);

        if (result.isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      // Update collected transcript with final results
      if (finalTranscript) {
        this.collectedTranscript = finalTranscript.trim();
        console.log('✅ Collected transcript so far:', this.collectedTranscript);
      }

      // Log interim results
      if (interimTranscript) {
        console.log('💬 Interim (not final):', interimTranscript);
      }

      // If we got nothing, log it
      if (!finalTranscript && !interimTranscript) {
        console.warn('⚠️ onresult fired but no transcript captured');
      }
    };

    this.recognition.onerror = (event) => {
      console.error('❌ Speech recognition error:', event.error);
      console.error('Error details:', {
        error: event.error,
        message: event.message,
        type: event.type,
        timeStamp: event.timeStamp
      });

      // Specific error messages
      switch(event.error) {
        case 'no-speech':
          console.warn('⚠️ No speech was detected. Make sure your microphone is working.');
          break;
        case 'audio-capture':
          console.error('⚠️ No microphone was found or it is not accessible.');
          break;
        case 'not-allowed':
          console.error('⚠️ Microphone permission was denied. Please allow microphone access.');
          break;
        case 'network':
          console.error('⚠️ Network error occurred during speech recognition.');
          break;
        case 'aborted':
          console.warn('⚠️ Speech recognition was aborted.');
          break;
        default:
          console.error('⚠️ Unknown speech recognition error:', event.error);
      }

      this.isRecording = false;
      this.isStarting = false;
      this.pendingStop = false;

      if (this.onError) {
        this.onError(event.error);
      }
    };

    this.recognition.onend = () => {
      console.log('🛑 Speech recognition ended');
      console.log('Was recording:', this.isRecording);
      console.log('Collected transcript length:', this.collectedTranscript.length);

      this.isRecording = false;
      this.isStarting = false;
      this.pendingStop = false;

      // Send the collected transcript when recording ends
      const finalText = this.collectedTranscript.trim();

      if (finalText) {
        console.log('✅ Final collected transcript:', finalText);
        if (this.onResult) {
          this.onResult(finalText, 1.0);
        }
      } else {
        console.warn('⚠️ No transcript collected - recognition ended without capturing speech');
        console.warn('This usually means: no speech detected, mic permission issue, or recognition stopped too quickly');
      }

      if (this.onEnd) {
        this.onEnd();
      }

      // Reset
      this.collectedTranscript = '';
    };
  }

  /**
   * Start listening for speech
   */
  async start() {
    if (!this.supported) {
      console.error('Speech recognition not supported');
      return false;
    }

    // Don't start if already recording or starting
    if (this.isRecording || this.isStarting) {
      console.log('Already recording or starting, ignoring start request');
      return false;
    }

    // Check microphone permission
    try {
      if (navigator.permissions) {
        const permissionStatus = await navigator.permissions.query({ name: 'microphone' });
        console.log('🎤 Microphone permission status:', permissionStatus.state);

        if (permissionStatus.state === 'denied') {
          console.error('❌ Microphone permission denied. Please allow microphone access in browser settings.');
          alert('Microphone access is denied. Please enable microphone permissions in your browser settings.');
          return false;
        }
      }
    } catch (permError) {
      console.warn('Could not check microphone permission:', permError);
    }

    try {
      console.log('🎙️ Attempting to start speech recognition...');
      this.isStarting = true;  // Mark that we're starting
      this.pendingStop = false;  // Clear any pending stop
      this.collectedTranscript = '';  // Clear any previous transcript

      this.recognition.start();
      console.log('📞 recognition.start() called successfully');
      return true;
    } catch (error) {
      console.error('❌ Error starting recognition:', error);
      console.error('Error details:', error.message, error.name);
      this.isStarting = false;

      // Provide user-friendly error message
      if (error.name === 'NotAllowedError') {
        alert('Microphone access denied. Please allow microphone permissions and try again.');
      } else if (error.name === 'NotFoundError') {
        alert('No microphone found. Please connect a microphone and try again.');
      }

      return false;
    }
  }

  /**
   * Stop listening for speech
   */
  stop() {
    if (!this.supported) {
      return;
    }

    // If we're still starting (onstart hasn't fired yet), mark stop as pending
    if (this.isStarting) {
      console.log('Recognition is starting, marking stop as pending');
      this.pendingStop = true;
      return;
    }

    // Only stop if we're actually recording
    if (!this.isRecording) {
      console.log('Not recording, nothing to stop');
      return;
    }

    try {
      console.log('Calling recognition.stop()...');
      this.recognition.stop();

      // Force state reset after a short delay as backup
      setTimeout(() => {
        if (this.isRecording || this.isStarting) {
          console.warn('Force stopping - recognition did not end naturally');
          this.isRecording = false;
          this.isStarting = false;
          this.pendingStop = false;
          try {
            this.recognition.abort();
          } catch (e) {
            console.error('Error aborting:', e);
          }
        }
      }, 500);
    } catch (error) {
      console.error('Error stopping recognition:', error);
      this.isRecording = false;
      this.isStarting = false;
      // Try abort as fallback
      try {
        this.recognition.abort();
      } catch (abortError) {
        console.error('Error aborting recognition:', abortError);
      }
    }
  }

  /**
   * Check if speech recognition is supported
   */
  isSupported() {
    return this.supported;
  }
}
