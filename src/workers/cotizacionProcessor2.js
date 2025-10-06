const { sendCotizacionCorreo } = require('../utils/mailer');

module.exports = async function cotizacionProcessor(job) {
  const cotizacion = job.data;
  const plantilla = cotizacion.plantilla; // 👈 viene desde createCotizacion

  console.log(`📝 Procesando job de cotización para ${cotizacion.email_destino}`);
  console.log('Datos de la cotización:', cotizacion);

  try {
    const smtpConfig = cotizacion.smtpConfig;

    if (!smtpConfig || !smtpConfig.host || !smtpConfig.user || !smtpConfig.pass) {
      throw new Error(`❌ Configuración SMTP inválida o incompleta recibida en el job`);
    }

    // ✅ Función para aplicar separador de miles
    const formatoMiles = numero => Number(numero).toLocaleString('es-CL');

    // ✅ Calcular subtotal sin IVA
    const total = Number(cotizacion.total || 0);
    const subtotal = total / 1.19;

    const totalFormateado = formatoMiles(total);
    const subtotalFormateado = formatoMiles(subtotal.toFixed(0));
    const iva = total - subtotal;
    const ivaFormateado = formatoMiles(iva.toFixed(0));

    // 🧾 Generar tabla de productos en HTML
    const productosHtml = cotizacion.productos.map(p => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${p.name}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${p.cantidad}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">$${formatoMiles(p.price)}</td>
      </tr>
    `).join('');

    console.log('🔎 HTML original:', plantilla.cuerpo_html);
    console.log('🧠 Nombre cliente:', cotizacion.nombre_cliente);

    let htmlContent = plantilla.cuerpo_html || '';
    htmlContent = htmlContent
      .replace(/{{nombre_cliente}}/g, cotizacion.nombre_cliente || 'cliente')
      .replace(/{{numero_cotizacion}}/g, cotizacion.numero_cotizacion || 'N/A')
      .replace(/{{total}}/g, totalFormateado)
      .replace(/{{subtotal}}/g, subtotalFormateado)
      .replace(/{{iva}}/g, ivaFormateado) // 👈 NUEVO
      .replace(/{{tabla_productos}}/g, productosHtml)
      .replace(/{{firma}}/g, plantilla.firma || '')
      .replace(/{{logo_url}}/g, plantilla.logo_url || '')
      .replace(/{{encabezado}}/g, plantilla.encabezado || '')
      .replace(/{{validez_texto}}/g, plantilla.validez_texto || '');

   // console.log('📨 HTML con reemplazos:', htmlContent);

    // ✉️ Asunto con reemplazos también (opcional)
    const subject = (plantilla.asunto || 'Tu cotización')
      .replace(/{{nombre_cliente}}/g, cotizacion.nombre_cliente || 'cliente')
      .replace(/{{numero_cotizacion}}/g, cotizacion.numero_cotizacion || 'N/A');

    await sendCotizacionCorreo({
      smtpConfig,
      to: cotizacion.email_destino,
      subject,
      text: `Hola ${cotizacion.nombre_cliente}, aquí está tu cotización solicitada.`,
      html: htmlContent
    });

    console.log(`✅ Correo de cotización enviado correctamente a ${cotizacion.email_destino}`);
  } catch (err) {
    console.error(`❌ Error al enviar correo de cotización a ${cotizacion.email_destino}:`, err);
    throw err;
  }
};
