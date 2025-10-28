const Informe = require('../models/informes.model');

//LICENCIAS ORIGINALES
exports.getInforme = async (req, res) => {
  console.log("Obteniendo informe para ID:", req.params.id);
  
  try {
    const { id: configId } = req.params;
    const { fechaInicio, fechaFin } = req.query;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ error: 'Los parámetros "fechaInicio" y "fechaFin" son obligatorios.' });
    }

    const datos = await Informe.getInformeLicenciasOriginales(configId, fechaInicio, fechaFin);
    res.json(datos);
  } catch (error) {
    console.error('❌ Error al obtener informe:', error);
    res.status(500).json({ error: 'Error al obtener datos del informe' });
  }
};

exports.getInformePorMes = async (req, res) => {
  console.log("📊 Obteniendo informe mensual para ID:", req.params.id);

  try {
    const { id: configId } = req.params;
    const { anio } = req.query;

    if (!anio || isNaN(parseInt(anio))) {
      return res.status(400).json({ error: 'El parámetro "anio" es obligatorio y debe ser un número válido.' });
    }

    const datos = await Informe.getInformeLicenciasPorMes(configId, parseInt(anio));

    // Opción: incluir los 12 meses (aunque no haya datos en la DB)
    const resultadoConMesesCompletos = Array.from({ length: 12 }, (_, i) => {
      const mes = i + 1;
      const encontrado = datos.find(d => d.mes === mes);
      return {
        mes,
        total_pagado: encontrado ? encontrado.total_pagado : 0
      };
    });

    res.json(resultadoConMesesCompletos);
  } catch (error) {
    console.error('❌ Error al obtener informe mensual:', error);
    res.status(500).json({ error: 'Error al obtener datos del informe mensual' });
  }
};
exports.getInformePorRango = async (req, res) => {
  console.log("📅 Obteniendo informe total y mensual por rango para ID:", req.params.id);

  try {
    const { id: configId } = req.params;
    const { fechaInicio, fechaFin } = req.query;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ error: 'Los parámetros "fechaInicio" y "fechaFin" son obligatorios.' });
    }

    const datos = await Informe.getInformeLicenciasPorRango(configId, fechaInicio, fechaFin);
    res.json(datos);
  } catch (error) {
    console.error('❌ Error al obtener informe:', error);
    res.status(500).json({ error: 'Error al obtener datos del informe' });
  }
};

//LICENCIAS SOFTWARE

exports.getInformePedidosDetallado = async (req, res) => {
  console.log("📦 Obteniendo informe detallado por rango para ID:", req.params.id);

  try {
    const { id: configId } = req.params;
    const { fechaInicio, fechaFin } = req.query;

    // Validar parámetros
    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ error: 'Los parámetros "fechaInicio" y "fechaFin" son obligatorios.' });
    }

    // Llamada al modelo
    const datos = await Informe.getInformePorRango(configId, fechaInicio, fechaFin);

    // Responder con los datos
    res.json(datos);
  } catch (error) {
    console.error('❌ Error al obtener informe detallado:', error);
    res.status(500).json({ error: 'Error al obtener datos del informe detallado' });
  }
};

//licencias digitales
exports.getInformePedidosDetalladoJeje = async (req, res) => {
  console.log("📦 Obteniendo informe detallado JEJE por rango para ID:", req.params.id);

  try {
    const { id: configId } = req.params;
    const { fechaInicio, fechaFin } = req.query;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({
        error: 'Los parámetros "fechaInicio" y "fechaFin" son obligatorios.'
      });
    }

    const datos = await Informe.getInformePedidosTotalesJejePorRango(configId, fechaInicio, fechaFin);
    res.json(datos);
  } catch (error) {
    console.error('❌ Error al obtener informe JEJE detallado:', error);
    res.status(500).json({ error: 'Error al obtener datos del informe detallado JEJE' });
  }
};
exports.getEstadoStockProductos = async (req, res) => {
  console.log("📦 Obteniendo estado de stock por promedio semanal");

  try {
    const { fechaInicio, fechaFin } = req.query;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ 
        error: 'Los parámetros "fechaInicio" y "fechaFin" son obligatorios.' 
      });
    }

    const datos = await Informe.getEstadoStockProductos(fechaInicio, fechaFin);

    res.json({
      rango: { fechaInicio, fechaFin },
      total_productos: datos.length,
      resultados: datos
    });

  } catch (error) {
    console.error('❌ Error en getEstadoStockProductos:', error.message);
    res.status(500).json({ error: 'Error al obtener estado del stock' });
  }
};

exports.getProductosVendidosPorRango = async (req, res) => {
  console.log("📦 Obteniendo informe de productos vendidos por rango");

  try {
    const { fechaInicio, fechaFin } = req.query;

    if (!fechaInicio || !fechaFin) {
      return res.status(400).json({ 
        error: 'Los parámetros "fechaInicio" y "fechaFin" son obligatorios.' 
      });
    }

    const datos = await Informe.getProductosVendidosPorRango(fechaInicio, fechaFin);

    res.json({
      rango: { fechaInicio, fechaFin },
      total_productos: datos.length,
      resultados: datos
    });

  } catch (error) {
    console.error('❌ Error en getProductosVendidosPorRango:', error.message);
    res.status(500).json({ error: 'Error al obtener datos del informe' });
  }
};
// controllers/StockController.js

const { getCorreosByStoreId } = require('../models/correosConfig.model');
const  stockProductoQueue   = require('../queues/StockProductoQueue');
//const { obtenerSMTPConfig } = require('../controllers/alertaStock.controller');

const obtenerSMTPConfig = async () => {
  const wooId = 6;
  const configList = await getCorreosByStoreId(wooId);

  if (!configList || configList.length === 0) {
    throw new Error('No se encontró configuración SMTP activa');
  }

  const config = configList[0];

  return {
    host: config.smtp_host,
    port: config.smtp_port,
    secure: !!config.smtp_secure,
    user: config.smtp_username,
    pass: config.smtp_password,
  };
};








const {
  existeAlertaActivaAdvertencia,
  registrarAlertaStock,
  upsertAlertaCritica
} = require('../models/alertasStockModel');

exports.verificarStockProductos = async (req, res) => {
  console.log("📦 Iniciando verificación de stock de productos del pedido...");

  try {
    const { productos } = req.body;

    // 1️⃣ Validar parámetros
    if (!Array.isArray(productos) || productos.length === 0) {
      return res.status(400).json({
        error: 'Debe proporcionar una lista de productos procesados para verificar el stock.'
      });
    }

    // 2️⃣ Llamar al modelo principal
    const resultados = await Informe.verificarStockProductos(productos);

    // 3️⃣ Calcular totales
    const { criticos, advertencias } = resultados.reduce(
      (acc, r) => {
        const estado = r.estado_stock?.toLowerCase();
        if (estado === "crítico" || estado === "critico") acc.criticos++;
        else if (estado === "advertencia") acc.advertencias++;
        return acc;
      },
      { criticos: 0, advertencias: 0 }
    );

    const meta = {
      total_productos: resultados.length,
      advertencias,
      criticos,
      fecha_evaluacion: new Date().toISOString()
    };

    // 4️⃣ Filtrar productos que realmente deben generar alerta
    const productosEnviar = [];

    for (const r of resultados) {
      const estado = r.estado_stock?.toLowerCase();

      if (estado === "crítico" || estado === "critico") {
        // Siempre se registra o actualiza
        await upsertAlertaCritica({
          producto_id: r.producto_id,
          producto_nombre: r.producto,
          estado_stock: estado,
          stock_disponible: r.stock_disponible,
          promedio_diario: r.promedio_diario
        });
        productosEnviar.push(r);

      } else if (estado === "advertencia") {
        // Solo registrar si no existe una alerta activa previa
        const yaExiste = await existeAlertaActivaAdvertencia(r.producto_id);
        if (!yaExiste) {
          await registrarAlertaStock({
            producto_id: r.producto_id,
            producto_nombre: r.producto,
            estado_stock: estado,
            stock_disponible: r.stock_disponible,
            promedio_diario: r.promedio_diario
          });
          productosEnviar.push(r);
        } else {
          console.log(`⚠️ ${r.producto} ya tiene alerta activa de advertencia, no se reenvía.`);
        }
      }
    }

    // 5️⃣ Si no hay productos nuevos para alertar → fin
    if (productosEnviar.length === 0) {
      console.log("✅ Sin nuevas alertas de stock. No se encola job.");
      return res.status(200).json({
        message: "Sin nuevas alertas de stock.",
        meta,
        resultados
      });
    }

    // 🕒 5️⃣.5️⃣ Verificar horario permitido (Chile)
    const ahoraChile = new Date().toLocaleString("en-US", { timeZone: "America/Santiago" });
    const horaChile = new Date(ahoraChile).getHours();

    if (horaChile < 8 || horaChile >= 24) {
      console.log("⏸️ Fuera del horario permitido (8:00 - 23:00 Chile). No se envían alertas.");
      return res.status(200).json({
        message: "Verificación realizada, pero sin envío por horario restringido (8:00 - 23:00 Chile).",
        meta,
        resultados,
        hora_actual_chile: `${horaChile}:00`
      });
    }

    // 6️⃣ Obtener configuración SMTP
    const smtpConfig = await obtenerSMTPConfig();
    if (!smtpConfig) throw new Error("No se encontró configuración SMTP activa.");

    // 7️⃣ Preparar datos del job Bull
    const jobData = {
      meta,
      resultados: productosEnviar,
      empresa: { nombre: "Sistema de Alertas" },
      smtpConfig,
      fecha_generacion: new Date().toISOString(),
      email_destinatario: ["claudiorodriguez7778@gmail.com"]
    };

    // 8️⃣ Encolar el job
    const job = await stockProductoQueue.add(jobData, {
      attempts: 3,
      removeOnComplete: true,
      removeOnFail: false,
      priority: 2
    });

    console.log(`📨 Job de verificación de stock encolado correctamente (ID: ${job.id})`);

    // 9️⃣ Responder
    return res.status(200).json({
      message: "✅ Verificación de stock encolada correctamente.",
      jobId: job.id,
      productos_alerta: productosEnviar.length,
      meta
    });

  } catch (error) {
    console.error("❌ Error en verificarStockProductos:", error);
    return res.status(500).json({
      error: "Error al verificar stock de productos.",
      detalles: error.message
    });
  }
};
/*
exports.obtenerPatronHorario = async (req, res) => {
  console.log("📊 Iniciando análisis de patrón horario de ventas...");

  try {
    const { productoIds } = req.body;

    // 1️⃣ Validar parámetros
    if (!Array.isArray(productoIds) || productoIds.length === 0) {
      return res.status(400).json({
        error: "Debe proporcionar una lista de IDs de productos para analizar el patrón horario."
      });
    }

    // 2️⃣ Llamar al modelo principal
    const resultados = await Informe.obtenerPatronHorario(productoIds);

    // 3️⃣ Procesar resultados → agrupar por producto
    const patronesAgrupados = resultados.reduce((acc, r) => {
      if (!acc[r.producto_id]) acc[r.producto_id] = {};
      acc[r.producto_id][r.rango_horario] = r.promedio_vendidos;
      return acc;
    }, {});

    // 4️⃣ Calcular metadatos
    const meta = {
      total_productos: Object.keys(patronesAgrupados).length,
      total_registros: resultados.length,
      rango_analizado: "Últimos 2 meses",
      fecha_evaluacion: new Date().toISOString()
    };

    // 5️⃣ Responder al cliente
    console.log(`✅ Patrón horario analizado para ${meta.total_productos} productos.`);
    return res.status(200).json({
      message: "✅ Patrón horario generado correctamente.",
      meta,
      data: patronesAgrupados
    });

  } catch (error) {
    console.error("❌ Error en obtenerPatronHorario:", error);
    return res.status(500).json({
      error: "Error al generar el patrón horario de ventas.",
      detalles: error.message
    });
  }
};*/
exports.obtenerPatronHorario = async (req, res) => {
  console.log("📊 Iniciando análisis de patrón horario de ventas...");

  try {
    const { productoIds } = req.body;

    // 1️⃣ Validar parámetros
    if (!Array.isArray(productoIds) || productoIds.length === 0) {
      return res.status(400).json({
        error: "Debe proporcionar una lista de IDs de productos para analizar el patrón horario."
      });
    }

    // 2️⃣ Llamar al modelo principal
    const resultados = await Informe.obtenerPatronHorario(productoIds);
    console.log(`📈 Resultados obtenidos: ${resultados.length} registros.`);
    console.log("resultados muestra:", resultados.slice(0, 5));

    // 3️⃣ Procesar resultados → agrupar por producto
    const patronesAgrupados = resultados.reduce((acc, r) => {
      if (!acc[r.producto_id]) {
        acc[r.producto_id] = {
          nombre: r.nombre_producto,      // 👈 agregado
          stock_actual: r.stock_actual ?? 0,
          horarios: {}
        };
      }

      acc[r.producto_id].horarios[r.rango_horario] = r.promedio_vendidos;
      return acc;
    }, {});

    // 4️⃣ Calcular metadatos
    const meta = {
      total_productos: Object.keys(patronesAgrupados).length,
      total_registros: resultados.length,
      rango_analizado: "Últimos 2 meses",
      fecha_evaluacion: new Date().toISOString()
    };

    // 5️⃣ Responder al cliente
    console.log(`✅ Patrón horario analizado para ${meta.total_productos} productos.`);
    return res.status(200).json({
      message: "✅ Patrón horario generado correctamente.",
      meta,
      data: patronesAgrupados
    });

  } catch (error) {
    console.error("❌ Error en obtenerPatronHorario:", error);
    return res.status(500).json({
      error: "Error al generar el patrón horario de ventas.",
      detalles: error.message
    });
  }
};


exports.calcularStockRestantePorHora = async (req, res) => {
  console.log("🕒 Iniciando cálculo de stock restante considerando hora parcial...");

  try {
    const { hora_actual, productoIds } = req.body;
    

    // 1️⃣ Validación
    if (!hora_actual || !Array.isArray(productoIds) || productoIds.length === 0) {
      return res.status(400).json({
        error: "Debe proporcionar una hora válida y una lista de IDs de productos."
      });
    }
    const alertaActiva = await Informe.obtenerEstadoAlertaStock();

    if (!alertaActiva) {
      console.log("🚫 ALERTA DESACTIVADA: No se generarán alertas.");
      return res.status(200).json({
        message: "🚫 El envío de alertas predictivas está actualmente desactivado.",
        meta: {
          alerta_activa: false,
          fecha_calculo: new Date().toISOString()
        },
        data: {}
      });
    }
    // 2️⃣ Convertir hora
    const [horaStr] = hora_actual.split(":");
    const hora = parseInt(horaStr, 10);

    // 3️⃣ Rangos horarios
    const rangos = [
      { nombre: "madrugada", inicio: 0, fin: 5 },
      { nombre: "mañana", inicio: 6, fin: 11 },
      { nombre: "tarde", inicio: 12, fin: 17 },
      { nombre: "noche", inicio: 18, fin: 23 }
    ];
    const rangoActual = rangos.find(r => hora >= r.inicio && hora <= r.fin)?.nombre || "noche";

    // 4️⃣ Proporción restante
    const rangoDef = rangos.find(r => r.nombre === rangoActual);
    const duracionRango = rangoDef.fin - rangoDef.inicio + 1;
    const horasTranscurridas = hora - rangoDef.inicio;
    const proporcionRestante = Math.max(0, (duracionRango - horasTranscurridas) / duracionRango);

    // 5️⃣ Rangos restantes
    const ordenRangos = rangos.map(r => r.nombre);
    const idxActual = ordenRangos.indexOf(rangoActual);
    const rangosRestantes = ordenRangos.slice(idxActual);

    // 6️⃣ Obtener patrón horario (ya trae nombre_producto)
    const resultados = await Informe.obtenerPatronHorario(productoIds);

    // 7️⃣ Estimación por producto
    const stockEstimado = {};

    for (const productoId of productoIds) {
      const filas = resultados.filter(r => r.producto_id === productoId);
      if (filas.length === 0) continue;

      const infoFila = filas[0]; // Usado para stock y nombre
      const nombreProducto = infoFila.nombre_producto;
      const stockActual = infoFila.stock_actual ?? 0;

      let consumoEstimado = 0;

      for (const f of filas) {
        const promedio = Number(f.promedio_vendidos || 0);

        if (f.rango_horario === rangoActual) {
          consumoEstimado += promedio * proporcionRestante;
        } else if (rangosRestantes.includes(f.rango_horario) && f.rango_horario !== rangoActual) {
          consumoEstimado += promedio;
        }
      }

      stockEstimado[productoId] = {
        producto_id: productoId,
        nombre: nombreProducto,
        stock_actual: stockActual,
        consumo_estimado_restante: Number(consumoEstimado.toFixed(2)),
        rango_actual: rangoActual,
        proporcion_rango_actual: Number(proporcionRestante.toFixed(2)),
        rangos_restantes: rangosRestantes
      };
    }

    // 8️⃣ Metadatos
    const meta = {
      hora_actual,
      rango_actual: rangoActual,
      proporcion_rango_actual: Number(proporcionRestante.toFixed(2)),
      rangos_restantes: rangosRestantes,
      total_productos: Object.keys(stockEstimado).length,
      fecha_calculo: new Date().toISOString()
    };

    // 🔥 9️⃣ DETECCIÓN DE ALERTAS PREDICTIVAS
    const productosEnviar = [];

    for (const productoId of Object.keys(stockEstimado)) {
      const info = stockEstimado[productoId];
      const { stock_actual, consumo_estimado_restante, nombre } = info;

      if (consumo_estimado_restante <= 0) continue;

      // Condición base de agotamiento
      if (stock_actual < consumo_estimado_restante) {

        const ratio = stock_actual / consumo_estimado_restante;
        let estado = "";

        if (ratio <= 0.5) {
          // 🔥 Crítico
          estado = "crítico";
          await upsertAlertaCritica({
            producto_id: Number(productoId),
            producto_nombre: nombre,
            estado_stock: estado,
            stock_disponible: stock_actual,
            consumo_estimado_restante
          });

          productosEnviar.push({
            producto_id: Number(productoId),
            producto: nombre,
            estado_stock: estado,
            stock_disponible: stock_actual,
            consumo_estimado_restante
          });

        } else {
          // 🟡 Advertencia
          estado = "advertencia";
          const yaExiste = await existeAlertaActivaAdvertencia(Number(productoId));

          if (!yaExiste) {
            await registrarAlertaStock({
              producto_id: Number(productoId),
              producto_nombre: nombre,
              estado_stock: estado,
              stock_disponible: stock_actual,
              consumo_estimado_restante
            });

            productosEnviar.push({
              producto_id: Number(productoId),
              producto: nombre,
              estado_stock: estado,
              stock_disponible: stock_actual,
              consumo_estimado_restante
            });
          }
        }
      }
    }

    // 1️⃣0️⃣ Si nada que alertar → responder normal
    if (productosEnviar.length === 0) {
      console.log("✅ Sin alertas predictivas requeridas.");
      return res.status(200).json({
        message: "✅ Cálculo realizado sin alertas predictivas.",
        meta,
        data: stockEstimado
      });
    }

    // 🕒 1️⃣1️⃣ Verificar horario permitido (Chile)
    const ahoraChile = new Date().toLocaleString("en-US", { timeZone: "America/Santiago" });
    const horaChile = new Date(ahoraChile).getHours();

    if (horaChile < 8 || horaChile >= 24) {
      console.log("⏸️ Fuera del horario permitido para envío de alertas.");
      return res.status(200).json({
        message: "Verificación realizada, pero sin envío por horario restringido.",
        meta,
        data: stockEstimado
      });
    }

    // 1️⃣2️⃣ Obtener configuración SMTP
    const smtpConfig = await obtenerSMTPConfig();
    if (!smtpConfig) throw new Error("No se encontró configuración SMTP activa.");

    // 1️⃣3️⃣ Encolar job predictivo
    const jobData = {
      meta,
      resultados: productosEnviar,
      empresa: { nombre: "Sistema de Alertas Predictivas" },
      smtpConfig,
      fecha_generacion: new Date().toISOString(),
      email_destinatario: ["claudiorodriguez7778@gmail.com","cleon@cloudi.cl","dtorres@cloudi.cl"]
    };

    const job = await stockProductoQueue.add(jobData, {
      attempts: 3,
      removeOnComplete: true,
      removeOnFail: false,
      priority: 2
    });

    console.log(`📨 Job predictivo encolado correctamente (ID: ${job.id})`);

    // 1️⃣4️⃣ Respuesta final
    return res.status(200).json({
      message: "✅ Alertas predictivas generadas y encoladas.",
      jobId: job.id,
      productos_alerta: productosEnviar.length,
      meta,
      data: stockEstimado
    });

  } catch (error) {
    console.error("❌ Error en calcularStockRestantePorHora:", error);
    return res.status(500).json({
      error: "Error al calcular el consumo restante según la hora.",
      detalles: error.message
    });
  }
};

