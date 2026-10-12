// An error that carries an HTTP status code.
// Throwing `new HttpError(404, 'Product not found')` inside a route
// lets the error-handling middleware send the right status and message.
// REQUIREMENT [Core Req 2 - REST API]: lets routes throw 400 / 404 errors that the error handler turns into the consistent JSON format.
class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

module.exports = HttpError;
