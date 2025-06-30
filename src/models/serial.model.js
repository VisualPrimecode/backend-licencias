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

module.exports = {
  getAllSeriales,
  getSerialById,
  createSerial,
  updateSerial,
  deleteSerial,
  insertarSerialesMasivos
};
