const db = require('../config/db');

// Obtener todas las cotizaciones enviadas
const getAllCotizaciones = async () => {
  const [rows] = await db.query('SELECT * FROM cotizaciones_enviadas ORDER BY fecha_envio DESC');
  return rows;
};

// Obtener una cotización por ID
const getCotizacionById = async (id) => {
  const [rows] = await db.query('SELECT * FROM cotizaciones_enviadas WHERE id = ?', [id]);
  return rows[0];
};

// Obtener una cotización por ID, ordenadas de más nueva a más antigua
const getCotizacionByIdWoo = async (id) => {
  const [rows] = await db.query(
    'SELECT * FROM cotizaciones_enviadas WHERE id_woo = ? ORDER BY fecha_envio DESC',
    [id]
  );
  return rows;
};

const getCotizacionesWithEstado = async (id_woo) => {
  const [rows] = await db.query(
    `SELECT 
        c.*, 
        e.id AS id_envio,
        e.estado_envio AS estado_concretacion,
        e.mensaje_error AS mensaje_error_envio,
        e.fecha_envio AS fecha_envio_envio
     FROM cotizaciones_enviadas c
     LEFT JOIN envios_pesonalizados e
       ON e.id_cotizaccion = c.id
     WHERE c.id_woo = ?
     ORDER BY c.fecha_envio DESC`,
    [id_woo]
  );

  return rows;
};
const getCotizacionesWithEstadoByPeriodo = async (
  id_woo,
  fechaInicio,
  fechaFin
) => {
  const [rows] = await db.query(
    `
    SELECT 
      c.*, 
      e.id AS id_envio,
      e.estado_envio AS estado_concretacion,
      e.mensaje_error AS mensaje_error_envio,
      e.fecha_envio AS fecha_envio_envio
    FROM cotizaciones_enviadas c
    LEFT JOIN envios_pesonalizados e
      ON e.id_cotizaccion = c.id
    WHERE c.id_woo = ?
      AND CONVERT_TZ(c.actualizado_en, '+00:00', 'America/Santiago')
          BETWEEN ? AND ?
    ORDER BY c.actualizado_en DESC
    `,
    [id_woo, fechaInicio, fechaFin]
  );

  return rows;
};

const findEnvioByCotizacion = async (id_cotizaccion, id_woo) => {
  const [rows] = await db.query(
    `SELECT id 
     FROM envios_pesonalizados 
     WHERE id_cotizaccion = ? AND id_woo = ?
     LIMIT 1`,
    [id_cotizaccion, id_woo]
  );

  if (rows.length > 0) {
    return { exists: true, id_envio: rows[0].id };
  }

  return { exists: false, id_envio: null };
};

// Crear una cotización enviada
const createCotizacion = async (datos) => {
  const {
    id_usuario,
    id_woo,
    id_empresa,
    nombre_cliente,
    email_destino,
    total,
    descuento = null, // 👈 nuevo campo opcional
    moneda,
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
  } = datos;

  console.log('Creando cotización con los siguientes datos:', datos);

  const [result] = await db.query(
    `INSERT INTO cotizaciones_enviadas (
      id_usuario, id_woo, id_empresa, nombre_cliente, email_destino,
      total, descuento, moneda, subtotal, iva,
      productos_json, smtp_host, smtp_user, plantilla_usada,
      asunto_correo, cuerpo_html, estado_envio, mensaje_error
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id_usuario,
      id_woo,
      id_empresa,
      nombre_cliente,
      email_destino,
      total,
      descuento, // 👈 nuevo parámetro
      moneda,
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
    ]
  );

  return result.insertId;
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

// Eliminar cotización (opcional)
const deleteCotizacion = async (id) => {
  const [result] = await db.query('DELETE FROM cotizaciones_enviadas WHERE id = ?', [id]);
  return result;
};

// Actualizar estado de envío o mensaje de error (opcional)
const updateCotizacionEstado = async (id, { estado_envio, mensaje_error }) => {
  const [result] = await db.query(
    'UPDATE cotizaciones_enviadas SET estado_envio = ?, mensaje_error = ? WHERE id = ?',
    [estado_envio, mensaje_error, id]
  );
  return result;
};

const updateEnvioPersonalizadoEstado = async (id, { estado_envio, mensaje_error }) => {
  const [result] = await db.query(
    'UPDATE envios_pesonalizados SET estado_envio = ?, mensaje_error = ? WHERE id = ?',
    [estado_envio, mensaje_error, id]
  );
  return result;
};

module.exports = {
  getAllCotizaciones,
  getCotizacionById,
  createCotizacion,
  deleteCotizacion,
  updateCotizacionEstado,
  getCotizacionByIdWoo,
  createEnvioPersonalizado,
  updateEnvioPersonalizadoEstado,
  findEnvioByCotizacion,
  getCotizacionesWithEstado,
  getCotizacionesWithEstadoByPeriodo

};
