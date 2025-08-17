const Serial = require('../models/serial.model');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const xlsx = require('xlsx');

const {createEnvioError} = require('../models/enviosErrores.model');


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
  console.log("entro en update serial");
  try {
    const { id } = req.params;
    const {
      codigo,
      producto_id,
      estado,
      observaciones,
      usuario_id
    } = req.body;
    console.log ("id",id);
    console.log("datos",req.body);
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
/*
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
};*/


exports.cargaMasivaSeriales = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Archivo no proporcionado' });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    const filePath = req.file.path;
    const BATCH_SIZE = 500;

    // Mapa de alias para cada campo
    const aliasMap = {
      codigo: ['codigo', 'código', 'serial', 'numero_serial', 'número_serial'],
      id_serial: ['id_serial', 'id serial', 'serial_id'],
      producto_id: ['producto_id', 'producto id', 'id_producto', 'id producto'],
      estado: ['estado', 'status', 'situacion', 'situación'],
      observaciones: ['observaciones', 'obs', 'comentarios', 'nota'],
      usuario_id: ['usuario_id', 'usuario id', 'id_usuario', 'id usuario'],
      woocommerce_id: ['woocommerce_id', 'woocommerce id', 'id_woocommerce', 'id woocommerce']
    };

    // Función para quitar tildes
    const quitarTildes = (texto) =>
      texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

    // Normalizar claves
    const normalizarClave = (clave) =>
      quitarTildes(clave.toLowerCase().trim().replace(/\s+/g, '_'));

    // Obtener valor según alias
    const obtenerValor = (fila, campo) => {
      for (const alias of aliasMap[campo]) {
        const key = normalizarClave(alias);
        if (fila.hasOwnProperty(key)) {
          return fila[key];
        }
      }
      return null;
    };
    const empresaWooMap = await Serial.precargarWooIdsPorEmpresa();

  const limpiarFila = (filaOriginal) => {
  const fila = {};
  for (const clave in filaOriginal) {
    fila[normalizarClave(clave)] = filaOriginal[clave];
  }

  const empresaNombre = fila.empresa?.trim();

  // Limpieza de valores con trim y manejo de numéricos con parseInt seguro
  const rawCodigo = obtenerValor(fila, 'codigo');
  const codigo = rawCodigo ? String(rawCodigo).trim() : '';

  const rawIdSerial = obtenerValor(fila, 'id_serial');
  const idSerial = rawIdSerial !== null && rawIdSerial !== undefined && String(rawIdSerial).trim() !== ''
    ? parseInt(String(rawIdSerial).trim(), 10)
    : null;

  const rawProdId = obtenerValor(fila, 'producto_id');
  const prodId = rawProdId !== null && rawProdId !== undefined && String(rawProdId).trim() !== ''
    ? parseInt(String(rawProdId).trim(), 10)
    : null;

  const estado = obtenerValor(fila, 'estado') || 'disponible';

  // Logs de depuración para ver valores limpios
  console.log('[DEBUG LIMPIAR_FILA] Entrada cruda:', {
    rawCodigo, rawIdSerial, rawProdId
  });
  console.log('[DEBUG LIMPIAR_FILA] Valores procesados:', {
    codigo, idSerial, prodId
  });

  return {
    codigo,
    id_serial: !isNaN(idSerial) ? idSerial : null,
    producto_id: !isNaN(prodId) ? prodId : null,
    estado,
    observaciones: obtenerValor(fila, 'observaciones') || '',
    usuario_id: obtenerValor(fila, 'usuario_id')
      ? parseInt(obtenerValor(fila, 'usuario_id'))
      : null,
    woocommerce_id: empresaWooMap[empresaNombre] || null
  };
};


    // Función para insertar lote
    const insertarLote = async (lote) => {
      if (!lote.length) return { affectedRows: 0 };
      return Serial.insertarSerialesMasivos(lote);
    };

    // Generador asíncrono para leer CSV
    const leerCSV = async function* () {
  const parser = fs.createReadStream(filePath).pipe(
    csv({
      separator: ';',
      skipEmptyLines: true,
      mapHeaders: ({ header }) => normalizarClave(header)
    })
  );
  for await (const row of parser) {
    yield limpiarFila(row);
  }
};


    // Generador asíncrono para leer XLSX
    const leerXLSX = async function* () {
      const workbook = xlsx.readFile(filePath);
      const hoja = workbook.Sheets[workbook.SheetNames[0]];
      const datos = xlsx.utils.sheet_to_json(hoja);
      for (const row of datos) {
        yield limpiarFila(row);
      }
    };

    // Elegir lector según extensión
    let lector;
    if (ext === '.csv') {
      lector = leerCSV();
    } else if (ext === '.xlsx') {
      lector = leerXLSX();
    } else {
      await fs.promises.unlink(filePath);
      return res.status(400).json({ error: 'Formato de archivo no soportado' });
    }

    // Procesar en lotes usando un flujo unificado
    let totalFilas = 0;
    let totalInsertados = 0;
    let batch = [];

    for await (const fila of lector) {
      totalFilas++;
      if (fila.codigo && fila.producto_id) {
        batch.push(fila);
        if (batch.length >= BATCH_SIZE) {
  console.log(`[DEPURACION] Insertando lote de ${batch.length} registros`);
  const resInsert = await insertarLote(batch);
  console.log('[DEPURACION] Resultado inserción:', resInsert);
  totalInsertados += resInsert.affectedRows;
  batch = [];
}

      }
    }

    // Insertar último lote si quedó algo
    if (batch.length) {
      const resInsert = await insertarLote(batch);
      totalInsertados += resInsert.affectedRows;
    }

    await fs.promises.unlink(filePath);

    res.json({
      mensaje: 'Carga completada',
      total: totalFilas,
      insertados: totalInsertados,
      omitidos: totalFilas - totalInsertados
    });

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

/*
exports.obtenerSerialDisponible = async (req, res) => {
  console.log('Iniciando solicitud para obtener serial disponible');
  try {
    const { producto_id, woocommerce_id } = req.body;

    // Validación básica
    if (!producto_id || !woocommerce_id) {
      return res.status(400).json({ error: 'producto_id y woocommerce_id son requeridos' });
    }
    console.log('Producto ID:', producto_id);
    console.log('WooCommerce ID:', woocommerce_id);
    const serial = await Serial.obtenerSerialDisponible(producto_id, woocommerce_id);
    console.log('Serial obtenido:', serial);
    if (!serial) {
      
      return res.status(404).json({ error: 'No hay seriales disponibles para este producto y woocommerce' });
    }

    res.status(200).json(serial);
  } catch (error) {
    console.error('❌ Error en obtenerSerialDisponible:', error);
    res.status(500).json({ error: 'Error al obtener serial disponible' });
  }
};*/
async function registrarErrorEnvio({ reqBody, motivo_error, detalles_error }) {
  console.log("Intento de crear registro de error...");
  console.log(reqBody);
  console.log(motivo_error);
  console.log(detalles_error);
  try {
    const {
      empresa_id,
      usuario_id,
      nombre_cliente,
      email_cliente,
      numero_pedido,
      numeroPedido, // <-- soportar camelCase
      producto_id
    } = reqBody;

    await createEnvioError({
      empresa_id,
      usuario_id,
      producto_id: producto_id || null, // <-- ahora también guarda producto
      serial_id: null, // no disponible en este flujo
      nombre_cliente,
      email_cliente,
      numero_pedido: numero_pedido || numeroPedido || null, // soporta ambas formas
      motivo_error,
      detalles_error
    });
  } catch (err) {
    console.error("⚠️ No se pudo registrar el error en BD:", err.message);
  }
}

/*
exports.obtenerSerialDisponible = async (req, res) => {
  console.log('Iniciando solicitud para obtener serial disponible');
  try {
    // Desestructurar y normalizar el nombre
    const { producto_id, woocommerce_id, numeroPedido } = req.body;
    const numero_pedido = numeroPedido; // alias para mantener consistencia

    console.log(req.body);
    console.log('Producto ID:', producto_id);
    console.log('WooCommerce ID:', woocommerce_id);
    console.log('Número de pedido:', numero_pedido);

    // Validación básica
    if (!producto_id || !woocommerce_id) {
      await registrarErrorEnvio({
        reqBody: {
          empresa_id: null,
          usuario_id: null,
          nombre_cliente: null,
          email_cliente: null,
          numero_pedido,
          producto_id // <-- añadir aquí

        },
        motivo_error: 'Validación inicial fallida',
        detalles_error: 'producto_id y woocommerce_id son requeridos'
      });
      return res.status(400).json({ error: 'producto_id y woocommerce_id son requeridos' });
    }

    const serial = await Serial.obtenerSerialDisponible(producto_id, woocommerce_id);
    console.log('Serial obtenido:', serial);

    if (!serial) {
      console.log("Número de pedido sin serial disponible:", numero_pedido);
      await registrarErrorEnvio({
        reqBody: {
          empresa_id: null,
          usuario_id: null,
          nombre_cliente: null,
          email_cliente: null,
          numero_pedido,
          producto_id // <-- añadir aquí

        },
        motivo_error: 'Serial no disponible',
        detalles_error: `No hay seriales disponibles para producto_id=${producto_id} y woocommerce_id=${woocommerce_id}`
      });
      return res.status(404).json({ error: 'No hay seriales disponibles para este producto y woocommerce' });
    }

    res.status(200).json(serial);

  } catch (error) {
    console.error('❌ Error en obtenerSerialDisponible:', error);

    await registrarErrorEnvio({
      reqBody: {
        empresa_id: null,
        usuario_id: null,
        nombre_cliente: null,
        email_cliente: null,
        numero_pedido: req.body.numeroPedido, // aquí también corregido,
        producto_id // <-- añadir aquí

      },
      motivo_error: 'Error interno en obtenerSerialDisponible',
      detalles_error: error.message
    });

    res.status(500).json({ error: 'Error al obtener serial disponible' });
  }
};*/
// Nuevo endpoint: obtener varios seriales a la vez y marcarlos como reservados
exports.obtenerSerialesDisponibles = async (req, res) => {
  console.log('Iniciando solicitud para obtener seriales disponibles');

  try {
    const { producto_id, woocommerce_id, cantidad, numeroPedido } = req.body;

    // Validación básica
    if (!producto_id || !woocommerce_id || !cantidad || cantidad <= 0) {
      await registrarErrorEnvio({
        reqBody: { producto_id, woocommerce_id, cantidad, numeroPedido },
        motivo_error: 'Validación inicial fallida',
        detalles_error: 'producto_id, woocommerce_id y cantidad son requeridos'
      });
      return res.status(400).json({ error: 'producto_id, woocommerce_id y cantidad son requeridos' });
    }

    const seriales = await Serial.obtenerSerialesDisponibles(
      producto_id,
      woocommerce_id,
      cantidad,
      numeroPedido
    );

    if (!seriales || seriales.length === 0) {
      await registrarErrorEnvio({
        reqBody: { producto_id, woocommerce_id, cantidad, numeroPedido },
        motivo_error: 'Seriales no disponibles',
        detalles_error: `No hay ${cantidad} seriales disponibles para producto_id=${producto_id} y woocommerce_id=${woocommerce_id}`
      });
      return res.status(404).json({ error: 'No hay suficientes seriales disponibles para este producto y woocommerce' });
    }

    res.status(200).json(seriales);

  } catch (error) {
    console.error('❌ Error en obtenerSerialesDisponibles:', error);

    await registrarErrorEnvio({
      reqBody: req.body,
      motivo_error: 'Error interno en obtenerSerialesDisponibles',
      detalles_error: error.message
    });

    res.status(500).json({ error: 'Error al obtener seriales disponibles' });
  }
};

