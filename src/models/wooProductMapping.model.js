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
const createMapping = async ({ empresa_id, woocommerce_id, woo_product_id, producto_interno_id, nombre_producto, precio, producto_externo_nombre }) => {
  const [result] = await db.query(
    `INSERT INTO woo_product_mappings (empresa_id, woocommerce_id, woo_product_id, producto_interno_id, nombre_producto, precio, nombre_producto_ext)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [empresa_id, woocommerce_id, woo_product_id, producto_interno_id, nombre_producto, precio, producto_externo_nombre]
  );
  return result.insertId;
};

// Actualizar un mapeo existente
const updateMapping = async (id, {
  empresa_id,
  woocommerce_id,
  woo_product_id,
  producto_interno_id,
  nombre_producto,
  precio,
  producto_externo_nombre
}) => {
  console.log('datos que llegan al modelo:', {
    empresa_id,
    woocommerce_id,
    woo_product_id,
    producto_interno_id,
    nombre_producto,
    precio,
    producto_externo_nombre
  });

  const [result] = await db.query(
    `UPDATE woo_product_mappings
     SET empresa_id = ?, woocommerce_id = ?, woo_product_id = ?, producto_interno_id = ?, nombre_producto = ?, precio = ?, nombre_producto_ext = ?
     WHERE id = ?`,
    [
      empresa_id,
      woocommerce_id,
      woo_product_id,
      producto_interno_id,
      nombre_producto,
      precio,
      producto_externo_nombre,
      id // <-- al final
    ]
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
  console.log('woocommerce_id:', woocommerce_id);
  console.log('woo_product_id:', woo_product_id);
  try {
    const [rows] = await db.query(
      `SELECT producto_interno_id 
       FROM woo_product_mappings 
       WHERE woocommerce_id = ? AND woo_product_id = ? 
       LIMIT 1`,
      [woocommerce_id, woo_product_id]
    );
    console.log('Resultado de la consulta:', rows[0].producto_interno_id);
    return rows.length > 0 ? rows[0].producto_interno_id : null;
  } catch (error) {
    throw new Error('Error al buscar producto interno, probablemente falta mapear el producto: ' + error.message);
  }
};
const getProductoInternoByNombreYWooId = async (nombreProducto, woocommerce_id) => {
  console.log('Llegó al método del modelo');
  console.log('nombreProducto:', nombreProducto);
  console.log('woocommerce_id:', woocommerce_id);

  try {
    // 1️⃣ Buscar en productosAux el id_woo por nombre
    const [auxRows] = await db.query(
      `SELECT ID
       FROM productosAux
       WHERE Nombre = ? AND id_woo = ?
       LIMIT 1`,
      [nombreProducto, woocommerce_id ]
    );

    if (auxRows.length === 0) {
      console.log('No se encontró el producto en productosAux');
      return null;
    }
    console.log('producto encontrado',auxRows);
    const woo_product_id = auxRows[0].ID;
    console.log("id woo producto", woo_product_id);
    // 2️⃣ Usar id_woo para buscar el producto interno en woo_product_mappings
    const [mapRows] = await db.query(
      `SELECT producto_interno_id
       FROM woo_product_mappings
       WHERE woocommerce_id = ? AND woo_product_id = ?
       LIMIT 1`,
      [woocommerce_id, woo_product_id]
    );

    console.log('Resultado de la consulta en mappings:', mapRows);

    return mapRows.length > 0 ? mapRows[0].producto_interno_id : null;
  } catch (error) {
    throw new Error('Error al buscar producto interno, probablemente falta mapear el producto: ' + error.message);
  }
};


module.exports = {
  getAllMappings,
  getMappingById,
  createMapping,
  updateMapping,
  deleteMapping,
  getMappingByIdWoo,
  getProductoInternoId,
  getProductoInternoByNombreYWooId
};
