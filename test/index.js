var should = require('should');
var supermodel = require('../');
var ValidationError = require('../validation-error');

Object.model = supermodel;

/**
 * Simple Validators Example
 * Validators are defined as objects with a 'test' (fn) property
 * The function is invoked in the context of the model being validated.
 * The 'test' function is called with the following:
 * value - the value of the key or model to be validated
 * key - the key name. This will be undefined for model level validators
 *
 * Any other data will be passed through and
 * available in any subsequent validation errors.
 */
var validators = {
  required: {
    name: 'required',
    test: function(value, key) {
      if (!value) {
        return key + ' is required';
      }
    },
    whatever: 42
  },
  number: {
    name: 'isNumber',
    test: function(value, key) {
      if (Object.prototype.toString.call(value) !== '[object Number]') {
        return key + ' should be a number';
      }
    }
  }
};

describe('person', function() {

  var personSchema = {
    val: '2',
    val1: 2,
    initializedDate: new Date(),
    typedAndInitializedDate: {
      __type: Date,
      __value: new Date()
    },
    fn: function() {
      console.log(this);
    },
    _privateProperty: String,
    typedString: String,
    untypedString: null,
    firstName: String,
    lastName: String,
    get fullName() {
      return this.firstName + ' ' + this.lastName;
    },
    set fullName(value) {
      var parts = value.split(' ');
      this.firstName = parts[0];
      this.lastName = parts[1];
    },
    age: Number,
    address: {
      line1: {
        __value: 'Marble Arch'
      },
      line2: {},
      country: 'UK',
      fullAddress1: {
        __get: function() {

        },
        __set: function(value) {

        },
        __validators: []
      },
      get fullAddress() {
        return this.line1 + ', ' + this.line2 + ', ' + this.country;
      },
      set fullAddress(value) {
        var parts = value.split(', ');
        this.line1 = parts[0];
        this.line2 = parts[1];
        this.country = parts[2];
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
    notes: {},
    scores: [],
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
    __validators: [function ensureModel() {}, function ensureModelAsync(done) {}]
  };
  var person;

  before(function() {
    person = Object.model(personSchema);
  });

  // test cases
  describe('#person', function() {
    it('should be ok and have the correct keys', function() {
      person.should.be.ok;
      person.should.have.property('val').be.String.and.eql('2');
      person.should.have.property('val1').be.Number.and.eql(2);
      person.should.have.property('firstName');
      person.should.have.property('fn').and.be.a.Function;
      person.should.have.property('firstName');
      person.should.have.property('initializedDate').and.be.a.Date;
      person.should.have.property('typedAndInitializedDate').and.be.a.Date;


      person.address.should.be.ok;
      person.address.should.have.property('line1').and.be.a.String.eql('Marble Arch');
      person.address.should.have.property('country').and.be.a.String.eql('UK');
    });
  });

  describe('#setting fullName via setter', function() {
    it('should set the firstName and lastName', function() {
      person.fullName = 'Jane Doe';
      person.should.have.property('firstName', 'Jane');
      person.should.have.property('lastName', 'Doe');
    });
  });

  describe('#setting fullAddress via setter', function() {
    it('should set the individual address parts', function() {
      person.address.fullAddress = 'Buckingham Palace, London, UK';
      person.address.should.have.property('line1', 'Buckingham Palace');
      person.address.should.have.property('line2', 'London');
      person.address.should.have.property('country', 'UK');
    });
  });

  describe('#setting address.latLong', function() {
    it('should result in the correct casting', function() {
      person.address.latLong.lat = '11.22';
      person.address.latLong.long = 'Invalid value. Because I\'m typed, this should result in me becoming NaN';

      person.address.latLong.lat.should.be.a.Number.and.eql(11.22);
      person.address.latLong.long.should.be.a.Number.and.eql(NaN);
    });
  });

  describe('#adding an item to items arrays', function() {
    var item;

    before(function() {
      item = person.items.create();
      person.items.push(item);
    });

    it('should result in a new item', function() {
      person.items.should.be.an.Array.and.have.lengthOf(1);
    });


    describe('#adding an item to subItems arrays', function() {

      before(function() {
        var subItem = item.subItems.create();
        item.subItems.push(subItem);
      });

      it('should result in a new item', function() {
        person.items[0].subItems.should.be.an.Array.and.have.lengthOf(1);
      });

    });
  });

});


describe('validators', function() {

  describe('.shallow', function() {

    var schema = {
      name: {
        __validators: [validators.required]
      },
      age: {
        __validators: [validators.required, validators.number]
      }
    };

    var model;

    before(function() {
      model = Object.model(schema);
    });

    // test cases
    describe('#accsessing shallow schema errors', function() {

      it('should be ok and have the correct length', function() {
        var errors = model.errors;

        errors.should.be.ok;
        errors.should.be.an.Array.and.have.lengthOf(3);
      });

      it('should yield the correct errors', function() {
        var errors = model.errors;

        errors.should.be.ok;
        errors[0].should.be.an.ValidationError;

        var nameIsRequiredError = errors[0];
        nameIsRequiredError.target.should.eql(model);
        nameIsRequiredError.error.should.eql('name is required');
        nameIsRequiredError.validator.name.should.eql(validators.required.name);
        nameIsRequiredError.validator.test.should.eql(validators.required.test);

        var ageIsNumberError = errors[2];
        ageIsNumberError.target.should.eql(model);
        ageIsNumberError.error.should.eql('age should be a number');
        ageIsNumberError.validator.name.should.eql(validators.number.name);
        ageIsNumberError.validator.test.should.eql(validators.number.test);

      });

    });

    describe('#satisfying the shallow schema errors', function() {

      it('should yield no errors', function() {

        model.age = 64;
        model.name = 'Jane Doe';

        var errors = model.errors;

        errors.should.be.ok;
        errors.should.be.an.Array.and.have.lengthOf(0);
      });

    });

  });

  describe('.deep', function() {

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
    };

    var model;

    before(function() {
      model = Object.model(schema);
    });

    // test cases
    describe('#accsessing deep schema errors', function() {

      it('should be ok and have the correct length', function() {
        var errors = model.errors;

        errors.should.be.ok;
        errors.should.be.an.Array.and.have.lengthOf(4);
      });

      it('should yield the correct errors', function() {
        var errors = model.errors;

        errors.should.be.ok;
        errors[0].should.be.an.ValidationError;

        var nameIsRequiredError = errors[0]
        nameIsRequiredError.target.should.eql(model);
        nameIsRequiredError.error.should.eql('name is required');
        nameIsRequiredError.validator.name.should.eql(validators.required.name);
        nameIsRequiredError.validator.test.should.eql(validators.required.test);

        var ageIsNumberError = errors[2]
        ageIsNumberError.target.should.eql(model);
        ageIsNumberError.error.should.eql('age should be a number');
        ageIsNumberError.validator.name.should.eql(validators.number.name);
        ageIsNumberError.validator.test.should.eql(validators.number.test);

        var line1IsRequiredError = errors[3]
        line1IsRequiredError.target.should.eql(model.address);
        line1IsRequiredError.error.should.eql('line1 is required');
        line1IsRequiredError.validator.name.should.eql(validators.required.name);
        line1IsRequiredError.validator.test.should.eql(validators.required.test);

      });

    });

    describe('#satisfying the deep schema errors', function() {

      it('should yield no errors', function() {

        model.age = 64;
        model.name = 'Jane Doe';
        model.address.line1 = 'Buckingham Palace';

        var errors = model.errors;

        errors.should.be.ok;
        errors.should.be.an.Array.and.have.lengthOf(0);
      });

    });

  });

  describe('.array', function() {

    var schema = {
      customerId: Number,
      orders: [{
        name: {
          __validators: [validators.required]
        },
        items: [{
          quantity: {
            __validators: [validators.number]
          }
        }]
      }]
    };

    var model = '';

    before(function() {
      model = Object.model(schema);
    });

    // test cases
    describe('#accsessing array schema errors', function() {

      it('should be ok and have the correct length', function() {
        var errors = model.errors;

        errors.should.be.ok;
        errors.should.be.an.Array.and.have.lengthOf(0);
      });

    });
    
    describe('#inserting blank array items', function() {

      it('should be ok and have the correct errors', function() {
        
        // pushing a new order
        var order = model.orders.create();
        model.orders.push(order);
        model.orders.should.be.an.Array.and.have.lengthOf(1);
        
        // should result in order name required error
        var nameIsRequiredError = model.errors[0];
        nameIsRequiredError.target.should.eql(order);
        nameIsRequiredError.error.should.eql('name is required');
        nameIsRequiredError.validator.name.should.eql(validators.required.name);
        nameIsRequiredError.validator.test.should.eql(validators.required.test);
        
        model.errors.should.be.ok;
        model.errors.should.be.an.Array.and.have.lengthOf(1);
        
        // to the order push a new order item
        var orderItem1 = order.items.create();
        order.items.push(orderItem1);
        order.items.should.be.an.Array.and.have.lengthOf(1);
        
        // this should result in order having two errors: name and item[0].quantity
        model.errors.should.be.an.Array.and.have.lengthOf(2);
        
        // to the order push another new order item
        var orderItem2 = order.items.create();
        order.items.push(orderItem2);
        order.items.should.be.an.Array.and.have.lengthOf(2);
        
        // and should result in order having two errors: name and item[0].quantity and item[1].quantity
        model.errors.should.be.an.Array.and.have.lengthOf(3);
        
      });

    });
    
    describe('#satisfying the blank array items', function() {

      it('should result in there being no errors', function() {
        var order = model.orders[0];
        order.name = 'ORDER0001';
        order.items[0].quantity = 1;
        
        // should result in order now only having one errors: item[1].quantity
        model.errors.should.be.an.Array.and.have.lengthOf(1);
        
        order.items[1].quantity = 1;
        
        // should result in order now having no errors
        model.errors.should.be.an.Array.and.have.lengthOf(0);
      });

    });
    
  });
  
  describe('.model', function() {

    var schema = {
      title: String,
      otherTitle: String,
      scores: [{
        mark: Number,
        createdOn: Date
      }],
      __validators: [function() {
        if (!this.scores.length) {
          return 'At least one score is required';
        }
      },function() {
        if (this.title === 'Other' && !this.otherTitle) {
          return 'Please supply a value for Other title';
        }
      }]
    };

    var model;

    before(function() {
      model = Object.model(schema);
    });

    // test cases
    describe('#accsessing model level errors', function() {

      it('should be ok and have the correct length', function() {

        model.errors.should.be.ok;
        model.errors.should.be.an.Array.and.have.lengthOf(1);
        
        model.errors[0].should.have.property('error', 'At least one score is required');
        
        model.title = 'Other';
        
        model.errors.should.have.lengthOf(2);
        model.errors[1].should.have.property('error', 'Please supply a value for Other title');
        
      });

    });

    describe('#satisfying the model level errors', function() {

      it('should result in no more errors', function() {

        model.otherTitle = 'Dame';
        
        var score = model.scores.create();
        score.mark = 99;
        score.createdOn = Date.now();
        model.scores.push(score);

        var errors = model.errors;

        errors.should.be.ok;
        errors.should.be.an.Array.and.have.lengthOf(0);
      });

    });

  });

});


describe('array', function() {

  var arraySchema = {
    val: ['2'],
    val1: [2],
    val2: [Number]
  };
  
  var arr;

  before(function() {
    arr = Object.model(arraySchema);
  });

  // test cases
  describe('#array', function() {
    it('should be ok and have the correct keys', function() {
      arr.should.be.ok;
      arr.should.have.property('val').be.Array.and.have.lengthOf(0);
      arr.should.have.property('val1').be.Array.and.have.lengthOf(0);
      arr.should.have.property('val2').be.Array.and.have.lengthOf(0);
      // person.should.have.property('val1').be.Number.and.eql(2);
      // person.should.have.property('firstName');
      // person.should.have.property('fn').and.be.a.Function;
      // person.should.have.property('firstName');
      // person.should.have.property('initializedDate').and.be.a.Date;
      // person.should.have.property('typedAndInitializedDate').and.be.a.Date;


      // person.address.should.be.ok;
      // person.address.should.have.property('line1').and.be.a.String.eql('Marble Arch');
      // person.address.should.have.property('country').and.be.a.String.eql('UK');
    });
  });
});
  