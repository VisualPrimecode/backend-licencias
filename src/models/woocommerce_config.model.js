const db = require('../config/db');
const model = require('../models/webhook.model');

// Obtener todas las configuraciones WooCommerce
const getAllConfigs = async () => {
  const [rows] = await db.query('SELECT * FROM woocommerce_api_config');
  return rows;
};
//obtener productos de WooCommerce por ID de wooCommerce

const getProducts = async (id, queryParams = {}) => {
  try {
    const api = await model.getWooApiInstanceByConfigId(id);

    console.log("estructura de la api", api);
    console.log("queryParams", queryParams);

    // ✅ CORRECTO: sin { params: ... }
    const response = await api.get("products", queryParams);

    console.log("URL final:", response.config.url);
    console.log("Base URL:", response.config.baseURL);
    console.log("Params:", response.config.params);

    return response.data.map(product => ({
      id: product.id,
      name: product.name,
      price: product.price
    }));
    
  } catch (error) {
    console.error("Error obteniendo productos:", error.response?.data || error);
    throw error;
  }
};


/*
const axios = require('axios');

const getProducts = async (id, queryParams = {}) => {
  try {
    const api = await model.getWooApiInstanceByConfigId(id);

    const { per_page = 10, page = 1, _fields = 'id,name,price,images' } = queryParams;

    // Construimos la URL completa usando los datos de la instancia
    const url = `${api.url}${api.wpAPIPrefix}/${api.version}/products` +
                `?_fields=${_fields}&per_page=${per_page}&page=${page}` +
                `&consumer_key=${api.consumerKey}&consumer_secret=${api.consumerSecret}`;

    console.log("URL final:", url);

    const response = await axios.get(url);

    return response.data;
  } catch (error) {
    console.error("Error obteniendo productos:", error.response?.data || error);
    throw error;
  }
};
*/



//pedidos
const getPedidos = async (id, queryParams = {}) => {
  console.log("Obteniendo pedidos para el WooCommerce con ID:", id);
  console.log("queryParams recibidos:", queryParams);

  try {
    const api = await model.getWooApiInstanceByConfigId(id);
    console.log("Instancia de API obtenida:", api);

    // Pasamos los queryParams directamente
    const response = await api.get("orders", queryParams);

    console.log("URL final:", response.config.url);
    console.log("Base URL:", response.config.baseURL);
    console.log("Params:", response.config.params);

    // Filtrar pedidos con estado "completed" o "processing"
    const completedOrders = response.data.filter(order =>
      order.status === "completed" || order.status === "processing"
    );

    const filteredOrders = completedOrders.map(order => ({
      id: order.id,
      customer_name: `${order.billing.first_name} ${order.billing.last_name}`,
      customer_email: order.billing.email,
      status: order.status,
      products: order.line_items.map(item => ({
        product_id: item.product_id,
        name: item.name,
        quantity: item.quantity
      }))
    }));

    return filteredOrders;
  } catch (error) {
    console.error("Error obteniendo pedidos:", error.response?.data || error);
    throw error;
  }
};



const getPedidoPorId = async (id_pedido, id_woocommerce) => {
    try {
      const api = await model.getWooApiInstanceByConfigId(id_woocommerce);
      const response = await api.get("orders/${id_pedido}");
      return response.data;
    } catch (error) {
      console.error("Error obteniendo pedido ${id}: ", error.response?.data || error);
      throw error;
    }
  };

// Obtener configuración por ID
const getConfigById = async (id) => {
  const [rows] = await db.query(
    'SELECT * FROM woocommerce_api_config WHERE id = ?',
    [id]
  );
  return rows[0];
};

// Crear nueva configuración WooCommerce
const createConfig = async (config) => {
  const {
    empresa_id,
    nombre_alias,
    url,
    clave_cliente,
    clave_secreta,
    estado = 'activa',
    notas,
  } = config;

  const [result] = await db.query(
    `INSERT INTO woocommerce_api_config 
     (empresa_id, nombre_alias, url, clave_cliente, clave_secreta, estado, notas) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [empresa_id, nombre_alias, url, clave_cliente, clave_secreta, estado, notas]
  );

  return result.insertId;
};

// Actualizar configuración
const updateConfig = async (id, config) => {
  const {
    nombre_alias,
    url,
    clave_cliente,
    clave_secreta,
    estado,
    notas,
    ultima_verificacion,
  } = config;

  await db.query(
    `UPDATE woocommerce_api_config 
     SET nombre_alias = ?, url = ?, clave_cliente = ?, clave_secreta = ?, estado = ?, notas = ?, ultima_verificacion = ? 
     WHERE id = ?`,
    [nombre_alias, url, clave_cliente, clave_secreta, estado, notas, ultima_verificacion, id]
  );

  return true;
};

// Eliminar configuración
const deleteConfig = async (id) => {
  await db.query('DELETE FROM woocommerce_api_config WHERE id = ?', [id]);
  return true;
};

// Obtener configuración por empresa_id
const getConfigsByEmpresaId = async (empresaId) => {
  const [rows] = await db.query(
    'SELECT * FROM woocommerce_api_config WHERE empresa_id = ?',
    [empresaId]
  );
  return rows;
};

module.exports = {
  getAllConfigs,
  getConfigById,
  getConfigsByEmpresaId,
  createConfig,
  updateConfig,
  deleteConfig,
  getProducts,
  getPedidos,
  getPedidoPorId
};
