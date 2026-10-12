// Central error handler. Every error ends up here and is returned
// in one consistent JSON shape: { "message": "..." } (+ "errors" per field when relevant).
// eslint-disable-next-line no-unused-vars
// REQUIREMENT [Core Req 2 - REST API]: error-handling middleware (4 arguments). Gives ONE consistent JSON error format { "message": "..." }.
// Status codes handled here: 400 (validation / bad ID / duplicate), the status of an HttpError (e.g. 404), and 500 for anything unexpected.
function errorHandler(err, req, res, next) {
  // Mongoose schema validation failed -> 400 with one message per field
  // REQUIREMENT [Core Req 2 - REST API]: server-side validation - Mongoose validation errors are returned as 400.
  if (err.name === 'ValidationError') {
    const errors = {};
    for (const field of Object.keys(err.errors)) {
      errors[field] = err.errors[field].message;
    }
    return res.status(400).json({ message: Object.values(errors)[0], errors });
  }

  // A value could not be converted to the schema type (for example a bad ObjectId)
  // REQUIREMENT [Core Req 2 - REST API]: invalid IDs / wrong types are handled cleanly as 400 instead of crashing.
  if (err.name === 'CastError') {
    return res.status(400).json({ message: `Invalid value for ${err.path}` });
  }

  // Unique index violated (duplicate SKU, duplicate supplier name, ...)
  // REQUIREMENT [Core Req 1 - Database and Data Modeling]: the unique rule in the schema (e.g. SKU, supplier name) is reported as a readable 400 error.
  if (err.code === 11000) {
    const field = Object.keys(err.keyPattern || err.keyValue || {})[0];
    if (!field) return res.status(400).json({ message: 'A record with that value already exists' });
    return res.status(400).json({
      message: `That ${field} is already in use`,
      errors: { [field]: `That ${field} is already in use` },
    });
  }

  // Malformed JSON body
  if (err.type === 'entity.parse.failed') {
    return res.status(400).json({ message: 'Request body is not valid JSON' });
  }

  // Errors we threw on purpose with a status code (HttpError)
  // REQUIREMENT [Core Req 2 - REST API]: correct status codes - 404 and other 4xx errors thrown with HttpError.
  if (err.status) {
    return res.status(err.status).json({ message: err.message });
  }

  // REQUIREMENT [Core Req 2 - REST API]: status code 500 for unexpected server errors.
  // Anything else is an unexpected server error
  console.error(err);
  res.status(500).json({ message: 'Something went wrong on the server' });
}

module.exports = errorHandler;
