const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhook.controller');

// 🔹 1️⃣ RUTAS ESPECÍFICAS / FUNCIONALES
router.post('/woo/polling', webhookController.ejecutarPolling);
router.post('/toggle-webhooks/:action', webhookController.toggleAllWebhooks);

// 🔹 2️⃣ RUTAS DE WEBHOOKS POR IDENTIFICADOR / CONFIG
router.get('/webhooksXid/:id', webhookController.getWebhookById);
router.get('/config/:configId', webhookController.getWebhooksByConfigId);

// 🔹 3️⃣ CRUD PRINCIPAL
router.get('/', webhookController.getAllWebhooks);
router.post('/', webhookController.createWebhook);
router.put('/:id', webhookController.updateWebhook);
router.delete('/:id', webhookController.deleteWebhook);

// 🔹 4️⃣ RUTA WOO SPECÍFICA
router.post(
  '/woocommerce/:wooId/pedido-completado',
  webhookController.pedidoCompletado
);

// 🔹 RUTA DE TEST PARA updateSerial2
router.post('/test/serial/update/:id', webhookController.testUpdateSerial);


// 🔹 5️⃣ CRUD ALTERNATIVO / LEGACY (mantenlo al final)
router.get('/webhooks', webhookController.getAll);
router.get('/webhook/:id', webhookController.getById);
router.post('/webhook', webhookController.create);
router.put('/webhook/:id', webhookController.update);
router.delete('/webhook/:id', webhookController.remove);

module.exports = router;
