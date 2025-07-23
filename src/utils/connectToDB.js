const mysql = require('mysql2/promise');
/*
const connectToDB = async (config) => {
  const connection = await mysql.createConnection({
    host: config.host,
    port: config.puerto,
    user: config.usuario,
    password: config.contrasena,
    database: config.nombre_base_datos,
  });
*/

  // IP pública del Droplet con socat
const DROPLET_IP = '159.89.88.228';
const DROPLET_PORT = 3306; // Puerto donde socat está escuchando

const connectToDB = async (config) => {
  const connection = await mysql.createConnection({
    host: DROPLET_IP, // ✅ Conectamos al Droplet, no directamente a la BD
    port: DROPLET_PORT,
    user: config.usuario,
    password: config.contrasena,
    database: config.nombre_base_datos,
  });
  return connection;
};

module.exports = connectToDB;
