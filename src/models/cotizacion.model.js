const { create } = require('handlebars');
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




// Crear una cotización enviada
const createCotizacion = async (datos) => {
  const {
    id_usuario,
    id_woo,
    id_empresa,
    nombre_cliente,
    email_destino,
    total,
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
      id_usuario, id_woo, id_empresa, nombre_cliente, email_destino, total, moneda, subtotal, iva,
      productos_json, smtp_host, smtp_user, plantilla_usada,
      asunto_correo, cuerpo_html, estado_envio, mensaje_error
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id_usuario,
      id_woo,
      id_empresa,
      nombre_cliente,
      email_destino,
      total,
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
      mensaje_error
    ]
  );

  return result.insertId;
};

const createEnvioPersonalizado = async (datos) => {
  const {
    id_usuario,
    id_woo,
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
      id_usuario, id_woo, numero_pedido, id_empresa, nombre_cliente, email_destino, total, subtotal, iva,
      productos_json, smtp_host, smtp_user, plantilla_usada,
      asunto_correo, cuerpo_html, estado_envio, mensaje_error, mensaje_opcional
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id_usuario,
      id_woo,
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
  updateEnvioPersonalizadoEstado

};
