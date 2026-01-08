const { sendEnvioProductosCorreo } = require('../utils/mailer');

module.exports = async function enviosProductosProcessor(job) {
  console.log('🔄 Procesando job de enviosProductos:', job.id);

  const enviosProductos = job.data;
  const plantilla = enviosProductos.plantilla;

  try {
    const smtpConfig = enviosProductos.smtpConfig;

    if (!smtpConfig || !smtpConfig.host || !smtpConfig.user || !smtpConfig.pass) {
      throw new Error('❌ Configuración SMTP inválida o incompleta recibida en el job');
    }

    // 🧾 Generar tabla de productos (solo producto + cantidad)
    const productosHtml = (enviosProductos.productos || []).map(p => {
      const serialesHtml = (p.seriales && p.seriales.length > 0)
        ? `
          <ul style="margin: 5px 0; padding-left: 15px; font-size: 12px; color: #555;">
            ${p.seriales.map(s => `<li>${s.codigo}</li>`).join('')}
          </ul>
        `
        : '';

      return `
        <tr>
          <td style="padding: 10px; border: 1px solid #ddd;">
            ${p.name}
            ${serialesHtml}
          </td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">
            ${p.cantidad}
          </td>
        </tr>
      `;
    }).join('');

    // 🔑 Construcción del bloque de mensaje opcional
    let mensajeOpcionalHtml = '';
    if (enviosProductos.mensaje_opcional && String(enviosProductos.mensaje_opcional).trim() !== '') {
      mensajeOpcionalHtml = `
        <div style="padding: 15px; border-top: 1px solid #ddd; font-style: italic; color: #555;">
          <strong>Mensaje adicional:</strong><br>
          ${enviosProductos.mensaje_opcional}
        </div>
      `;
    }

    // 📝 Reemplazo de placeholders en la plantilla
    let htmlContent = plantilla.cuerpo_html || '';
    htmlContent = htmlContent
      .replace(/{{nombre_cliente}}/g, enviosProductos.nombre_cliente || 'cliente')
      .replace(/{{tabla_productos}}/g, productosHtml)
      .replace(/{{mensaje_opcional}}/g, mensajeOpcionalHtml)
      .replace(/{{logo_url}}/g, plantilla.logo_url || '')
      .replace(/{{encabezado}}/g, plantilla.encabezado || '');

    // 🔑 Concatenar instrucciones por producto (si existen)
    const instruccionesHtml = (enviosProductos.productos || []).map(p => {
      const cuerpo = p?.plantilla?.cuerpo_html?.trim();
      if (!cuerpo) return '';

      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 30px auto; padding: 20px;
                    border: 1px solid #ccc; border-radius: 8px;">
          <h3 style="color: #1E63D5; margin-top: 0;">
            📦 ${p.name}
          </h3>
          ${cuerpo}
        </div>
      `;
    }).join('');

    // 📌 HTML final
    htmlContent = htmlContent + instruccionesHtml;

    // 📤 Envío del correo
    const subject = (plantilla.asunto || 'Envío de productos')
      .replace(/{{nombre_cliente}}/g, enviosProductos.nombre_cliente || 'cliente');

    await sendEnvioProductosCorreo({
      smtpConfig,
      to: enviosProductos.email_destino,
      subject,
      text: `Hola ${enviosProductos.nombre_cliente}, te enviamos el detalle de los productos enviados.`,
      html: htmlContent
    });

    console.log(`✅ Correo de envío de productos enviado correctamente a ${enviosProductos.email_destino}`);
  } catch (err) {
    console.error(
      `❌ Error al enviar correo de envío de productos a ${job?.data?.email_destino}:`,
      err
    );
    throw err;
  }
};
