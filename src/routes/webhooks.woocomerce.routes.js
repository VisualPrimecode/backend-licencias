const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhook.controller');

router.get('/webhooks', webhookController.getAll);
router.get('/webhook/:id', webhookController.getById);
router.post('/webhook', webhookController.create);
router.put('/webhook/:id', webhookController.update);
router.delete('/webhook/:id', webhookController.remove);

module.exports = router;