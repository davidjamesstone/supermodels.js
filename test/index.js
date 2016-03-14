var test = require('tape')
var supermodels = require('../')

test('supermodels', function (t) {
  t.equal(typeof supermodels, 'function')
  t.end()
})

test('creating a supermodel from a simple schema', function (t) {
  var schema = {
    a: String,
    b: Number,
    c: 42
  }

  var Model = supermodels(schema)

  t.equal(typeof Model, 'function')

  t.end()
})

test('creating an model instance from a supermodel', function (t) {
  var schema = {
    a: String,
    b: Number,
    c: 42
  }

  var Model = supermodels(schema)
  var model = new Model()

  t.equal(typeof model.a, 'undefined')
  t.equal(typeof model.b, 'undefined')
  t.equal(typeof model.c, 'number')
  t.equal(model.c, 42)

  t.end()
})

test('creating an instance from a supermodel with constructor initializer', function (t) {
  var schema = {
    a: String,
    b: Number
  }

  var Model = supermodels(schema, function (data) {
    // Constructor
    this.a = data.a
    this.b = data.b
  })

  var model = new Model({
    a: '42',
    b: 42
  })

  t.equal(model.a, '42')
  t.equal(model.b, 42)

  t.end()
})
