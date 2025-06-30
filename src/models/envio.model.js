const db = require('../config/db');

// Obtener todos los envíos
const getAllEnvios = async () => {
  const [rows] = await db.query('SELECT * FROM envios');
  return rows;
};

// Obtener un envío por ID
const getEnvioById = async (id) => {
  const [rows] = await db.query('SELECT * FROM envios WHERE id = ?', [id]);
  return rows[0];
};

// Crear un nuevo envío
const createEnvio = async ({
  empresa_id,
  usuario_id,
  producto_id,
  serial_id,
  nombre_cliente,
  email_cliente,
  numero_pedido,
  estado = 'pendiente', // ✅ por defecto
  fecha_envio
}) => {
  const [result] = await db.query(
    `INSERT INTO envios (
      empresa_id,
      usuario_id,
      producto_id,
      serial_id,
      nombre_cliente,
      email_cliente,
      numero_pedido,
      estado,
      fecha_envio
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      empresa_id,
      usuario_id,
      producto_id,
      serial_id,
      nombre_cliente,
      email_cliente,
      numero_pedido,
      estado,
      fecha_envio || null
    ]
  );
  return result.insertId;
};
const updateEstadoEnvio = async (id, nuevoEstado) => {
  await db.query(
    `UPDATE envios SET estado = ? WHERE id = ?`,
    [nuevoEstado, id]
  );
};

// Actualizar un envío
const updateEnvio = async (id, {
  empresa_id,
  usuario_id,
  producto_id,
  serial_id,
  nombre_cliente,
  email_cliente,
  numero_pedido,
  estado,
  fecha_envio
}) => {
  const [result] = await db.query(
    `UPDATE envios SET
      empresa_id = ?,
      usuario_id = ?,
      producto_id = ?,
      serial_id = ?,
      nombre_cliente = ?,
      email_cliente = ?,
      numero_pedido = ?,
      estado = ?,
      fecha_envio = ?
    WHERE id = ?`,
    [
      empresa_id,
      usuario_id,
      producto_id,
      serial_id,
      nombre_cliente,
      email_cliente,
      numero_pedido,
      estado,
      fecha_envio,
      id
    ]
  );
  return result;
};

// Eliminar un envío
const deleteEnvio = async (id) => {
  const [result] = await db.query('DELETE FROM envios WHERE id = ?', [id]);
  return result;
};

module.exports = {
  getAllEnvios,
  getEnvioById,
  createEnvio,
  updateEnvio,
  deleteEnvio,
  updateEstadoEnvio
};
