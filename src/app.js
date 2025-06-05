const express = require('express');
const dotenv = require('dotenv');
const usuariosRoutes = require('./routes/usuarios.routes');

dotenv.config();

const app = express();
app.use(express.json());

// Rutas
app.use('/api/usuarios', usuariosRoutes);

// Ruta base
app.get('/', (req, res) => {
  res.send('API de Licencias funcionando 🚀');
});

module.exports = app;
