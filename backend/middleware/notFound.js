// JSON 404 catch-all for URLs that do not match any route.
// REQUIREMENT [Core Req 2 - REST API]: JSON 404 catch-all. Returns the consistent error format { "message": "..." } with status 404.
function notFound(req, res) {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
}

module.exports = notFound;
