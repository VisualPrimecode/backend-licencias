const { sendCotizacionCorreo } = require('../utils/mailer');

module.exports = async function correoSeguimientoProcessor(job) {
  const correoSeguimiento = job.data;
  console.log('datos del job correoSeguimiento:', correoSeguimiento);
  const plantilla = correoSeguimiento.plantilla;
  const nombreVendedor = 'Debora Fuentes';
  const cargo = 'Asesora Comercial';
const fechaActual = new Date().toISOString().split('T')[0];
const productosHtml = correoSeguimiento.productos_json.map(p => {
      return `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">${p.name}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${p.cantidad}</td>
        </tr>
      `;
    }).join('');
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
      .replace(/{{logo_url}}/g, plantilla.logo_url || '')
      .replace(/{{encabezado}}/g, plantilla.encabezado || '')
      .replace(/{{cuerpo_mensaje}}/g, correoSeguimiento.contenido || '')
      .replace(/{{fecha_cotizacion}}/g, correoSeguimiento.fecha_envio || '')
      .replace(/{{producto_servicio}}/g, productosHtml || 'N/A')
      .replace(/{{tabla_productos}}/g, productosHtml || 'N/A')
      .replace(/{{total}}/g, correoSeguimiento.total || 'N/A')
      .replace(/{{numero_cotizacion}}/g, correoSeguimiento.id || 'N/A')
      .replace(/{{fecha}}/g, fechaActual)
      .replace(/{{nombre_vendedor}}/g, nombreVendedor)
      .replace(/{{cargo}}/g, cargo)
      .replace(/{{telefono}}/g, plantilla.celular || 'N/A')
      .replace(/{{correo}}/g, plantilla.correo || 'N/A')
      .replace(/{{sitio_web}}/g, plantilla.sitio_web || 'N/A')
      .replace(/{{nombre_empresa}}/g, plantilla.nombre_empresa || 'N/A');
    // ✉️ Asunto con reemplazos
    const subject = (plantilla.asunto || 'Tu cotización')
      .replace(/{{nombre_cliente}}/g, correoSeguimiento.nombre_cliente || 'Cliente')
      .replace(/{{numero_cotizacion}}/g, correoSeguimiento.numero_cotizacion || 'N/A');
    // 📤 Enviar correo
    await sendCotizacionCorreo({
      smtpConfig,
      to: correoSeguimiento.email_destino,
      /*
      to: 'claudiorodriguez7778@gmail.com',*/
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
