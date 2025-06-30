const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhook.controller');

// Obtener todos los webhooks
router.get('/', webhookController.getAllWebhooks);

// Obtener un webhook por ID
router.get('/:id', webhookController.getWebhookById);

// Obtener todos los webhooks de una configuración específica
router.get('/config/:configId', webhookController.getWebhooksByConfigId);

// Crear un nuevo webhook
router.post('/', webhookController.createWebhook);

// Actualizar un webhook por ID
router.put('/:id', webhookController.updateWebhook);

// Eliminar un webhook por ID
router.delete('/:id', webhookController.deleteWebhook);

module.exports = router;
