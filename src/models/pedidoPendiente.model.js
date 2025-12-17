const db = require('../config/db');

/**
 * Obtener todos los pedidos pendientes
 */
const getAllPedidosPendientes = async () => {
  console.log("entro en getAllPedidosPendientes");
  const [rows] = await db.query('SELECT * FROM pedido_pendiente');
  return rows;
};

/**
 * Obtener todos los pedidos pendientes
 */
const getAllPedidosPendientesAun = async () => {
  console.log("entro en getAllPedidosPendientes");
  const [rows] = await db.query('SELECT numero_pedido, id_tienda FROM pedido_pendiente where estado="pendiente"');
  return rows;
};
/**
 * Obtener pedido pendiente por ID
 */
const getPedidoPendienteById = async (id) => {
  console.log("entro en getPedidoPendienteById");
  const [rows] = await db.query(
    'SELECT * FROM pedido_pendiente WHERE id = ?',
    [id]
  );
  return rows[0];
};

/**
 * Crear nuevo pedido pendiente
 */
const createPedidoPendiente = async (pedido) => {
  console.log("entro en createPedidoPendiente");

  const { numero_pedido, id_tienda, estado } = pedido;

  const [result] = await db.query(
    `INSERT INTO pedido_pendiente 
     (numero_pedido, id_tienda, estado) 
     VALUES (?, ?, ?)`,
    [numero_pedido, id_tienda, estado]
  );

  return result.insertId;
};

/**
 * Actualizar pedido pendiente
 */
const updatePedidoPendiente = async (id, pedido) => {
  console.log("entro en updatePedidoPendiente");

  const { numero_pedido, id_tienda, estado } = pedido;

  const [result] = await db.query(
    `UPDATE pedido_pendiente 
     SET numero_pedido = ?, id_tienda = ?, estado = ?
     WHERE id = ?`,
    [numero_pedido, id_tienda, estado, id]
  );

  return result.affectedRows;
};

/**
 * Eliminar pedido pendiente
 */
const deletePedidoPendiente = async (id) => {
  console.log("entro en deletePedidoPendiente");

  const [result] = await db.query(
    'DELETE FROM pedido_pendiente WHERE id = ?',
    [id]
  );

  return result.affectedRows;
};


/**
 * Crear pedido pendiente solo si no existe
 */
const crearSiNoExistePedidoPendiente = async ({ numero_pedido, id_tienda, estado }) => {
  console.log("entro en crearSiNoExistePedidoPendiente");

  // 1️⃣ Verificar si ya existe el pedido pendiente
  const [rows] = await db.query(`
    SELECT id
    FROM pedido_pendiente
    WHERE numero_pedido = ?
    LIMIT 1
  `, [numero_pedido]);

  if (rows.length > 0) {
    // Ya existe → NO crear
    return { creado: false };
  }

  // 2️⃣ Insertar nuevo pedido pendiente
  await db.query(`
    INSERT INTO pedido_pendiente (numero_pedido, id_tienda, estado)
    VALUES (?, ?, ?)
  `, [numero_pedido, id_tienda, estado]);

  return { creado: true };
};
/**
 * Marcar pedido pendiente como enviado
 */
const marcarPedidoPendienteComoEnviado = async (numero_pedido, id_tienda) => {
  console.log('entro en marcarPedidoPendienteComoEnviado');

  const [result] = await db.query(`
    UPDATE pedido_pendiente
    SET estado = 'enviado'
    WHERE numero_pedido = ? AND id_tienda = ?
  `, [numero_pedido, id_tienda]);

  return result.affectedRows;
};
module.exports = {
  getAllPedidosPendientes,
  getPedidoPendienteById,
  createPedidoPendiente,
  updatePedidoPendiente,
  deletePedidoPendiente,
  crearSiNoExistePedidoPendiente,
  getAllPedidosPendientesAun,
  marcarPedidoPendienteComoEnviado
};
