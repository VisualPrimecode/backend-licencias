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


// Obtener una plantilla por ID
const getPlantillaByIdProductoWoo = async (producto_id, woo_id) => {
  console.log('obteniendo plantillas para el producto', producto_id);
  console.log('empresa u woo id = ', woo_id);
  const [rows] = await db.query('SELECT * FROM plantillas_envio WHERE producto_id = ? AND woo_id = ?', [producto_id, woo_id]);
  return rows[0];
};
// Obtener una plantilla por ID de empresa
const getPlantillaByIdEmpresa = async (id) => {
  const [rows] = await db.query('SELECT * FROM plantillas_envio WHERE empresa_id = ?', [id]);
  return rows;
};
// Obtener una plantilla por ID wooCommerce y motivo

const getPlantillaByIdWooYmotivo = async (id, motivo) => {
  const [rows] = await db.query(
    'SELECT * FROM plantillas_envio WHERE woo_id = ? AND motivo = ?',
    [id, motivo]
  );
  return rows;
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
  activa,
  woocommerce_id,
  motivo,
  validez_texto
}) => {
  const [result] = await db.query(
    `INSERT INTO plantillas_envio 
    (empresa_id, producto_id, asunto, encabezado, cuerpo_html, firma, logo_url, idioma, activa, woo_id, motivo, validez_texto) 
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      empresa_id,
      producto_id,
      asunto,
      encabezado,
      cuerpo_html,
      firma,
      logo_url,
      idioma,
      activa ?? 1,
      woocommerce_id ?? null,
      motivo ?? null,
      validez_texto ?? null
    ]
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
  getPlantillaByIdEmpresa,
  getPlantillaByIdWooYmotivo,
  getPlantillaByIdProductoWoo
};
