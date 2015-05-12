var addressSchema = require('./address');

var personSchema = {
  person: {
    name: String,
    age: Number,
    addresses: [addressSchema]
  }
};

module.exports = personSchema;
