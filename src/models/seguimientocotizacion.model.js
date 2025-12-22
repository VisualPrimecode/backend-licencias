const db = require('../config/db');

/**
 * Obtener todos los seguimientos de correos de cotización
 */
const getAllSeguimientos = async () => {
  console.log("entro en getAllSeguimientos");
  const [rows] = await db.query(
    'SELECT * FROM seguimiento_correos_cotizacion'
  );
  return rows;
};

/**
 * Obtener seguimiento por ID
 */
const getSeguimientoById = async (id) => {
  console.log("entro en getSeguimientoById");
  const [rows] = await db.query(
    'SELECT * FROM seguimiento_correos_cotizacion WHERE id = ?',
    [id]
  );
  return rows[0];
};

/**
 * Obtener seguimientos por cotización
 */
const getSeguimientosByCotizacionId = async (cotizacion_id) => {
  console.log("entro en getSeguimientosByCotizacionId");
  const [rows] = await db.query(
    'SELECT * FROM seguimiento_correos_cotizacion WHERE cotizacion_id = ?',
    [cotizacion_id]
  );
  return rows;
};

/**
 * Crear nuevo seguimiento de correo
 */
const createSeguimiento = async (seguimiento) => {
  console.log("entro en createSeguimiento");

  const {
    cotizacion_id,
    correo_destinatario,
    asunto,
    cuerpo,
    fecha_programada,
    estado
  } = seguimiento;

  const [result] = await db.query(
    `INSERT INTO seguimiento_correos_cotizacion
     (cotizacion_id, correo_destinatario, asunto, cuerpo, fecha_programada, estado)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      cotizacion_id,
      correo_destinatario,
      asunto,
      cuerpo,
      fecha_programada,
      estado || 'pendiente'
    ]
  );

  return result.insertId;
};

/**
 * Actualizar seguimiento de correo
 */
const updateSeguimiento = async (id, seguimiento) => {
  console.log("entro en updateSeguimiento");

  const {
    correo_destinatario,
    asunto,
    cuerpo,
    fecha_programada,
    fecha_envio,
    estado
  } = seguimiento;

  const [result] = await db.query(
    `UPDATE seguimiento_correos_cotizacion
     SET correo_destinatario = ?,
         asunto = ?,
         cuerpo = ?,
         fecha_programada = ?,
         fecha_envio = ?,
         estado = ?
     WHERE id = ?`,
    [
      correo_destinatario,
      asunto,
      cuerpo,
      fecha_programada,
      fecha_envio,
      estado,
      id
    ]
  );

  return result.affectedRows;
};

/**
 * Eliminar seguimiento
 */
const deleteSeguimiento = async (id) => {
  console.log("entro en deleteSeguimiento");

  const [result] = await db.query(
    'DELETE FROM seguimiento_correos_cotizacion WHERE id = ?',
    [id]
  );

  return result.affectedRows;
};

/**
 * Marcar correo como enviado
 */
const marcarComoEnviado = async (id, fechaEnvio = new Date()) => {
  console.log("entro en marcarComoEnviado");

  const [result] = await db.query(
    `UPDATE seguimiento_correos_cotizacion
     SET estado = 'enviado',
         fecha_envio = ?
     WHERE id = ?`,
    [fechaEnvio, id]
  );

  return result.affectedRows;
};
/**
 * Actualizar solo el estado de un seguimiento
 */
const updateEstadoSeguimiento = async (id, estado) => {
  console.log("entro en updateEstadoSeguimiento");

  const [result] = await db.query(
    `UPDATE seguimiento_correos_cotizacion
     SET estado = ?
     WHERE id = ?`,
    [estado, id]
  );

  return result.affectedRows;
};
module.exports = {
  getAllSeguimientos,
  getSeguimientoById,
  getSeguimientosByCotizacionId,
  createSeguimiento,
  updateSeguimiento,
  deleteSeguimiento,
  marcarComoEnviado,
  updateEstadoSeguimiento
};
