// 📁 models/controlAlertasStockModel.js
const db = require('../config/db');

/**
 * 🔹 Crea un registro de control si no existe
 */
const crearControlSiNoExiste = async (productoId, maxAlertas = 3) => {
  await db.query(`
    INSERT IGNORE INTO control_alertas_stock (producto_id, max_alertas)
    VALUES (?, ?)
  `, [productoId, maxAlertas]);
};

/**
 * 🔹 Obtiene el control de alertas de un producto
 */
const obtenerControlPorProducto = async (productoId) => {
  const [rows] = await db.query(`
    SELECT * FROM control_alertas_stock
    WHERE producto_id = ?
    LIMIT 1
  `, [productoId]);
  return rows[0] || null;
};

/**
 * 🔹 Incrementa el contador de alertas y bloquea si supera el máximo
 */
const incrementarContador = async (productoId) => {
  await db.query(`
    UPDATE control_alertas_stock
    SET 
      alertas_enviadas = alertas_enviadas + 1,
      ultima_alerta = NOW(),
      bloqueado = CASE 
        WHEN alertas_enviadas + 1 >= max_alertas THEN 1
        ELSE bloqueado
      END
    WHERE producto_id = ?
  `, [productoId]);
};

/**
 * 🔹 Bloquea manualmente un producto
 */
const bloquearProducto = async (productoId, comentario = null) => {
  await db.query(`
    UPDATE control_alertas_stock
    SET bloqueado = 1, comentario = ?
    WHERE producto_id = ?
  `, [comentario, productoId]);
};

/**
 * 🔹 Desbloquea un producto y reinicia el contador
 */
const desbloquearProducto = async (productoId) => {
  await db.query(`
    UPDATE control_alertas_stock
    SET 
      alertas_enviadas = 0,
      bloqueado = 0,
      fecha_desbloqueo = NOW(),
      comentario = NULL
    WHERE producto_id = ?
  `, [productoId]);
};

/**
 * 🔹 Actualiza el máximo permitido de alertas
 */
const actualizarMaximoAlertas = async (productoId, nuevoMax) => {
  await db.query(`
    UPDATE control_alertas_stock
    SET max_alertas = ?
    WHERE producto_id = ?
  `, [nuevoMax, productoId]);
};

/**
 * 🔹 Elimina el registro de control de un producto
 */
const eliminarControl = async (productoId) => {
  await db.query(`
    DELETE FROM control_alertas_stock
    WHERE producto_id = ?
  `, [productoId]);
};

/**
 * 🔹 Verifica si un producto está bloqueado
 */
const estaBloqueado = async (productoId) => {
  const [rows] = await db.query(`
    SELECT bloqueado 
    FROM control_alertas_stock
    WHERE producto_id = ?
  `, [productoId]);

  return rows.length > 0 ? !!rows[0].bloqueado : false;
};

/**
 * 🔹 Reinicia todos los controles (función administrativa)
 */
const reiniciarTodosLosControles = async () => {
  await db.query(`
    UPDATE control_alertas_stock
    SET 
      alertas_enviadas = 0,
      bloqueado = 0,
      fecha_desbloqueo = NOW(),
      comentario = NULL
  `);
};

module.exports = {
  crearControlSiNoExiste,
  obtenerControlPorProducto,
  incrementarContador,
  bloquearProducto,
  desbloquearProducto,
  actualizarMaximoAlertas,
  eliminarControl,
  estaBloqueado,
  reiniciarTodosLosControles
};
