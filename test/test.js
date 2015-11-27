var test = require('tape')
var supermodels = require('../')
var prop = supermodels.prop()

prop.register('required', function () {
  return function (val, name) {
    if (!val) {
      return name + ' is required'
    }
  }
})

prop.register('range', function (min, max) {
  return function (val, name) {
    if (val > max || val < min) {
      return name + ' is out of range'
    }
  }
})

prop.register('min', function (min, max) {
  return function (val, name) {
    if (val < min) {
      return name + ' is less than ' + min
    }
  }
})

prop.register('max', function (max) {
  return function (val, name) {
    if (val > max) {
      return name + ' is greater than ' + max
    }
  }
})

test('simple test', function (t) {
  var ordersSchema = [{
    quantity: prop(Number).name('Quantity').required().value(1).min(1).max(10),
    productCode: prop(String).name('Product Code').required()
  }]

  var Orders = supermodels(ordersSchema)
  var orders = new Orders()

  t.equal(Array.isArray(orders), true)

  var order = orders.create()

  t.equal(order.quantity, 1)
  t.equal(order.errors.length, 1)
  t.equal(order.errors[0].error, 'Product Code is required')
  order.productCode = 'ABC001'
  t.equal(order.errors.length, 0)

  order.quantity = 11
  t.equal(order.errors.length, 1)
  t.equal(order.errors[0].error, 'Quantity is greater than 10')

  // Attaching the order to the orders array
  // should result in validation errors in the array
  t.equal(orders.errors.length, 0)
  orders.push(order)
  t.equal(orders.errors.length, 1)
  t.equal(order.errors[0].error, 'Quantity is greater than 10')

  order.quantity = 2
  t.equal(order.errors.length, 0)

  // Check constructor merge
  var orders1 = new Orders([{ quantity: 5, productCode: 'XYZ123' }, { quantity: 15, productCode: 'DEF123' }])
  t.equal(orders1.length, 2)
  t.equal(orders1.errors.length, 1)
  console.log(orders1.errors)
  t.equal(orders1.errors[0].error, 'Quantity is greater than 10')
   // the `target` of the validation error is the second array element,
   // array elements' `name` property return it's own index i.e. '1'
  t.equal(orders1.errors[0].target.__name, '1')

  t.end()
})
