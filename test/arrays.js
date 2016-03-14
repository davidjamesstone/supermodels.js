var test = require('tape')
var supermodels = require('../')

test('simple array', function (t) {
  var ordersSchema = [{
    quantity: Number,
    productCode: String
  }]

  var Orders = supermodels(ordersSchema)
  var orders = new Orders()

  t.equal(Array.isArray(orders), true)

  t.end()
})
