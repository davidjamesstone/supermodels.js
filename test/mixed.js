var test = require('tape')
var supermodels = require('../')

test('mixed', function (t) {
  t.plan(17)

  var mixedSchema = {
    val: '2',
    val1: 2,
    initializedDate: new Date(),
    typedAndInitializedDate: {
      __type: Date,
      __value: Date.now
    },
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
      line1: {
        __value: 'Marble Arch'
      },
      line2: {},
      country: 'UK',
      fullAddress1: {
        __get: function () {},
        __validators: []
      },
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
        lat: {
          __type: Number
        },
        long: {
          __type: Number
        }
      }
    },
    items: [{
      name: {
        __type: String
      },
      quantity: Number,
      subItems: [{
        subName: {
          __type: String
        },
        subMixed: 'defaultvalue'
      }]
    }],
    __validators: []
  }

  var Mixed = supermodels(mixedSchema)
  var mixed = new Mixed()

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
  mixed.address.latLong.long = "Invalid value. Because I'm typed, this should result in me becoming NaN"
  t.equal(mixed.address.latLong.lat, 11.22)
  t.equal(isNaN(mixed.address.latLong.long), true)

  mixed.fullName = 'Jo Bloggs'
  t.equal(mixed.firstName, 'Jo')
  t.equal(mixed.lastName, 'Bloggs')

  var item = mixed.items.create()
  mixed.items.push(item)
  t.equal(mixed.items.length, 1)
})
