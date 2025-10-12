// 📦 models/pollingControl.js
const db = require('../config/db');

/**
 * Obtiene el estado actual del polling de WooCommerce.
 * Retorna un objeto con los campos de la tabla o undefined si no existe registro.
 */
const getPollingStatus = async () => {
  console.log('🔍 Consultando estado actual del polling...');
  const [rows] = await db.query('SELECT * FROM polling_control LIMIT 1');
  return rows[0];
};

/**
 * Crea un registro inicial del control de polling (solo debe ejecutarse una vez).
 * @param {string} usuario - Usuario o proceso que crea el registro.
 */
const createDefaultPolling = async (usuario = 'sistema') => {
  console.log('🆕 Creando registro inicial de control de polling...');
  const [result] = await db.query(
    `INSERT INTO polling_control (activo, descripcion, actualizado_por)
     VALUES (TRUE, 'Controla si el polling de WooCommerce está habilitado', ?)`,
    [usuario]
  );
  return result.insertId;
};

/**
 * Actualiza el estado del polling (activar o pausar).
 * @param {boolean} activo - true para habilitar, false para pausar.
 * @param {string} usuario - Usuario que realiza la acción.
 */
const updatePollingStatus = async (activo, usuario = 'admin') => {
  console.log(`⚙️ Actualizando estado del polling a: ${activo ? 'ACTIVO' : 'PAUSADO'}`);
  const [result] = await db.query(
    `UPDATE polling_control 
     SET activo = ?, actualizado_por = ?, actualizado_en = CURRENT_TIMESTAMP
     WHERE id = 1`,
    [activo, usuario]
  );
  return result;
};

/**
 * Elimina un registro de control del polling (rara vez necesario).
 * @param {number} id - ID del registro a eliminar.
 */
const deletePollingRecord = async (id) => {
  console.log(`🗑 Eliminando registro de control de polling con ID ${id}...`);
  const [result] = await db.query('DELETE FROM polling_control WHERE id = ?', [id]);
  return result;
};

module.exports = {
  getPollingStatus,
  createDefaultPolling,
  updatePollingStatus,
  deletePollingRecord
};
