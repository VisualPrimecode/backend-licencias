const db = require('../config/db');

// Obtener todos los envíos
const getAllEnvios = async () => {
  console.log("👉 entro en getAllEnvios");
  const [rows] = await db.query('SELECT * FROM envios_pesonalizados');
  return rows;
};

// Obtener un envío por ID
const getEnvioById = async (id) => {
  console.log("👉 entro en getEnvioById");
  const [rows] = await db.query('SELECT * FROM envios_pesonalizados WHERE id = ?', [id]);
  return rows[0];
};

const getEnviosByIdWoo = async (id_woo) => {
  const [rows] = await db.query('SELECT * FROM envios_pesonalizados WHERE id_woo = ? order by id desc', [id_woo]);
  return rows;
};

// Crear un nuevo envío
const createEnvio = async ({
  id_usuario,
  id_woo,
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
  estado_envio,
  mensaje_error,
  fecha_envio
}) => {
  console.log("👉 entro en createEnvio");
  const [result] = await db.query(
    `INSERT INTO envios_pesonalizados 
     (id_usuario, id_woo, id_empresa, nombre_cliente, email_destino, total, subtotal, iva, productos_json, smtp_host, smtp_user, plantilla_usada, asunto_correo, cuerpo_html, estado_envio, mensaje_error, fecha_envio)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id_usuario,
      id_woo,
      id_empresa,
      nombre_cliente,
      email_destino,
      total,
      subtotal,
      iva,
      JSON.stringify(productos_json), // aseguramos JSON
      smtp_host,
      smtp_user,
      plantilla_usada,
      asunto_correo,
      cuerpo_html,
      estado_envio || 'PENDIENTE',
      mensaje_error,
      fecha_envio
    ]
  );
  return result.insertId;
};

// Actualizar un envío existente
const updateEnvio = async (id, {
  id_usuario,
  id_woo,
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
  estado_envio,
  mensaje_error,
  fecha_envio
}) => {
  console.log("👉 entro en updateEnvio");
  const [result] = await db.query(
    `UPDATE envios_pesonalizados 
     SET id_usuario = ?, id_woo = ?, id_empresa = ?, nombre_cliente = ?, email_destino = ?, total = ?, subtotal = ?, iva = ?, productos_json = ?, smtp_host = ?, smtp_user = ?, plantilla_usada = ?, asunto_correo = ?, cuerpo_html = ?, estado_envio = ?, mensaje_error = ?, fecha_envio = ?
     WHERE id = ?`,
    [
      id_usuario,
      id_woo,
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
      fecha_envio,
      id
    ]
  );
  return result;
};

// Eliminar un envío
const deleteEnvio = async (id) => {
  console.log("👉 entro en deleteEnvio");
  const [result] = await db.query('DELETE FROM envios_pesonalizados WHERE id = ?', [id]);
  return result;
};

module.exports = {
  getAllEnvios,
  getEnvioById,
  createEnvio,
  updateEnvio,
  deleteEnvio,
  getEnviosByIdWoo
};
