const db = require('../config/db');

// Obtener todos los productos
const getAllProductos = async () => {
  const [rows] = await db.query('SELECT * FROM productos');
  return rows;
};

// Obtener un producto por ID
const getProductoById = async (id) => {
  const [rows] = await db.query('SELECT * FROM productos WHERE id = ?', [id]);
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

module.exports = {
  getAllProductos,
  getProductoById,
  createProducto,
  updateProducto,
  deleteProducto,
};
