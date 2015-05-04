var test = require('tape');
var supermodels = require('../');
var validators = require('./validators');

test('simple field model validation', function(t) {
  t.plan(12);

  var schema = {
    customerId: Number,
    orders: [{
      name: {
        __validators: [validators.required]
      },
      items: [{
        quantity: {
          __validators: [validators.number]
        }
      }]
    }]
  };

  var Model, model;
  var Model = supermodels(schema);
  var model = Model();

  t.equal(model.errors.length, 0);


  // pushing a new order
  var order = model.orders.create();
  model.orders.push(order);
  t.equal(model.orders.length, 1);

  // should result in order name required error
  var nameIsRequiredError = model.errors[0];
  t.equal(nameIsRequiredError.target, order);
  t.equal(nameIsRequiredError.error, 'name is required');
  t.equal(nameIsRequiredError.validator, validators.required);
  t.equal(model.errors.length, 1);

  // to the order push a new order item
  var orderItem1 = order.items.create();
  order.items.push(orderItem1);
  t.equal(order.items.length, 1);

  // this should result in order having two errors: name and item[0].quantity
  t.equal(model.errors.length, 2);

  // to the order push another new order item
  var orderItem2 = order.items.create();
  order.items.push(orderItem2);
  t.equal(order.items.length, 2);

  // and should result in order having two errors: name and item[0].quantity and item[1].quantity
  t.equal(model.errors.length, 3);

  var order = model.orders[0];
  order.name = 'ORDER0001';
  order.items[0].quantity = 1;

  // should result in order now only having one errors: item[1].quantity
  t.equal(model.errors.length, 1);

  order.items[1].quantity = 1;

  // should result in order now having no errors
  t.equal(model.errors.length, 0);

});
