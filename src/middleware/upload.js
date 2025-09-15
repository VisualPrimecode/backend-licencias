/*const multer = require('multer');
const path = require('path');

// Configurar almacenamiento temporal
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Asegúrate de crear esta carpeta
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = path.basename(file.originalname, ext);
    cb(null, `${name}-${Date.now()}${ext}`);
  }
});

// Filtrar solo .csv y .xlsx
const fileFilter = (req, file, cb) => {
  const allowedTypes = ['.csv', '.xlsx'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Solo se permiten archivos .csv o .xlsx'), false);
  }
};

module.exports = multer({ storage, fileFilter });
*/
const multer = require("multer");
const path = require("path");

// Almacenamiento en memoria
const storage = multer.memoryStorage();

// Filtrar solo .csv y .xlsx
const fileFilter = (req, file, cb) => {
  const allowedTypes = [".csv", ".xlsx"];
  const ext = path.extname(file.originalname).toLowerCase();

  if (allowedTypes.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error("Solo se permiten archivos .csv o .xlsx"), false);
  }
};

// Limitar tamaño (ej. 5MB, ajusta según tu caso)
const limits = {
  fileSize: 5 * 1024 * 1024, // 5 MB
};

module.exports = multer({ storage, fileFilter, limits });
