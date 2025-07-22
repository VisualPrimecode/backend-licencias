const mysql = require('mysql2/promise');

const connectToDB = async (config) => {
  const connection = await mysql.createConnection({
    host: config.host,
    port: config.puerto,
    user: config.usuario,
    password: config.contrasena,
    database: config.nombre_base_datos,
  });

  return connection;
};

module.exports = connectToDB;
