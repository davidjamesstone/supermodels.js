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

test('simple validation', function (t) {
  var schema = {
    a: prop(String).required(),
    b: prop(Number).required()
  }

  var Model = supermodels(schema)
  var model = new Model()

  t.equal(model.errors.length, 2)
  model.a = 'foo'
  t.equal(model.errors.length, 1)
  model.b = 42
  t.equal(model.errors.length, 0)

  t.end()
})

test('nested validation', function (t) {
  var schema = {
    name: String,
    date: Date,
    active: Boolean,
    age: Number,
    requiredString: prop(String).name('Required string').required(),
    requiredNumber: prop(Number).name('Required number').required().range(0, 100),
    nestedDoc: prop().keys({
      field1: prop(Number).required(),
      field2: prop(String).required(),
      nestedNestedDoc: prop().keys({
        field11: prop(Number).required(),
        field12: prop(String).required()
      })
    })
  }

  var Model = supermodels(schema)
  var model = new Model()

  t.equal(model.errors.length, 6)
  t.equal(model.nestedDoc.errors.length, 4)
  t.equal(model.nestedDoc.nestedNestedDoc.errors.length, 2)

  model.nestedDoc.field1 = 42
  model.nestedDoc.field2 = 'foo'
  model.nestedDoc.nestedNestedDoc.field11 = 42
  model.nestedDoc.nestedNestedDoc.field12 = 'foo'

  t.equal(model.errors[0].error, 'Required string is required')
  model.requiredString = 'bar'
  model.requiredNumber = '101'

  t.equal(model.requiredNumber, 101)
  t.equal(model.errors.length, 1)
  t.equal(model.errors[0].error, 'Required number is out of range')

  model.requiredNumber = 42
  t.equal(model.errors.length, 0)

  t.end()
})

test('simple model level validation', function (t) {
  var schema = prop().keys({
    a: Number,
    b: Number
  }).validate(function () {
    if ((this.a + this.b) !== 42) {
      return 'a + b must sum to 42'
    }
  })

  var Model = supermodels(schema)
  var model = new Model()

  t.equal(model.errors.length, 1)
  t.equal(model.errors[0].error, 'a + b must sum to 42')

  model.a = 21
  model.b = 21
  t.equal(model.errors.length, 0)

  t.end()
})
