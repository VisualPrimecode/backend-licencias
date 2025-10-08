const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhook.controller');

//router.post('/woo/polling', webhookController.ejecutarPolling);


// Obtener todos los webhooks
router.get('/', webhookController.getAllWebhooks);

// Obtener un webhook por ID
router.get('/webhooksXid/:id', webhookController.getWebhookById);

// Obtener todos los webhooks de una configuración específica
router.get('/config/:configId', webhookController.getWebhooksByConfigId);

// Crear un nuevo webhook
router.post('/', webhookController.createWebhook);

// Actualizar un webhook por ID
router.put('/:id', webhookController.updateWebhook);

// Eliminar un webhook por ID
router.delete('/:id', webhookController.deleteWebhook);


router.post(
  '/woocommerce/:wooId/pedido-completado',
  webhookController.pedidoCompletado
);
//woocomerceendpont crud
router.get('/webhooks', webhookController.getAll);
router.get('/webhook/:id', webhookController.getById);
router.post('/webhook', webhookController.create);
router.put('/webhook/:id', webhookController.update);
router.delete('/webhook/:id', webhookController.remove);

module.exports = router;
