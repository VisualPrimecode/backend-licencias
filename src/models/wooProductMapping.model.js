const db = require('../config/db');

// Obtener todos los mapeos
const getAllMappings = async () => {
  const [rows] = await db.query('SELECT * FROM woo_product_mappings');
  return rows;
};

// Obtener un mapeo por ID
const getMappingById = async (id) => {
  const [rows] = await db.query('SELECT * FROM woo_product_mappings WHERE id = ?', [id]);
  return rows[0];
};

// Obtener un mapeo por ID woocomerce
const getMappingByIdWoo = async (id) => {
  const [rows] = await db.query('SELECT * FROM woo_product_mappings WHERE woocommerce_id = ?', [id]);
  return rows;
};




// Crear un nuevo mapeo
const createMapping = async ({ empresa_id, woocommerce_id, woo_product_id, producto_interno_id }) => {
  const [result] = await db.query(
    `INSERT INTO woo_product_mappings (empresa_id, woocommerce_id, woo_product_id, producto_interno_id)
     VALUES (?, ?, ?, ?)`,
    [empresa_id, woocommerce_id, woo_product_id, producto_interno_id]
  );
  return result.insertId;
};

// Actualizar un mapeo existente
const updateMapping = async (id, { empresa_id, woocommerce_id, woo_product_id, producto_interno_id }) => {
  const [result] = await db.query(
    `UPDATE woo_product_mappings
     SET empresa_id = ?, woocommerce_id = ?, woo_product_id = ?, producto_interno_id = ?
     WHERE id = ?`,
    [empresa_id, woocommerce_id, woo_product_id, producto_interno_id, id]
  );
  return result;
};

// Eliminar un mapeo
const deleteMapping = async (id) => {
  const [result] = await db.query('DELETE FROM woo_product_mappings WHERE id = ?', [id]);
  return result;
};

const getProductoInternoId = async (woocommerce_id, woo_product_id) => {
  console.log('lllego al metodo del modelo');
  try {
    const [rows] = await db.query(
      `SELECT producto_interno_id 
       FROM woo_product_mappings 
       WHERE woocommerce_id = ? AND woo_product_id = ? 
       LIMIT 1`,
      [woocommerce_id, woo_product_id]
    );

    return rows.length > 0 ? rows[0].producto_interno_id : null;
  } catch (error) {
    throw new Error('Error al buscar producto interno: ' + error.message);
  }
};


module.exports = {
  getAllMappings,
  getMappingById,
  createMapping,
  updateMapping,
  deleteMapping,
  getMappingByIdWoo,
  getProductoInternoId
};
