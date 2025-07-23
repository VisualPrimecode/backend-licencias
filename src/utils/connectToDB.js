const net = require('net');
const mysql = require('mysql2/promise');

const DROPLET_IP = '159.89.88.228';
const DROPLET_PORT = 3306;

const connectToDB = async (config) => {
  return new Promise((resolve, reject) => {
    const { host, puerto, usuario, contrasena, nombre_base_datos } = config;

    const socket = net.createConnection({ host: DROPLET_IP, port: DROPLET_PORT }, async () => {
      const destino = `${host}:${puerto}\n`;
      socket.write(destino);

      try {
        const connection = await mysql.createConnection({
          user: usuario,
          password: contrasena,
          database: nombre_base_datos,
          stream: socket, // 👈 Reutilizamos el socket TCP como transporte
        });

        resolve(connection);
      } catch (err) {
        reject(new Error('❌ Error al conectar a la base de datos: ' + err.message));
      }
    });

    socket.on('error', (err) => {
      reject(new Error('❌ Error en el socket TCP: ' + err.message));
    });
  });
};

module.exports = connectToDB;
