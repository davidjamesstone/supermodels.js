var test = require('tape')
var supermodels = require('../')
var ValidationError = require('../lib/validation-error')
var validators = require('./validators')

test('validation examples', function (t) {
  t.plan(6)

  var schema = {
    title: String,
    otherTitle: String,
    scores: [{
      mark: Number,
      createdOn: Date
    }],
    __validators: [ function () {
      if (!this.scores.length) {
        return 'At least one score is required'
      }
    }, function () {
      if (this.title === 'Other' && !this.otherTitle) {
        return 'Please supply a value for Other title'
      }
    } ]
  }
  var Model = supermodels(schema)
  var model = new Model()

  t.equal(model.errors.length, 1)
  t.equal(model.errors[0].error, 'At least one score is required')

  model.title = 'Other'
  t.equal(model.errors.length, 2)
  t.equal(model.errors[1].error, 'Please supply a value for Other title')

  model.otherTitle = 'Dame'
  t.equal(model.errors.length, 1)

  var score = model.scores.create()
  score.mark = 99
  score.createdOn = Date.now()
  model.scores.push(score)
  t.equal(model.errors.length, 0)
})

test('validation examples 2', function (t) {
  t.plan(9)

  var schema = {
    name: {
      __validators: [validators.required]
    },
    age: {
      __validators: [validators.required, validators.number]
    }
  }

  var Model = supermodels(schema)
  var model = new Model()

  // should be ok and have the correct length
  var errors = model.errors
  t.equal(errors.length, 3)

  t.equal(errors[0] instanceof ValidationError, true)

  var nameIsRequiredError = errors[0]
  t.equal(nameIsRequiredError.target, model)
  t.equal(nameIsRequiredError.error, 'name is required')
  t.equal(nameIsRequiredError.validator, validators.required)

  var ageIsNumberError = errors[2]
  t.equal(ageIsNumberError.target, model)
  t.equal(ageIsNumberError.error, 'age should be a number')
  t.equal(ageIsNumberError.validator, validators.number)

  // satisfying the model errors
  // should result in 0 errors
  model.age = 64
  model.name = 'Jane Doe'
  t.equal(model.errors.length, 0)
})

test('validation examples 2', function (t) {
  t.plan(12)

  var schema = {
    name: {
      __validators: [validators.required]
    },
    age: {
      __validators: [validators.required, validators.number]
    },
    address: {
      line1: {
        __validators: [validators.required]
      }
    }
  }

  var Model = supermodels(schema)
  var model = new Model()

  var errors = model.errors

  t.equal(errors.length, 4)
  t.equal(errors[0] instanceof ValidationError, true)

  var nameIsRequiredError = errors[0]
  t.equal(nameIsRequiredError.target, model)
  t.equal(nameIsRequiredError.error, 'name is required')
  t.equal(nameIsRequiredError.validator, validators.required)

  var ageIsNumberError = errors[2]
  t.equal(ageIsNumberError.target, model)
  t.equal(ageIsNumberError.error, 'age should be a number')
  t.equal(ageIsNumberError.validator, validators.number)

  var line1IsRequiredError = errors[3]
  t.equal(line1IsRequiredError.target, model.address)
  t.equal(line1IsRequiredError.error, 'line1 is required')
  t.equal(line1IsRequiredError.validator, validators.required)

  model.age = 64
  model.name = 'Jane Doe'
  model.address.line1 = 'Buckingham Palace'
  t.equal(model.errors.length, 0)
})
