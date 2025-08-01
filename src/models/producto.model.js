const db = require('../config/db');

// Obtener todos los productos
const getAllProductos = async () => {
  console.log("entro en getAllProductos");
  const [rows] = await db.query('SELECT * FROM productos');
  return rows;
};

const getProductosDuplicados = async () => {
  const [rows] = await db.query('SELECT * FROM productos');
  return rows;
};




// Obtener un producto por ID
const getProductoById = async (id) => {
  console.log("entro en getProductoById");
  const [rows] = await db.query('SELECT * FROM productos WHERE id = ?', [id]);
  return rows[0];
};

const getProductoNameById = async (id) => {
  const [rows] = await db.query('SELECT nombre FROM productos WHERE id = ?', [id]);
  return rows[0];
};

// Crear un nuevo producto
const createProducto = async ({
  
  nombre,
  categoria,
  subcategoria,
  tipo_licencia,
  requiere_online
}) => {
  console.log("entro en createproducto")
  const [result] = await db.query(
    `INSERT INTO productos (nombre, categoria, subcategoria, tipo_licencia, requiere_online)
     VALUES (?, ?, ?, ?, ?)`,
    [nombre, categoria, subcategoria, tipo_licencia, requiere_online]
  );
  return result.insertId;
};

// Actualizar un producto existente
const updateProducto = async (id, {
  nombre,
  categoria,
  subcategoria,
  tipo_licencia,
  requiere_online
}) => {
  const [result] = await db.query(
    `UPDATE productos 
     SET nombre = ?, categoria = ?, subcategoria = ?, tipo_licencia = ?, requiere_online = ?
     WHERE id = ?`,
    [nombre, categoria, subcategoria, tipo_licencia, requiere_online, id]
  );
  return result;
};

// Eliminar un producto
const deleteProducto = async (id) => {
  const [result] = await db.query('DELETE FROM productos WHERE id = ?', [id]);
  return result;
};

//producto auxiliares

const insertarProductosAuxMasivos = async (productos) => {
  console.log("entro en insertarProductosAuxMasivos");
  console.log("productos:", productos);
  try {
    const valores = productos.map(producto => [
      producto.ID,
      producto.Nombre || null,
      producto.Precio_rebajado || null,
      producto.Precio_normal || null,
      producto.id_woo || null
    ]);

    const [result] = await db.query(
      `INSERT INTO productosAux (ID, Nombre, Precio_rebajado, Precio_normal, id_woo)
       VALUES ?`,
      [valores]
    );

    return result;
  } catch (err) {
    console.error('❌ Error al insertar productos masivos en productosAux:', err);
    throw err;
  }
};

// Obtener un producto por ID
const getProductoAuxByIdWoo = async (id) => {
  console.log("entro en getProductoAuxByIdWoo");
  const [rows] = await db.query('SELECT * FROM productosAux WHERE id_woo = ?', [id]);
  return rows;
};


module.exports = {
  getAllProductos,
  getProductoById,
  createProducto,
  updateProducto,
  deleteProducto,
  insertarProductosAuxMasivos,
  getProductoAuxByIdWoo,
  getProductoNameById,
  getProductosDuplicados
};
