const express = require('express');
const LLMService = require('../services/llmService');
const router = express.Router();

function isBirdRelated(message) {
  const birdKeywords = [
    'bird', 'birds', 'robin', 'sparrow', 'eagle', 'hawk', 'owl', 'cardinal', 
    'blue jay', 'hummingbird', 'feathers', 'wingspan', 'nest', 'chirp', 'tweet',
    'species', 'avian', 'ornithology', 'migration', 'habitat', 'birdwatching',
    'scientific name', 'family', 'diet', 'size'
  ];
  
  const lowerMessage = message.toLowerCase();
  return birdKeywords.some(keyword => lowerMessage.includes(keyword));
}

function extractBirdName(message) {
  const birdNames = ['robin', 'sparrow', 'eagle', 'hawk', 'owl', 'cardinal', 'blue jay', 'hummingbird'];
  const lowerMessage = message.toLowerCase();
  
  for (const birdName of birdNames) {
    if (lowerMessage.includes(birdName)) {
      return birdName;
    }
  }
  return null;
}

async function enrichWithBirdInfo(message, mcpService) {
  try {
    if (!mcpService.isReady()) {
      console.log('[MCP] MCP Service not ready for bird info enrichment');
      return null;
    }

    console.log('[MCP] Attempting to enrich message with bird information:', message.substring(0, 100));

    const birdName = extractBirdName(message);
    if (birdName) {
      console.log('[MCP] Extracted bird name:', birdName);
      const birdInfo = await mcpService.executeRequest('bird-reference', 'getBirdInfo', { birdName });
      if (birdInfo.success && birdInfo.result.success) {
        console.log('[MCP] Successfully retrieved specific bird info for:', birdName);
        return birdInfo.result.bird;
      }
    }

    console.log('[MCP] Performing bird search query');
    const searchResult = await mcpService.executeRequest('bird-reference', 'searchBirds', { 
      query: message.toLowerCase(), 
      limit: 3 
    });
    
    if (searchResult.success && searchResult.result.success && searchResult.result.results.length > 0) {
      console.log(`[MCP] Bird search returned ${searchResult.result.results.length} results`);
      return searchResult.result.results;
    } else {
      console.log('[MCP] Bird search returned no results');
    }
  } catch (error) {
    console.error('[MCP] Error enriching with bird info:', error);
  }
  return null;
}

router.post('/', async (req, res) => {
  try {
    const { message, model, context, stream = false } = req.body;

    if (!message) {
      return res.status(400).json({ error: 'Message is required' });
    }

    let enrichedContext = context || '';
    let usedMcpServices = [];
    
    if (isBirdRelated(message)) {
      console.log('[MCP] Message detected as bird-related, attempting MCP enrichment');
      const birdInfo = await enrichWithBirdInfo(message, req.mcpService);
      if (birdInfo) {
        console.log('[MCP] Successfully enriched context with bird information');
        usedMcpServices.push('bird-reference');
        
        if (Array.isArray(birdInfo)) {
          enrichedContext += `\n\nRelevant bird information found:\n${birdInfo.map(bird => 
            `- ${bird.name} (${bird.scientific_name}): ${bird.habitat}, diet: ${bird.diet}`
          ).join('\n')}`;
        } else {
          enrichedContext += `\n\nBird Information:\n- Name: ${birdInfo.name}\n- Scientific Name: ${birdInfo.scientific_name}\n- Family: ${birdInfo.family}\n- Habitat: ${birdInfo.habitat}\n- Diet: ${birdInfo.diet}\n- Size: ${birdInfo.size}\n- Related Species: ${birdInfo.related_species.join(', ')}`;
        }
      } else {
        console.log('[MCP] No bird information retrieved from MCP service');
      }
    } else {
      console.log('[MCP] Message not bird-related, skipping MCP enrichment');
    }

    const llmService = new LLMService();
    
    if (stream) {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      let responseContent = '';
      await llmService.streamChat(message, model, enrichedContext, (chunk) => {
        responseContent += chunk;
        res.write(`data: ${JSON.stringify({ content: chunk })}\n\n`);
      });

      // Add references at the end for streaming responses
      if (usedMcpServices.length > 0) {
        const referencesText = `\n\n## References\n- MCP Services: ${usedMcpServices.join(', ')}`;
        res.write(`data: ${JSON.stringify({ content: referencesText })}\n\n`);
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } else {
      const response = await llmService.chat(message, model, enrichedContext);
      
      // Add references to non-streaming response
      let fullResponse = response;
      if (usedMcpServices.length > 0) {
        fullResponse += `\n\n## References\n- MCP Services: ${usedMcpServices.join(', ')}`;
      }
      
      res.json({ response: fullResponse });
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