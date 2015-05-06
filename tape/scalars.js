var test = require('tape');
var supermodels = require('../');

test('scalar', function(t) {
  t.plan(2);

  function range(min, max) {

    return function(value, key) {
      if (value < min || value > max) {
        return {
          key: key,
          some: 'range error happened, return anything truthy'
        };
      }
    }
  };

  var schema = {
    __type: Number,
    __value: 42,
    __validators: [range(0, 100)]
  };

  var PercentModel = supermodels(schema);
  var model = new PercentModel();

  t.equal(model.value, 42);

  model.value = '-1';
  t.equal(model.value, -1);

  //t.equal(model.errors.length, 1);

});

test('scalar array', function(t) {
  t.plan(9);

  var schema = {
    val: ['2'],
    val1: [2],
    val2: [Number]
  };
  var Model = supermodels(schema);
  var model = Model();

  t.equal(Array.isArray(model.val), true);
  t.equal(Array.isArray(model.val1), true);
  t.equal(Array.isArray(model.val2), true);

  var val = model.val.create();
  t.equal(val, '2');

  var val1 = model.val1.create();
  t.equal(val1, 2);

  var val2 = model.val2.create();
  t.equal(typeof val2, 'undefined');

  model.val.push('3');
  model.val1.push('3');
  model.val2.push('3');

  t.equal(model.val[0], '3');
  t.equal(model.val1[0], '3');
  t.equal(model.val2[0], 3);
});
