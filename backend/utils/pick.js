// Copy only the allowed keys from an object.
// Used so clients cannot set fields they should not control (for example `quantity`).
// REQUIREMENT [Core Req 2 - REST API]: server-side protection - only whitelisted fields from req.body are accepted (e.g. a client cannot set `quantity`).
function pick(source, allowedKeys) {
  const result = {};
  for (const key of allowedKeys) {
    if (source && source[key] !== undefined) {
      result[key] = source[key];
    }
  }
  return result;
}

module.exports = pick;
