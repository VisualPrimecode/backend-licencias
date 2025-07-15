const { sendCotizacionCorreo } = require('../utils/mailer');

module.exports = async function cotizacionProcessor(job) {
  const cotizacion = job.data;

  console.log(`📝 Procesando job de cotización para ${cotizacion.email_destino}`);
  console.log('Datos de la cotización:', cotizacion);

  try {
    const smtpConfig = cotizacion.smtpConfig;

    if (!smtpConfig || !smtpConfig.host || !smtpConfig.user || !smtpConfig.pass) {
      throw new Error(`❌ Configuración SMTP inválida o incompleta recibida en el job`);
    }

    // 🧾 Generar tabla de productos en HTML
    const productosHtml = cotizacion.productos.map(p => `
      <tr>
        <td style="padding: 8px; border: 1px solid #ddd;">${p.name}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${p.cantidad}</td>
        <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">$${p.price}</td>
      </tr>
    `).join('');

    const htmlContent = `
      <div style="font-family: Arial, sans-serif; color: #333; max-width: 600px; margin: auto; padding: 20px; border: 1px solid #e0e0e0; border-radius: 10px;">
        <h2 style="color: #2196F3;">Cotización</h2>
        <p>Hola <strong>${cotizacion.nombre_cliente || 'cliente'}</strong>,</p>
        <p>Gracias por solicitar una cotización. Aquí tienes el detalle:</p>

        <table style="width: 100%; border-collapse: collapse; margin-top: 20px;">
          <thead>
            <tr style="background-color: #f5f5f5;">
              <th style="padding: 10px; border: 1px solid #ddd;">Producto</th>
              <th style="padding: 10px; border: 1px solid #ddd;">Cantidad</th>
              <th style="padding: 10px; border: 1px solid #ddd;">Precio</th>
            </tr>
          </thead>
          <tbody>
            ${productosHtml}
          </tbody>
        </table>

        <p style="margin-top: 20px;"><strong>Total:</strong> $${cotizacion.total}</p>

        <p style="margin-top: 30px;">Saludos,<br>El equipo de ventas</p>
      </div>
    `;

    await sendCotizacionCorreo({
      smtpConfig,
      to: cotizacion.email_destino,
      subject: `Tu cotización`,
      text: `Hola ${cotizacion.nombre_cliente}, aquí está tu cotización solicitada.`,
      html: htmlContent
    });

    console.log(`✅ Correo de cotización enviado correctamente a ${cotizacion.email_destino}`);
  } catch (err) {
    console.error(`❌ Error al enviar correo de cotización a ${cotizacion.email_destino}:`, err);
    throw err;
  }
};
