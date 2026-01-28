/**
 * Audio Recording Wrapper using MediaRecorder API
 * Handles audio recording for transcription via OpenAI Whisper API
 */

class SpeechRecognitionWrapper {
  constructor() {
    // Check for MediaRecorder API support
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      this.supported = false;
      console.error('MediaRecorder API is not supported in this browser');
      return;
    }

    this.supported = true;
    this.mediaRecorder = null;
    this.audioChunks = [];
    this.stream = null;
    this.isRecording = false;
    this.isStarting = false;
    this.pendingStop = false;

    // Callback handlers
    this.onResult = null;
    this.onError = null;
    this.onEnd = null;
    this.onStart = null;
  }

  /**
   * Start recording audio
   */
  async start() {
    if (!this.supported) {
      console.error('Audio recording not supported');
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
      console.log('🎙️ Requesting microphone access...');
      this.isStarting = true;
      this.pendingStop = false;
      this.audioChunks = [];

      // Request microphone access
      this.stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: 1,
          sampleRate: 16000,
          echoCancellation: true,
          noiseSuppression: true
        }
      });

      console.log('✅ Microphone access granted');

      // Determine the best MIME type for recording
      let mimeType = 'audio/webm';
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        mimeType = 'audio/webm;codecs=opus';
      } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
        mimeType = 'audio/mp4';
      } else if (MediaRecorder.isTypeSupported('audio/ogg;codecs=opus')) {
        mimeType = 'audio/ogg;codecs=opus';
      }

      console.log('Using MIME type:', mimeType);

      // Create MediaRecorder
      this.mediaRecorder = new MediaRecorder(this.stream, {
        mimeType: mimeType
      });

      // Setup event handlers
      this.mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          this.audioChunks.push(event.data);
          console.log('📦 Audio chunk received, size:', event.data.size);
        }
      };

      this.mediaRecorder.onstart = () => {
        console.log('✅ Recording started successfully');
        this.isStarting = false;
        this.isRecording = true;

        // If stop was requested while starting, stop immediately
        if (this.pendingStop) {
          console.log('Stop was pending, stopping immediately');
          this.pendingStop = false;
          this.stop();
          return;
        }

        if (this.onStart) {
          this.onStart();
        }
      };

      this.mediaRecorder.onstop = async () => {
        console.log('🛑 Recording stopped');
        console.log('Audio chunks collected:', this.audioChunks.length);

        this.isRecording = false;
        this.isStarting = false;
        this.pendingStop = false;

        // Stop all tracks
        if (this.stream) {
          this.stream.getTracks().forEach(track => track.stop());
          this.stream = null;
        }

        // Create blob from chunks
        if (this.audioChunks.length > 0) {
          const audioBlob = new Blob(this.audioChunks, { type: mimeType });
          console.log('✅ Created audio blob, size:', audioBlob.size);

          // Call onResult with the audio blob
          if (this.onResult) {
            this.onResult(audioBlob);
          }
        } else {
          console.warn('⚠️ No audio chunks collected');
          if (this.onError) {
            this.onError('no-speech');
          }
        }

        if (this.onEnd) {
          this.onEnd();
        }

        // Reset
        this.audioChunks = [];
        this.mediaRecorder = null;
      };

      this.mediaRecorder.onerror = (event) => {
        console.error('❌ MediaRecorder error:', event.error);
        this.isRecording = false;
        this.isStarting = false;
        this.pendingStop = false;

        // Stop stream
        if (this.stream) {
          this.stream.getTracks().forEach(track => track.stop());
          this.stream = null;
        }

        if (this.onError) {
          this.onError('audio-capture');
        }
      };

      // Start recording
      this.mediaRecorder.start(1000); // Collect data every second
      console.log('📞 MediaRecorder.start() called');

      return true;
    } catch (error) {
      console.error('❌ Error starting recording:', error);
      console.error('Error details:', error.message, error.name);
      this.isStarting = false;

      // Stop stream if it was created
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
      }

      // Provide user-friendly error message
      if (error.name === 'NotAllowedError') {
        alert('Microphone access denied. Please allow microphone permissions and try again.');
      } else if (error.name === 'NotFoundError') {
        alert('No microphone found. Please connect a microphone and try again.');
      }

      if (this.onError) {
        this.onError(error.name === 'NotAllowedError' ? 'not-allowed' : 'audio-capture');
      }

      return false;
    }
  }

  /**
   * Stop recording audio
   */
  stop() {
    if (!this.supported) {
      return;
    }

    // If we're still starting, mark stop as pending
    if (this.isStarting) {
      console.log('Recording is starting, marking stop as pending');
      this.pendingStop = true;
      return;
    }

    // Only stop if we're actually recording
    if (!this.isRecording) {
      console.log('Not recording, nothing to stop');
      return;
    }

    try {
      console.log('Calling mediaRecorder.stop()...');
      if (this.mediaRecorder && this.mediaRecorder.state !== 'inactive') {
        this.mediaRecorder.stop();
      }
    } catch (error) {
      console.error('Error stopping recording:', error);
      this.isRecording = false;
      this.isStarting = false;

      // Stop stream
      if (this.stream) {
        this.stream.getTracks().forEach(track => track.stop());
        this.stream = null;
      }
    }
  }

  /**
   * Check if audio recording is supported
   */
  isSupported() {
    return this.supported;
  }
}
