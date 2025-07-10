// src/routes/woocommerce.routes.js
const express = require('express');
const router = express.Router();
const WooService = require('../services/woocomerce.service');



// Ver pedidos
router.get('/pedidos', async (req, res) => {
  try {
    const pedidos = await WooService.getPedidos();
    res.json(pedidos);
  } catch (err) {
    res.status(500).json({ error: 'Error al obtener pedidos' });
  }
});

// Obtener todos los productos
router.get('/productos', async (req, res) => {
  try {
    const productos = await WooService.getProductos();
    res.json(productos);
  } catch (err) {
    console.error('❌ Error al obtener productos:', err.message);
    res.status(500).json({ error: 'Error al obtener productos desde WooCommerce' });
  }
});


// Crear webhook
router.post('/webhook', async (req, res) => {
  try {
    const { nombre, topic, url } = req.body;
    const webhook = await WooService.crearWebhook({ nombre, topic, url });
    res.json(webhook);
  } catch (err) {
    res.status(500).json({ error: 'Error creando webhook' });
  }
});

router.get('/webhooks', async (req, res) => {
  try {
    const webhooks = await WooService.getWebhooks();
    res.status(200).json(webhooks);
  } catch (error) {
    console.error('❌ Error al obtener webhooks:', error);
    res.status(500).json({ mensaje: 'Error al obtener webhooks' });
  }
});
// Obtener un webhook por ID
router.get('/webhook/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const webhook = await WooService.getWebhookPorId(id);
    res.json(webhook);
  } catch (err) {
    res.status(500).json({ error: `Error al obtener webhook con ID ${req.params.id}` });
  }
});

// Actualizar un webhook por ID
router.put('/webhook/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const data = req.body;
    const webhookActualizado = await WooService.actualizarWebhook(id, data);
    res.json(webhookActualizado);
  } catch (err) {
    res.status(500).json({ error: `Error al actualizar webhook con ID ${req.params.id}` });
  }
});

// Eliminar un webhook por ID
router.delete('/webhook/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const eliminado = await WooService.eliminarWebhook(id);
    res.json({ mensaje: `Webhook ${id} eliminado`, data: eliminado });
  } catch (err) {
    res.status(500).json({ error: `Error al eliminar webhook con ID ${req.params.id}` });
  }
});


module.exports = router;
