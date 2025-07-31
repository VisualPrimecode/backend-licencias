import '../controllers/webhook.controller';

const Webhook = require('../models/webhook.model');

// Obtener todos los webhooks desde WooCommerce
exports.getAllWebhooksFromWoo = async (req, res) => {
  console.log('[WooController] Obteniendo todos los webhooks de WooCommerce');
  try {
    const webhooks = await Webhook.getWebhooksFromWoo();
    res.status(200).json(webhooks);
  } catch (err) {
    console.error('[WooController] Error al obtener webhooks:', err);
    res.status(500).json({ error: 'Error al obtener webhooks de WooCommerce' });
  }
};

// Obtener un webhook por ID desde WooCommerce
exports.getWebhookByIdFromWoo = async (req, res) => {
  const id = req.params.id;
  console.log(`[WooController] Obteniendo webhook con ID ${id} desde WooCommerce`);
  try {
    const webhook = await Webhook.getWebhookByIdFromWoo(id);
    res.json(webhook);
  } catch (err) {
    console.error(`[WooController] Error al obtener webhook con ID ${id}:`, err);
    res.status(500).json({ error: `Error al obtener webhook con ID ${id}` });
  }
};

// Crear un webhook en WooCommerce
exports.createWebhookInWoo = async (req, res) => {
  console.log('[WooController] Creando nuevo webhook en WooCommerce');
  try {
    const data = req.body;

    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'Datos inválidos para crear webhook' });
    }

    const webhook = await Webhook.createWebhookInWoo(data);
    res.status(201).json(webhook);
  } catch (err) {
    console.error('[WooController] Error al crear webhook:', err);
    res.status(500).json({ error: 'Error al crear webhook en WooCommerce' });
  }
};

// Actualizar un webhook en WooCommerce
exports.updateWebhookInWoo = async (req, res) => {
  const id = req.params.id;
  console.log(`[WooController] Actualizando webhook con ID ${id} en WooCommerce`);
  try {
    const data = req.body;

    if (!data || typeof data !== 'object') {
      return res.status(400).json({ error: 'Datos inválidos para actualizar webhook' });
    }

    const updated = await Webhook.updateWebhookInWoo(id, data);
    res.json(updated);
  } catch (err) {
    console.error(`[WooController] Error al actualizar webhook con ID ${id}:`, err);
    res.status(500).json({ error: 'Error al actualizar webhook en WooCommerce' });
  }
};

// Eliminar un webhook de WooCommerce
exports.deleteWebhookFromWoo = async (req, res) => {
  const id = req.params.id;
  console.log(`[WooController] Eliminando webhook con ID ${id} de WooCommerce`);
  try {
    const result = await Webhook.deleteWebhookInWoo(id);
    res.json({ mensaje: `Webhook ${id} eliminado correctamente de WooCommerce`, data: result });
  } catch (err) {
    console.error(`[WooController] Error al eliminar webhook con ID ${id}:`, err);
    res.status(500).json({ error: 'Error al eliminar webhook de WooCommerce' });
  }
};
