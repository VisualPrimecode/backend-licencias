const Usuario = require('../models/usuario.model');
const jwt = require('jsonwebtoken');

const verifyLogin = async (email, password) => {
  const user = await Usuario.findUserByEmail(email);

  if (!user) {
    return { error: 'Usuario no encontrado' };
  }

  /*const passwordCorrecta = await bcrypt.compare(password, user.contraseña);
  if (!passwordCorrecta) {
    return { error: 'Contraseña incorrecta' };
  }*/
 if (password !== user.contraseña) {
  return { error: 'Contraseña incorrecta' };
}

  if (!user.activo) {
    return { error: 'Usuario inactivo' };
  }

  // Crear token
  const token = jwt.sign(
    { id: user.id, email: user.email, rol: user.rol },
    process.env.JWT_SECRET,
    { expiresIn: '1d' }
  );

  delete user.contraseña;

  return { usuario: user, token };
};
exports.login = async (req, res) => {
  const { email, password } = req.body;

  try {
    console.log(`Intentando iniciar sesión con email: ${email}`);
    const resultado = await verifyLogin(email, password);

    if (resultado.error) {
      return res.status(401).json({ error: resultado.error });
    }
    console.log(`Inicio de sesión exitoso para el usuario: ${email}`);
    return res.json(resultado);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
};

