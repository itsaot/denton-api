const { merge } = require('./merge');

module.exports = merge(
  require('./system'),
  require('./auth'),
  require('./users'),
  require('./mines'),
  require('./minerals'),
  require('./offers'),
  require('./messages'),
  require('./analytics'),
  require('./payments')
);
