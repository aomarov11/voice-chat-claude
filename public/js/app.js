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
  silentModeToggle: document.getElementById('silentModeToggle'),
  debugLog: document.getElementById('debugLog'),
  debugLogContent: document.getElementById('debugLogContent'),
  debugShowBtn: document.getElementById('debugShowBtn')
};

/**
 * Debug logging function - logs to console AND visible UI
 */
function debugLog(message, type = 'info') {
  const timestamp = new Date().toLocaleTimeString();
  const fullMessage = `[${timestamp}] ${message}`;

  // Log to console with appropriate method
  switch(type) {
    case 'error':
      console.error(fullMessage);
      break;
    case 'warning':
      console.warn(fullMessage);
      break;
    case 'success':
      console.log('✅', fullMessage);
      break;
    default:
      console.log(fullMessage);
  }

  // Log to visible UI
  if (elements.debugLogContent) {
    const entry = document.createElement('div');
    entry.className = `debug-log-entry ${type}`;
    entry.textContent = fullMessage;
    elements.debugLogContent.appendChild(entry);

    // Auto-scroll to bottom
    elements.debugLogContent.scrollTop = elements.debugLogContent.scrollHeight;

    // Keep only last 50 entries
    const entries = elements.debugLogContent.children;
    if (entries.length > 50) {
      elements.debugLogContent.removeChild(entries[0]);
    }

    // Auto-show debug log
    if (elements.debugLog) {
      elements.debugLog.style.display = 'block';
    }
  }
}

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

  // Setup debug log controls
  setupDebugLog();

  // Log that button is ready
  console.log('Push-to-talk button element:', elements.pushToTalkButton);
  console.log('Button disabled:', elements.pushToTalkButton.disabled);

  console.log('App initialized successfully');
  debugLog('🚀 App initialized successfully - ready to record', 'success');
  updateStatus('Ready - Tap to toggle or hold to talk');
}

/**
 * Setup speech recognition event callbacks
 */
function setupSpeechRecognitionCallbacks() {
  // On speech recognition start
  appState.speechRecognition.onStart = () => {
    debugLog('✅ Listening started successfully', 'success');
    appState.isListening = true;
    updateButtonState('listening');
    updateStatus('Listening...');
  };

  // On speech recognition result
  appState.speechRecognition.onResult = async (transcript, confidence) => {
    debugLog(`📝 Got transcript: "${transcript}" (confidence: ${confidence})`, 'success');

    // Validate transcript
    if (!transcript || transcript.trim() === '') {
      debugLog('⚠️ Empty transcript received', 'warning');
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
    debugLog(`❌ Recognition error: ${error}`, 'error');
    appState.recordingRequested = false;  // Reset recording request on error

    let errorMessage = 'Error: ';
    switch (error) {
      case 'no-speech':
        errorMessage += 'No speech detected - speak immediately after pressing';
        debugLog('⚠️ No speech detected - you need to speak within a few seconds of pressing', 'warning');
        break;
      case 'audio-capture':
        errorMessage += 'No microphone found';
        debugLog('❌ No microphone found or accessible', 'error');
        break;
      case 'not-allowed':
        errorMessage += 'Microphone permission denied';
        debugLog('❌ Microphone permission denied - check browser settings', 'error');
        break;
      case 'aborted':
        errorMessage += 'Recording aborted';
        debugLog('⚠️ Recording was aborted (stopped too quickly?)', 'warning');
        break;
      default:
        errorMessage += 'Speech recognition failed';
        debugLog(`❌ Unknown error: ${error}`, 'error');
    }

    updateStatus(errorMessage);
    resetToIdle();
  };

  // On speech recognition end
  appState.speechRecognition.onEnd = () => {
    debugLog('🛑 Listening ended', 'info');
    appState.isListening = false;
    appState.recordingRequested = false;  // Reset the recording request flag
  };
}

/**
 * Setup push-to-talk button event handlers
 */
function setupPushToTalkButton() {
  console.log('Setting up push-to-talk button event listeners...');
  console.log('Button element:', elements.pushToTalkButton);
  console.log('Button computed style pointer-events:', window.getComputedStyle(elements.pushToTalkButton).pointerEvents);

  // Track if we've already handled the press in this cycle
  let handledPress = false;

  // Simpler approach: just use click for Arc compatibility
  elements.pushToTalkButton.addEventListener('click', (e) => {
    console.log('>>> BUTTON click event fired');
    e.preventDefault();
    e.stopPropagation();

    // Toggle behavior on click
    if (appState.recordingRequested || appState.isListening) {
      console.log('Click detected while recording - stopping');
      handlePressEnd('button-click');
    } else {
      console.log('Click detected while idle - starting');
      handlePressStart('button-click');
    }
  }, { passive: false, capture: false });

  // Also keep mousedown/up for hold mode
  elements.pushToTalkButton.addEventListener('mousedown', (e) => {
    console.log('>>> BUTTON mousedown');
    if (handledPress) return;
    handledPress = true;
    e.preventDefault();
    e.stopPropagation();
    handlePressStart('button-mouse');
  }, { passive: false });

  elements.pushToTalkButton.addEventListener('mouseup', (e) => {
    console.log('>>> BUTTON mouseup');
    if (!handledPress) return;
    handledPress = false;
    e.preventDefault();
    e.stopPropagation();
    handlePressEnd('button-mouse');
  }, { passive: false });

  elements.pushToTalkButton.addEventListener('mouseleave', (e) => {
    console.log('>>> BUTTON mouseleave');
    if (handledPress) {
      handledPress = false;
      if (appState.isHoldMode || appState.recordingRequested) {
        handlePressEnd('button-mouse');
      }
    }
  });

  // Pointer events (Arc might use these)
  elements.pushToTalkButton.addEventListener('pointerdown', (e) => {
    console.log('>>> BUTTON pointerdown', 'pointerType:', e.pointerType);
  }, { passive: false });

  elements.pushToTalkButton.addEventListener('pointerup', (e) => {
    console.log('>>> BUTTON pointerup', 'pointerType:', e.pointerType);
  }, { passive: false });

  // Touch support for mobile
  elements.pushToTalkButton.addEventListener('touchstart', (e) => {
    console.log('>>> BUTTON touchstart');
    if (handledPress) return;
    handledPress = true;
    e.preventDefault();
    handlePressStart('button-touch');
  }, { passive: false });

  elements.pushToTalkButton.addEventListener('touchend', (e) => {
    console.log('>>> BUTTON touchend');
    if (!handledPress) return;
    handledPress = false;
    e.preventDefault();
    handlePressEnd('button-touch');
  }, { passive: false });

  console.log('Button event listeners set up successfully');
}

/**
 * Setup keyboard controls (SPACE bar)
 */
function setupKeyboardControls() {
  console.log('Setting up keyboard controls...');

  // Test if we can capture keyboard events
  window.addEventListener('keydown', (e) => {
    console.log('Window keydown:', e.code, e.key, e.keyCode);
  }, { once: true });

  document.addEventListener('keydown', (e) => {
    console.log('>>> Document keydown:', 'code:', e.code, 'key:', e.key, 'keyCode:', e.keyCode);

    // Only respond to SPACE bar
    if (e.code === 'Space' || e.key === ' ' || e.keyCode === 32) {
      console.log('>>> SPACE key DOWN detected');
      // Prevent default space behavior (page scroll)
      e.preventDefault();
      e.stopPropagation();

      // Prevent repeated keydown events when holding the key
      if (appState.spaceKeyPressed) {
        console.log('Space already pressed, ignoring repeated keydown');
        return;
      }

      console.log('Processing SPACE keydown...');
      appState.spaceKeyPressed = true;
      handlePressStart('space');
    }
  }, { passive: false, capture: false });

  document.addEventListener('keyup', (e) => {
    console.log('>>> Document keyup:', 'code:', e.code, 'key:', e.key, 'keyCode:', e.keyCode);

    // Only respond to SPACE bar
    if (e.code === 'Space' || e.key === ' ' || e.keyCode === 32) {
      console.log('>>> SPACE key UP detected');
      e.preventDefault();
      e.stopPropagation();

      if (appState.spaceKeyPressed) {
        console.log('Processing SPACE keyup...');
        appState.spaceKeyPressed = false;
        handlePressEnd('space');
      }
    }
  }, { passive: false, capture: false });

  console.log('Keyboard controls set up successfully');
}

/**
 * Handle press start (button/key pressed down)
 * Supports both toggle and hold modes
 */
async function handlePressStart(source) {
  debugLog(`🎙️ Press START from ${source}`, 'info');
  debugLog(`State: processing=${appState.isProcessing}, listening=${appState.isListening}, requested=${appState.recordingRequested}`, 'info');

  // Unlock iOS audio on first user interaction
  if (appState.textToSpeech && !appState.textToSpeech.iosUnlocked) {
    appState.textToSpeech.unlockIOSAudio();
  }

  // Don't start if already processing
  if (appState.isProcessing) {
    debugLog('⚠️ Already processing, ignoring press', 'warning');
    return;
  }

  // Record when the press started
  appState.pressStartTime = Date.now();

  // If already recording, mark to stop on release (toggle mode - second tap)
  if (appState.recordingRequested || appState.isListening) {
    debugLog('🔄 Already recording - will stop on release (toggle mode)', 'info');
    appState.shouldStopOnRelease = true;
    return;
  }

  // Start recording (toggle mode - first tap)
  debugLog('▶️ Starting recording...', 'info');
  appState.recordingRequested = true;
  appState.isHoldMode = false;
  appState.shouldStopOnRelease = false;

  // Update UI immediately
  updateButtonState('listening');
  updateStatus('Requesting microphone...');

  const started = await appState.speechRecognition.start();
  debugLog(`Recognition start returned: ${started}`, started ? 'success' : 'error');

  if (!started) {
    debugLog('❌ Failed to start recognition', 'error');
    updateStatus('Failed to start - check microphone');
    appState.recordingRequested = false;
    updateButtonState('idle');
    appState.pressStartTime = null;
  } else {
    debugLog('✅ Recognition started - speak now!', 'success');
    updateStatus('Listening - speak now!');
  }
}

/**
 * Handle press end (button/key released)
 * Detects if this is toggle mode or hold mode
 */
function handlePressEnd(source) {
  debugLog(`🎙️ Press END from ${source}`, 'info');
  debugLog(`State: listening=${appState.isListening}, requested=${appState.recordingRequested}, shouldStop=${appState.shouldStopOnRelease}`, 'info');

  // If we're not recording, nothing to do
  if (!appState.recordingRequested && !appState.isListening) {
    debugLog('⚠️ Not recording, nothing to stop', 'warning');
    appState.pressStartTime = null;
    appState.shouldStopOnRelease = false;
    return;
  }

  // If marked to stop (toggle mode - second tap), stop immediately
  if (appState.shouldStopOnRelease) {
    debugLog('⏹️ Toggle mode - second tap - stopping recording', 'info');
    appState.speechRecognition.stop();
    appState.shouldStopOnRelease = false;
    appState.pressStartTime = null;
    return;
  }

  // Calculate hold duration
  const holdDuration = appState.pressStartTime ? Date.now() - appState.pressStartTime : 0;
  debugLog(`⏱️ Hold duration: ${holdDuration}ms`, 'info');

  // Determine mode based on hold duration
  // If held for more than 300ms, it's hold mode (stop on release)
  // If released quickly (< 300ms), it's toggle mode (don't stop, wait for next press)
  const HOLD_MODE_THRESHOLD = 300; // milliseconds

  if (holdDuration >= HOLD_MODE_THRESHOLD) {
    // HOLD MODE: User held the button/key, stop recording on release
    debugLog('⏹️ Hold mode detected - stopping recording', 'info');
    appState.isHoldMode = true;
    appState.speechRecognition.stop();
  } else {
    // TOGGLE MODE: Quick tap (first tap), recording continues until next press
    debugLog('🔄 Toggle mode - first tap - recording continues', 'info');
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

/**
 * Setup debug log controls
 */
function setupDebugLog() {
  console.log('Setting up debug log...');

  // Show debug log button
  if (elements.debugShowBtn) {
    elements.debugShowBtn.addEventListener('click', () => {
      if (elements.debugLog) {
        elements.debugLog.style.display = 'block';
      }
    });
  }

  console.log('Debug log initialized');
}

// Initialize app when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeApp);
} else {
  initializeApp();
}
