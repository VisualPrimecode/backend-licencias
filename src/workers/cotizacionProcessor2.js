const { sendCotizacionCorreo } = require('../utils/mailer');

module.exports = async function cotizacionProcessor(job) {
  const cotizacion = job.data;
  const plantilla = cotizacion.plantilla;

  console.log(`📝 Procesando job de cotización para ${cotizacion.email_destino}`);
  console.log('Datos de la cotización:', cotizacion);

  try {
    const smtpConfig = cotizacion.smtpConfig;
    const descuentoPorcentaje = cotizacion.descuentoPorcentaje || 0;
    const montoDescuento = cotizacion.montoDescuento || 0;
    const totalConDescuento = cotizacion.totalConDescuento || cotizacion.total;

    console.log(`💸 Descuento aplicado en el processor: ${descuentoPorcentaje}%, Monto descuento: ${montoDescuento}`);

    if (!smtpConfig || !smtpConfig.host || !smtpConfig.user || !smtpConfig.pass) {
      throw new Error('❌ Configuración SMTP inválida o incompleta recibida en el job');
    }

    // 💱 Detectar moneda y formato
    const moneda = cotizacion.monedaDestino || cotizacion.moneda || 'CLP';

    // Configuración de formato por moneda
    const getCurrencyInfo = (currency) => {
      switch (currency) {
        case 'USD':
          return { locale: 'en-US', symbol: '$', suffix: 'USD', decimals: 2 };
        case 'COP':
          return { locale: 'es-CO', symbol: '$', suffix: 'COP', decimals: 0 };
        case 'ARS':
          return { locale: 'es-AR', symbol: '$', suffix: 'ARS', decimals: 0 };
        case 'MXN':
          return { locale: 'es-MX', symbol: '$', suffix: 'MXN', decimals: 2 };
        case 'PEN':
          return { locale: 'es-PE', symbol: 'S/', suffix: 'PEN', decimals: 2 };
        default:
          return { locale: 'es-CL', symbol: '$', suffix: 'CLP', decimals: 0 };
      }
    };

    const { locale, symbol, suffix, decimals } = getCurrencyInfo(moneda);

    // ✅ Función de formato de moneda con símbolo + sufijo
    const formatoMoneda = (valor) =>
      `${symbol}${Number(valor).toLocaleString(locale, {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals
      })} ${suffix}`;

    // 🧮 Calcular valores
    const total = Number(cotizacion.total || 0);
    const subtotal = Number(cotizacion.subtotal || total / 1.19);
    const iva = Number(cotizacion.iva || total - subtotal);

    // 🧾 Formatear valores
    const totalFormateado = formatoMoneda(total);
    const subtotalFormateado = formatoMoneda(subtotal);
    const ivaFormateado = formatoMoneda(iva);
    const totalConDescuentoFormateado = formatoMoneda(totalConDescuento);
    const montoDescuentoFormateado = formatoMoneda(montoDescuento);

    console.log('monto descuento formateado:', montoDescuentoFormateado);

    // 🛒 Generar tabla de productos
    const productos = Array.isArray(cotizacion.productos) ? cotizacion.productos : [];
    const productosHtml = productos.map(p => {
      const precio = formatoMoneda(p.price);
      return `
        <tr>
          <td style="padding: 8px; border: 1px solid #ddd;">${p.name}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: center;">${p.cantidad}</td>
          <td style="padding: 8px; border: 1px solid #ddd; text-align: right;">${precio}</td>
        </tr>
      `;
    }).join('');

    // 🧩 Bloque dinámico de descuento
    let bloqueDescuento = '';
    if (descuentoPorcentaje && descuentoPorcentaje > 0) {
      bloqueDescuento = `
        <tr>
          <td style="padding: 6px 12px; text-align: left; color: #444;">
            <strong>Descuento (${descuentoPorcentaje}%)</strong>
          </td>
          <td style="padding: 6px 12px; text-align: right; color: #444;">
            ${montoDescuentoFormateado}
          </td>
        </tr>
        <tr style="background-color: #d0ebff;">
          <td style="padding: 8px 12px; text-align: left; font-weight: bold; color: #0d47a1;">
            Total con Descuento
          </td>
          <td style="padding: 8px 12px; text-align: right; font-weight: bold; color: #0d47a1;">
            ${totalConDescuentoFormateado}
          </td>
        </tr>
      `;
    }

    // 🧠 Reemplazar placeholders en plantilla
    let htmlContent = plantilla.cuerpo_html || '';
    htmlContent = htmlContent
      .replace(/{{nombre_cliente}}/g, cotizacion.nombre_cliente || 'Cliente')
      .replace(/{{numero_cotizacion}}/g, cotizacion.numero_cotizacion || 'N/A')
      .replace(/{{total}}/g, totalFormateado)
      .replace(/{{subtotal}}/g, subtotalFormateado)
      .replace(/{{iva}}/g, ivaFormateado)
      .replace(/{{tabla_productos}}/g, productosHtml)
      .replace(/{{firma}}/g, plantilla.firma || '')
      .replace(/{{logo_url}}/g, plantilla.logo_url || '')
      .replace(/{{encabezado}}/g, plantilla.encabezado || '')
      .replace(/{{validez_texto}}/g, plantilla.validez_texto || '')
      .replace(/{{bloque_descuento}}/g, bloqueDescuento); // 👈 bloque dinámico insertado aquí

    // ✉️ Asunto con reemplazos
    const subject = (plantilla.asunto || 'Tu cotización')
      .replace(/{{nombre_cliente}}/g, cotizacion.nombre_cliente || 'Cliente')
      .replace(/{{numero_cotizacion}}/g, cotizacion.numero_cotizacion || 'N/A');

    // 📤 Enviar correo
    await sendCotizacionCorreo({
      smtpConfig,
      to: cotizacion.email_destino,
      subject,
      text: `Hola ${cotizacion.nombre_cliente}, aquí está tu cotización en ${moneda}.`,
      html: htmlContent
    });

    console.log(`✅ Correo de cotización enviado correctamente a ${cotizacion.email_destino}`);
  } catch (err) {
    console.error(`❌ Error al enviar correo de cotización a ${cotizacion.email_destino}:`, err);
    throw err;
  }
};
