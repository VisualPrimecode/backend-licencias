const db = require('../config/db');

// Obtener todas las configuraciones WooCommerce
const getAllConfigs = async () => {
  const [rows] = await db.query('SELECT * FROM woocommerce_api_config');
  return rows;
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
};
