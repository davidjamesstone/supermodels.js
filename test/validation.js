var test = require('tape')
var supermodels = require('../')
var validators = require('./validators')

test('simple field model validation', function (t) {
  t.plan(7)

  var schema = {
    a: {
      __type: String,
      __validators: [validators.required]
    },
    b: {
      __type: Number,
      __validators: [validators.required, validators.number]
    }
  }

  var Model = supermodels(schema)
  var model = new Model()

  t.equal(model.errors.length, 3)
  t.equal(model.errors[0].validator, validators.required)
  t.equal(model.errors[1].validator, validators.required)
  t.equal(model.errors[2].validator, validators.number)
  t.equal(model.errors.length, 3)
  model.a = 'foo'
  t.equal(model.errors.length, 2)
  model.b = 42
  t.equal(model.errors.length, 0)
})

test('simple model level validation', function (t) {
  t.plan(2)

  var schema = {
    a: Number,
    b: Number,
    __validators: [function () {
      if ((this.a + this.b) !== 42) {
        return 'a + b must sum to 42'
      }
    }]
  }

  var Model = supermodels(schema)
  var model = new Model()

  t.equal(model.errors.length, 1)
  model.a = 21
  model.b = 21
  t.equal(model.errors.length, 0)
})
