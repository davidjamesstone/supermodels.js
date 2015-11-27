'use strict'

var supermodels = require('../')
var helpers = require('./validators/helpers')
var required = helpers.required
var passwordValidator = helpers.passwordValidator

var test = require('tape')

test('simple array', function (t) {
  t.plan(9)

  var LoginModel = supermodels({
    username: required('User name'),
    password: required('Password', String, [passwordValidator])
  })

  var LoginControllerA = supermodels({
    model: LoginModel,
    submit: function (e) {
      e.preventDefault()
    // xhr('POST', '/login', this.model, function () {})
    }
  })

  var LoginControllerB = supermodels({
    model: {
      __type: LoginModel,
      __value: function () {
        return new LoginModel({})
      }
    },
    submit: function (e) {
      e.preventDefault()
    // xhr('POST', '/login', this.model, function () {})
    }
  })

  var ctrl1 = new LoginControllerA()
  var ctrl2 = new LoginControllerA({
    model: {
      username: 'joanne@bloggs.com'
    }
  })

  var ctrl3 = new LoginControllerB()
  var ctrl4 = new LoginControllerB()

  t.equal(typeof ctrl1.model, 'undefined')
  t.equal(typeof ctrl2.model, 'object')
  t.equal(typeof ctrl3.model, 'object')
  t.equal(typeof ctrl4.model, 'object')

  // test the submit function
  // is common on the prototype
  t.equal(ctrl1.submit, ctrl2.submit)
  t.equal(ctrl3.submit, ctrl4.submit)
  t.notEqual(ctrl1.submit, ctrl3.submit)
  t.notEqual(ctrl2.submit, ctrl4.submit)

  t.equal(ctrl2.model.username, 'joanne@bloggs.com')
})
