var test = require('tape');
var supermodels = require('../');
var personSchema = require('./schema/person');

test('array object events 1', function(t) {
  t.plan(15);

  var Person = supermodels(personSchema);
  var model = new Person();

  /**
   * `change` events are emitted on the
   * model and to ancestors for all changes:
   * set values, push, splice, pop etc.
   */
  model.on('change', function(e) {
    t.equal(e.name, 'set');
    t.equal(e.path, 'person.name');
    t.equal(e.target, model.person);
    t.equal(typeof e.detail.oldValue, 'undefined');
    t.equal(e.detail.newValue, 'Foo');
  });
  model.person.on('change', function(e) {
    t.equal(e.name, 'set');
    t.equal(e.path, 'name');
    t.equal(e.target, model.person);
    t.equal(typeof e.detail.oldValue, 'undefined');
    t.equal(e.detail.newValue, 'Foo');
  });

  /**
   * Specific events are emitted on the
   * current model only. In this case
   * the specific event is a `set` event.
   */
  model.person.on('set', function(e) {
    t.equal(e.name, 'set');
    t.equal(e.path, 'name');
    t.equal(e.target, model.person);
    t.equal(typeof e.detail.oldValue, 'undefined');
    t.equal(e.detail.newValue, 'Foo');
  });

  model.person.name = 'Foo';
});

test('array object events 2', function(t) {
  t.plan(15);

  var Person = supermodels(personSchema);
  var model = new Person();

  /**
   * `change` events are emitted on the current
   * model and to ancestors for all changes:
   * set values, push, splice, pop etc.
   */
  model.on('change', function(e) {
    t.equal(e.name, 'push');
    t.equal(e.path, 'person.addresses');
    t.equal(e.target, model.person.addresses);
    t.equal(e.detail.value, 1);
  });
  model.person.on('change', function(e) {
    t.equal(e.name, 'push');
    t.equal(e.path, 'addresses');
    t.equal(e.target, model.person.addresses);
    t.equal(e.detail.value, 1);
  });

  /**
   * Specific events are emitted on the
   * current model only. In this case
   * the specific event is a `push` event.
   */
  model.person.addresses.on('push', function(e) {
    t.equal(e.name, 'push');
    t.equal(e.path, '');
    t.equal(e.target, model.person.addresses);
    t.equal(e.detail.value, 1);
  });

  var address = model.person.addresses.create();
  model.person.addresses.push(address);

  t.equal(model.person.addresses[0], address);

  model.removeAllListeners();
  model.person.removeAllListeners();
  model.person.addresses.removeAllListeners();

  model.person.name = 'No more events to be handled';
  address.latLong.lat = 99;
  address.latLong.long = 99;
  model.person.age = 99;
  model.person.addresses[0].latLong.lat = 100;
  model.person.addresses[0].latLong.long = 100;

  t.equal(address.latLong.lat, 100);
  t.equal(address.latLong.long, 100);
});
