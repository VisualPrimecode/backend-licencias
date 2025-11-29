const db = require('../config/db');

/**
 * 🔹 Verifica si ya existe una alerta para un pedido según numero_pedido + config
 */
const existeAlertaPedido = async (numero_pedido, woo_config_id) => {
  const [rows] = await db.query(`
    SELECT id 
    FROM alertas_pedidos
    WHERE numero_pedido = ? 
      AND woo_config_id = ?
    LIMIT 1
  `, [numero_pedido, woo_config_id]);

  return rows.length > 0;
};

/**
 * 🔹 Registrar una nueva alerta para un pedido
 */
const registrarAlertaPedido = async ({ numero_pedido, woo_config_id, empresa_id, motivo }) => {
  await db.query(`
    INSERT INTO alertas_pedidos 
      (numero_pedido, woo_config_id, empresa_id, motivo)
    VALUES (?, ?, ?, ?)
  `, [numero_pedido, woo_config_id, empresa_id, motivo]);
};

/**
 * 🔹 Inserta o actualiza una alerta para un pedido (upsert)
 *    ✔ Si existe: actualiza motivo y fecha_alerta
 *    ✔ Si no existe: la crea
 */
const upsertAlertaPedido = async ({ numero_pedido, woo_config_id, empresa_id, motivo }) => {
  await db.query(`
    INSERT INTO alertas_pedidos 
      (numero_pedido, woo_config_id, empresa_id, motivo)
    VALUES (?, ?, ?, ?)
    ON DUPLICATE KEY UPDATE
      motivo = VALUES(motivo),
      fecha_alerta = NOW()
  `, [numero_pedido, woo_config_id, empresa_id, motivo]);
};

/**
 * 🔹 Elimina alerta para un pedido (por si se quiere limpiar)
 */
const eliminarAlertaPedido = async (numero_pedido, woo_config_id) => {
  await db.query(`
    DELETE FROM alertas_pedidos
    WHERE numero_pedido = ? AND woo_config_id = ?
  `, [numero_pedido, woo_config_id]);
};

/**
 * 🔹 Lista las alertas de una empresa
 */
const obtenerAlertasPorEmpresa = async (empresa_id) => {
  const [rows] = await db.query(`
    SELECT *
    FROM alertas_pedidos
    WHERE empresa_id = ?
    ORDER BY fecha_alerta DESC
  `, [empresa_id]);

  return rows;
};

/**
 * 🔹 Crea una alerta solo si NO existe una previamente
 * 🔹 Devuelve:
 *     { creada: true }   → si se insertó en BD (primera vez)
 *     { creada: false }  → si ya existía una alerta
 */
const crearSiNoExisteAlertaPedido = async ({ numero_pedido, woo_config_id, empresa_id, motivo }) => {

  // 1️⃣ Verificar existencia previa
  const [rows] = await db.query(`
    SELECT id 
    FROM alertas_pedidos
    WHERE numero_pedido = ? AND woo_config_id = ?
    LIMIT 1
  `, [numero_pedido, woo_config_id]);

  if (rows.length > 0) {
    // Ya existe → NO crear, NO enviar alerta
    return { creada: false };
  }

  // 2️⃣ Insertar nueva alerta
  await db.query(`
    INSERT INTO alertas_pedidos (numero_pedido, woo_config_id, empresa_id, motivo)
    VALUES (?, ?, ?, ?)
  `, [numero_pedido, woo_config_id, empresa_id, motivo]);

  return { creada: true };
};


module.exports = {
  existeAlertaPedido,
  registrarAlertaPedido,
  upsertAlertaPedido,
  eliminarAlertaPedido,
  obtenerAlertasPorEmpresa,
  crearSiNoExisteAlertaPedido,
};
