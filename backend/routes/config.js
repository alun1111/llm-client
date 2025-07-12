const express = require('express');
const ConfigService = require('../services/configService');
const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const configService = new ConfigService();
    const config = await configService.getConfig();
    res.json({ config });
  } catch (error) {
    console.error('Config error:', error);
    res.status(500).json({ error: 'Failed to get configuration' });
  }
});

router.post('/', async (req, res) => {
  try {
    const { config } = req.body;
    const configService = new ConfigService();
    await configService.updateConfig(config);
    res.json({ success: true });
  } catch (error) {
    console.error('Config update error:', error);
    res.status(500).json({ error: 'Failed to update configuration' });
  }
});

module.exports = router;