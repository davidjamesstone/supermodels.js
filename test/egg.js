var supermodels = require('../dist/supermodels.js');
var required = function(value, key) {
  if (!value) {
    return key + ' is required';
  }
};
var peopleSchema = {
  __type: [{
    name: {
      __type: String,
      __validators: [required]
    },
    age: {
      __type: Number,
      __validators: [required]
    }
  }],
  name: {
  __type: String,
  __validators: [required]
  },
  __validators: [function() {
    if (this.length === 0) {
      return 'At least one person is required';
    }
  }]
};
var PeopleModel = supermodels(peopleSchema);

var customerSchema = {
  // __validators: [function() {
  //   if (this.scoreRef1 === 2) {
  //     return 'No twos';
  //   }
  // }],
  // name: String,
  // addresses: [addressSchema],
  // addressesRef: [AddressModel],
  // scores: [scoreSchema],
  // scoresRef: [ScoreModel],
  // score: scoreSchema,
  // score1: scoreSchema,
  // scoreRef: ScoreModel,
  // scoreRef1: ScoreModel,
  people: {
    __type: PeopleModel,
    __value: PeopleModel    
  },
  val: '2',
  val1: 2
};
var CustomerModel = supermodels(customerSchema);
var customer = CustomerModel();

console.log(JSON.stringify(customer, null, 2));
console.log(customer.__get);