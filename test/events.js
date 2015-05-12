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
  model.on('change', function() {
    ++eventCount;
  });

  model.a = 'foo';
  t.equal(eventCount, 1);

  model.b = 42;
  t.equal(eventCount, 2);

  // attach 2nd handler
  model.on('change', function() {
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

test('array scalar events 1', function(t) {
  t.plan(3);

  var schema = {
    a: Array
  };

  var Model = supermodels(schema);

  var model = new Model();

  var eventCount = 0;

  function eventCounter() {
    ++eventCount;
  }

  model.a.on('push', eventCounter);

  model.a.on('change', eventCounter);

  model.a.push('foo');
  t.equal(eventCount, 2);

  model.a.update(0, 'bar');
  t.equal(eventCount, 3);

  model.on('change', eventCounter);

  model.a.update(0, 'baz'); // special update function, should now cause 2 events

  t.equal(eventCount, 5);
});

test('array scalar events 2', function(t) {
  t.plan(32);

  var schema = {
    a: [Number]
  };

  var Model = supermodels(schema);
  var model = new Model();
  var eventCount = 0;

  function eventCounter() {
    //t.comment(e.name, e.path, e.detail);
    ++eventCount;
  }

  model.a.on('push', eventCounter);

  model.a.push('42');
  t.equal(eventCount, 1);
  t.equal(model.a[0], 42); // check casting too

  model.a.off('push', eventCounter);
  model.a.push('43');
  t.equal(eventCount, 1);
  t.equal(model.a[1], 43); // check casting too

  model.a.on('unshift', eventCounter);
  model.a.unshift('41');
  t.equal(eventCount, 2);
  t.equal(model.a[0], 41); // check casting too

  t.equal(model.a.length, 3);

  model.a.on('reverse', eventCounter);
  model.a.reverse();
  t.equal(model.a[0], 43);
  t.equal(model.a[1], 42);
  t.equal(model.a[2], 41);
  t.equal(eventCount, 3);

  model.a.off('reverse', eventCounter);
  model.a.on('sort', eventCounter);
  model.a.sort();

  t.equal(model.a[0], 41);
  t.equal(model.a[1], 42);
  t.equal(model.a[2], 43);
  t.equal(eventCount, 4);
  model.a.off('sort', eventCounter);

  model.a.reverse();
  model.a.sort();
  t.equal(eventCount, 4);

  model.a.on('pop', eventCounter);
  model.a.pop();
  t.equal(eventCount, 5);
  t.equal(model.a.length, 2);

  model.a.on('shift', eventCounter);
  model.a.shift();
  t.equal(eventCount, 6);
  t.equal(model.a.length, 1);

  model.a.on('splice', eventCounter);
  model.a.splice(0, 1, '1', '2', '3');
  t.equal(eventCount, 7);
  t.equal(model.a.length, 3);
  t.equal(model.a[0], 1); // check casting too
  t.equal(model.a[1], 2);
  t.equal(model.a[2], 3);

  model.on('change', eventCounter);
  model.a.update(0, '10');
  model.a.update(1, '11');
  model.a.update(2, '12');
  t.equal(model.a[0], 10); // check casting too
  t.equal(model.a[1], 11);
  t.equal(model.a[2], 12);
  t.equal(eventCount, 10);

  model.a.off('splice', eventCounter);
  var rtn = model.a.splice(0, 3);
  t.equal(eventCount, 11);
  t.equal(model.a.length, 0);
  t.equal(rtn.length, 3);
});

test('array object events', function(t) {

  t.plan(7);

  var schema = {
    person: {
      name: String,
      age: Number,
      addresses: [{
        line1: String,
        line2: String,
        latLong: {
          lat: Number,
          long: Number
        }
      }]
    }
  };

  var Model = supermodels(schema);
  var model = new Model();
  var eventCount = 0;

  function eventCounter() {
    ++eventCount;
  }

  model.on('change', eventCounter);
  model.person.on('change', eventCounter);

  model.person.name = 'Foo';
  t.equal(eventCount, 2);

  model.person.age = 42;
  t.equal(eventCount, 4);

  // special `create` function
  // factories a item model instance.
  // Events (and validation) are not active
  // because the item is not yet in the array
  var a1 = model.person.addresses.create();

  t.equal(eventCount, 4);
  a1.line1 = 'Buckingham Palace'; // shouldn't cause any increment to eventCount
  t.equal(eventCount, 4);

  model.person.addresses.push(a1);
  t.equal(eventCount, 6);

  a1.line2 = 'London';
  a1.latLong.lat = 100;
  a1.latLong.long = 100;
  t.equal(eventCount, 12);

  t.equal(model.person.addresses.length, 1);
});
