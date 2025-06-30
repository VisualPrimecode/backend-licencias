const db = require('../config/db');

// Obtener todos los webhooks
const getAllWebhooks = async () => {
  const [rows] = await db.query('SELECT * FROM woocommerce_webhooks');
  return rows;
};

// Obtener un webhook por ID
const getWebhookById = async (id) => {
  const [rows] = await db.query('SELECT * FROM woocommerce_webhooks WHERE id = ?', [id]);
  return rows[0];
};

// Obtener todos los webhooks de una configuración específica
const getWebhooksByConfigId = async (configId) => {
  const [rows] = await db.query('SELECT * FROM woocommerce_webhooks WHERE config_id = ?', [configId]);
  return rows;
};

// Crear un nuevo webhook
const createWebhook = async (webhookData) => {
  const {
    config_id,
    nombre,
    estado = 'activo',
    tema,
    url_entrega,
    secreto,
    version_api = 'v3'
  } = webhookData;

  const [result] = await db.query(
    `INSERT INTO woocommerce_webhooks 
      (config_id, nombre, estado, tema, url_entrega, secreto, version_api) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [config_id, nombre, estado, tema, url_entrega, secreto, version_api]
  );

  return result.insertId;
};

// Actualizar un webhook por ID
const updateWebhook = async (id, webhookData) => {
  const [result] = await db.query(
    `UPDATE woocommerce_webhooks 
     SET ? 
     WHERE id = ?`,
    [webhookData, id]
  );

  return result.affectedRows > 0;
};

// Eliminar un webhook por ID
const deleteWebhook = async (id) => {
  const [result] = await db.query('DELETE FROM woocommerce_webhooks WHERE id = ?', [id]);
  return result.affectedRows > 0;
};

module.exports = {
  getAllWebhooks,
  getWebhookById,
  getWebhooksByConfigId,
  createWebhook,
  updateWebhook,
  deleteWebhook
};
