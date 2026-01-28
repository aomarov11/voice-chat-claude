/**
 * Main Application Logic
 * Orchestrates speech recognition, API calls, and UI updates
 */

// Application state
const appState = {
  conversationHistory: [],
  isListening: false,
  isProcessing: false,
  speechRecognition: null,
  textToSpeech: null,
  recordingRequested: false,
  silentMode: false,  // Track if silent mode is enabled (text only, no voice output)
  currentLanguage: 'en'  // Track detected language for TTS
};

// DOM elements
const elements = {
  pushToTalkButton: document.getElementById('pushToTalkButton'),
  conversationContainer: document.getElementById('conversationContainer'),
  status: document.getElementById('status'),
  compatibilityWarning: document.getElementById('compatibilityWarning'),
  loadingSpinner: document.getElementById('loadingSpinner'),
  silentModeToggle: document.getElementById('silentModeToggle'),
  testAudioBtn: document.getElementById('testAudioBtn')
};

/**
 * Initialize the application
 */
function initializeApp() {
  console.log('Initializing Voice Chat App...');
  console.log('Browser:', navigator.userAgent);
  console.log('Platform:', navigator.platform);

  // Detect device type
  const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  console.log('Touch device:', isTouchDevice);

  // Update UI text based on device type
  const subtitle = document.getElementById('subtitle');
  const buttonText = document.getElementById('buttonText');
  const welcomeMessage = document.getElementById('welcomeMessage');

  if (isTouchDevice) {
    // Mobile/Touch device - hold-to-talk only
    if (subtitle) subtitle.textContent = 'Press and hold to talk';
    if (buttonText) buttonText.textContent = 'Hold to Talk';
    if (welcomeMessage) {
      welcomeMessage.innerHTML = `
        <p>Welcome! Press and hold the button while talking.</p>
        <p style="margin-top: 10px; font-size: 0.9em;">Release when you're done to send your message.</p>
      `;
    }
  } else {
    // Desktop - toggle mode (click or SPACE key)
    if (subtitle) subtitle.textContent = 'Click or press SPACE to toggle';
    if (buttonText) buttonText.textContent = 'Click to Start';
    if (welcomeMessage) {
      welcomeMessage.innerHTML = `
        <p>Welcome! Click the button or press SPACE to start recording.</p>
        <p style="margin-top: 10px; font-size: 0.9em;">Click again or press SPACE to stop and send.</p>
      `;
    }
  }

  // Initialize speech recognition
  appState.speechRecognition = new SpeechRecognitionWrapper();
  appState.textToSpeech = new TextToSpeechWrapper();

  // Check browser compatibility
  if (!appState.speechRecognition.isSupported()) {
    showCompatibilityWarning();
    elements.pushToTalkButton.disabled = true;
    return;
  }

  // Setup speech recognition callbacks
  setupSpeechRecognitionCallbacks();

  // Setup push-to-talk button
  setupPushToTalkButton();

  // Setup keyboard controls (desktop only)
  if (!isTouchDevice) {
    setupKeyboardControls();
  }

  // Setup silent mode toggle
  setupSilentModeToggle();

  // Setup test audio button
  setupTestAudioButton();

  console.log('App initialized successfully');
  updateStatus(isTouchDevice ? 'Ready - Hold to talk' : 'Ready - Click to toggle');
}

/**
 * Setup speech recognition event callbacks
 */
function setupSpeechRecognitionCallbacks() {
  // On speech recognition start
  appState.speechRecognition.onStart = () => {
    console.log('Listening started');
    appState.isListening = true;
    updateButtonState('listening');
    updateStatus('Listening...');
  };

  // On audio recording result (receives audio blob)
  appState.speechRecognition.onResult = async (audioBlob) => {
    console.log('Got audio recording, size:', audioBlob.size, 'bytes');

    // Validate audio blob
    if (!audioBlob || audioBlob.size === 0) {
      console.warn('Empty audio blob received');
      updateStatus('No audio captured. Try again.');
      resetToIdle();
      return;
    }

    // Update status
    updateButtonState('processing');
    updateStatus('Transcribing audio...');

    try {
      // Send audio to transcription API (now returns {transcript, language})
      const result = await API.transcribeAudio(audioBlob);

      console.log('Transcription successful:', result.transcript);
      console.log('Detected language:', result.language);

      // Store detected language for TTS
      appState.currentLanguage = result.language;

      // Validate transcript
      if (!result.transcript || result.transcript.trim() === '') {
        console.warn('Empty transcript received');
        updateStatus('No speech detected. Try again.');
        resetToIdle();
        return;
      }

      // Add user message to conversation
      addMessageToUI('user', result.transcript);
      appState.conversationHistory.push({
        role: 'user',
        content: result.transcript
      });

      // Process the message with Claude
      await processUserMessage(result.transcript);
    } catch (error) {
      console.error('Transcription failed:', error);
      updateStatus(`Transcription error: ${error.message}`);
      resetToIdle();
    }
  };

  // On speech recognition error
  appState.speechRecognition.onError = (error) => {
    console.error('Recognition error:', error);
    appState.recordingRequested = false;  // Reset recording request on error

    let errorMessage = 'Error: ';
    switch (error) {
      case 'no-speech':
        errorMessage += 'No speech detected - speak immediately after pressing';
        break;
      case 'audio-capture':
        errorMessage += 'No microphone found';
        break;
      case 'not-allowed':
        errorMessage += 'Microphone permission denied';
        break;
      case 'aborted':
        errorMessage += 'Recording aborted';
        break;
      default:
        errorMessage += 'Speech recognition failed';
    }

    updateStatus(errorMessage);
    resetToIdle();
  };

  // On speech recognition end
  appState.speechRecognition.onEnd = () => {
    console.log('Listening ended');
    appState.isListening = false;
    appState.recordingRequested = false;  // Reset the recording request flag
  };
}

/**
 * Setup push-to-talk button event handlers
 */
function setupPushToTalkButton() {
  console.log('Setting up push-to-talk button event listeners...');

  // Detect if this is a touch device
  const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  console.log('Touch device detected:', isTouchDevice);

  if (isTouchDevice) {
    // MOBILE: Use simple hold-to-talk with touch events only
    let touchActive = false;

    elements.pushToTalkButton.addEventListener('touchstart', (e) => {
      console.log('Touch start');
      e.preventDefault();
      if (touchActive || appState.isProcessing) return;
      touchActive = true;
      handleMobileStart();
    }, { passive: false });

    elements.pushToTalkButton.addEventListener('touchend', (e) => {
      console.log('Touch end');
      e.preventDefault();
      if (!touchActive) return;
      touchActive = false;
      handleMobileEnd();
    }, { passive: false });

    elements.pushToTalkButton.addEventListener('touchcancel', (e) => {
      console.log('Touch cancel');
      e.preventDefault();
      if (!touchActive) return;
      touchActive = false;
      handleMobileEnd();
    }, { passive: false });

  } else {
    // DESKTOP: Use click for toggle mode
    elements.pushToTalkButton.addEventListener('click', (e) => {
      console.log('Desktop click');
      e.preventDefault();

      // Toggle behavior on click
      if (appState.isListening || appState.recordingRequested) {
        console.log('Stopping recording (toggle off)');
        appState.speechRecognition.stop();
        appState.shouldStopOnRelease = false;
      } else if (!appState.isProcessing) {
        console.log('Starting recording (toggle on)');
        handleDesktopStart();
      }
    }, { passive: false });
  }

  console.log('Button event listeners set up successfully');
}

/**
 * Setup keyboard controls (SPACE bar) - toggle mode like desktop
 */
function setupKeyboardControls() {
  console.log('Setting up keyboard controls...');

  let spacePressed = false;

  document.addEventListener('keydown', (e) => {
    // Only respond to SPACE bar
    if (e.code === 'Space' || e.key === ' ' || e.keyCode === 32) {
      // Prevent default space behavior (page scroll)
      e.preventDefault();

      // Prevent repeated keydown events when holding the key
      if (spacePressed) {
        return;
      }

      spacePressed = true;
      console.log('SPACE: Toggle recording');

      // Toggle behavior like desktop click
      if (appState.isListening || appState.recordingRequested) {
        console.log('Stopping recording');
        appState.speechRecognition.stop();
      } else if (!appState.isProcessing) {
        console.log('Starting recording');
        handleDesktopStart();
      }
    }
  }, { passive: false });

  document.addEventListener('keyup', (e) => {
    // Only respond to SPACE bar
    if (e.code === 'Space' || e.key === ' ' || e.keyCode === 32) {
      e.preventDefault();
      spacePressed = false;
    }
  }, { passive: false });

  console.log('Keyboard controls set up successfully');
}

/**
 * Handle mobile touch start - simple hold-to-talk mode
 */
async function handleMobileStart() {
  console.log('Mobile: Starting hold-to-talk');

  // CRITICAL: Unlock audio playback during user interaction
  // This allows audio to play later when Claude responds
  if (appState.textToSpeech) {
    try {
      await appState.textToSpeech.unlockAudioPlayback();
      console.log('✅ Audio playback unlocked for this session');
    } catch (error) {
      console.warn('⚠️ Could not unlock audio:', error);
    }
  }

  if (appState.isProcessing || appState.isListening) {
    console.log('Already active, ignoring');
    return;
  }

  appState.recordingRequested = true;
  updateButtonState('listening');
  updateStatus('Requesting microphone...');

  const started = await appState.speechRecognition.start();

  if (!started) {
    console.error('Failed to start recording');
    updateStatus('Failed to start - check microphone');
    appState.recordingRequested = false;
    updateButtonState('idle');
  } else {
    console.log('Recording started - hold and speak');
    updateStatus('Hold and speak!');
  }
}

/**
 * Handle mobile touch end - stop recording immediately
 */
function handleMobileEnd() {
  console.log('Mobile: Stopping recording');

  if (appState.isListening || appState.recordingRequested) {
    appState.speechRecognition.stop();
  }
}

/**
 * Handle desktop start - toggle mode
 */
async function handleDesktopStart() {
  console.log('Desktop: Starting recording (toggle mode)');

  // Unlock audio playback during user interaction
  if (appState.textToSpeech) {
    try {
      await appState.textToSpeech.unlockAudioPlayback();
      console.log('✅ Audio playback unlocked for this session');
    } catch (error) {
      console.warn('⚠️ Could not unlock audio:', error);
    }
  }

  if (appState.isProcessing) {
    return;
  }

  appState.recordingRequested = true;
  updateButtonState('listening');
  updateStatus('Requesting microphone...');

  const started = await appState.speechRecognition.start();

  if (!started) {
    console.error('Failed to start recording');
    updateStatus('Failed to start - check microphone');
    appState.recordingRequested = false;
    updateButtonState('idle');
  } else {
    console.log('Recording started - click again to stop');
    updateStatus('Recording - click to stop');
  }
}


/**
 * Process user message and get Claude's response
 */
async function processUserMessage(message) {
  appState.isProcessing = true;
  updateButtonState('processing');
  updateStatus('Processing...');

  try {
    // Call API
    const reply = await API.sendMessageToClaude(message, appState.conversationHistory);

    // Add assistant message to conversation
    appState.conversationHistory.push({
      role: 'assistant',
      content: reply
    });

    // Display message
    addMessageToUI('assistant', reply);

    // Speak the response only if silent mode is OFF
    if (!appState.silentMode) {
      console.log('🔊 Silent mode is OFF - playing audio response');
      console.log('🌍 Using language:', appState.currentLanguage);

      // Show visual indicator
      updateStatus('Playing audio...');

      try {
        // Pass the detected language to TTS
        const success = await appState.textToSpeech.speak(reply, {
          language: appState.currentLanguage
        });

        if (!success) {
          console.error('❌ TTS failed to play audio');
        }
      } catch (error) {
        console.error('❌ TTS error:', error);
      }
    } else {
      console.log('🔇 Silent mode is ENABLED - skipping text-to-speech');
    }

    updateStatus('Ready');
  } catch (error) {
    console.error('Error processing message:', error);
    updateStatus(`Error: ${error.message}`);

    // Show error message in chat
    addMessageToUI('assistant', `Sorry, I encountered an error: ${error.message}`);
  } finally {
    resetToIdle();
  }
}

/**
 * Add a message to the UI
 */
function addMessageToUI(role, content) {
  // Remove welcome message if it exists
  const welcomeMessage = elements.conversationContainer.querySelector('.welcome-message');
  if (welcomeMessage) {
    welcomeMessage.remove();
  }

  // Create message element
  const messageDiv = document.createElement('div');
  messageDiv.className = `message ${role}`;

  const bubbleDiv = document.createElement('div');
  bubbleDiv.className = 'message-bubble';

  const roleLabel = document.createElement('div');
  roleLabel.className = 'message-role';
  roleLabel.textContent = role === 'user' ? 'You' : 'Claude';

  const contentDiv = document.createElement('div');
  contentDiv.className = 'message-content';
  contentDiv.textContent = content;

  bubbleDiv.appendChild(roleLabel);
  bubbleDiv.appendChild(contentDiv);
  messageDiv.appendChild(bubbleDiv);

  elements.conversationContainer.appendChild(messageDiv);

  // Scroll to bottom
  scrollToBottom();
}

/**
 * Update button state visually
 */
function updateButtonState(state) {
  elements.pushToTalkButton.classList.remove('listening', 'processing');

  if (state === 'listening') {
    elements.pushToTalkButton.classList.add('listening');
    elements.status.classList.add('listening');
    elements.status.classList.remove('processing');
  } else if (state === 'processing') {
    elements.pushToTalkButton.classList.add('processing');
    elements.pushToTalkButton.disabled = true;
    elements.status.classList.add('processing');
    elements.status.classList.remove('listening');
  } else {
    elements.pushToTalkButton.disabled = false;
    elements.status.classList.remove('listening', 'processing');
  }
}

/**
 * Update status message
 */
function updateStatus(message) {
  elements.status.querySelector('.status-text').textContent = message;
}

/**
 * Reset to idle state
 */
function resetToIdle() {
  appState.isProcessing = false;
  appState.isListening = false;
  appState.recordingRequested = false;
  updateButtonState('idle');

  // Update status based on device type
  const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);
  updateStatus(isTouchDevice ? 'Ready - Hold to talk' : 'Ready - Click to toggle');
}

/**
 * Scroll conversation to bottom
 */
function scrollToBottom() {
  elements.conversationContainer.scrollTop = elements.conversationContainer.scrollHeight;
}

/**
 * Show compatibility warning
 */
function showCompatibilityWarning() {
  elements.compatibilityWarning.style.display = 'block';
  updateStatus('Browser not supported');
}

/**
 * Setup silent mode toggle
 */
function setupSilentModeToggle() {
  console.log('Setting up silent mode toggle...');

  // Load saved preference from localStorage
  const savedSilentMode = localStorage.getItem('silentMode');
  if (savedSilentMode !== null) {
    appState.silentMode = savedSilentMode === 'true';
  }

  console.log('🔊 Silent mode loaded from localStorage:', appState.silentMode);
  console.log('📱 Silent mode state:', appState.silentMode ? 'ON (text only)' : 'OFF (voice enabled)');

  // Update toggle UI to match state
  if (elements.silentModeToggle) {
    elements.silentModeToggle.checked = appState.silentMode;
    updateSilentModeUI();

    // Show alert if silent mode is ON at startup
    if (appState.silentMode) {
      setTimeout(() => {
        alert('Silent Mode is ON. You will see text responses but not hear audio. Toggle Silent Mode OFF to enable voice responses.');
      }, 500);
    }

    // Add change event listener
    elements.silentModeToggle.addEventListener('change', () => {
      appState.silentMode = elements.silentModeToggle.checked;

      // Save preference
      localStorage.setItem('silentMode', appState.silentMode);

      // Update UI
      updateSilentModeUI();

      console.log('🔊 Silent mode changed:', appState.silentMode ? 'ON (text only)' : 'OFF (voice enabled)');

      // Show user feedback
      if (appState.silentMode) {
        alert('Silent Mode enabled. You will see text but not hear audio.');
      } else {
        alert('Silent Mode disabled. You will now hear voice responses!');
      }
    });
  }

  console.log('Silent mode initialized:', appState.silentMode);
}

/**
 * Update UI based on silent mode state
 */
function updateSilentModeUI() {
  const label = document.querySelector('.silent-mode-label');
  if (label) {
    if (appState.silentMode) {
      label.classList.add('active');
    } else {
      label.classList.remove('active');
    }
  }
}

/**
 * Setup test audio button for troubleshooting
 */
function setupTestAudioButton() {
  if (!elements.testAudioBtn) return;

  elements.testAudioBtn.addEventListener('click', async () => {
    console.log('🧪 Testing audio playback...');

    // Check silent mode
    if (appState.silentMode) {
      alert('Silent mode is ON. Turn it off to test audio.');
      return;
    }

    // Disable button during test
    elements.testAudioBtn.disabled = true;
    elements.testAudioBtn.textContent = 'Testing...';

    try {
      // Unlock audio playback first
      await appState.textToSpeech.unlockAudioPlayback();

      // Test with a simple message
      const testText = 'Audio test successful. You should hear this message.';
      console.log('🔊 Playing test audio:', testText);

      const success = await appState.textToSpeech.speak(testText, {
        language: 'en'
      });

      if (success) {
        console.log('✅ Test audio completed');
        alert('Audio test completed! If you heard the message, audio is working.');
      } else {
        console.error('❌ Test audio failed');
        alert('Audio test failed. Check console for details.');
      }
    } catch (error) {
      console.error('❌ Test audio error:', error);
      alert('Audio test error: ' + error.message);
    } finally {
      // Re-enable button
      elements.testAudioBtn.disabled = false;
      elements.testAudioBtn.textContent = 'Test Audio';
    }
  });

  console.log('Test audio button initialized');
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
