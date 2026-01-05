const db = require('../config/db');

/**
 * Crear un pedido Woo
 */
const crearPedido = async ({
  woo_config_id,
  woo_order_id,
  numero_pedido,
  status,
  total,
  currency,
  payment_method,
  pedido_json
}) => {
  const sql = `
    INSERT INTO woo_pedidos (
      woo_config_id,
      woo_order_id,
      numero_pedido,
      status,
      total,
      currency,
      payment_method,
      pedido_json
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `;

  const [result] = await db.query(sql, [
    woo_config_id,
    woo_order_id,
    String(numero_pedido),
    status,
    total,
    currency,
    payment_method,
    JSON.stringify(pedido_json)
  ]);

  return result.insertId;
};

/**
 * Obtener pedido por tienda + número
 */
const getPedidoPorNumero = async (numero_pedido, woo_config_id) => {
  const [rows] = await db.query(
    `SELECT * FROM woo_pedidos 
     WHERE numero_pedido = ? AND woo_config_id = ?
     LIMIT 1`,
    [String(numero_pedido), woo_config_id]
  );

  return rows[0] || null;
};

/**
 * Obtener pedidos por tienda
 */
const getPedidosPorTienda = async (woo_config_id) => {
  const [rows] = await db.query(
    `SELECT * FROM woo_pedidos WHERE woo_config_id = ?
     ORDER BY created_at DESC`,
    [woo_config_id]
  );

  return rows;
};

/**
 * Marcar pedido como enviado
 */
const marcarPedidoEnviado = async (id, estado_envio = 'ENVIADO') => {
  await db.query(
    `UPDATE woo_pedidos
     SET procesado_envio = 1,
         estado_envio = ?
     WHERE id = ?`,
    [estado_envio, id]
  );
};

/**
 * Registrar error de envío
 */
const registrarErrorEnvio = async (id, error) => {
  await db.query(
    `UPDATE woo_pedidos
     SET procesado_envio = 0,
         estado_envio = 'ERROR',
         ultimo_error = ?
     WHERE id = ?`,
    [error, id]
  );
};

/**
 * Obtener pedidos pendientes de envío
 */
const getPedidosPendientesEnvio = async () => {
  const [rows] = await db.query(
    `SELECT * FROM woo_pedidos
     WHERE procesado_envio = 0
     ORDER BY created_at ASC`
  );

  return rows;
};
/**
 * Verifica si un pedido Woo ya existe
 */
const existePedidoWoo = async ({
  woo_config_id,
  numero_pedido,
  woo_order_id
}) => {
  const sql = `
    SELECT id
    FROM woo_pedidos
    WHERE woo_config_id = ?
      AND (
        numero_pedido = ?
        OR woo_order_id = ?
      )
    LIMIT 1
  `;

  const [rows] = await db.query(sql, [
    woo_config_id,
    String(numero_pedido),
    woo_order_id
  ]);

  return rows.length > 0;
};


module.exports = {
  crearPedido,
  getPedidoPorNumero,
  getPedidosPorTienda,
  marcarPedidoEnviado,
  registrarErrorEnvio,
  getPedidosPendientesEnvio,
  existePedidoWoo
};
