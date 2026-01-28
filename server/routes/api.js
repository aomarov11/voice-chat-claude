const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const claudeService = require('../services/claudeService');
const whisperService = require('../services/whisperService');
const googleTTSService = require('../services/googleTTSService');

// Configure multer for audio file uploads with proper file extensions
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/');
  },
  filename: (req, file, cb) => {
    // Generate unique filename with original extension
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname) || '.webm'; // Default to .webm if no extension
    cb(null, 'audio-' + uniqueSuffix + ext);
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 25 * 1024 * 1024 // 25MB max (Whisper API limit)
  },
  fileFilter: (req, file, cb) => {
    // Accept audio files
    const allowedMimes = [
      'audio/webm',
      'audio/wav',
      'audio/mp3',
      'audio/mpeg',
      'audio/mp4',
      'audio/ogg',
      'audio/flac'
    ];

    if (allowedMimes.includes(file.mimetype) || file.mimetype.startsWith('audio/')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio files are allowed.'));
    }
  }
});

/**
 * POST /api/chat
 * Send a message to Claude and get a response
 *
 * Request body:
 * - message: string (required) - The user's message
 * - conversationHistory: array (optional) - Previous conversation messages
 *
 * Response:
 * - reply: string - Claude's response
 */
router.post('/chat', async (req, res, next) => {
  try {
    const { message, conversationHistory = [] } = req.body;

    // Validate request
    if (!message || typeof message !== 'string' || message.trim() === '') {
      return res.status(400).json({
        error: true,
        message: 'Message is required and must be a non-empty string'
      });
    }

    // Validate conversation history format
    if (!Array.isArray(conversationHistory)) {
      return res.status(400).json({
        error: true,
        message: 'Conversation history must be an array'
      });
    }

    // Call Claude service
    const reply = await claudeService.sendMessage(message, conversationHistory);

    // Return response
    res.json({
      reply: reply
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/transcribe
 * Transcribe audio file using OpenAI Whisper API with language detection
 *
 * Request:
 * - multipart/form-data with 'audio' field containing audio file
 *
 * Response:
 * - transcript: string - The transcribed text
 * - language: string - The detected language code
 */
router.post('/transcribe', upload.single('audio'), async (req, res, next) => {
  try {
    // Check if file was uploaded
    if (!req.file) {
      return res.status(400).json({
        error: true,
        message: 'No audio file provided'
      });
    }

    console.log('Received audio file:', {
      originalName: req.file.originalname,
      mimetype: req.file.mimetype,
      size: req.file.size,
      path: req.file.path
    });

    // Transcribe the audio with language detection
    const result = await whisperService.transcribeAudio(req.file.path);

    // Return transcript and detected language
    res.json({
      transcript: result.text.trim(),
      language: result.language
    });
  } catch (error) {
    console.error('Transcription endpoint error:', error);
    next(error);
  }
});

/**
 * POST /api/text-to-speech
 * Convert text to speech using Google Cloud TTS API
 *
 * Request body:
 * - text: string (required) - The text to convert to speech
 * - language: string (optional) - The language code (e.g., 'en', 'ru')
 *
 * Response:
 * - Audio file (MP3)
 */
router.post('/text-to-speech', async (req, res, next) => {
  try {
    const { text, language = 'en' } = req.body;

    // Validate request
    if (!text || typeof text !== 'string' || text.trim() === '') {
      return res.status(400).json({
        error: true,
        message: 'Text is required and must be a non-empty string'
      });
    }

    // Generate speech using Google Cloud TTS
    const audioBuffer = await googleTTSService.textToSpeech(text, language);

    // Set response headers
    res.set({
      'Content-Type': 'audio/mpeg',
      'Content-Length': audioBuffer.length,
      'Cache-Control': 'no-cache'
    });

    // Send audio buffer
    res.send(audioBuffer);
  } catch (error) {
    console.error('TTS endpoint error:', error);
    next(error);
  }
});

module.exports = router;
