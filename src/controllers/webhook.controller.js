const Webhook = require('../models/webhook.model');

// Obtener todos los webhooks
exports.getAllWebhooks = async (req, res) => {
  try {
    const webhooks = await Webhook.getAllWebhooks();
    res.json(webhooks);
  } catch (error) {
    console.error('Error al obtener webhooks:', error);
    res.status(500).json({ error: 'Error al obtener webhooks' });
  }
};

// Obtener un webhook por ID
exports.getWebhookById = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const webhook = await Webhook.getWebhookById(id);

    if (!webhook) {
      return res.status(404).json({ error: 'Webhook no encontrado' });
    }

    res.json(webhook);
  } catch (error) {
    console.error('Error al obtener webhook:', error);
    res.status(500).json({ error: 'Error al obtener webhook' });
  }
};

// Obtener todos los webhooks de una configuración específica
exports.getWebhooksByConfigId = async (req, res) => {
  try {
    const configId = parseInt(req.params.configId);
    const webhooks = await Webhook.getWebhooksByConfigId(configId);
    res.json(webhooks);
  } catch (error) {
    console.error('Error al obtener webhooks por configuración:', error);
    res.status(500).json({ error: 'Error al obtener webhooks por configuración' });
  }
};

// Crear un nuevo webhook
exports.createWebhook = async (req, res) => {
  try {
    const nuevoWebhook = req.body;
    const id = await Webhook.createWebhook(nuevoWebhook);
    res.status(201).json({ id });
  } catch (error) {
    console.error('Error al crear webhook:', error);
    res.status(500).json({ error: 'Error al crear webhook' });
  }
};

// Actualizar un webhook
exports.updateWebhook = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const data = req.body;
    const actualizado = await Webhook.updateWebhook(id, data);

    if (actualizado) {
      res.json({ mensaje: 'Webhook actualizado correctamente' });
    } else {
      res.status(404).json({ error: 'Webhook no encontrado o sin cambios' });
    }
  } catch (error) {
    console.error('Error al actualizar webhook:', error);
    res.status(500).json({ error: 'Error al actualizar webhook' });
  }
};

// Eliminar un webhook
exports.deleteWebhook = async (req, res) => {
  try {
    const id = parseInt(req.params.id);
    const eliminado = await Webhook.deleteWebhook(id);

    if (eliminado) {
      res.json({ mensaje: 'Webhook eliminado correctamente' });
    } else {
      res.status(404).json({ error: 'Webhook no encontrado' });
    }
  } catch (error) {
    console.error('Error al eliminar webhook:', error);
    res.status(500).json({ error: 'Error al eliminar webhook' });
  }
};
