var test = require('tape');
var supermodels = require('../');

test('supermodels', function(t) {
  t.plan(1);
  t.equal(typeof supermodels, 'function');
});

test('creating a supermodel from a simple schema', function(t) {
  t.plan(1);

  var schema = {
    a: String,
    b: Number,
    c: 42
  };

  var Model = supermodels(schema);

  t.equal(typeof Model, 'function');
});

test('creating an model instance from a supermodel', function(t) {
  t.plan(4);

  var schema = {
    a: String,
    b: Number,
    c: 42
  }

  var Model = supermodels(schema);
  var model = new Model();

  t.equal(typeof model.a, 'undefined');
  t.equal(typeof model.b, 'undefined');
  t.equal(typeof model.c, 'number');
  t.equal(model.c, 42);
});

test('creating an instance from a supermodel with constructor initializer', function(t) {
  t.plan(2);

  var schema = {
    a: String,
    b: Number
  };

  var Model = supermodels(schema, function(data) {
    // Constructor
    this.a = data.a;
    this.b = data.b;
  });

  var model = new Model({
    a: '42',
    b: 42
  });

  t.equal(model.a, '42');
  t.equal(model.b, 42);
});
