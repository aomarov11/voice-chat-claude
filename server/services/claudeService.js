const Anthropic = require('@anthropic-ai/sdk');

// Initialize Anthropic client with API key from environment
const client = new Anthropic({
  apiKey: process.env.CLAUDE_API_KEY,
});

/**
 * Send a message to Claude and get a response
 * @param {string} message - The user's message
 * @param {Array} conversationHistory - Array of previous messages
 * @returns {Promise<string>} - Claude's response text
 */
async function sendMessage(message, conversationHistory = []) {
  try {
    // Build the messages array for Claude API
    const messages = [
      ...conversationHistory,
      { role: 'user', content: message }
    ];

    // Call Claude API
    const response = await client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 1024,
      messages: messages,
    });

    // Extract and return the text content
    return response.content[0].text;
  } catch (error) {
    console.error('Claude API Error:', error);
    throw new Error('Failed to get response from Claude');
  }
}

module.exports = {
  sendMessage,
};
