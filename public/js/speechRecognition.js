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
      console.log('Speech recognition started');
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
      // Build the full transcript from all results
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = 0; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript + ' ';
        } else {
          interimTranscript += transcript;
        }
      }

      // Update collected transcript with final results
      if (finalTranscript) {
        this.collectedTranscript = finalTranscript.trim();
        console.log('Collected transcript so far:', this.collectedTranscript);
      }

      // Log interim results
      if (interimTranscript) {
        console.log('Interim:', interimTranscript);
      }
    };

    this.recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      this.isRecording = false;
      this.isStarting = false;
      this.pendingStop = false;

      if (this.onError) {
        this.onError(event.error);
      }
    };

    this.recognition.onend = () => {
      console.log('Speech recognition ended');
      this.isRecording = false;
      this.isStarting = false;
      this.pendingStop = false;

      // Send the collected transcript when recording ends
      const finalText = this.collectedTranscript.trim();
      console.log('Final collected transcript:', finalText);

      if (this.onResult && finalText) {
        this.onResult(finalText, 1.0);
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
  start() {
    if (!this.supported) {
      console.error('Speech recognition not supported');
      return false;
    }

    // Don't start if already recording or starting
    if (this.isRecording || this.isStarting) {
      console.log('Already recording or starting, ignoring start request');
      return false;
    }

    try {
      this.isStarting = true;  // Mark that we're starting
      this.pendingStop = false;  // Clear any pending stop
      this.recognition.start();
      return true;
    } catch (error) {
      console.error('Error starting recognition:', error);
      this.isStarting = false;
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
