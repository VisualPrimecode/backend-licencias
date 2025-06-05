const express = require('express');
const router = express.Router();
const db = require('../db');

// GET: listar todos los usuarios
router.get('/', async (req, res) => {
  try {
    const [rows] = await db.query('SELECT * FROM usuarios');
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
});

// POST: crear un usuario (simple ejemplo)
router.post('/', async (req, res) => {
  const { nombre, email, contraseña, rol } = req.body;
  try {
    const [result] = await db.query(
      'INSERT INTO usuarios (nombre, email, contraseña, rol, activo) VALUES (?, ?, ?, ?, ?)',
      [nombre, email, contraseña, rol, true]
    );
    res.status(201).json({ id: result.insertId, mensaje: 'Usuario creado' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al crear usuario' });
  }
});

module.exports = router;
