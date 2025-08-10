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
    version_api = 'v3',
    woo_id // Nuevo campo
  } = webhookData;

  const [result] = await db.query(
    `INSERT INTO woocommerce_webhooks 
      (config_id, nombre, estado, tema, url_entrega, secreto, version_api, woo_id) 
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    [config_id, nombre, estado, tema, url_entrega, secreto, version_api, woo_id]
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

// crud de webhooks para woocomerce
// Este modelo maneja las operaciones CRUD para los webhooks de WooCommerce
const WooCommerceRestApi = require("@woocommerce/woocommerce-rest-api").default;


/**
 * Crea y devuelve una instancia de WooCommerceRestApi basada en el ID de configuración (woocommerce_api_config.id)
 * @param {number|string} configId - ID del registro de configuración en woocommerce_api_config
 * @returns {WooCommerceRestApi} instancia configurada con la API de WooCommerce
 */
const getWooApiInstanceByConfigId = async (configId) => {
  console.log("Obteniendo instancia de WooCommerce API para config_id en webhook_model.js 74:", configId);

  const [rows] = await db.query(
    'SELECT * FROM woocommerce_api_config WHERE id = ?',
    [configId]
  );
  //console.log("rows", rows)
  if (rows.length === 0) {
    throw new Error(`No se encontró configuración de WooCommerce para config_id: ${configId}`);
  }

  const config = rows[0];

  // Validación mínima
  if (!config.url || !config.clave_cliente || !config.clave_secreta) {
    throw new Error(`Configuración incompleta para config_id: ${configId}`);
  }

  const api = new WooCommerceRestApi({
    url: config.url,
    consumerKey: config.clave_cliente,
    consumerSecret: config.clave_secreta,
    version: 'wc/v3', // Se puede hacer dinámico si hay una columna 'version_api' en la tabla
    queryStringAuth: config.queryStringAuth === true || config.queryStringAuth === 1 || config.queryStringAuth === '1'
    
  });

  return api;
};




const getWebhooksFromWoo = async () => {
  console.log("Obteniendo webhooks de WooCommerce...");
  try {
    const response = await api.get("webhooks");
    return response.data;
  } catch (error) {
    console.error("Error obteniendo webhooks:", error.response?.data || error);
    throw error;
  }
};

/**
 * Crea un webhook en WooCommerce usando los datos de configuración de la empresa
 * @param {Object} params
 * @param {string} params.nombre - Nombre del webhook
 * @param {string} params.topic - Tema del webhook (ej: order.created)
 * @param {string} params.url - URL de entrega del webhook
 * @param {number|string} params.id - ID para obtener config WooCommerce
 */
const createWebhookInWoo = async ({ nombre, topic, url, id }) => {
  try {
    const api = await getWooApiInstanceByConfigId(id);

    const response = await api.post("webhooks", {
      name: nombre,
      topic,
      delivery_url: url,
      status: "active"
    });

    return response.data;
  } catch (error) {
    console.error("Error creando webhook en WooCommerce:", error.response?.data || error);
    throw error;
  }
};
/**
 * Obtiene un webhook de WooCommerce por su ID
 * @param {Object} params
 * @param {number|string} params.id - ID del webhook
 * @param {number|string} params.configId - ID para obtener config WooCommerce
 */
const getWebhookByIdFromWoo = async ({ id, configId }) => {
  if (!id || !configId) {
    throw new Error("Se requieren 'id' y 'configId' para obtener el webhook");
  }

  try {
    const api = await getWooApiInstanceByConfigId(configId);
    const response = await api.get(`webhooks/${id}`);
    return response.data;
  } catch (error) {
    const { status, data } = error.response || {};
    console.error(`Error obteniendo webhook ${id} (status: ${status}):`, data || error.message);
    throw error;
  }
};

/**
 * Actualiza un webhook en WooCommerce
 * @param {Object} params
 * @param {number|string} params.id - ID del webhook
 * @param {Object} params.data - Datos a actualizar
 * @param {number|string} params.configId - ID para obtener config WooCommerce
 */
const updateWebhookInWoo = async ({ id, data, configId }) => {
  if (!id || !data || !configId) {
    throw new Error("Se requieren 'id', 'data' y 'configId' para actualizar el webhook");
  }

  try {
    const api = await getWooApiInstanceByConfigId(configId);
    const response = await api.put(`webhooks/${id}`, data);
    return response.data;
  } catch (error) {
    const { status, data: errData } = error.response || {};
    console.error(`Error actualizando webhook ${id} (status: ${status}):`, errData || error.message);
    throw error;
  }
};

/**
 * Elimina un webhook en WooCommerce
 * @param {Object} params
 * @param {number|string} params.id - ID del webhook
 * @param {number|string} params.configId - ID para obtener config WooCommerce
 */
const deleteWebhookInWoo = async ({ id, configId }) => {
  if (!id || !configId) {
    throw new Error("Se requieren 'id' y 'configId' para eliminar el webhook");
  }

  try {
    const api = await getWooApiInstanceByConfigId(configId);
    const response = await api.delete(`webhooks/${id}`, { force: true });
    return response.data;
  } catch (error) {
    const { status, data } = error.response || {};
    console.error(`Error eliminando webhook ${id} (status: ${status}):`, data || error.message);
    throw error;
  }
};


module.exports = {
  getAllWebhooks,
  getWebhookById,
  getWebhooksByConfigId,
  createWebhook,
  updateWebhook,
  deleteWebhook,
  getWebhookByIdFromWoo,
  deleteWebhookInWoo,
  updateWebhookInWoo,
  createWebhookInWoo,
  getWebhooksFromWoo,
  getWooApiInstanceByConfigId
};
