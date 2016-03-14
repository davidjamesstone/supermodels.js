'use strict'

var supermodels = require('../')
var prop = require('./prop')
var test = require('tape')

test('simple array', function (t) {
  // Define a simple password validator function
  function passwordValidator (value, name) {
    if (value && value.length < 5) {
      return {
        key: name,
        message: 'Password should be 5 or more characters'
      }
    }
  }

  var LoginModel = supermodels({
    username: prop(String).required().name('User name'),
    password: prop(String).required().name('Password').validate(passwordValidator)
  })

  var LoginControllerA = supermodels({
    model: LoginModel,
    submit: function (e) {
      e.preventDefault()
      // xhr('POST', '/login', this.model, function () {})
    }
  })

  var LoginControllerB = supermodels({
    // define `model` to be of type `LoginModel`. Use the value
    // method to initialize to a new LoginModel on construction
    model: prop(LoginModel).value(LoginModel),
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

  t.end()
})
