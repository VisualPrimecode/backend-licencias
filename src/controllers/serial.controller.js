const Serial = require('../models/serial.model');
const Empresa = require('../models/empresa.model');
const {getEmpresaByWooConfigId}= require('../models/empresa.model');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const xlsx = require('xlsx');

const {createEnvioError} = require('../models/enviosErrores.model');
const { raw } = require('mysql2');


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

// Obtener un serial por ID
exports.getSerialesPorPedido = async (req, res) => {
  try {
    const { id } = req.params;
    const serial = await Serial.getSerialesByNumeroPedido(id);

    if (!serial) {
      return res.status(404).json({ error: 'Serial no encontrado' });
    }

    res.json(serial);
  } catch (error) {
    console.error('❌ Error al obtener serial:', error);
    res.status(500).json({ error: 'Error al obtener serial' });
  }
};
exports.createSerial = async (req, res) => {
  console.log("➡️ Entró en create serial");
  console.log(req.body);
  try {
    const {
      codigo,
      producto_id,
      estado = 'disponible',
      observaciones,
      usuario_id,
      tienda_woo_id // 👈 viene del front
    } = req.body;

    // Validaciones mínimas
    if (!codigo || !producto_id || !tienda_woo_id) {
      return res.status(400).json({ error: 'Código, producto_id y tienda_woo_id son obligatorios' });
    }

    const estadosValidos = ['disponible', 'asignado', 'ENVIADO', 'agotado'];
    if (!estadosValidos.includes(estado)) {
      return res.status(400).json({ error: 'Estado no válido' });
    }

    // 👇 aquí hacemos el mapping a lo que espera el modelo
    const id = await Serial.createSerial({
      codigo,
      producto_id,
      estado,
      observaciones,
      usuario_id,
      woocommerce_id: tienda_woo_id, // 👈 se transforma antes de pasar al modelo
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


// Actualizar un serial
exports.updateSerialEstado = async (req, res) => {
  console.log("entro en updateestado serial");
  try {
    const { id } = req.params;
    const {
      estado,
      observaciones,
      numero_pedido,
      numero_envio,
      usuario_id
    } = req.body;
    console.log ("id",id);
    console.log("datos",req.body);
    const serial = await Serial.getSerialById(id);
    if (!serial) {
      return res.status(404).json({ error: 'Serial no encontrado' });
    }

    await Serial.updateSerialEstado(id, {
      estado,
      observaciones,
      numero_pedido,
      numero_envio,
      usuario_id
    });

    res.json({ mensaje: 'Serial actualizado correctamente' });
  } catch (error) {
    console.error('❌ Error al actualizar serial:', error);
    res.status(500).json({ error: 'Error al actualizar serial' });
  }
};


exports.updateSerialController2 = async (req, res) => {
  console.log("➡️ Entró en update serial2");
  try {
    const { id } = req.params;
    const {
      codigo,
      producto_id,
      estado,
      observaciones,
      usuario_id,
      tienda_woo_id // 👈 viene del front
    } = req.body;

    console.log("id", id);
    console.log("datos", req.body);

    const serial = await Serial.getSerialById(id);
    if (!serial) {
      return res.status(404).json({ error: 'Serial no encontrado' });
    }

    await Serial.updateSerial2(id, {
      codigo,
      producto_id,
      estado,
      observaciones,
      usuario_id,
      woocommerce_id: tienda_woo_id, // 👈 mapping al modelo
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

// ============================
// 🔹 Funciones de normalización y alias
// ============================

// Quita acentos/tildes de un texto
const quitarTildes = (texto) =>
  texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');

// Normaliza una clave de cabecera para que sea uniforme
const normalizarClave = (clave) =>
  quitarTildes(clave.toLowerCase().trim().replace(/\s+/g, '_'));

// Obtiene un valor de una fila en base al aliasMap
const obtenerValor = (fila, campo, aliasMap) => {
  for (const alias of aliasMap[campo]) {
    const key = normalizarClave(alias);
    if (fila.hasOwnProperty(key)) {
      return fila[key];
    }
  }
  return null;
};

// ============================
// 🔹 Limpieza y transformación de filas
// ============================

const limpiarFila = (filaOriginal, aliasMap, empresaWooMap) => {
  const fila = {};
  for (const clave in filaOriginal) {
    fila[normalizarClave(clave)] = filaOriginal[clave];
  }

  // Empresa: puede venir del archivo
  const rawEmpresa = fila.empresa;
  const empresaNombre = rawEmpresa ? String(rawEmpresa).trim() : '';

  // Producto
  const rawNombreProducto = obtenerValor(fila, 'nombre_producto', aliasMap)?.trim();
  const NombreProducto = rawNombreProducto ? String(rawNombreProducto).trim() : '';

  // Código
  const rawCodigo = obtenerValor(fila, 'codigo', aliasMap);
  const codigo = rawCodigo ? String(rawCodigo).trim() : '';

  // ID Serial
  const rawIdSerial = obtenerValor(fila, 'id_serial', aliasMap);
  const idSerial = rawIdSerial !== null && rawIdSerial !== undefined && String(rawIdSerial).trim() !== ''
    ? parseInt(String(rawIdSerial).trim(), 10)
    : null;

  // Producto ID directo
  const rawProdId = obtenerValor(fila, 'producto_id', aliasMap);
  const prodId = rawProdId !== null && rawProdId !== undefined && String(rawProdId).trim() !== ''
    ? parseInt(String(rawProdId).trim(), 10)
    : null;

  // Estado
  const estado = obtenerValor(fila, 'estado', aliasMap) || 'disponible';

  return {
    codigo,
    id_serial: !isNaN(idSerial) ? idSerial : null,
    producto_id: !isNaN(prodId) ? prodId : null,
    nombre_producto: NombreProducto || '',     // ✅ ya lo tienes
    empresa: empresaNombre || '',              // ✅ añadir empresa explícita
    estado,
    observaciones: obtenerValor(fila, 'observaciones', aliasMap) || '',
    usuario_id: obtenerValor(fila, 'usuario_id', aliasMap)
      ? parseInt(obtenerValor(fila, 'usuario_id', aliasMap))
      : null,
    woocommerce_id: empresaWooMap[empresaNombre] || null
  };
};

// ============================
// 🔹 Lectores de archivos (CSV y XLSX)
// ============================
/*
const leerCSV = async function* (filePath, aliasMap, empresaWooMap) {
  const parser = fs.createReadStream(filePath).pipe(
    csv({
      separator: ';',
      skipEmptyLines: true,
      mapHeaders: ({ header }) => normalizarClave(header)
    })
  );
  for await (const row of parser) {
    yield limpiarFila(row, aliasMap, empresaWooMap);
  }
};

const leerXLSX = async function* (filePath, aliasMap, empresaWooMap) {
  const workbook = xlsx.readFile(filePath);
  const hoja = workbook.Sheets[workbook.SheetNames[0]];
  const datos = xlsx.utils.sheet_to_json(hoja);
  for (const row of datos) {
    yield limpiarFila(row, aliasMap, empresaWooMap);
  }
};

// Selector de lector en base a extensión
const getLector = (ext, filePath, aliasMap, empresaWooMap) => {
  if (ext === '.csv') {
    return leerCSV(filePath, aliasMap, empresaWooMap);
  } else if (ext === '.xlsx') {
    return leerXLSX(filePath, aliasMap, empresaWooMap);
  } else {
    throw new Error('Formato de archivo no soportado');
  }
};

const insertarLote = async (lote) => {
  if (!lote.length) return { affectedRows: 0 };

  try {
    const resultado = await Serial.insertarSerialesMasivos(lote);
    console.log(`[DEPURACION] Insertados ${resultado.affectedRows} registros`);
    return resultado;
  } catch (error) {
    console.error('❌ Error al insertar lote:', error);
    return { affectedRows: 0 };
  }
};
*/

/*
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
      nombre_producto: ['nombre_producto', 'producto', 'producto_nombre', 'nombre producto'],
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
  const nombreProducto = obtenerValor(fila, 'nombre_producto')?.trim();

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
};*/
// ============================
// 🔹 Orquestador principal
// ============================
/*
exports.cargaMasivaSeriales = async (req, res) => {
  try {
    // 1. Validar archivo
    if (!req.file) {
      return res.status(400).json({ error: 'Archivo no proporcionado' });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    const filePath = req.file.path;
    const BATCH_SIZE = 500;

    // 2. Definir alias
    const aliasMap = {
      codigo: ['codigo', 'código', 'serial', 'numero_serial', 'número_serial'],
      id_serial: ['id_serial', 'id serial', 'serial_id'],
      producto_id: ['producto_id', 'producto id', 'id_producto', 'id producto'],
      nombre_producto: ['nombre_producto', 'producto', 'producto_nombre', 'nombre producto'],
      estado: ['estado', 'status', 'situacion', 'situación'],
      observaciones: ['observaciones', 'obs', 'comentarios', 'nota'],
      usuario_id: ['usuario_id', 'usuario id', 'id_usuario', 'id usuario'],
      woocommerce_id: ['woocommerce_id', 'woocommerce id', 'id_woocommerce', 'id woocommerce']
    };

    // 3. Precargar mapa de WooCommerce por empresa
    const empresaWooMap = await Serial.precargarWooIdsPorEmpresa();

    // 4. Elegir lector según extensión
   let lector;
try {
  lector = getLector(ext, filePath, aliasMap, empresaWooMap);
} catch (error) {
  await fs.promises.unlink(filePath);
  return res.status(400).json({ error: error.message });
}

// 5. Procesar archivo en lotes
let totalFilas = 0;
let totalInsertados = 0;
let batch = [];

/// cache en memoria: clave = "empresa:producto", valor = productoInternoId
const productoCache = new Map();

// contadores agrupados
const resumenInsertados = new Map(); // clave: empresa:producto
const resumenOmitidos = new Map();   // clave: empresa:producto:motivo

for await (const fila of lector) {
  totalFilas++;

  const nombreEmpresa = fila.empresa?.trim() || "";
  const nombreProducto = fila.nombre_producto?.trim() || "";

  if (!nombreEmpresa || !nombreProducto) {
    const motivo = `Faltan datos → empresa: "${nombreEmpresa}", producto: "${nombreProducto}"`;
    console.warn(`Fila omitida: ${motivo}`);
    const key = `${nombreEmpresa}:${nombreProducto}:${motivo}`;
    resumenOmitidos.set(key, {
      empresa: nombreEmpresa,
      producto: nombreProducto,
      motivo,
      cantidad: (resumenOmitidos.get(key)?.cantidad || 0) + 1
    });
    continue;
  }

  const cacheKey = `${nombreEmpresa}:${nombreProducto}`;
  let productoInternoId = productoCache.get(cacheKey);

  if (productoInternoId === undefined) {
    console.log(`Resolviendo producto para: ${nombreProducto} en empresa: ${nombreEmpresa}`);
    productoInternoId = await Empresa.getProductoInternoByEmpresaYProducto(
      nombreEmpresa,
      nombreProducto
    );
    productoCache.set(cacheKey, productoInternoId); // guarda incluso null
  }

  if (!productoInternoId) {
    const motivo = "Sin mapeo interno";
    console.warn(`Fila omitida: ${nombreProducto} (empresa: ${nombreEmpresa}) - ${motivo}`);
    const key = `${nombreEmpresa}:${nombreProducto}:${motivo}`;
    resumenOmitidos.set(key, {
      empresa: nombreEmpresa,
      producto: nombreProducto,
      motivo,
      cantidad: (resumenOmitidos.get(key)?.cantidad || 0) + 1
    });
    continue;
  }

  fila.producto_id = productoInternoId;

  if (fila.codigo && fila.producto_id) {
    batch.push(fila);

    // 👇 contar como insertable (aunque el batch se inserta después)
    const key = `${nombreEmpresa}:${nombreProducto}`;
    resumenInsertados.set(key, {
      empresa: nombreEmpresa,
      producto: nombreProducto,
      cantidad: (resumenInsertados.get(key)?.cantidad || 0) + 1
    });

    if (batch.length >= BATCH_SIZE) {
      try {
        const resInsert = await insertarLote(batch);
        totalInsertados += resInsert.affectedRows;
      } catch (err) {
        console.error(`❌ Error al insertar lote: ${err.message}`);
      } finally {
        batch = [];
      }
    }
  }
}

// insertar último batch pendiente
if (batch.length) {
  try {
    const resInsert = await insertarLote(batch);
    totalInsertados += resInsert.affectedRows;
  } catch (err) {
    console.error(`❌ Error al insertar último lote: ${err.message}`);
  }
}

await fs.promises.unlink(filePath);

// convertir Map → array para respuesta JSON
const insertadosArray = Array.from(resumenInsertados.values());
const omitidosArray = Array.from(resumenOmitidos.values());

res.json({
  mensaje: "Carga completada",
  total: totalFilas,
  insertados: totalInsertados,
  resumen_insertados: insertadosArray,
  resumen_omitidos: omitidosArray
});

  } catch (err) {
    console.error('❌ Error general en carga masiva:', err);
    res.status(500).json({ error: 'Error al procesar archivo' });
  }
};*/

exports.cargaMasivaSeriales = async (req, res) => {
  try {
    // 1. Validar archivo
    if (!req.file) {
      return res.status(400).json({ error: "Archivo no proporcionado" });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    const filePath = req.file.path;
    const BATCH_SIZE = 500;

    // 2. Función para limpiar y validar fila
    const limpiarFila = (fila) => ({
      id_serial: fila.id_serial ? parseInt(fila.id_serial, 10) : null,
      codigo: fila.codigo ? String(fila.codigo).trim() : null,
      producto_id: fila.producto_id ? parseInt(fila.producto_id, 10) : null,
      estado: fila.estado?.trim() || "disponible",
      fecha_ingreso: fila.fecha_ingreso || new Date(),
      observaciones: fila.observaciones?.trim() || "",
      usuario_id: fila.usuario_id ? parseInt(fila.usuario_id, 10) : null,
      woocommerce_id: fila.woocommerce_id
        ? parseInt(fila.woocommerce_id, 10)
        : null,
      numero_pedido: fila.numero_pedido
        ? String(fila.numero_pedido).trim()
        : null,
    });

    // 3. Obtener lector según extensión
    let lector;
    try {
      lector = getLector(ext, filePath, limpiarFila);
    } catch (error) {
      await fs.promises.unlink(filePath);
      return res.status(400).json({ error: error.message });
    }

    // 4. Procesar archivo en lotes
    let totalFilas = 0;
    let totalInsertados = 0;
    let batch = [];

    for await (const fila of lector) {
      totalFilas++;

      // Validación mínima: codigo + producto_id obligatorios
      if (fila.codigo && fila.producto_id) {
        batch.push(fila);

        if (batch.length >= BATCH_SIZE) {
          const resInsert = await insertarLote(batch);
          totalInsertados += resInsert.affectedRows;
          batch = [];
        }
      }
    }

    // Insertar último lote pendiente
    if (batch.length) {
      const resInsert = await insertarLote(batch);
      totalInsertados += resInsert.affectedRows;
    }

    await fs.promises.unlink(filePath);

    // 5. Respuesta final
    res.json({
      mensaje: "Carga completada",
      total: totalFilas,
      insertados: totalInsertados,
      omitidos: totalFilas - totalInsertados,
    });
  } catch (err) {
    console.error("❌ Error general en carga masiva:", err);
    res.status(500).json({ error: "Error al procesar archivo" });
  }
};

// ============================
// 🔹 Lectores de archivos (CSV y XLSX)
// ============================
const leerCSV = async function* (filePath, limpiarFila) {
  const parser = fs.createReadStream(filePath).pipe(
    csv({
      separator: ";",
      skipEmptyLines: true,
    })
  );
  for await (const row of parser) {
    yield limpiarFila(row);
  }
};

const leerXLSX = async function* (filePath, limpiarFila) {
  const workbook = xlsx.readFile(filePath);
  const hoja = workbook.Sheets[workbook.SheetNames[0]];
  const datos = xlsx.utils.sheet_to_json(hoja);
  for (const row of datos) {
    yield limpiarFila(row);
  }
};

const getLector = (ext, filePath, limpiarFila) => {
  if (ext === ".csv") return leerCSV(filePath, limpiarFila);
  if (ext === ".xlsx") return leerXLSX(filePath, limpiarFila);
  throw new Error("Formato de archivo no soportado");
};

// ============================
// 🔹 Inserción en lotes
// ============================
const insertarLote = async (lote) => {
  if (!lote.length) return { affectedRows: 0 };

  try {
    const resultado = await Serial.insertarSerialesMasivos(lote);
    console.log(`[DEPURACION] Insertados ${resultado.affectedRows} registros`);
    return resultado;
  } catch (error) {
    console.error("❌ Error al insertar lote:", error);
    return { affectedRows: 0 };
  }
};




exports.previsualizarSeriales = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Archivo no proporcionado" });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    const filePath = req.file.path;

    const limpiarFila = (fila) => ({
      id_serial: fila.id_serial ? parseInt(fila.id_serial, 10) : null,
      codigo: fila.codigo ? String(fila.codigo).trim() : null,
      producto_id: fila.producto_id ? parseInt(fila.producto_id, 10) : null,
      estado: fila.estado?.trim() || "disponible",
      fecha_ingreso: fila.fecha_ingreso || new Date(),
      observaciones: fila.observaciones?.trim() || "",
      usuario_id: fila.usuario_id ? parseInt(fila.usuario_id, 10) : null,
      woocommerce_id: fila.woocommerce_id ? parseInt(fila.woocommerce_id, 10) : null,
      numero_pedido: fila.numero_pedido ? String(fila.numero_pedido).trim() : null,
       });

   if (ext === ".csv") {
  const filas = [];
  fs.createReadStream(filePath)
    .pipe(csv({ separator: ';' })) // 👈 importante
    .on("data", (data) => {
      console.log("📥 Fila cruda CSV:", data);
      const limpia = limpiarFila(data);
      console.log("✨ Fila normalizada:", limpia);
      filas.push(limpia);
    })
    .on("end", () => {
      fs.unlinkSync(filePath);
      const validos = filas.filter(s => s.codigo && s.producto_id);
      console.log("✅ Filas válidas:", validos.length);
      res.json(validos);
    });
} else if (ext === ".xlsx") {
  
      const workbook = xlsx.readFile(filePath);
      const hoja = workbook.Sheets[workbook.SheetNames[0]];
      const datos = xlsx.utils.sheet_to_json(hoja);

      console.log("📥 Datos XLSX crudos:", datos);
      registros = datos.map(limpiarFila).filter(s => s.codigo && s.producto_id);
      console.log("✅ Filas válidas:", registros.length);

      fs.unlinkSync(filePath);
      res.json(registros);
    } else {
      fs.unlinkSync(filePath);
      res.status(400).json({ error: "Formato de archivo no soportado" });
    }
  } catch (err) {
    console.error("❌ Error en previsualización:", err);
    res.status(500).json({ error: "Error al procesar archivo" });
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
     const tienda = await getEmpresaByWooConfigId(woocommerce_id);

await registrarErrorEnvio({
  reqBody: { producto_id, woocommerce_id, cantidad, numeroPedido },
  motivo_error: 'Seriales no disponibles',
  detalles_error: `No hay ${cantidad} seriales disponibles para producto_id=${producto_id} y tienda=${tienda?.nombre_empresa || 'Desconocida'}`
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

exports.obtenerSeriales = async (req, res) => {
  console.log('📦 Obteniendo seriales disponibles...');
  try {
    const { woocommerce_id, woo_product_id, cantidad } = req.body;

    if (!woocommerce_id || !woo_product_id || !cantidad) {
      return res.status(400).json({ error: 'Faltan parámetros requeridos' });
    }

    const result = await Serial.getSerialesByWooData(
      woocommerce_id,
      woo_product_id,
      cantidad
    );

    if (result.error) {
      return res.status(404).json({ error: result.message });
    }

    res.json({ seriales: result.seriales });
  } catch (error) {
    console.error('❌ Error al obtener seriales:', error);
    res.status(500).json({ error: 'Error al obtener seriales' });
  }
};

// Obtener seriales con paginación
exports.getSerialesPaginated = async (req, res) => {
  try {
    // Obtenemos page y limit desde query params, con valores por defecto
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const offset = (page - 1) * limit;

    // Llamamos al modelo
    const seriales = await Serial.getSerialesPaginated(limit, offset);

    res.json({
      page,
      limit,
      count: seriales.length,
      data: seriales,
    });
  } catch (error) {
    console.error('❌ Error al obtener seriales paginados:', error);
    res.status(500).json({ error: 'Error al obtener seriales paginados' });
  }
};
exports.searchSeriales = async (req, res) => {
  try {
    const { codigo, estado, numeroPedido, woocommerceId, productoInternoId } = req.query;

    const filters = {
      codigo: codigo || null,
      estado: estado || null,
      numeroPedido: numeroPedido || null,
      woocommerceId: woocommerceId || null,
      productoInternoId: productoInternoId || null,
    };

    console.log('🔍 Filtros recibidos:', filters);

    const seriales = await Serial.searchSeriales(filters);

    res.json({
      count: seriales.length,
      data: seriales,
    });
  } catch (error) {
    console.error('❌ Error al buscar seriales:', error);
    res.status(500).json({ error: 'Error al buscar seriales' });
  }
};
