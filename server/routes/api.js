const express = require('express');
const router = express.Router();
const claudeService = require('../services/claudeService');

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

module.exports = router;
