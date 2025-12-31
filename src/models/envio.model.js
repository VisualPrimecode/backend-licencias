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

const createEnvioPersonalizado = async (datos) => {
  const {
    id_usuario,
    id_woo,
    id_cotizacion,   // 👈 Nuevo campo
    numero_pedido,
    id_empresa,
    nombre_cliente,
    email_destino,
    total,
    subtotal,
    iva,
    productos_json,
    smtp_host,
    smtp_user,
    plantilla_usada,
    asunto_correo,
    cuerpo_html,
    estado_envio = 'PENDIENTE',
    mensaje_error = null,
    mensaje_opcional = null // 👈 Nuevo campo opcional
  } = datos;

  const [result] = await db.query(
    `INSERT INTO envios_pesonalizados (
      id_usuario, id_woo, id_cotizaccion, numero_pedido, id_empresa, nombre_cliente, email_destino, total, subtotal, iva,
      productos_json, smtp_host, smtp_user, plantilla_usada,
      asunto_correo, cuerpo_html, estado_envio, mensaje_error, mensaje_opcional
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id_usuario,
      id_woo,
      id_cotizacion,
      numero_pedido,
      id_empresa,
      nombre_cliente,
      email_destino,
      total,
      subtotal,
      iva,
      JSON.stringify(productos_json),
      smtp_host,
      smtp_user,
      plantilla_usada,
      asunto_correo,
      cuerpo_html,
      estado_envio,
      mensaje_error,
      mensaje_opcional // 👈 Nuevo valor insertado
    ]
  );

  return result.insertId;
};
// Crear un nuevo envío
const createEnvio = async ({
  empresa_id,
  usuario_id,
  producto_id,
  id_serial,
  nombre_cliente,
  email_cliente,
  numero_pedido,
  estado = 'pendiente', // ✅ por defecto
  fecha_envio,
  woocommerce_id,
  woo_producto_id
}) => {
  
  console.log('datos recibidos para crear envio:', empresa_id, usuario_id, producto_id, id_serial, nombre_cliente, email_cliente, numero_pedido, estado, fecha_envio, woocommerce_id, woo_producto_id);
  const timestamp = fecha_envio || new Date(); // ⏱️ usa timestamp actual si no se pasa fecha_envio

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
      fecha_envio,
      woo_id,
      woo_idproduct
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      empresa_id,
      usuario_id,
      producto_id,
      id_serial,
      nombre_cliente,
      email_cliente,
      numero_pedido,
      estado,
      timestamp,
      woocommerce_id,
      woo_producto_id
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

const getEstadoEnvio = async (wooId, numeroPedido) => {
  try {
    const [rows] = await db.query(
      `SELECT estado 
       FROM envios 
       WHERE woo_id = ? AND numero_pedido = ? 
       ORDER BY fecha_envio DESC 
       LIMIT 1`,
      [wooId, numeroPedido]
    );

    if (rows.length === 0) {
      return null; // No encontrado
    }
   // console.log("estado",rows[0].estado);
    return rows[0].estado;
  } catch (err) {
    throw new Error('Error al consultar estado de envío: ' + err.message);
  }
};

const existeEnvioPorPedidoWoo = async (numero_pedido, woo_id) => {
  try {
    const [rows] = await db.query(
      'SELECT id FROM envios WHERE numero_pedido = ? AND woo_id = ? LIMIT 1',
      [numero_pedido, woo_id]
    );

    return rows.length > 0;
  } catch (error) {
    console.error('❌ Error en existeEnvioPorPedidoWoo:', error);
    throw error;
  }
};

module.exports = {
  getAllEnvios,
  getEnvioById,
  createEnvio,
  updateEnvio,
  deleteEnvio,
  updateEstadoEnvio,
  getEstadoEnvio,
  existeEnvioPorPedidoWoo,
  createEnvioPersonalizado
};
