const db = require('../config/db');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');


const getAllUsuarios = async () => {
  console.log('Obteniendo todos los usuarios...modelo');
  const [rows] = await db.query(`
    SELECT 
      id AS usuario_id,
      nombre AS nombre_usuario,
      email,
      rol
    FROM usuarios
  `);
  /*
  const [rows] = await db.query(`
    SELECT DISTINCT 
      u.id AS usuario_id,
      u.nombre AS nombre_usuario,
      u.email,
      u.rol
    FROM correos_dinamicos.usuarios u
  `);*/
  return rows;
};


const createUsuario = async ({ nombre, email, contraseña, rol }) => {
  const [result] = await db.query(
    'INSERT INTO usuarios (nombre, email, contraseña, rol, activo) VALUES (?, ?, ?, ?, ?)',
    [nombre, email, contraseña, rol, true]
  );
  return result.insertId;
};

const findUserByEmail = async (email) => {
  try {
    const [rows] = await db.query('SELECT * FROM usuarios WHERE email = ?', [email]);
    return rows[0];
  } catch (err) {
    throw new Error('Error al buscar usuario por email: ' + err.message);
  }
};
const updateUsuario = async (id, { nombre, email, contraseña, rol, activo }) => {
  const campos = [];
  const valores = [];

  if (nombre !== undefined) {
    campos.push('nombre = ?');
    valores.push(nombre);
  }
  if (email !== undefined) {
    campos.push('email = ?');
    valores.push(email);
  }
  if (contraseña !== undefined) {
    // Aquí deberías hashear la contraseña si es necesario
    valores.push(contraseña);
    campos.push('contraseña = ?');
  }
  if (rol !== undefined) {
    campos.push('rol = ?');
    valores.push(rol);
  }
  if (activo !== undefined) {
    campos.push('activo = ?');
    valores.push(activo);
  }

  if (campos.length === 0) {
    throw new Error('No se proporcionaron campos para actualizar.');
  }

  valores.push(id);
  const sql = `UPDATE usuarios SET ${campos.join(', ')} WHERE id = ?`;
  const [result] = await db.query(sql, valores);
  return result;
};
const deleteUsuario = async (id) => {
  const [result] = await db.query('UPDATE usuarios SET activo = 0 WHERE id = ?', [id]);
  return result;
};


module.exports = {
  getAllUsuarios,
  createUsuario,
  findUserByEmail,
  deleteUsuario,
  updateUsuario
  
};




