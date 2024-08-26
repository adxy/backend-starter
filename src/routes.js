// node modules
const router = require('express').Router();

// routes
router.get('/', (_req, res) => res.send('Khao piyo aish karo mitron!'));

router.get('/healthz', (_req, res) => res.json({ status: 'success' }));

module.exports = router;
