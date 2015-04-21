var test = require('tape');
var supermodels = require('../');

test('simple field level events', function(t) {
  t.plan(4);

  var schema = {
    a: String,
    b: String
  };

  var Model = supermodels(schema);
  var model = new Model();

  var eventCount = 0;

  // attach 1st handler
  model.on('change', function(e) {
    ++eventCount;
  });

  model.a = 'foo';
  t.equal(eventCount, 1);

  model.b = 42;
  t.equal(eventCount, 2);

  // attach 2nd handler specifically 
  // listening for change to `a`
  model.on('change:a', function(e) {
    ++eventCount;
  });

  model.a = 'bar'; // should cause 2 events to be raised
  t.equal(eventCount, 4);

  // A quick test to ensure 
  // events are instance specific
  var model1 = new Model();
  model1.a = 'baz';
  t.equal(eventCount, 4);
});

test('array field events', function(t) {

  t.plan(1);

  var schema = {
    a: Array
  };

  var Model = supermodels(schema);

  var model = new Model();

  var eventCount = 0;

  model.on('change:a', function(e) {
    //console.log(e);
    ++eventCount;
  });

  model.a.push('foo');
  t.equal(eventCount, 0);
  //t.equal(1, 1);
});
