const Producto = require('../models/producto.model');
const fs = require('fs');
const path = require('path');
const csv = require('csv-parser');
const xlsx = require('xlsx');

// Obtener todos los seriales
// Obtener todos los productos
exports.getProductos = async (req, res) => {
  console.log("entro en getproductos")
  try {
    const productos = await Producto.getAllProductos();
    res.json(productos);
  } catch (error) {
    console.error('❌ Error al obtener productos:', error);
    res.status(500).json({ error: 'Error al obtener productos' });
  }
};

// Obtener un producto por ID
exports.getProductoById = async (req, res) => {
  try {
    const { id } = req.params;
    const producto = await Producto.getProductoById(id);

    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json(producto);
  } catch (error) {
    console.error('❌ Error al obtener producto:', error);
    res.status(500).json({ error: 'Error al obtener producto' });
  }
};

// Crear un producto
exports.createProducto = async (req, res) => {
  console.log("entro en crear producto")
  try {
    const {
      nombre,
      categoria,
      subcategoria,
      tipo_licencia,
      requiere_online
    } = req.body;

    // Validaciones básicas
    if (!nombre || !tipo_licencia) {
      return res.status(400).json({ error: 'Faltan campos requeridos' });
    }

    const tiposPermitidos = ['permanente', '1año', '3años','1mes', '6meses','2meses','3meses'];
    if (!tiposPermitidos.includes(tipo_licencia)) {
      return res.status(400).json({ error: `Tipo de licencia inválido. Permitidos: ${tiposPermitidos.join(', ')}` });
    }

    const id = await Producto.createProducto({
      nombre,
      categoria,
      subcategoria,
      tipo_licencia,
      requiere_online: requiere_online ? 1 : 0
    });

    res.status(201).json({ id });
  } catch (error) {
    console.error('❌ Error al crear producto:', error);
    res.status(500).json({ error: 'Error al crear producto' });
  }
};

// Actualizar un producto
exports.updateProducto = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      nombre,
      categoria,
      subcategoria,
      tipo_licencia,
      requiere_online
    } = req.body;

    const producto = await Producto.getProductoById(id);
    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    await Producto.updateProducto(id, {
      nombre,
      categoria,
      subcategoria,
      tipo_licencia,
      requiere_online: requiere_online ? 1 : 0
    });

    res.json({ mensaje: 'Producto actualizado correctamente' });
  } catch (error) {
    console.error('❌ Error al actualizar producto:', error);
    res.status(500).json({ error: 'Error al actualizar producto' });
  }
};

// Eliminar un producto
exports.deleteProducto = async (req, res) => {
  try {
    const { id } = req.params;

    const producto = await Producto.getProductoById(id);
    if (!producto) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    await Producto.deleteProducto(id);
    res.json({ mensaje: 'Producto eliminado correctamente' });
  } catch (error) {
    console.error('❌ Error al eliminar producto:', error);
    res.status(500).json({ error: 'Error al eliminar producto' });
  }
};
//productos axiliares
// Obtener un producto por ID
exports.getProductosAuxByIdWooController = async (req, res) => {
  try {
    const { id } = req.params;
    const productos = await Producto.getProductoAuxByIdWoo(id);

    if (!productos) {
      return res.status(404).json({ error: 'Producto no encontrado' });
    }

    res.json(productos);
  } catch (error) {
    console.error('❌ Error al obtener producto:', error);
    res.status(500).json({ error: 'Error al obtener producto' });
  }
};
exports.cargaMasivaProductosAux = async (req, res) => {
  const ID_WOO_ESTATICO = 5;
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'Archivo no proporcionado' });
    }

    const ext = path.extname(req.file.originalname).toLowerCase();
    const filePath = req.file.path;

    console.log('📁 Archivo recibido:', req.file.originalname);

    const limpiarCampo = (valor) => {
  if (typeof valor === 'string') {
    return valor.trim();
  }
  return valor;
};
const normalizarFila = (fila) => {
  const nuevaFila = {};
  for (const key in fila) {
    const claveLimpia = key.trim().toLowerCase().replace(/\s/g, '_');
    nuevaFila[claveLimpia] = fila[key];
  }
  return nuevaFila;
};

const mapFila = (fila) => ({
  ID: parseInt(fila.id) || null,
  Nombre: fila.nombre || '',
  Precio_rebajado: parseFloat(fila.precio_rebajado || 0),
  Precio_normal: parseFloat(fila.precio_normal || 0),
  id_woo: ID_WOO_ESTATICO // ← valor fijo aquí
});

    // Función común para ambos formatos
    const procesarYResponder = async (filas, totalFilas) => {
      console.log('📊 Total filas leídas del archivo:', totalFilas);

      const productosValidos = filas.filter(p => {
  const valido = p.ID && p.Nombre;
  if (!valido) {
    console.warn('⛔ Producto inválido (omitido):', p);
  }
  return valido;
});

      console.log('✅ Productos válidos para insertar:', productosValidos.length);

      if (productosValidos.length === 0) {
        fs.unlinkSync(filePath);
        console.warn('⚠️ No hay productos válidos. Verifica el formato del archivo.');
        return res.status(400).json({
          error: 'No se encontraron productos válidos para insertar. Revisa el archivo.'
        });
      }

      console.log('🚀 Insertando productos...');
      const resultado = await Producto.insertarProductosAuxMasivos(productosValidos);
      fs.unlinkSync(filePath);

      res.json({
        mensaje: 'Carga completada',
        total: totalFilas,
        insertados: resultado.affectedRows,
        omitidos: totalFilas - resultado.affectedRows
      });
    };

    if (ext === '.csv') {
      const filas = [];
      fs.createReadStream(filePath)
.pipe(csv({ separator: ';' }))
        .on('data', (data) => {
          console.log('📄 Fila CSV original:', data);
          const filaNormalizada = normalizarFila(data);
filas.push(mapFila(filaNormalizada));
        })
        .on('end', () => {
          procesarYResponder(filas, filas.length).catch((err) => {
            fs.unlinkSync(filePath);
            console.error('❌ Error al insertar productos:', err);
            res.status(500).json({ error: 'Error al insertar productos' });
          });
        });
    } else if (ext === '.xlsx') {
      const workbook = xlsx.readFile(filePath);
      const hoja = workbook.Sheets[workbook.SheetNames[0]];
      const datos = xlsx.utils.sheet_to_json(hoja);
      const filas = datos.map(mapFila);
      await procesarYResponder(filas, datos.length);
    } else {
      fs.unlinkSync(filePath);
      return res.status(400).json({ error: 'Formato de archivo no soportado' });
    }
  } catch (err) {
    console.error('❌ Error general en carga masiva:', err);
    res.status(500).json({ error: 'Error al procesar archivo' });
  }
};

