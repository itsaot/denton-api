/**
 * Shallow merge path maps (each export is { '/path': { get|post|... } }).
 */
function merge(...objects) {
  return objects.reduce((acc, o) => Object.assign(acc, o), {});
}

module.exports = { merge };
