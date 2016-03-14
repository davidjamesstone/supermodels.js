/**
 * Return a property builder that has a few
 * common validators to support some of the tests
 */
var supermodels = require('../..')
var prop = supermodels.prop()

prop.register('required', function () {
  return function (val, name) {
    if (!val) {
      return name + ' is required'
    }
  }
})

module.exports = prop
