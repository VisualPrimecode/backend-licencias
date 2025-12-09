import crypto from "crypto";
import fetch from "node-fetch";

const apiKey = '6F331DF1-102B-43E6-A284-674107L1B0F6';
const secretKey = '89b7a55772208af2e45b1dcf98a7d3c22d5c5bab';

function signParams(params, secretKey) {
  // Claves ordenadas alfabéticamente
  const ordered = Object.keys(params)
    .sort()
    .map(key => `${key}=${params[key]}`)
    .join("&");

  return crypto.createHmac("sha256", secretKey).update(ordered).digest("hex");
}

async function crearPago() {
  const params = {
    apiKey,
    commerceOrder: "TEST12345",
    subject: "Pago de prueba",
    amount: "1500",          // STRING, NO number
    email: "cliente@correo.com",
    urlConfirmation: "https://90ab390b4b90.ngrok-free.app/confirm",
    urlReturn: "https://90ab390b4b90.ngrok-free.app/retorno",
  };

  // Generar firma
  const s = signParams(params, secretKey);

  const payload = {
    ...params,
    s,
  };

  console.log("Payload enviado a Flow:");
  console.log(payload);

  const response = await fetch("https://sandbox.flow.cl/api/payment/create", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  const data = await response.json();
  console.log("Respuesta de Flow:", data);
}

crearPago().catch(console.error);
