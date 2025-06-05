const db = require('../config/db');

exports.getUsuarios = async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM usuarios');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
};

exports.createUsuario = async (req, res) => {
  const { nombre, email, contraseña, rol } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO usuarios (nombre, email, contraseña, rol, activo) VALUES (?, ?, ?, ?, ?)',
      [nombre, email, contraseña, rol, true]
    );
    res.status(201).json({ id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear usuario' });
  }
};
