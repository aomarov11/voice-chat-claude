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
  recordingRequested: false,  // Track if we've requested recording (even if not started yet)
  pressStartTime: null,  // Track when press started (for detecting hold vs toggle)
  isHoldMode: false,  // Track if user is in hold-to-talk mode
  shouldStopOnRelease: false,  // Track if we should stop on next release (for toggle mode)
  silentMode: false  // Track if silent mode is enabled (text only, no voice output)
};

// DOM elements
const elements = {
  pushToTalkButton: document.getElementById('pushToTalkButton'),
  conversationContainer: document.getElementById('conversationContainer'),
  status: document.getElementById('status'),
  compatibilityWarning: document.getElementById('compatibilityWarning'),
  loadingSpinner: document.getElementById('loadingSpinner'),
  silentModeToggle: document.getElementById('silentModeToggle')
};

/**
 * Initialize the application
 */
function initializeApp() {
  console.log('Initializing Voice Chat App...');
  console.log('Browser:', navigator.userAgent);
  console.log('Platform:', navigator.platform);

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

  // Setup silent mode toggle
  setupSilentModeToggle();

  // Log that button is ready
  console.log('Push-to-talk button element:', elements.pushToTalkButton);
  console.log('Button disabled:', elements.pushToTalkButton.disabled);

  console.log('App initialized successfully');
  updateStatus('Ready - Tap to toggle or hold to talk');
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
  console.log('Setting up push-to-talk button event listeners...');

  // Prevent default button behavior
  elements.pushToTalkButton.addEventListener('click', (e) => {
    console.log('>>> BUTTON click event fired (this is prevented, using mousedown/up instead)');
    e.preventDefault();
  });

  // Support both toggle and hold modes
  elements.pushToTalkButton.addEventListener('mousedown', (e) => {
    console.log('>>> BUTTON mousedown');
    e.preventDefault();
    e.stopPropagation();
    handlePressStart('button');
  });

  elements.pushToTalkButton.addEventListener('mouseup', (e) => {
    console.log('>>> BUTTON mouseup');
    e.preventDefault();
    e.stopPropagation();
    handlePressEnd('button');
  });

  elements.pushToTalkButton.addEventListener('mouseleave', (e) => {
    console.log('>>> BUTTON mouseleave');
    // If they're holding and mouse leaves, treat it as release
    if (appState.isHoldMode || appState.recordingRequested) {
      handlePressEnd('button');
    }
  });

  // Pointer events (more modern, works in more browsers including Arc)
  elements.pushToTalkButton.addEventListener('pointerdown', (e) => {
    console.log('>>> BUTTON pointerdown');
    e.preventDefault();
    e.stopPropagation();
    handlePressStart('button');
  });

  elements.pushToTalkButton.addEventListener('pointerup', (e) => {
    console.log('>>> BUTTON pointerup');
    e.preventDefault();
    e.stopPropagation();
    handlePressEnd('button');
  });

  // Touch support for mobile
  elements.pushToTalkButton.addEventListener('touchstart', (e) => {
    console.log('>>> BUTTON touchstart');
    e.preventDefault();
    handlePressStart('button');
  });

  elements.pushToTalkButton.addEventListener('touchend', (e) => {
    console.log('>>> BUTTON touchend');
    e.preventDefault();
    handlePressEnd('button');
  });

  // Debug: Log ALL events on the button
  ['click', 'mousedown', 'mouseup', 'pointerdown', 'pointerup', 'touchstart', 'touchend'].forEach(eventType => {
    elements.pushToTalkButton.addEventListener(eventType, () => {
      console.log(`[DEBUG] Button ${eventType} event fired`);
    }, { passive: false });
  });

  console.log('Button event listeners set up successfully');
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
      handlePressStart('space');
    }
  });

  document.addEventListener('keyup', (e) => {
    // Only respond to SPACE bar
    if (e.code === 'Space' || e.keyCode === 32) {
      console.log('>>> SPACE key UP detected');
      e.preventDefault();

      if (appState.spaceKeyPressed) {
        appState.spaceKeyPressed = false;
        handlePressEnd('space');
      }
    }
  });
}

/**
 * Handle press start (button/key pressed down)
 * Supports both toggle and hold modes
 */
function handlePressStart(source) {
  console.log('=== handlePressStart called ===', 'source:', source);
  console.log('appState.isProcessing:', appState.isProcessing);
  console.log('appState.isListening:', appState.isListening);
  console.log('appState.recordingRequested:', appState.recordingRequested);

  // Unlock iOS audio on first user interaction
  if (appState.textToSpeech && !appState.textToSpeech.iosUnlocked) {
    appState.textToSpeech.unlockIOSAudio();
  }

  // Don't start if already processing
  if (appState.isProcessing) {
    console.log('Already processing, ignoring press start');
    return;
  }

  // Record when the press started
  appState.pressStartTime = Date.now();

  // If already recording, mark to stop on release (toggle mode - second tap)
  if (appState.recordingRequested || appState.isListening) {
    console.log('Already recording - marking to stop on release (toggle mode)');
    appState.shouldStopOnRelease = true;
    return;
  }

  // Start recording (toggle mode - first tap)
  console.log('Starting recording...');
  appState.recordingRequested = true;
  appState.isHoldMode = false;
  appState.shouldStopOnRelease = false;

  // Update UI immediately
  updateButtonState('listening');
  updateStatus('Starting...');

  const started = appState.speechRecognition.start();
  console.log('start() returned:', started);

  if (!started) {
    updateStatus('Failed to start listening');
    appState.recordingRequested = false;
    updateButtonState('idle');
    appState.pressStartTime = null;
  }
}

/**
 * Handle press end (button/key released)
 * Detects if this is toggle mode or hold mode
 */
function handlePressEnd(source) {
  console.log('=== handlePressEnd called ===', 'source:', source);
  console.log('appState.isListening:', appState.isListening);
  console.log('appState.isProcessing:', appState.isProcessing);
  console.log('appState.recordingRequested:', appState.recordingRequested);
  console.log('appState.shouldStopOnRelease:', appState.shouldStopOnRelease);

  // If we're not recording, nothing to do
  if (!appState.recordingRequested && !appState.isListening) {
    console.log('Not recording, nothing to do');
    appState.pressStartTime = null;
    appState.shouldStopOnRelease = false;
    return;
  }

  // If marked to stop (toggle mode - second tap), stop immediately
  if (appState.shouldStopOnRelease) {
    console.log('Toggle mode - second tap - stopping recording');
    appState.speechRecognition.stop();
    appState.shouldStopOnRelease = false;
    appState.pressStartTime = null;
    return;
  }

  // Calculate hold duration
  const holdDuration = appState.pressStartTime ? Date.now() - appState.pressStartTime : 0;
  console.log('Hold duration:', holdDuration, 'ms');

  // Determine mode based on hold duration
  // If held for more than 300ms, it's hold mode (stop on release)
  // If released quickly (< 300ms), it's toggle mode (don't stop, wait for next press)
  const HOLD_MODE_THRESHOLD = 300; // milliseconds

  if (holdDuration >= HOLD_MODE_THRESHOLD) {
    // HOLD MODE: User held the button/key, stop recording on release
    console.log('Hold mode detected - stopping recording');
    appState.isHoldMode = true;
    appState.speechRecognition.stop();
  } else {
    // TOGGLE MODE: Quick tap (first tap), recording continues until next press
    console.log('Toggle mode - first tap - recording continues');
    appState.isHoldMode = false;
    // Don't stop - user needs to press again to stop
  }

  // Reset press start time
  appState.pressStartTime = null;
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
      appState.textToSpeech.speak(reply);
    } else {
      console.log('Silent mode enabled - skipping text-to-speech');
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
  appState.pressStartTime = null;
  appState.isHoldMode = false;
  appState.shouldStopOnRelease = false;
  updateButtonState('idle');
  updateStatus('Ready - Tap to toggle or hold to talk');
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

  // Update toggle UI to match state
  if (elements.silentModeToggle) {
    elements.silentModeToggle.checked = appState.silentMode;
    updateSilentModeUI();

    // Add change event listener
    elements.silentModeToggle.addEventListener('change', () => {
      appState.silentMode = elements.silentModeToggle.checked;

      // Save preference
      localStorage.setItem('silentMode', appState.silentMode);

      // Update UI
      updateSilentModeUI();

      console.log('Silent mode:', appState.silentMode ? 'ON (text only)' : 'OFF (voice enabled)');
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

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
