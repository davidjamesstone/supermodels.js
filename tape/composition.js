var test = require('tape');
var supermodels = require('../');


/*
 * Tests for models being composable.
 * Models can reference other Models
 * though properties and arrays. 
 * E.g.
 * customer.basket = <Basket> 
 * basket.items = Array<BasketItem>
 */
test('composition references', function(t) {
  t.plan(10);

  var BasketItem = supermodels({
    productCode: String,
    quantity: {
      __type: Number,
      __validators: [function(value) {
        if (!value) {
          return 'Quantity is required';
        }
      }]
    }
  }, function(productCode, quantity) {
    this.productCode = productCode;
    this.quantity = quantity;
  });

  var Basket = supermodels({
    items: [BasketItem],
    total: function() {
      return this.items.length;
    },
    totalItems: function() {
      var total = 0;
      for (var i = 0; i < this.items.length; i++) {
        total += this.items[i].quantity;
      };
      return total;
    }
  });

  var Customer = supermodels({
    name: String,
    basket: Basket
  });

  var customer = new Customer();

  t.equals(typeof customer.basket, 'undefined');
  customer.basket = new Basket();
  var a = customer.basket.items
  t.equals(customer.basket.__parent, customer);

  customer.name = 'Jo Bloggs';
  var basketItem = new BasketItem('P100', 2);
  customer.basket.items.push(basketItem);
  t.equals(customer.basket.items[0].__parent, customer.basket.items);

  // Assert the events are propagated correctly
  customer.on('change', function(e) {
    t.equals(e.path, 'basket.items.0.quantity');
  });

  basketItem.quantity++;
  customer.removeAllListeners();

  // Assert the custom properties are ok
  t.equals(customer.basket.total(), 1);
  t.equals(customer.basket.totalItems(), 3);


  // Assert the errors are propagated correctly.
  // Shouud have length zero at first, then after 
  // adding a new basket item without the required
  // quantity, should sum 1. The error should propagate. 
  debugger
  t.equals(customer.errors.length, 0);

  var basketItem2 = new BasketItem('P100');
  customer.basket.items.push(basketItem2);

  t.equals(customer.errors.length, 1);
  t.equals(customer.basket.errors.length, 1);
  t.equals(basketItem2.errors.length, 1);

});
