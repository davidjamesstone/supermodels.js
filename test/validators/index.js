/**
 * Define some simple test validators
 */
var validators = {
  required: function(value, key) {
    if (!value) {
      return key + ' is required';
    }
  },
  number: function(value, key) {
    if (Object.prototype.toString.call(value) !== '[object Number]') {
      return key + ' should be a number';
    }
  }
};

module.exports = validators;
