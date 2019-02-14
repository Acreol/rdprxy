const proxy = require('http-proxy');
const https = require('https');
const http = require('http');
const { URL } = require('url');

if (!process.env.ACCESS_KEY) {
  throw new Error('Configuration error! Make sure ACCESS_KEY is defined in your process environment.');
}

const PORT = process.env.PORT || 80;
const ACCESS_KEY = process.env.ACCESS_KEY;

const server = http.createServer();

const httpsProxy = proxy.createProxyServer({
  agent: new https.Agent({
    checkServerIdentity: (host, cert) => {
      return undefined;
    }
  }),
  changeOrigin: true
});

const httpProxy = proxy.createProxyServer({
  changeOrigin: true
});

const onProxyError = (err, req, res) => {
  console.error(err);

  res.writeHead(500, {'Content-Type': 'text/plain'});

  res.end('Proxying failed.');
};

const onProxyReq = (proxyReq, req, res, options) => {
  proxyReq.setHeader('User-Agent', 'Mozilla');
  proxyReq.removeHeader('roblox-id');
  proxyReq.removeHeader('proxy-access-key');
  proxyReq.removeHeader('proxy-target');
};

httpsProxy.on('error', onProxyError);
httpsProxy.on('proxyReq', onProxyReq);
httpProxy.on('error', onProxyError);
httpProxy.on('proxyReq', onProxyReq);

const doProxy = (target, req, res) => {
  var options = {
    target: (/^https?:\/\/(.+)/g).exec(target)[2]
  };
  if (target.match(/^https/g)!=null) {
    httpsProxy.web(req, res, options);
  } else if (target.match(/^http/g)!=null) {
    httpProxy.web(req, res, options);
  } else {
    throw new Error(`Do proxy error: Invalid protocol ${proto}`);
  }
};

server.on('request', (req, res) => {
  if (req.headers['proxy-access-key'] && req.headers['proxy-target']) {
    req.on('error', (err) => {
      console.error(`Request error: ${err}`);
    });
    if (req.headers['proxy-access-key'] === ACCESS_KEY) {
      const requestedTarget = req.headers['proxy-target'];
      if (requestedTarget) {
        let parsedTarget;
        try {
          parsedTarget = new URL(requestedTarget);
        } catch (e) {
          res.writeHead(400, {'Content-Type': 'text/plain'});
          res.end('Invalid target');
          return;
        }
        doProxy(requestedTarget, req, res);
      } else {
        res.writeHead(400, {'Content-Type': 'text/plain'});
        res.end('Target is required');
      }
    } else {
      res.writeHead(403, {'Content-Type': 'text/plain'});
      res.end('Invalid access key');
    }
  } else {
    res.writeHead(400, {'Content-Type': 'text/plain'});
    res.end('proxy-access-key header is required');
  }
});

server.listen(PORT, (err) => {
  if (err) {
    console.error(`Server listening error: ${err}`);
    return;
  }
  console.log(`Server started on port ${PORT}`);
});
