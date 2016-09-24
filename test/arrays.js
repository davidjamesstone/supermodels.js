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

  var order = orders.create({
    quantity: 1,
    productCode: 'ABC001'
  })

  t.ok(order)
  t.equal(order.quantity, 1)
  t.equal(order.productCode, 'ABC001')

  orders.push(order)
  t.equal(orders.length, 1)

  t.end()
})

test('referenced arrays', function (t) {
  var orderSchema = {
    quantity: Number,
    productCode: String
  }

  var Order = supermodels(orderSchema)
  var Orders = supermodels([Order])
  var orders = new Orders()

  t.equal(Array.isArray(orders), true)

  var order = new Order({
    quantity: 1,
    productCode: 'ABC001'
  })

  t.ok(order)
  t.equal(order.quantity, 1)
  t.equal(order.productCode, 'ABC001')

  orders.push(order)
  t.equal(orders.length, 1)

  t.end()
})
