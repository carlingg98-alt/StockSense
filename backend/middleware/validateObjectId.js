const mongoose = require('mongoose');
const HttpError = require('../utils/HttpError');

// Used with router.param('id', ...). Rejects malformed IDs with a clean 400
// before the route handler runs, instead of letting Mongoose throw a CastError.
// REQUIREMENT [Core Req 2 - REST API]: invalid IDs are handled cleanly - a malformed :id returns 400 before the route runs.
function validateObjectId(req, res, next, id) {
  if (!mongoose.isValidObjectId(id)) {
    return next(new HttpError(400, `"${id}" is not a valid ID`));
  }
  next();
}

module.exports = validateObjectId;
