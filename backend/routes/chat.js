const express = require('express');
const LLMService = require('../services/llmService');
const router = express.Router();

router.post('/', async (req, res) => {
  try {
    const { message, model, context, stream = false } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    const llmService = new LLMService();
    
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      await llmService.streamChat(message, model, context, (chunk) => {
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      });

      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      const response = await llmService.chat(message, model, context);
      res.json({ response });
    }
  } catch (error) {
    console.error('Chat error:', error);
    res.status(500).json({ error: 'Failed to process chat request' });
  }
});

router.get('/models', async (req, res) => {
  try {
    const llmService = new LLMService();
    const models = await llmService.getAvailableModels();
    res.json({ models });
  } catch (error) {
    console.error('Models error:', error);
    res.status(500).json({ error: 'Failed to get available models' });
  }
});

module.exports = router;