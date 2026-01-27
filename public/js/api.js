/**
 * API Client
 * Handles communication with the backend API
 */

const API = {
  baseURL: '/api',

  /**
   * Send a message to Claude and get a response
   * @param {string} message - The user's message
   * @param {Array} conversationHistory - Array of previous messages
   * @returns {Promise<string>} - Claude's response
   */
  async sendMessageToClaude(message, conversationHistory = []) {
    try {
      const response = await fetch(`${this.baseURL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: message,
          conversationHistory: conversationHistory
        })
      });

      // Check if response is ok
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to get response from server');
      }

      // Parse response
      const data = await response.json();

      // Validate response
      if (!data.reply) {
        throw new Error('Invalid response format from server');
      }

      return data.reply;
    } catch (error) {
      console.error('API Error:', error);

      // Provide user-friendly error messages
      if (error.message.includes('fetch')) {
        throw new Error('Network error: Unable to connect to server');
      }

      throw error;
    }
  }
};
