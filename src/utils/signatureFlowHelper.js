const crypto = require('crypto');
const querystring = require('node:querystring');

function buildSignedBody(params, secretKey) {
  const keys = Object.keys(params).sort();

  let toSign = "";
  for (let i = 0; i < keys.length; i++) {
    const key = keys[i];
    toSign += key + params[key];
  }

  const signature = crypto
    .createHmac('sha256', secretKey)
    .update(toSign)
    .digest('hex');

  const body = {
    ...params,
    s: signature
  };

  return querystring.stringify(body); // listo para enviar en axios.post
}
