const { sendEnvioProductosCorreo } = require('../utils/mailer');

module.exports = async function enviosProductosProcessor(job) {
  console.log('🔄 Procesando job de enviosProductos:', job.id);
  const enviossProductos = job.data;
  const plantilla = enviossProductos.plantilla; // 👈 viene desde createCotizacion2

  console.log(`📝 Procesando job de cotización para ${enviossProductos.email_destino}`);
  console.log('Datos de la cotización:', enviossProductos);

  try {
    const smtpConfig = enviossProductos.smtpConfig;

    if (!smtpConfig || !smtpConfig.host || !smtpConfig.user || !smtpConfig.pass) {
      throw new Error(`❌ Configuración SMTP inválida o incompleta recibida en el job`);
    }

    // ✅ Formato de miles
    const formatoMiles = numero => Number(numero).toLocaleString('es-CL');

    // ✅ Cálculos
    const total = Number(enviossProductos.total || 0);
    const subtotal = total / 1.19;
    const totalFormateado = formatoMiles(total);
    const subtotalFormateado = formatoMiles(subtotal.toFixed(0));
    const iva = total - subtotal;
    const ivaFormateado = formatoMiles(iva.toFixed(0));

    // 🧾 Generar tabla de productos en HTML
    const productosHtml = enviossProductos.productos.map(p => {
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
          <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">${p.cantidad}</td>
          <td style="padding: 10px; border: 1px solid #ddd; text-align: right;">$${formatoMiles(p.price)}</td>
        </tr>
      `;
    }).join('');

    // 🔑 Bloque de seriales independiente
    const serialesHtml = enviossProductos.productos.map(p => {
      if (!p.seriales || p.seriales.length === 0) return '';
      return `
        <div style="margin-top:10px;">
          <strong>${p.name}</strong>
          <ul style="margin: 5px 0; padding-left: 15px; font-size: 12px; color: #555;">
            ${p.seriales.map(s => `<li>${s.codigo}</li>`).join('')}
          </ul>
        </div>
      `;
    }).join('');

    // 🔑 Construcción del bloque de mensaje opcional
   // 🔑 Construcción del bloque de mensaje opcional
let mensajeOpcionalHtml = '';
if (enviossProductos.mensaje_opcional && String(enviossProductos.mensaje_opcional).trim() !== '') {
  mensajeOpcionalHtml = `
    <div style="margin-top: 20px; padding: 15px; border-top: 1px solid #ddd; font-style: italic; color: #555;">
      <strong>Mensaje adicional:</strong><br>
      ${enviossProductos.mensaje_opcional}
    </div>
  `;
}

// 📝 Reemplazo de placeholders
let htmlContent = plantilla.cuerpo_html || '';
htmlContent = htmlContent
  .replace(/{{nombre_cliente}}/g, enviossProductos.nombre_cliente || 'cliente')
  .replace(/{{numero_cotizacion}}/g, enviossProductos.numero_cotizacion || 'N/A')
  .replace(/{{total}}/g, totalFormateado)
  .replace(/{{subtotal}}/g, subtotalFormateado)
  .replace(/{{iva}}/g, ivaFormateado)
  .replace(/{{tabla_productos}}/g, productosHtml)
  .replace(/{{seriales}}/g, serialesHtml)
  .replace(/{{firma}}/g, plantilla.firma || '')
  .replace(/{{logo_url}}/g, plantilla.logo_url || '')
  .replace(/{{encabezado}}/g, plantilla.encabezado || '')
  .replace(/{{validez_texto}}/g, plantilla.validez_texto || '')
  .replace(/{{mensaje_opcional}}/g, mensajeOpcionalHtml || ''); // 👈 asegura string vacío


    // 🔑 Concatenar plantillas por producto (si existen)
    const instruccionesHtml = enviossProductos.productos.map((p) => {
      const cuerpo = p?.plantilla?.cuerpo_html?.trim();
      if (!cuerpo) return '';
      return `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 30px auto; padding: 20px; border: 1px solid #ccc; border-radius: 8px;">
          <h3 style="color: #007BFF;">📦 <strong>${p.name}</strong></h3>
          ${cuerpo}
        </div>
      `;
    }).join('');

    // 📌 HTML final = plantilla general + plantillas de cada producto
    htmlContent = htmlContent + instruccionesHtml;

    // 📤 Envío del correo
    const subject = (plantilla.asunto || 'Tu cotización')
      .replace(/{{nombre_cliente}}/g, enviossProductos.nombre_cliente || 'cliente')
      .replace(/{{numero_cotizacion}}/g, enviossProductos.numero_cotizacion || 'N/A');

    await sendEnvioProductosCorreo({
      smtpConfig,
      to: enviossProductos.email_destino,
      subject,
      text: `Hola ${enviossProductos.nombre_cliente}, aquí está tu cotización solicitada.`,
      html: htmlContent
    });

    console.log(`✅ Correo de cotización enviado correctamente a ${enviossProductos.email_destino}`);
  } catch (err) {
    console.error(`❌ Error al enviar correo de cotización a ${enviossProductos.email_destino}:`, err);
    throw err;
  }
};
