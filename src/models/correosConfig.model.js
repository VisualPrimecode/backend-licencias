const db = require('../config/db');

// Obtener todas las configuraciones de correo
const getAllCorreosConfig = async () => {
  const [rows] = await db.query('SELECT * FROM correos_config');
  return rows;
};

// Obtener una configuración específica por ID
const getCorreoConfigById = async (id) => {
  const [rows] = await db.query('SELECT * FROM correos_config WHERE id = ?', [id]);
  return rows[0];
};

// Crear una nueva configuración de correo
const createCorreoConfig = async (config) => {
  const {
    store_id,
    smtp_host,
    smtp_port,
    smtp_encryption,
    smtp_secure,
    smtp_username,
    smtp_password,
    sender_name,
    sender_email,
    reply_to_email,
    estado
  } = config;

  const [result] = await db.query(
    `INSERT INTO correos_config (
      store_id, smtp_host, smtp_port, smtp_encryption, smtp_secure, smtp_username, smtp_password,
      sender_name, sender_email, reply_to_email, estado
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      store_id,
      smtp_host,
      smtp_port,
      smtp_encryption || 'ssl',
      smtp_secure || true,
      smtp_username,
      smtp_password,
      sender_name || null,
      sender_email,
      reply_to_email || null,
      estado || 'activa'
    ]
  );

  return result.insertId;
};

// Actualizar configuración existente
const updateCorreoConfig = async (id, config) => {
  const {
    store_id,
    smtp_host,
    smtp_port,
    smtp_encryption,
    smtp_secure,
    smtp_username,
    smtp_password,
    sender_name,
    sender_email,
    reply_to_email,
    estado
  } = config;

  const [result] = await db.query(
    `UPDATE correos_config SET
      store_id = ?, smtp_host = ?, smtp_port = ?, smtp_encryption = ?, smtp_secure = ?,
      smtp_username = ?, smtp_password = ?, sender_name = ?,
      sender_email = ?, reply_to_email = ?, estado = ?
     WHERE id = ?`,
    [
      store_id,
      smtp_host,
      smtp_port,
      smtp_encryption,
      smtp_secure,
      smtp_username,
      smtp_password,
      sender_name,
      sender_email,
      reply_to_email,
      estado,
      id
    ]
  );

  return result;
};

// Eliminar configuración de correo
const deleteCorreoConfig = async (id) => {
  const [result] = await db.query('DELETE FROM correos_config WHERE id = ?', [id]);
  return result;
};


const getCorreosByStoreId = async (storeId) => {
  const [rows] = await db.query('SELECT * FROM correos_config WHERE store_id = ?', [storeId]);
  return rows;
};

async function getSMTPConfigByStoreId(store_id, uso = 'envios') {
  const [rows] = await db.query(
    'SELECT * FROM correos_config WHERE store_id = ? AND uso = ? AND estado = "activa" LIMIT 1',
    [store_id, uso]
  );
  return rows[0]; // Devuelve solo una config activa para el uso específico
}

module.exports = {
  getAllCorreosConfig,
  getCorreoConfigById,
  createCorreoConfig,
  updateCorreoConfig,
  deleteCorreoConfig,
  getCorreosByStoreId,
  getSMTPConfigByStoreId
};
