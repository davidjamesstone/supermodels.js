var test = require('tape')
var supermodels = require('../')
var prop = require('./prop')

test('merge', function (t) {
  var orderSchema = {
    quantity: Number,
    productCode: String
  }
  var Order = supermodels(orderSchema)
  var ordersSchema = [Order]
  var Orders = supermodels(ordersSchema)

  var commentSchema = {
    title: String,
    body: String,
    date: Date
  }
  var Comment = supermodels(commentSchema)

  function simpletonValidator (value, key) {
    if (value !== "I'm a simpleton") {
      return 'You must be a simpleton!'
    }
  }
  // define a simple string that must
  // have a specific value to be valid
  var simpletonSchema = prop(String).validate(simpletonValidator)

  // Simple models can be reused too. This
  // Simpleton class is used in the mixed model
  var Simpleton = supermodels(simpletonSchema)

  var mixedSchema = prop().keys({
    val: '2',
    val1: 2,
    initializedDate: new Date(),
    typedAndInitializedDate: prop(Date).value(Date.now),
    fn: function () {
      console.log(this)
    },
    typedString: String,
    untypedString: null,
    firstName: String,
    lastName: String,
    get fullName () {
      return this.firstName + ' ' + this.lastName
    },
    set fullName (value) {
      var parts = value.split(' ')
      this.firstName = parts[0]
      this.lastName = parts[1]
    },
    age: Number,
    address: {
      line1: prop().value('Marble Arch'),
      line2: {},
      country: 'UK',
      fullAddress1: prop().value(function () {}),
      get fullAddress () {
        return this.line1 + ', ' + this.line2 + ', ' + this.country
      },
      set fullAddress (value) {
        var parts = value.split(', ')
        this.line1 = parts[0]
        this.line2 = parts[1]
        this.country = parts[2]
      },
      latLong: {
        lat: Number,
        long: Number
      }
    },
    scores: [Number],
    coords: [{
      x: Number,
      y: Number
    }],
    items: [{
      name: {
        __type: String
      },
      quantity: Number,
      subItems: [{
        subName: String,
        subMixed: 'defaultvalue'
      }]
    }],
    orders: Orders,
    comments: [Comment],
    simpleton: Simpleton
  }).validate(function (value) {
    if (this.comments.length === 0) {
      return 'At least 1 comment is required'
    }
  })

  var Mixed = supermodels(mixedSchema)

  var order = new Order({
    productCode: 'ABC3',
    quantity: 2
  })

  var orders = new Orders([{
    productCode: 'ABC1',
    quantity: 3
  }, {
    productCode: 'ABC2',
    quantity: 1
  }, order])

  // orders.push(order)

  t.equal(orders.length, 3)

  var mixed = new Mixed()

  t.equal(mixed.errors.length, 2)
  t.equal(mixed.errors[0].error, 'At least 1 comment is required')
  t.equal(mixed.errors[1].error, 'You must be a simpleton!')

  t.equal(mixed.val, '2')
  t.equal('firstName' in mixed, true)
  t.equal('fn' in mixed, true)
  t.equal(typeof mixed.fn, 'function')
  t.equal(mixed.val1, 2)

  t.equal('initializedDate' in mixed, true)
  t.equal(Object.prototype.toString.call(mixed.initializedDate), '[object Date]')

  t.equal('typedAndInitializedDate' in mixed, true)
  t.equal(Object.prototype.toString.call(mixed.typedAndInitializedDate), '[object Date]')

  t.equal('address' in mixed, true)
  t.equal(mixed.address.line1, 'Marble Arch')
  t.equal(mixed.address.country, 'UK')

  mixed.address.latLong.lat = '11.22'
  mixed.address.latLong.long = "Invalid value. Because I'm a typed Number, this should result in me becoming NaN"
  t.equal(mixed.address.latLong.lat, 11.22)
  t.equal(isNaN(mixed.address.latLong.long), true)

  var item = mixed.items.create()
  mixed.items.push(item)
  t.equal(mixed.items.length, 1)

  var d = new Date()
  var mergeData = {
    val1: 'baa',
    untypedString: 'foo',
    typedString: 42,
    age: '21',
    initializedDate: d,
    address: {
      line1: 'Washington',
      country: 'US',
      latLong: {
        lat: 55.23,
        long: 55.76
      }
    },
    simpleton: "I'm a simpleton",
    items: [{
      name: 'Item 1',
      quantity: 1,
      subItems: [{
        subName: 1,
        subMixed: 'xxx'
      }, {
        subName: '1',
        subMixed: 'yyy'
      }]
    }, {
      name: 'Item 2',
      quantity: 2,
      subItems: [{
        subName: 2,
        subMixed: 'aaa'
      }, {
        subName: '2',
        subMixed: 'bbb'
      }]
    }],
    scores: [1, 2, 3],
    coords: [{
      x: 2,
      y: 2
    }, {
      x: 4,
      y: 6
    }],
    orders: [{
      productCode: 'ABC1',
      quantity: 3
    }, {
      productCode: 'ABC2',
      quantity: 1
    }],
    comments: [{
      title: 'TITLE1',
      body: 'Hi'
    }, {
      title: 'TITLE1',
      body: 'Bye'
    }]
  }

  supermodels.merge(mixed, mergeData)

  t.equal(mixed.val, '2')
  t.equal(mixed.val1, 'baa')
  t.equal(mixed.untypedString, 'foo')
  t.equal(mixed.typedString, '42')
  t.equal(mixed.age, 21)
  t.equal(mixed.initializedDate, d)

  t.equal(mixed.orders.length, 2)
  t.equal(mixed.comments.length, 2)
  t.equal(mixed.orders[0].productCode, 'ABC1')
  t.equal(mixed.comments[1].title, 'TITLE1')
  t.equal(mixed.errors.length, 0)

  var mixed1 = new Mixed(mergeData)

  t.equal(mixed1.val, '2')
  t.equal(mixed1.val1, 'baa')
  t.equal(mixed1.untypedString, 'foo')
  t.equal(mixed1.typedString, '42')
  t.equal(mixed1.age, 21)
  t.equal(mixed1.initializedDate, d)
  t.equal(mixed1.orders.length, 2)
  t.equal(mixed1.comments.length, 2)
  t.equal(mixed1.orders[0].productCode, 'ABC1')
  t.equal(mixed1.comments[1].title, 'TITLE1')

  t.end()
})
