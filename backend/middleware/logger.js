// Custom request logger: prints method, URL, status code and how long the request took.
// REQUIREMENT [Core Req 2 - REST API]: custom middleware - the request logger (method, URL, status code, duration).
function logger(req, res, next) {
  const startedAt = Date.now();

  res.on('finish', () => {
    const ms = Date.now() - startedAt;
    const time = new Date().toLocaleTimeString();
    console.log(`[${time}] ${req.method} ${req.originalUrl} -> ${res.statusCode} (${ms}ms)`);
  });

  next();
}

module.exports = logger;
