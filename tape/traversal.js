var test = require('tape');
var supermodels = require('../');
var addressSchema = require('./schema/address');

test('traversal examples', function(t) {
  t.plan(10);

  var schema = {
    name: String,
    address: addressSchema,
    scores: [{
      mark: Number,
      createdOn: Date
    }]
  };
  var Model = supermodels(schema);
  var model = Model();

  t.equal(model.__ancestors.length, 0);
  t.equal(model.__descendants.length, 3);
  t.equal(model.__descendants[0], model.address);
  t.equal(model.__descendants[1], model.address.latLong);
  t.equal(model.__descendants[2], model.scores);

  var score = model.scores.create();
  score.mark = 42;
  score.createdOn = Date.now();
  model.scores.push(score);

  t.equal(model.__descendants.length, 4);
  t.equal(model.__descendants[3], score);

  // check first scores ancestors
  t.equal(score.__ancestors.length, 2);
  t.equal(score.__ancestors[0], model.scores);
  t.equal(score.__ancestors[1], model);
});

test('traversal examples 2', function(t) {
  t.plan(15);

  var scoreSchema = {
    mark: Number,
    createdOn: Date
  };
  var Score = supermodels(scoreSchema);
  var Address = supermodels(addressSchema);

  var schema = {
    name: String,
    address: Address,
    scores: [Score]
  };
  var Model = supermodels(schema);
  var model = new Model();

  model.address = new Address();
  t.equal(model.__ancestors.length, 0);
  t.equal(model.__descendants.length, 3);
  t.equal(model.__descendants[0], model.address);
  t.equal(model.__descendants[1], model.address.latLong);
  t.equal(model.__descendants[2], model.scores);

  var score = new Score();
  score.mark = 42;
  score.createdOn = Date.now();
  model.scores.push(score);

  t.equal(model.__descendants.length, 4);
  t.equal(model.__descendants[3], score);

  // check first scores ancestors
  t.equal(score.__ancestors.length, 2);
  t.equal(score.__ancestors[0], model.scores);
  t.equal(score.__ancestors[1], model);


  var score2 = model.scores.create(); // alternative way of creating an array instance
  score2.mark = 42;
  score2.createdOn = Date.now();
  model.scores.push(score2);

  t.equal(model.__descendants.length, 5);
  t.equal(model.__descendants[4], score2);

  // check first scores ancestors
  t.equal(score2.__ancestors.length, 2);
  t.equal(score2.__ancestors[0], model.scores);
  t.equal(score2.__ancestors[1], model);
});
