const { sendCotizacionCorreo } = require('../utils/mailer');

module.exports = async function correoSeguimientoProcessor(job) {
  const correoSeguimiento = job.data;
  const plantilla = correoSeguimiento.plantilla;

  try {
    const smtpConfig = correoSeguimiento.smtpConfig;
    if (!smtpConfig || !smtpConfig.host || !smtpConfig.user || !smtpConfig.pass) {
      throw new Error('❌ Configuración SMTP inválida o incompleta recibida en el job');
    }

    // 🧠 Reemplazar placeholders en plantilla
    let htmlContent = plantilla.cuerpo_html || '';
    htmlContent = htmlContent
      .replace(/{{nombre_cliente}}/g, correoSeguimiento.nombre_cliente || 'Cliente')
      /*fecha de envio */
      .replace(/{{fecha}}/g, correoSeguimiento.fecha_envio || 'N/A')
      .replace(/{{logo_url}}/g, plantilla.logo_url || '')
      .replace(/{{encabezado}}/g, plantilla.encabezado || '')

    // ✉️ Asunto con reemplazos
    const subject = (plantilla.asunto || 'Tu cotización')
      .replace(/{{nombre_cliente}}/g, correoSeguimiento.nombre_cliente || 'Cliente')
      .replace(/{{numero_cotizacion}}/g, correoSeguimiento.numero_cotizacion || 'N/A');
    // 📤 Enviar correo
    await sendCotizacionCorreo({
      smtpConfig,/*
      to: correoSeguimiento.email_destino,*/
      to: 'claudiorodriguez7778@gmail.com',
      subject,
      text: `Hola ${correoSeguimiento.nombre_cliente}, Nos gustaria conocer tu decision.`,
      html: htmlContent
    });

    console.log(`✅ Correo de cotización enviado correctamente a ${correoSeguimiento.email_destino}`);
  } catch (err) {
    console.error(`❌ Error al enviar correo de cotización a ${correoSeguimiento.email_destino}:`, err);
    throw err;
  }
};
