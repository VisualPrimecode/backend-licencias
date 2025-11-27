const { sendEnvioCorreo } = require('../utils/mailer');

module.exports = async function alertaPedidoProcessor(job) {
  const alerta = job.data;

  console.log("🚨 [alertaPedidoProcessor] Datos recibidos:", alerta);

  try {
   const {
  smtpConfig,
  numero_pedido,
  empresa_id,
  wooId,
  productos_afectados: rawProductos,
  total_productos_ok = 0,
  total_productos_fallidos = 0,
  fecha_fallo,
} = alerta;

// Garantiza SIEMPRE un array
const productos_afectados = Array.isArray(rawProductos) ? rawProductos : [];

    // 🧩 1️⃣ Validar SMTP
    if (!smtpConfig?.host || !smtpConfig?.user || !smtpConfig?.pass) {
      throw new Error('❌ smtpConfig inválido o incompleto.');
    }

    // 🧮 2️⃣ Construir tabla HTML de productos con error
    const htmlProductos = productos_afectados.map((p, i) => `
      <tr>
        <td style="border: 1px solid #ddd; padding: 8px;">${i + 1}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${p.nombre_producto || '-'}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${p.cantidad_solicitada || 0}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center;">${p.cantidad_asignada || 0}</td>
        <td style="border: 1px solid #ddd; padding: 8px; text-align: center; color: #c0392b;">
          ${p.cantidad_faltante || 0}
        </td>
        <td style="border: 1px solid #ddd; padding: 8px;">${p.producto_id}</td>
        <td style="border: 1px solid #ddd; padding: 8px;">${p.mensaje_error || 'Error no especificado'}</td>
      </tr>
    `).join('') || `
      <tr><td colspan="6" style="padding:10px; text-align:center;">No se encontraron productos afectados.</td></tr>
    `;

    // 🧾 3️⃣ Construir cuerpo del correo
    const htmlFinal = `
      <div style="font-family: Arial, sans-serif; max-width: 750px; margin: auto; padding: 20px; border: 1px solid #e74c3c; border-radius: 10px;">
        <h2 style="color: #e74c3c;">🚨 Alerta de Pedido con Problemas</h2>

        <div style="background: #fff3cd; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <p><strong>📦 Pedido:</strong> #${numero_pedido}</p>
          <p><strong>🏢 Empresa ID:</strong> ${empresa_id || 'N/D'}</p>
          <p><strong>⚙️ Woo Config ID:</strong> ${wooId || 'N/D'}</p>
          <p><strong>🕒 Fecha del fallo:</strong> ${new Date(fecha_fallo).toLocaleString('es-CL')}</p>
        </div>

        <h3>Productos con errores o falta de stock:</h3>
        <table style="width:100%; border-collapse: collapse; margin-top: 10px;">
          <thead>
            <tr style="background-color: #f8f9fa;">
              <th style="border: 1px solid #ddd; padding: 8px;">#</th>
              <th style="border: 1px solid #ddd; padding: 8px;">Producto</th>
              <th style="border: 1px solid #ddd; padding: 8px;">Solicitado</th>
              <th style="border: 1px solid #ddd; padding: 8px;">Asignado</th>
              <th style="border: 1px solid #ddd; padding: 8px;">Faltante</th>
              <th style="border: 1px solid #ddd; padding: 8px;">ID Interno</th>
              <th style="border: 1px solid #ddd; padding: 8px;">Detalle</th>
            </tr>
          </thead>
          <tbody>${htmlProductos}</tbody>
        </table>

        <div style="margin-top: 20px; background: #f0f8ff; padding: 15px; border-radius: 5px;">
          <p><strong>✅ Productos OK:</strong> ${total_productos_ok}</p>
          <p><strong>❌ Productos con fallos:</strong> ${total_productos_fallidos}</p>
        </div>

        <p style="margin-top: 25px; color: #856404;">
          ⚠️ Este pedido permanecerá en estado pendiente hasta que se repongan los seriales faltantes o se reprocesen los productos afectados.
        </p>
      </div>
    `;

    // 📤 4️⃣ Enviar correo
    await sendEnvioCorreo({
      smtpConfig,
      to: alerta.email_destinatario || 'alertas@miempresa.com',
      subject: `🚨 Pedido #${numero_pedido} con incidencias (${total_productos_fallidos} productos afectados)`,
      text: `El pedido #${numero_pedido} no se completó correctamente. ${total_productos_fallidos} productos presentan problemas de stock o seriales.`,
      html: htmlFinal,
    });

    console.log(`✅ Alerta consolidada enviada para pedido ${numero_pedido}`);
    return { success: true, pedido: numero_pedido };

  } catch (error) {
    console.error('❌ Error en alertaPedidoProcessor:', error);
    throw error;
  }
};
