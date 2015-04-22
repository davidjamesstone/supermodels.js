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

test('array scalar events', function(t) {

  t.plan(35);

  var schema = {
    a: Array
  };

  var Model = supermodels(schema);

  var model = new Model();

  var eventCount = 0;
  
  function eventCounter(e) {
    ++eventCount;
  }
  
  model.a.on('push', eventCounter);
  
  model.a.on('change', eventCounter);

  model.a.push('foo');
  t.equal(eventCount, 1);
  
  model.a.update(0, 'bar');
  t.equal(eventCount, 2);
  
  model.on('change', eventCounter);
  
  model.a.update(0, 'baz'); // special update function, should now cause 2 events
  
  t.equal(eventCount, 4);
  
  // second, primitive Number array
  var schema1 = {
    a: [Number]
  };

  var Model1 = supermodels(schema1);

  var model1 = new Model1();
  model1.a.on('push', eventCounter);
  
  model1.a.push('42');
  t.equal(eventCount, 5);
  t.equal(model1.a[0], 42); // check casting too
  
  model1.a.off('push', eventCounter);
  model1.a.push('43');
  t.equal(eventCount, 5);
  t.equal(model1.a[1], 43); // check casting too

  model1.a.on('unshift', eventCounter);
  model1.a.unshift('41');
  //console.info(model.a.)
  t.equal(eventCount, 6);
  t.equal(model1.a[0], 41); // check casting too
  
  t.equal(model1.a.length, 3); // check casting too
  
  model1.a.on('reverse', eventCounter);
  model1.a.reverse();
  t.equal(model1.a[0], 43);
  t.equal(model1.a[1], 42);
  t.equal(model1.a[2], 41);
  t.equal(eventCount, 7);
  
  model1.a.off('reverse', eventCounter);
  model1.a.on('sort', eventCounter);
  model1.a.sort();
  
  t.equal(model1.a[0], 41);
  t.equal(model1.a[1], 42);
  t.equal(model1.a[2], 43);
  t.equal(eventCount, 8);
  model1.a.off('sort', eventCounter);
  
  model1.a.reverse();
  model1.a.sort();
  t.equal(eventCount, 8);
  
  model1.a.on('pop', eventCounter);
  model1.a.pop();
  t.equal(eventCount, 9);
  t.equal(model1.a.length, 2);
  
  model1.a.on('shift', eventCounter);
  model1.a.shift();
  t.equal(eventCount, 10);
  t.equal(model1.a.length, 1);
  
  model1.a.on('splice', eventCounter);
  model1.a.splice(0, 1, '1', '2', '3');
  t.equal(eventCount, 11);
  t.equal(model1.a.length, 3);
  t.equal(model1.a[0], 1);
  t.equal(model1.a[1], 2);
  t.equal(model1.a[2], 3);

  model1.on('change', eventCounter);
  model1.a.update(0, '10');
  model1.a.update(1, '11');
  model1.a.update(2, '12');
  t.equal(model1.a[0], 10);
  t.equal(model1.a[1], 11);
  t.equal(model1.a[2], 12);
  t.equal(eventCount, 14);
  
  model1.a.off('splice', eventCounter);
  var rtn = model1.a.splice(0, 3);
  t.equal(eventCount, 14);
  t.equal(model1.a.length, 0);
  t.equal(rtn.length, 3);
  
  
  
  
  
});

test('array object events', function(t) {

  t.plan(3);

  var schema = {
    a: Array
  };

  var Model = supermodels(schema);

  var model = new Model();

  var eventCount = 0;
  
  function eventCounter(e) {
    ++eventCount;
  }
  
  model.a.on('push', eventCounter);
  
  model.a.on('change', eventCounter);

  model.a.push('foo');
  t.equal(eventCount, 1);
  
  model.a.update(0, 'bar');
  t.equal(eventCount, 2);
  
  model.on('change', eventCounter);
  
  model.a.update(0, 'baz'); // special update function, should now cause 2 events
  
  t.equal(eventCount, 4);
});