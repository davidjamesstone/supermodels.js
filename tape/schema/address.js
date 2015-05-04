var addressSchema = {
  line1: String,
  line2: String,
  latLong: {
    lat: Number,
    long: Number
  }
};

module.exports = addressSchema;
