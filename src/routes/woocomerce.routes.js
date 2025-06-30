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

module.exports = router;
