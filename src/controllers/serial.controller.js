const Serial = require('../models/serial.model');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const xlsx = require('xlsx');

// Obtener todos los seriales
exports.getSeriales = async (req, res) => {
  try {
    const seriales = await Serial.getAllSeriales();
    res.json(seriales);
  } catch (error) {
    console.error('❌ Error al obtener seriales:', error);
    res.status(500).json({ error: 'Error al obtener seriales' });
  }
};

// Obtener un serial por ID
exports.getSerialById = async (req, res) => {
  try {
    const { id } = req.params;
    const serial = await Serial.getSerialById(id);

    if (!serial) {
      return res.status(404).json({ error: 'Serial no encontrado' });
    }

    res.json(serial);
  } catch (error) {
    console.error('❌ Error al obtener serial:', error);
    res.status(500).json({ error: 'Error al obtener serial' });
  }
};

// Crear un nuevo serial
exports.createSerial = async (req, res) => {
  try {
    const {
      codigo,
      producto_id,
      estado = 'disponible',
      observaciones,
      usuario_id
    } = req.body;

    // Validaciones mínimas
    if (!codigo || !producto_id) {
      return res.status(400).json({ error: 'Código y producto_id son obligatorios' });
    }

    const estadosValidos = ['disponible', 'asignado', 'enviado', 'agotado'];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ error: 'Estado no válido' });
    }

    const id = await Serial.createSerial({
      codigo,
      producto_id,
      estado,
      observaciones,
      usuario_id
    });

    res.status(201).json({ id });
  } catch (error) {
    console.error('❌ Error al crear serial:', error);
    res.status(500).json({ error: 'Error al crear serial' });
  }
};

// Actualizar un serial
exports.updateSerial = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      codigo,
      producto_id,
      estado,
      observaciones,
      usuario_id
    } = req.body;

    const serial = await Serial.getSerialById(id);
    if (!serial) {
      return res.status(404).json({ error: 'Serial no encontrado' });
    }

    await Serial.updateSerial(id, {
      codigo,
      producto_id,
      estado,
      observaciones,
      usuario_id
    });

    res.json({ mensaje: 'Serial actualizado correctamente' });
  } catch (error) {
    console.error('❌ Error al actualizar serial:', error);
    res.status(500).json({ error: 'Error al actualizar serial' });
  }
};

// Eliminar un serial
exports.deleteSerial = async (req, res) => {
  try {
    const { id } = req.params;

    const serial = await Serial.getSerialById(id);
    if (!serial) {
      return res.status(404).json({ error: 'Serial no encontrado' });
    }

    await Serial.deleteSerial(id);
    res.json({ mensaje: 'Serial eliminado correctamente' });
  } catch (error) {
    console.error('❌ Error al eliminar serial:', error);
    res.status(500).json({ error: 'Error al eliminar serial' });
  }
};
exports.cargaMasivaSeriales = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Archivo no proporcionado' });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    const filePath = req.file.path;
    let registros = [];

    // Función para limpiar campos
    const limpiarFila = (fila) => ({
      codigo: fila.codigo || fila['Código'] || fila['codigo'] || '',
      producto_id: parseInt(fila.producto_id || fila['Producto ID']) || null,
      estado: fila.estado || 'disponible',
      observaciones: fila.observaciones || '',
      usuario_id: fila.usuario_id ? parseInt(fila.usuario_id) : null
    });

    if (ext === '.csv') {
      // Leer CSV
      const filas = [];
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => {
          filas.push(limpiarFila(data));
        })
        .on('end', async () => {
          try {
            // Filtros básicos
            const serialesValidos = filas.filter(s => s.codigo && s.producto_id);
            const resultado = await Serial.insertarSerialesMasivos(serialesValidos);
            fs.unlinkSync(filePath); // eliminar archivo temporal
            res.json({
              mensaje: `Carga completada`,
              total: filas.length,
              insertados: resultado.affectedRows,
              omitidos: filas.length - resultado.affectedRows
            });
          } catch (error) {
            fs.unlinkSync(filePath);
            console.error('❌ Error al insertar seriales:', error);
            res.status(500).json({ error: 'Error al insertar seriales' });
          }
        });
    } else if (ext === '.xlsx') {
      // Leer Excel
      const workbook = xlsx.readFile(filePath);
      const hoja = workbook.Sheets[workbook.SheetNames[0]];
      const datos = xlsx.utils.sheet_to_json(hoja);
      registros = datos.map(limpiarFila).filter(s => s.codigo && s.producto_id);

      const resultado = await Serial.insertarSerialesMasivos(registros);
      fs.unlinkSync(filePath); // eliminar archivo temporal
      res.json({
        mensaje: `Carga completada`,
        total: datos.length,
        insertados: resultado.affectedRows,
        omitidos: datos.length - resultado.affectedRows
      });
    } else {
      fs.unlinkSync(filePath);
      res.status(400).json({ error: 'Formato de archivo no soportado' });
    }
  } catch (err) {
    console.error('❌ Error general en carga masiva:', err);
    res.status(500).json({ error: 'Error al procesar archivo' });
  }
};
exports.previsualizarSeriales = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Archivo no proporcionado' });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    const filePath = req.file.path;

    const limpiarFila = (fila) => ({
      codigo: fila.codigo || fila['Código'] || fila['codigo'] || '',
      producto_id: parseInt(fila.producto_id || fila['Producto ID']) || null,
      estado: fila.estado || 'disponible',
      observaciones: fila.observaciones || '',
      usuario_id: fila.usuario_id ? parseInt(fila.usuario_id) : null
    });

    let registros = [];

    if (ext === '.csv') {
      const filas = [];
      fs.createReadStream(filePath)
        .pipe(csv())
        .on('data', (data) => filas.push(limpiarFila(data)))
        .on('end', () => {
          fs.unlinkSync(filePath); // eliminar archivo temporal
          const validos = filas.filter(s => s.codigo && s.producto_id);
          res.json(validos);
        });
    } else if (ext === '.xlsx') {
      const workbook = xlsx.readFile(filePath);
      const hoja = workbook.Sheets[workbook.SheetNames[0]];
      const datos = xlsx.utils.sheet_to_json(hoja);
      registros = datos.map(limpiarFila).filter(s => s.codigo && s.producto_id);

      fs.unlinkSync(filePath);
      res.json(registros);
    } else {
      fs.unlinkSync(filePath);
      res.status(400).json({ error: 'Formato de archivo no soportado' });
    }
  } catch (err) {
    console.error('❌ Error en previsualización:', err);
    res.status(500).json({ error: 'Error al procesar archivo' });
  }
};
exports.obtenerSerialDisponible = async (req, res) => {
  try {
    const { producto_id, woocommerce_id } = req.body;

    // Validación básica
    if (!producto_id || !woocommerce_id) {
      return res.status(400).json({ error: 'producto_id y woocommerce_id son requeridos' });
    }

    const serial = await Serial.obtenerSerialDisponible(producto_id, woocommerce_id);

    if (!serial) {
      return res.status(404).json({ error: 'No hay seriales disponibles para este producto y woocommerce' });
    }

    res.status(200).json(serial);
  } catch (error) {
    console.error('❌ Error en obtenerSerialDisponible:', error);
    res.status(500).json({ error: 'Error al obtener serial disponible' });
  }
};