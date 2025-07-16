const db = require('../config/db');
const model = require('../models/webhook.model');

// Obtener todas las configuraciones WooCommerce
const getAllConfigs = async () => {
  const [rows] = await db.query('SELECT * FROM woocommerce_api_config');
  return rows;
};
//obtener productos de WooCommerce por ID de wooCommerce
const getProducts = async (id) => {
  try {
    const api = await model.getWooApiInstanceByConfigId(id);
    const response = await api.get("products");

    // Filtrar solo los campos que necesitas
    const filteredProducts = response.data.map(product => ({
      id: product.id,
      name: product.name,
      price: product.price
    }));

    return filteredProducts;
  } catch (error) {
    console.error("Error obteniendo productos:", error.response?.data || error);
    throw error;
  }
};

//pedidos
const getPedidos = async (id) => {
  console.log("Obteniendo pedidos para la el woocommerce con ID:", id);
  try {
    const api = await model.getWooApiInstanceByConfigId(id);
    console.log("esta es la api", api);
  
    const response = await api.get("orders");
    console.log("Respuesta de pedidos:", response.data);

    // Filtrar pedidos con estado "completed"
// Filtrar pedidos con estado "completed" o "processing"
const completedOrders = response.data.filter(order => 
  order.status === "completed" || order.status === "processing"
);
    console.log("Pedidos completados:", completedOrders);
    // Filtrar los campos relevantes de cada pedido
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
