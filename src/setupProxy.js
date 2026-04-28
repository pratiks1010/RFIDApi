const { execFile } = require('child_process');
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function setupProxy(app) {
  const feroniaTarget = process.env.REACT_APP_FERONIA_PROXY_TARGET || 'http://192.168.29.245:93';
  const feroniaPath = process.env.REACT_APP_FERONIA_API_PATH || '/api/TamannaahBS';

  app.use(
    '/api/Feronia',
    createProxyMiddleware({
      target: feroniaTarget,
      changeOrigin: true,
      secure: false,
      pathRewrite: {
        '^/api/Feronia': feroniaPath,
      },
      logLevel: 'warn',
    })
  );

  app.use('/rd-local/bridge', express.json({ limit: '2mb' }));

  app.post('/rd-local/bridge', (req, res) => {
    const payload = req.body || {};
    const method = String(payload.method || 'GET').toUpperCase();
    const path = String(payload.path || '/');
    const body = typeof payload.data === 'string' ? payload.data : '';
    const incomingHeaders = payload.headers && typeof payload.headers === 'object' ? payload.headers : {};

    const requestHeaders = {
      Accept: 'text/xml, application/xml, text/plain, */*',
      ...incomingHeaders,
    };

    if (body) {
      requestHeaders['Content-Length'] = Buffer.byteLength(body);
    }

    const runCurl = (url) => new Promise((resolve, reject) => {
      const args = ['-k', '-i', '-sS', '-X', method, url];

      Object.keys(requestHeaders).forEach((key) => {
        const value = requestHeaders[key];
        if (value !== undefined && value !== null && String(value).length) {
          args.push('-H', `${key}: ${value}`);
        }
      });

      if (body) {
        args.push('--data-binary', body);
      }

      execFile('curl.exe', args, { windowsHide: true, maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
        if (err) {
          reject(new Error(stderr || err.message || 'curl bridge call failed'));
          return;
        }

        const text = String(stdout || '');
        const separator = text.indexOf('\r\n\r\n') >= 0 ? '\r\n\r\n' : '\n\n';
        const idx = text.lastIndexOf(separator);
        const head = idx >= 0 ? text.slice(0, idx) : text;
        const data = idx >= 0 ? text.slice(idx + separator.length) : '';

        const statusMatch = head.match(/HTTP\/\d\.\d\s+(\d{3})/g);
        const lastStatusLine = statusMatch && statusMatch.length ? statusMatch[statusMatch.length - 1] : '';
        const statusCodeMatch = lastStatusLine.match(/(\d{3})/);
        const statusCode = statusCodeMatch ? Number(statusCodeMatch[1]) : 500;

        resolve({
          statusCode,
          headers: {},
          data,
          endpoint: url,
        });
      });
    });

    const candidates = [
      'https://localhost:11100',
      'https://127.0.0.1:11100',
      'http://localhost:11100',
      'http://127.0.0.1:11100',
    ];

    (async () => {
      const errors = [];
      for (let i = 0; i < candidates.length; i += 1) {
        try {
          const out = await runCurl(`${candidates[i]}${path}`);
          return res.status(200).json(out);
        } catch (err) {
          errors.push(err?.message || 'curl bridge transport error');
        }
      }

      return res.status(502).json({
        statusCode: 502,
        error: errors[errors.length - 1] || 'Unable to reach RD service',
        attempts: errors,
      });
    })();
  });

  app.use(
    '/rd-local',
    createProxyMiddleware({
      target: 'https://localhost:11100',
      changeOrigin: true,
      secure: false,
      pathRewrite: {
        '^/rd-local': '',
      },
      logLevel: 'warn',
    })
  );
};
