const db = require('../config/db');

// Obtener todos los seriales
const getAllSeriales = async () => {
  const [rows] = await db.query('SELECT * FROM seriales');
  return rows;
};

// Obtener un serial por ID
const getSerialById = async (id) => {
  const [rows] = await db.query('SELECT * FROM seriales WHERE id = ?', [id]);
  return rows[0];
};

// Crear un nuevo serial
const createSerial = async ({
  codigo,
  producto_id,
  estado = 'disponible',
  observaciones,
  usuario_id
}) => {
  const [result] = await db.query(
    `INSERT INTO seriales (codigo, producto_id, estado, observaciones, usuario_id)
     VALUES (?, ?, ?, ?, ?)`,
    [codigo, producto_id, estado, observaciones, usuario_id]
  );
  return result.insertId;
};

// Actualizar un serial
const updateSerial = async (id, {
  codigo,
  producto_id,
  estado,
  observaciones,
  usuario_id
}) => {
  const [result] = await db.query(
    `UPDATE seriales
     SET codigo = ?, producto_id = ?, estado = ?, observaciones = ?, usuario_id = ?
     WHERE id = ?`,
    [codigo, producto_id, estado, observaciones, usuario_id, id]
  );
  return result;
};

// Eliminar un serial
const deleteSerial = async (id) => {
  const [result] = await db.query('DELETE FROM seriales WHERE id = ?', [id]);
  return result;
};

const insertarSerialesMasivos = async (seriales) => {
  try {
    const valores = seriales.map(serial => [
      serial.codigo,
      serial.producto_id,
      serial.estado || 'disponible',
      serial.observaciones || null,
      serial.usuario_id || null
    ]);

    const [result] = await db.query(
      `INSERT INTO seriales (codigo, producto_id, estado, observaciones, usuario_id)
       VALUES ?`,
      [valores]
    );

    return result;
  } catch (err) {
    console.error('❌ Error al insertar seriales masivos:', err);
    throw err;
  }
};

// Obtener un serial disponible por producto y woocommerce
const obtenerSerialDisponible = async (producto_id, woocommerce_id) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Seleccionar el primer serial disponible y bloquearlo
    const [rows] = await connection.query(
      `SELECT id, codigo
       FROM seriales
       WHERE producto_id = ?
         AND woocommerce_id = ?
         AND estado = 'disponible'
       ORDER BY fecha_ingreso ASC
       LIMIT 1
       FOR UPDATE`,
      [producto_id, woocommerce_id]
    );

    if (rows.length === 0) {
      await connection.rollback();
      return undefined; // No hay serial disponible
    }

    const serial = rows[0];
        await connection.commit();

    

    return serial; // Retorna el serial ya reservado
  } catch (error) {
    await connection.rollback();
    throw new Error('Error al obtener y asignar serial: ' + error.message);
  } finally {
    connection.release();
  }
};

module.exports = {
  getAllSeriales,
  getSerialById,
  createSerial,
  updateSerial,
  deleteSerial,
  insertarSerialesMasivos,
  obtenerSerialDisponible
};
