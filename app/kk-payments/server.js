const http = require('http');
const crypto = require('crypto');

const PORT = process.env.PORT || 3000;
const ENV = process.env.APP_ENV || 'unknown';

// structured JSON logs
const log = (level, msg, extra = {}) =>
  console.log(JSON.stringify({ ts: new Date().toISOString(), level, service: 'kk-payments', env: ENV, msg, ...extra }));

const send = (res, code, obj) => {
  res.writeHead(code, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify(obj));
};

http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/health') {
    return send(res, 200, { status: 'ok', env: ENV, dbHost: process.env.DB_HOST, receiptsBucket: process.env.RECEIPTS_BUCKET });
  }
  if (req.method === 'POST' && req.url === '/payments') {
    let body = '';
    req.on('data', (c) => (body += c));
    req.on('end', () => {
      let p;
      try { p = JSON.parse(body || '{}'); } catch { return send(res, 400, { error: 'invalid json' }); }
      if (!(p.amount > 0) || !p.customerId) return send(res, 400, { error: 'amount and customerId required' });
      const receipt = { receiptId: crypto.randomUUID(), customerId: p.customerId, amount: p.amount, bucket: process.env.RECEIPTS_BUCKET, timestamp: new Date().toISOString() };
      log('info', 'payment accepted', receipt);
      send(res, 201, receipt);
    });
    return;
  }
  send(res, 404, { error: 'not found' });
}).listen(PORT, () => log('info', 'started', { port: PORT, dbHost: process.env.DB_HOST }));
