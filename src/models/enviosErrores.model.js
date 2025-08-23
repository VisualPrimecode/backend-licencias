const db = require('../config/db');

// Obtener todos los envíos con errores
const getAllEnviosErrores = async () => {
  const [rows] = await db.query(`
    SELECT ee.*, 
           p.nombre AS nombre_producto, 
           e.nombre AS nombre_empresa
    FROM envios_errores ee
    LEFT JOIN productos p ON ee.producto_id = p.id
    LEFT JOIN empresas e ON ee.empresa_id = e.id
    ORDER BY ee.id DESC
    LIMIT 50
  `);
  return rows;
};


// Obtener un envío con error por ID
const getEnvioErrorById = async (id) => {
  const [rows] = await db.query('SELECT * FROM envios_errores WHERE id = ?', [id]);
  return rows[0];
};

// Crear un nuevo registro de envío con error
const createEnvioError = async ({
    
  empresa_id,
  usuario_id,
  producto_id,
  serial_id,
  nombre_cliente,
  email_cliente,
  numero_pedido,
  estado = 'fallido', // por defecto
  motivo_error,
  detalles_error
}) => {
  const [result] = await db.query(
    `INSERT INTO envios_errores (
      empresa_id,
      usuario_id,
      producto_id,
      serial_id,
      nombre_cliente,
      email_cliente,
      numero_pedido,
      estado,
      motivo_error,
      detalles_error
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      empresa_id,
      usuario_id,
      producto_id,
      serial_id,
      nombre_cliente,
      email_cliente,
      numero_pedido,
      estado,
      motivo_error,
      detalles_error
    ]
  );
  return result.insertId;
};

// Actualizar estado de un envío con error
const updateEstadoEnvioError = async (id, nuevoEstado) => {
  await db.query(
    `UPDATE envios_errores SET estado = ? WHERE id = ?`,
    [nuevoEstado, id]
  );
};

// Actualizar un envío con error
const updateEnvioError = async (id, {
  empresa_id,
  usuario_id,
  producto_id,
  serial_id,
  nombre_cliente,
  email_cliente,
  numero_pedido,
  estado,
  motivo_error,
  detalles_error
}) => {
  const [result] = await db.query(
    `UPDATE envios_errores SET
      empresa_id = ?,
      usuario_id = ?,
      producto_id = ?,
      serial_id = ?,
      nombre_cliente = ?,
      email_cliente = ?,
      numero_pedido = ?,
      estado = ?,
      motivo_error = ?,
      detalles_error = ?
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
      motivo_error,
      detalles_error,
      id
    ]
  );
  return result;
};

// Eliminar un registro de envío con error
const deleteEnvioError = async (id) => {
  const [result] = await db.query('DELETE FROM envios_errores WHERE id = ?', [id]);
  return result;
};

module.exports = {
  getAllEnviosErrores,
  getEnvioErrorById,
  createEnvioError,
  updateEstadoEnvioError,
  updateEnvioError,
  deleteEnvioError
};
