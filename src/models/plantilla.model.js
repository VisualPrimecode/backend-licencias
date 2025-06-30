const db = require('../config/db');

// Obtener todas las plantillas
const getAllPlantillas = async () => {
  const [rows] = await db.query('SELECT * FROM plantillas_envio');
  return rows;
};

// Obtener una plantilla por ID
const getPlantillaById = async (id) => {
  const [rows] = await db.query('SELECT * FROM plantillas_envio WHERE id = ?', [id]);
  return rows[0];
};

// Crear una nueva plantilla
const createPlantilla = async ({
  empresa_id,
  producto_id,
  asunto,
  encabezado,
  cuerpo_html,
  firma,
  logo_url,
  idioma,
  activa
}) => {
  const [result] = await db.query(
    `INSERT INTO plantillas_envio 
    (empresa_id, producto_id, asunto, encabezado, cuerpo_html, firma, logo_url, idioma, activa) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [empresa_id, producto_id, asunto, encabezado, cuerpo_html, firma, logo_url, idioma, activa ?? 1]
  );
  return result.insertId;
};

// Actualizar una plantilla existente
const updatePlantilla = async (
  id,
  {
    empresa_id,
    producto_id,
    asunto,
    encabezado,
    cuerpo_html,
    firma,
    logo_url,
    idioma,
    activa
  }
) => {
  const [result] = await db.query(
    `UPDATE plantillas_envio 
     SET empresa_id = ?, producto_id = ?, asunto = ?, encabezado = ?, cuerpo_html = ?, firma = ?, logo_url = ?, idioma = ?, activa = ?
     WHERE id = ?`,
    [empresa_id, producto_id, asunto, encabezado, cuerpo_html, firma, logo_url, idioma, activa, id]
  );
  return result;
};

// Eliminar una plantilla
const deletePlantilla = async (id) => {
  const [result] = await db.query('DELETE FROM plantillas_envio WHERE id = ?', [id]);
  return result;
};

module.exports = {
  getAllPlantillas,
  getPlantillaById,
  createPlantilla,
  updatePlantilla,
  deletePlantilla,
};
