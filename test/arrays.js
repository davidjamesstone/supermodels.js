var test = require('tape')
var supermodels = require('../')

test('simple array', function (t) {
  t.plan(2)

  var ordersSchema = [{
    quantity: Number,
    productCode: String
  }]

  var Orders = supermodels(ordersSchema)
  var orders = new Orders()

  t.equal(Array.isArray(orders), true)

  var badOrdersSchema1 = {
    __type: [{
      quantity: Number,
      productCode: String
    }],
    __get: function () {
      return 'Fred'
    }
  }

  var BadOrdersSchema1 = supermodels(badOrdersSchema1)
  var fred = BadOrdersSchema1()

  t.equal(fred, 'Fred')

})
