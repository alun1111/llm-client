const express = require('express');
const ContextService = require('../services/contextService');
const router = express.Router();

router.post('/scan', async (req, res) => {
  try {
    const { paths, extensions, maxFiles = 100 } = req.body;
    
    const contextService = new ContextService();
    const context = await contextService.scanPaths(paths, extensions, maxFiles);
    
    res.json({ 
      context,
      summary: {
        totalFiles: context.length,
        totalSize: context.reduce((sum, file) => sum + file.content.length, 0)
      }
    });
  } catch (error) {
    console.error('Context scan error:', error);
    res.status(500).json({ error: 'Failed to scan context' });
  }
});

router.get('/sources', async (req, res) => {
  try {
    const contextService = new ContextService();
    const sources = await contextService.getConfiguredSources();
    res.json({ sources });
  } catch (error) {
    console.error('Context sources error:', error);
    res.status(500).json({ error: 'Failed to get context sources' });
  }
});

module.exports = router;