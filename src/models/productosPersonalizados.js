const db = require('../config/db');

// Obtener todos los productos personalizados
const getAllProductosPersonalizados = async () => {
  console.log('Obteniendo todos los productos personalizados...');

  const [rows] = await db.query(`
    SELECT 
      id,
      nombre,
      descripcion,
      precio,
      unidad_medida,
      cantidad_default,
      creado_por,
      activo,
      creado_en,
      actualizado_en
    FROM productos_personalizados
    WHERE activo = 1
  `);

  return rows;
};

// Crear un producto personalizado
const createProductoPersonalizado = async ({
  nombre,
  descripcion,
  precio,
  unidad_medida,
  cantidad_default,
  creado_por
}) => {
  
  const [result] = await db.query(
    `INSERT INTO productos_personalizados 
      (nombre, descripcion, precio, unidad_medida, cantidad_default, creado_por, activo) 
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [
      nombre,
      descripcion,
      precio,
      unidad_medida,
      cantidad_default,
      creado_por || null,
      true
    ]
  );

  return result.insertId;
};

// Obtener producto por ID
const getProductoPersonalizadoById = async (id) => {
  const [rows] = await db.query(
    `SELECT * FROM productos_personalizados WHERE id = ? AND activo = 1`,
    [id]
  );

  return rows[0] || null;
};

// Actualizar producto personalizado
const updateProductoPersonalizado = async (
  id,
  { nombre, descripcion, precio, unidad_medida, cantidad_default, activo }
) => {
  const campos = [];
  const valores = [];

  if (nombre !== undefined) {
    campos.push('nombre = ?');
    valores.push(nombre);
  }
  if (descripcion !== undefined) {
    campos.push('descripcion = ?');
    valores.push(descripcion);
  }
  if (precio !== undefined) {
    campos.push('precio = ?');
    valores.push(precio);
  }
  if (unidad_medida !== undefined) {
    campos.push('unidad_medida = ?');
    valores.push(unidad_medida);
  }
  if (cantidad_default !== undefined) {
    campos.push('cantidad_default = ?');
    valores.push(cantidad_default);
  }
  if (activo !== undefined) {
    campos.push('activo = ?');
    valores.push(activo);
  }

  if (campos.length === 0) {
    throw new Error('No se proporcionaron campos para actualizar.');
  }

  valores.push(id);

  const sql = `UPDATE productos_personalizados SET ${campos.join(', ')} WHERE id = ?`;

  const [result] = await db.query(sql, valores);
  return result;
};

// Eliminación lógica
const deleteProductoPersonalizado = async (id) => {
  const [result] = await db.query(
    'UPDATE productos_personalizados SET activo = 0 WHERE id = ?',
    [id]
  );

  return result;
};

module.exports = {
  getAllProductosPersonalizados,
  createProductoPersonalizado,
  getProductoPersonalizadoById,
  updateProductoPersonalizado,
  deleteProductoPersonalizado
};
