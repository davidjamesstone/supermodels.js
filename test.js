var should = require('should');
var makeModel = require('./');

Object.model = function(schema) {
  return makeModel(schema);
};

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

  firstName: {
    __validators: 'required'
  },
  lastName: {
    __validators: 'required'
  },
  get fullName() {
    return this.firstName + ' ' + this.lastName;
  },
  set fullName(value) {
    var parts = value.split(' ');
    this.firstName = parts[0];
    this.lastName = parts[1];
  },
  age: {
    __validators: 'required|number'
  },
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

var person = Object.model(personSchema);


describe('person', function() {
  before(function() {
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