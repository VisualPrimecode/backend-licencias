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

exports.getProductosDuplicados = async (req, res) => {
  try {
    const productos = await Producto.getProductosDuplicados();

    // Agrupar y contar
    const contador = {};
    productos.forEach(prod => {
      const nombre = prod.nombre.trim().toLowerCase(); // normalizamos
      if (!contador[nombre]) {
        contador[nombre] = [];
      }
      contador[nombre].push(prod);
    });

    // Filtrar duplicados (más de una entrada)
    const duplicados = Object.values(contador).filter(arr => arr.length > 1);

    res.json({ duplicados });
  } catch (error) {
    console.error('❌ Error al detectar productos duplicados:', error);
    res.status(500).json({ error: 'Error al detectar duplicados' });
  }
};
const stringSimilarity = require('string-similarity');

// Función para limpiar y normalizar nombres
function normalizarNombre(str) {
  return str
    .toLowerCase()
    .replace(/[-–|,.:]+/g, '') // elimina símbolos comunes
    .replace(/\s+/g, ' ')      // reduce espacios múltiples
    .trim();
}

exports.getGruposPosiblesDuplicados = async (req, res) => {
  try {
    console.log('🔍 Iniciando búsqueda de posibles duplicados...');
    const productos = await Producto.getProductosDuplicados();
    console.log(`📦 Productos cargados: ${productos.length}`);

    const umbral = 0.75;
    const relaciones = [];

    // 1. Comparar productos por pares
    for (let i = 0; i < productos.length; i++) {
      const a = productos[i];
      const nombreA = normalizarNombre(a.nombre);

      for (let j = i + 1; j < productos.length; j++) {
        const b = productos[j];
        const nombreB = normalizarNombre(b.nombre);

        const score = stringSimilarity.compareTwoStrings(nombreA, nombreB);

        if (score >= umbral && nombreA !== nombreB) {
        //  console.log(`🟢 Similitud ${score.toFixed(2)} entre "${a.nombre}" y "${b.nombre}"`);
          relaciones.push([a, b]);
        } else {
      //    console.log(`⚪️ Similitud baja (${score.toFixed(2)}) entre "${a.nombre}" y "${b.nombre}"`);
        }
      }
    }

    //console.log(`🔗 Total de relaciones encontradas: ${relaciones.length}`);

    // 2. Agrupar conectados
    const grupos = [];
    const asignados = new Map(); // id -> grupoIndex

    for (const [a, b] of relaciones) {
      const idA = a.id;
      const idB = b.id;
      const grupoA = asignados.get(idA);
      const grupoB = asignados.get(idB);

      if (grupoA != null && grupoB != null) {
        if (grupoA !== grupoB) {
          //console.log(`🔄 Fusionando grupos ${grupoA} y ${grupoB}`);
          const grupo1 = grupos[grupoA];
          const grupo2 = grupos[grupoB];
          grupo1.push(...grupo2);
          grupos[grupoB] = [];
          grupo2.forEach(p => asignados.set(p.id, grupoA));
        }
      } else if (grupoA != null) {
        //console.log(`➕ Añadiendo "${b.nombre}" al grupo ${grupoA}`);
        grupos[grupoA].push(b);
        asignados.set(idB, grupoA);
      } else if (grupoB != null) {
      //  console.log(`➕ Añadiendo "${a.nombre}" al grupo ${grupoB}`);
        grupos[grupoB].push(a);
        asignados.set(idA, grupoB);
      } else {
        const nuevoGrupo = [a, b];
        const index = grupos.length;
        grupos.push(nuevoGrupo);
        asignados.set(idA, index);
        asignados.set(idB, index);
    //    console.log(`🆕 Creando nuevo grupo ${index} con "${a.nombre}" y "${b.nombre}"`);
      }
    }
    //este grupos si me sirven pero parce que cuando se ocupa en postamn se omite el [] que separa los grupos
    console.log('grupos formados', grupos);
    // 3. Limpiar grupos vacíos y duplicados
  /*  const gruposLimpios = grupos
      .filter(g => g.length > 0)
      .map(g => {
        const unicos = new Map();
        g.forEach(p => unicos.set(p.id, p));
        return Array.from(unicos.values());
      });

    console.log(`✅ Total de grupos formados: ${gruposLimpios.length}`);*/

    res.json({ grupos/*: gruposLimpios*/ });
  } catch (error) {
    console.error('❌ Error agrupando duplicados similares:', error);
    res.status(500).json({ error: 'Error al agrupar duplicados similares' });
  }
};
exports.getPosiblesDuplicados = async (req, res) => {
  try {
    const productos = await Producto.getProductosDuplicados(); // obtiene todos
    const posiblesDuplicados = [];
    const umbral = 0.8; // 80%

    // Normalizamos nombres y comparamos cada par una sola vez
    for (let i = 0; i < productos.length; i++) {
      const prodA = productos[i];
      const nombreA = prodA.nombre.trim().toLowerCase();

      for (let j = i + 1; j < productos.length; j++) {
        const prodB = productos[j];
        const nombreB = prodB.nombre.trim().toLowerCase();

        const score = stringSimilarity.compareTwoStrings(nombreA, nombreB);

        if (score >= umbral && nombreA !== nombreB) {
          posiblesDuplicados.push({
            productoA: { id: prodA.id, nombre: prodA.nombre },
            productoB: { id: prodB.id, nombre: prodB.nombre },
            similitud: score.toFixed(2)
          });
        }
      }
    }

    res.json({ posiblesDuplicados });
  } catch (error) {
    console.error('❌ Error al detectar posibles duplicados:', error);
    res.status(500).json({ error: 'Error al buscar posibles duplicados' });
  }
};


exports.eliminarDuplicados = async (req, res) => {
  try {
    const productos = await Producto.getProductosDuplicados();

    // Agrupamos productos por nombre normalizado
    const grupos = {};
    productos.forEach(prod => {
      const nombre = prod.nombre.trim().toLowerCase();
      if (!grupos[nombre]) grupos[nombre] = [];
      grupos[nombre].push(prod);
    });

    const eliminados = [];

    for (const nombre in grupos) {
      const grupo = grupos[nombre];
      if (grupo.length > 1) {
        // Ordenamos por ID (puedes cambiar esto si prefieres otro criterio)
        grupo.sort((a, b) => a.id - b.id);

        // Nos quedamos con el primero y eliminamos los demás
        const aEliminar = grupo.slice(1); // todos menos el primero

        for (const producto of aEliminar) {
          await Producto.deleteProducto(producto.id);
          eliminados.push(producto.id);
        }
      }
    }

    res.json({ eliminados });
  } catch (error) {
    console.error('❌ Error al eliminar duplicados:', error);
    res.status(500).json({ error: 'Error al eliminar duplicados' });
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
  try {
    const productos = Array.isArray(req.body) ? req.body : [req.body];
    const tiposPermitidos = ['permanente', '1año', '3años', '1mes', '6meses', '2meses', '3meses'];

    const ids = [];

    for (const producto of productos) {
      const {
        nombre,
        categoria,
        subcategoria,
        tipo_licencia,
        requiere_online
      } = producto;

      if (!nombre || !tipo_licencia) {
        return res.status(400).json({ error: 'Faltan campos requeridos en uno de los productos' });
      }

      if (!tiposPermitidos.includes(tipo_licencia)) {
        return res.status(400).json({ error: `Tipo de licencia inválido en uno de los productos. Permitidos: ${tiposPermitidos.join(', ')}` });
      }

      const id = await Producto.createProducto({
        nombre,
        categoria,
        subcategoria,
        tipo_licencia,
        requiere_online: requiere_online ? 1 : 0
      });

      ids.push(id);
    }

    res.status(201).json({ ids });
  } catch (error) {
    console.error('❌ Error al crear productos:', error);
    res.status(500).json({ error: 'Error al crear productos' });
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

