const { getEstadoStockProductos } = require('../models/informes.model');

const { getCorreosByStoreId } = require('../models/correosConfig.model');
const  stockAlertQueue  = require('../queues/stockAlertQueue');


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

exports.obtenerSMTPConfig = obtenerSMTPConfig;

exports.generarAlertaStock = async (req, res) => {
  try {
    // 🔹 Generar fechas automáticas
    const hoy = new Date();
    const haceDosMeses = new Date();
    haceDosMeses.setMonth(hoy.getMonth() - 1);

    // 🔹 Función para formatear fechas en YYYY-MM-DD
    function formatoFechaSQL(date) {
      const y = date.getFullYear();
      const m = String(date.getMonth() + 1).padStart(2, '0');
      const d = String(date.getDate()).padStart(2, '0');
      return `${y}-${m}-${d}`;
    }

    const fechaInicio = formatoFechaSQL(hoy);        // Hoy
    const fechaFin = formatoFechaSQL(haceDosMeses);  // Hace 2 meses

    console.log(`📊 Analizando stock entre ${fechaFin} → ${fechaInicio}`);

    // 1️⃣ Ejecutar el análisis de stock
    const resultados = await getEstadoStockProductos(fechaFin, fechaInicio);

    const datosStock = {
      rango: { fechaInicio, fechaFin },
      total_productos: resultados.length,
      resultados,
    };

    // 2️⃣ Filtrar productos con riesgo o bajo stock
    const productosEnRiesgo = resultados.filter(p =>
      p.estado_stock?.includes('Riesgo') || p.estado_stock?.includes('Atención')
    );

    if (productosEnRiesgo.length === 0) {
      console.log('✅ No hay productos en riesgo ni con stock bajo. Nada que encolar.');
      return res.status(200).json({
        message: 'Sin alertas de stock',
        total_productos: resultados.length,
      });
    }

    // 3️⃣ Obtener configuración SMTP activa
    const smtpConfig = await obtenerSMTPConfig();
    if (!smtpConfig) {
      throw new Error('No se encontró configuración SMTP activa');
    }

    // 4️⃣ Preparar jobData
    const jobData = {
      rango: datosStock.rango,
      total_productos: datosStock.total_productos,
      resultados: productosEnRiesgo,
      empresa: { nombre: 'Mi Distribuidora', dominio_web: 'midistribuidora.com' },
      smtpConfig,
      fecha_generacion: new Date().toISOString(),
      email_destinatario: ['claudiorodriguez7778@gmail.com'],//cleon@cloudi.cl
    };                                                              //dtorres@cloudi.cl


    // 5️⃣ Encolar job en Bull
    const job = await stockAlertQueue.add(jobData, {
      attempts: 3,
      removeOnComplete: true,
      removeOnFail: false,
      priority: 2,
    });

    console.log(`🚨   ojo ojo Job de alerta de stock encolado (ID: ${job.id})`);
    return res.status(200).json({
      message: '✅ Alerta de stock encolada correctamente',
      jobId: job.id,
      total_alertas: productosEnRiesgo.length,
    });

  } catch (error) {
    console.error('❌ Error generando alerta de stock:', error);
    return res.status(500).json({
      error: 'Error generando alerta de stock',
      detalles: error.message,
    });
  }
};
