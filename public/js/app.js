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
  spaceKeyPressed: false,  // Track if space is currently held down
  recordingRequested: false  // Track if we've requested recording (even if not started yet)
};

// DOM elements
const elements = {
  pushToTalkButton: document.getElementById('pushToTalkButton'),
  conversationContainer: document.getElementById('conversationContainer'),
  status: document.getElementById('status'),
  compatibilityWarning: document.getElementById('compatibilityWarning'),
  loadingSpinner: document.getElementById('loadingSpinner')
};

/**
 * Initialize the application
 */
function initializeApp() {
  console.log('Initializing Voice Chat App...');

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

  // Setup keyboard controls
  setupKeyboardControls();

  console.log('App initialized successfully');
  updateStatus('Ready - Press SPACE or click button');
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

  // On speech recognition result
  appState.speechRecognition.onResult = async (transcript, confidence) => {
    console.log('Got transcript:', transcript);

    // Validate transcript
    if (!transcript || transcript.trim() === '') {
      updateStatus('No speech detected. Try again.');
      resetToIdle();
      return;
    }

    // Add user message to conversation
    addMessageToUI('user', transcript);
    appState.conversationHistory.push({
      role: 'user',
      content: transcript
    });

    // Process the message
    await processUserMessage(transcript);
  };

  // On speech recognition error
  appState.speechRecognition.onError = (error) => {
    console.error('Recognition error:', error);
    appState.recordingRequested = false;  // Reset recording request on error

    let errorMessage = 'Error: ';
    switch (error) {
      case 'no-speech':
        errorMessage += 'No speech detected';
        break;
      case 'audio-capture':
        errorMessage += 'No microphone found';
        break;
      case 'not-allowed':
        errorMessage += 'Microphone permission denied';
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
  // Click to toggle (simpler behavior)
  elements.pushToTalkButton.addEventListener('click', () => {
    console.log('>>> BUTTON clicked');
    handleTalkToggle();
  });
}

/**
 * Setup keyboard controls (SPACE bar)
 */
function setupKeyboardControls() {
  document.addEventListener('keydown', (e) => {
    // Only respond to SPACE bar
    if (e.code === 'Space' || e.keyCode === 32) {
      console.log('>>> SPACE key DOWN detected');
      // Prevent default space behavior (page scroll)
      e.preventDefault();

      // Prevent repeated keydown events when holding the key
      if (appState.spaceKeyPressed) {
        console.log('Space already pressed, ignoring repeated keydown');
        return;
      }

      appState.spaceKeyPressed = true;

      // Toggle behavior - same as button
      handleTalkToggle();
    }
  });

  document.addEventListener('keyup', (e) => {
    // Only respond to SPACE bar
    if (e.code === 'Space' || e.keyCode === 32) {
      console.log('>>> SPACE key UP detected');
      e.preventDefault();

      // Just reset the flag, don't trigger any action
      appState.spaceKeyPressed = false;
    }
  });
}

/**
 * Handle start of talk (button/key pressed)
 */
function handleTalkStart() {
  console.log('=== handleTalkStart called ===');
  console.log('appState.isProcessing:', appState.isProcessing);
  console.log('appState.isListening:', appState.isListening);
  console.log('appState.recordingRequested:', appState.recordingRequested);

  // Don't start if already processing
  if (appState.isProcessing) {
    console.log('Already processing, ignoring talk start');
    return;
  }

  // Don't start if we've already requested recording
  if (appState.recordingRequested) {
    console.log('Recording already requested, ignoring talk start');
    return;
  }

  console.log('Calling speechRecognition.start()...');
  appState.recordingRequested = true;  // Mark that we've requested recording

  // Update UI immediately to show we're starting to listen
  updateButtonState('listening');
  updateStatus('Starting...');

  const started = appState.speechRecognition.start();
  console.log('start() returned:', started);

  if (!started) {
    updateStatus('Failed to start listening');
    appState.recordingRequested = false;  // Reset if start failed
    updateButtonState('idle');
  }
}

/**
 * Handle end of talk (button/key released)
 */
function handleTalkEnd() {
  console.log('=== handleTalkEnd called ===');
  console.log('appState.isListening:', appState.isListening);
  console.log('appState.isProcessing:', appState.isProcessing);
  console.log('appState.recordingRequested:', appState.recordingRequested);

  // If we requested recording, we need to stop it (even if it hasn't fully started yet)
  if (appState.recordingRequested || appState.isListening) {
    console.log('Attempting to stop speech recognition...');
    appState.speechRecognition.stop();
    // Don't reset recordingRequested here - let the onEnd callback do it
  } else {
    console.log('No recording in progress or requested, nothing to stop');
  }
}

/**
 * Toggle recording on/off (for button clicks)
 */
function handleTalkToggle() {
  console.log('=== handleTalkToggle called ===');
  console.log('appState.recordingRequested:', appState.recordingRequested);
  console.log('appState.isListening:', appState.isListening);
  console.log('appState.isProcessing:', appState.isProcessing);

  // If processing, ignore
  if (appState.isProcessing) {
    console.log('Processing, ignoring toggle');
    return;
  }

  // If recording or requested, stop
  if (appState.recordingRequested || appState.isListening) {
    console.log('Currently recording, stopping...');
    handleTalkEnd();
  } else {
    // Otherwise, start
    console.log('Not recording, starting...');
    handleTalkStart();
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

    // Speak the response
    appState.textToSpeech.speak(reply);

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
  appState.recordingRequested = false;  // Reset recording request
  updateButtonState('idle');
  updateStatus('Ready - Press SPACE or click button');
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

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
