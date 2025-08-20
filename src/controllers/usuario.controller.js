const Usuario = require('../models/usuario.model');

exports.getUsuarios = async (req, res) => {
  console.log('Obteniendo todos los usuarios...');
  try {
    const usuarios = await Usuario.getAllUsuarios();
    res.json(usuarios);
  } catch (error) {
    res.status(500).json({ error: 'Error al obtener usuarios' });
  }
};

exports.createUsuario = async (req, res) => {
  try {
    const { nombre, email, contraseña, rol } = req.body;
    const id = await Usuario.createUsuario({ nombre, email, contraseña, rol });
    res.status(201).json({ id });
  } catch (error) {
    res.status(500).json({ error: 'Error al crear usuario' });
  }
};
exports.updateUsuario = async (req, res) => {
  try {
    const { id } = req.params;
    const datosActualizados = req.body;

    // Validación básica
    if (!id) {
      return res.status(400).json({ error: 'ID de usuario requerido' });
    }

    const result = await Usuario.updateUsuario(id, datosActualizados);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ mensaje: 'Usuario actualizado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al actualizar usuario' });
  }
};
exports.deleteUsuario = async (req, res) => {
  console.log('Eliminando usuario...');
  try {
    const { id } = req.params;

    if (!id) {
      return res.status(400).json({ error: 'ID de usuario requerido' });
    }

    const result = await Usuario.deleteUsuario(id);

    if (result.affectedRows === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    res.json({ mensaje: 'Usuario eliminado correctamente' });
  } catch (error) {
    res.status(500).json({ error: 'Error al eliminar usuario' });
  }
};
