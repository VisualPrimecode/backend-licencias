const db = require('../config/db');

// Obtener todas las configuraciones
const getAllConfigs = async () => {
  const [rows] = await db.query('SELECT * FROM db_connection_config');
  return rows;
};

// Obtener configuraciones por empresa
const getConfigsByEmpresaId = async (empresaId) => {
  const [rows] = await db.query(
    'SELECT * FROM db_connection_config WHERE empresa_id = ?',
    [empresaId]
  );
  return rows;
};

// Crear una nueva configuración
const createConfig = async ({
  empresa_id,
  nombre_alias,
  host,
  puerto,
  nombre_base_datos,
  usuario,
  contrasena,
  estado,
  notas,
}) => {
  const [result] = await db.query(
    `INSERT INTO db_connection_config 
    (empresa_id, nombre_alias, host, puerto, nombre_base_datos, usuario, contrasena, estado, notas)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      empresa_id,
      nombre_alias,
      host,
      puerto,
      nombre_base_datos,
      usuario,
      contrasena,
      estado || 'activa',
      notas || null,
    ]
  );

  return result.insertId;
};

// Actualizar configuración por ID
const updateConfig = async (id, datos) => {
  const campos = [];
  const valores = [];

  for (const [clave, valor] of Object.entries(datos)) {
    campos.push(`${clave} = ?`);
    valores.push(valor);
  }

  if (campos.length === 0) {
    throw new Error('No se proporcionaron datos para actualizar.');
  }

  valores.push(id);
  const sql = `UPDATE db_connection_config SET ${campos.join(', ')} WHERE id = ?`;
  const [result] = await db.query(sql, valores);
  return result;
};

// Eliminar configuración
const deleteConfig = async (id) => {
  const [result] = await db.query(
    'DELETE FROM db_connection_config WHERE id = ?',
    [id]
  );
  return result;
};

// Obtener una configuración por ID
const getConfigById = async (id) => {
  const [rows] = await db.query(
    'SELECT * FROM db_connection_config WHERE id = ?',
    [id]
  );
  return rows[0];
};

// Obtener una configuración por ID
const getConfigByIdWoo = async (id) => {
  const [rows] = await db.query(
    'SELECT * FROM db_connection_config WHERE id_woo = ?',
    [id]
  );
  return rows[0];
};

module.exports = {
  getAllConfigs,
  getConfigsByEmpresaId,
  getConfigById,
  createConfig,
  updateConfig,
  deleteConfig,
  getConfigByIdWoo
};
