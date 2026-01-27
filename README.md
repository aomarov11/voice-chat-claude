# Conversational Voice Web App

A voice-enabled web application where you can have natural conversations with Claude using speech recognition and text-to-speech. Simply hold a button, speak your message, and hear Claude's response.

## Features

- **Push-to-Talk Interface**: Hold the button to speak, release to send
- **Speech Recognition**: Converts your voice to text using Web Speech API
- **Real-time Conversation**: Chat naturally with Claude AI
- **Text-to-Speech**: Hear Claude's responses spoken aloud
- **Conversation History**: Maintains context throughout the conversation
- **Responsive Design**: Works on desktop and mobile devices

## Tech Stack

- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Backend**: Node.js with Express
- **AI**: Claude API (Anthropic)
- **Speech**: Web Speech API (SpeechRecognition + SpeechSynthesis)

## Prerequisites

- Node.js (v14 or higher)
- npm or yarn
- Claude API key from [Anthropic](https://www.anthropic.com)
- A modern web browser (Chrome, Edge, or Safari recommended)

## Installation

1. **Clone or navigate to the project directory**
   ```bash
   cd my-ai-app
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create environment file**
   ```bash
   cp .env.example .env
   ```

4. **Configure environment variables**

   Edit the `.env` file and add your settings:
   ```
   CLAUDE_API_KEY=your_actual_api_key_here
   PORT=3000
   NODE_ENV=development

   # Authentication (protect your app from unauthorized access)
   AUTH_USERNAME=admin
   AUTH_PASSWORD=your_secure_password_here
   ```

   **Security Note**: Change `AUTH_PASSWORD` to a strong password. Without authentication, anyone can use your Claude API tokens!

## Running the Application

### Development Mode (with auto-reload)
```bash
npm run dev
```

### Production Mode
```bash
npm start
```

The server will start on `http://localhost:3000`

## Usage

1. Open your browser and navigate to `http://localhost:3000`
2. Allow microphone access when prompted
3. Hold down the blue push-to-talk button
4. Speak your message
5. Release the button when finished speaking
6. Wait for Claude to process and respond
7. Listen to Claude's spoken response
8. Repeat for continued conversation

## Browser Compatibility

The Web Speech API is required for this application to work:

- **Chrome/Edge**: Full support ✅
- **Safari**: Full support ✅
- **Firefox**: Limited support ⚠️
- **Other browsers**: May not be supported ❌

## Project Structure

```
my-ai-app/
├── server/
│   ├── index.js                 # Express server entry point
│   ├── routes/
│   │   └── api.js              # API routes for Claude
│   ├── middleware/
│   │   └── errorHandler.js     # Error handling
│   └── services/
│       └── claudeService.js    # Claude API wrapper
├── public/
│   ├── index.html              # Main page
│   ├── css/
│   │   └── styles.css          # Styles
│   └── js/
│       ├── app.js              # Main app logic
│       ├── speechRecognition.js # Speech-to-text wrapper
│       ├── textToSpeech.js     # TTS functionality
│       └── api.js              # Frontend API client
├── .env                        # Environment variables (git-ignored)
├── .env.example                # Example env file
├── .gitignore
├── package.json
└── README.md
```

## API Endpoints

### POST `/api/chat`

Send a message to Claude and receive a response.

**Request Body:**
```json
{
  "message": "Hello, Claude!",
  "conversationHistory": [
    { "role": "user", "content": "Previous message" },
    { "role": "assistant", "content": "Previous response" }
  ]
}
```

**Response:**
```json
{
  "reply": "Hello! How can I help you today?"
}
```

## Troubleshooting

### Microphone not working
- Ensure you've granted microphone permissions to your browser
- Check that your microphone is properly connected and working
- Try refreshing the page and granting permissions again

### Speech recognition not starting
- Make sure you're using a supported browser (Chrome, Edge, or Safari)
- Check the browser console for error messages
- Verify that no other application is using the microphone

### API errors
- Verify your `CLAUDE_API_KEY` is correctly set in the `.env` file
- Check that you have an active internet connection
- Ensure your API key has sufficient credits

### Button stuck in "processing" state
- Refresh the page to reset the state
- Check the browser console and server logs for errors
- Verify the backend server is running

## Security Considerations

- API key is stored server-side and never exposed to the frontend
- CORS and Helmet middleware for security headers
- Input validation on all API endpoints
- Sanitized error messages to prevent information leakage

## Development

To modify the application:

- **Frontend styling**: Edit `public/css/styles.css`
- **UI structure**: Edit `public/index.html`
- **App logic**: Edit `public/js/app.js`
- **Speech features**: Edit `public/js/speechRecognition.js` and `textToSpeech.js`
- **API integration**: Edit `server/services/claudeService.js`
- **Server configuration**: Edit `server/index.js`

## License

MIT

## Acknowledgments

- Built with [Claude](https://www.anthropic.com/claude) by Anthropic
- Uses Web Speech API for voice capabilities
- Express.js for the backend server
