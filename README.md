# supermodels.js

Modeling library for javascript. Define schemas that represent your data.
Create instances from schemas that can be observed, validated and composed.

`npm install supermodels.js --save`

For use in Node.js, the browser (3Kb gzipped) or any other JavaScript environment.

  - Isomorphic
  - JSON serializable/deserializable (no pollution)
  - Model instances are observable, validatable and composable.

supermodels can be used for all sorts of purposes including:

 - On the front end as model components in a unidirectional data flow or MVC
 - Defining your Business Objects (Customer, Address, Order etc.), their relationships and any validation rules.
 - Validating HTTP payloads
 - Building blocks like Services, Singletons

## supermodels(schema)

Returns a model constructor function for the given `schema` value.

```js
// Define a basic `Comment` schema
var commentSchema = {
  body: String
  createdDate: Date
}

var Comment = supermodels(customerSchema)

// Define a `Customer` with some personal details,
// an address, a list of orders and a list of comments
var customerSchema = {
  name: String,
  age: Number,
  address: {
    line1: String,
    line2: String,
    postcode: String,
    get fullAddress() {
      return this.line1 + ', ' + this.line2;
    }
  },
  orders: [{
    productCode: String,
    price: Number,
    quantity: Number,
    get total () {
      return '$' + price * quantity
    }
  }],
  comments: [Comment]
}

// Call supermodels to get our Customer constructor
var Customer = supermodels(customerSchema)

// Call constructor like you would
// We can pass is some initial data
var customer = new Customer({
  name: 'Jane Doe',
  age: 42,
  address: {
    line1: 'Buckingham Palace',
    line2: 'London',
    postcode: 'L1 1XY'
  },
  orders: [{ productCode: 'ABC001', price: 99.99, quantity: 2 }]
})

console.log(customer.fullAddress)
//=> 'Buckingham Palace, London'

console.log(customer.orders.length)
//=> 1

console.log(customer.order[0].total)
//=> $199.98

console.log(customer.comments.length)
//=> 0

customer.comments.push(new Comment({ text: 'Hello world', date: Date.now() }))
console.log(customer.comments.length)
//=> 1

```


See the [examples](test/examples) folder

## prop([type])
The `prop` function provides a fluent interface for building properties.
It allows us to add metadata and validation rules to our schema.

Metadata methods available in the fluent interface:

 - `type`
   - `String`, `Number`, `Date`, `Boolean`, `Array` or `Object`
   - Values will be cast on supported types `String`, `Number`, `Date` and `Boolean`.
   - Can also be a reference another model
 - `name`
   - A display name for the property
 - `value`
   - The default value of the property. If a function is passed, it will be called and the return value used e.g. `Date.now` can be used to timestamp the model.
 - `validate` (fn)
   - Register a validator. This can be used as an alternative to registering on the `prop`'s fluent interface
 - `get` (fn)
   - A getter function.
 - `set` (fn)
   - A setter function.
 - `enumerable`, `writable`, `configurable`

There are no built in validators but they can easily defined using the `register` function.

```js
var prop = supermodels.prop()

// Let's register 3 simple validators. Registering validators
// makes them part of the fluent interface when using `prop`.
prop.register('required', function () {
  return function (val, name) {
    if (!val) {
      return name + ' is required'
    }
  }
})

prop.register('min', function (min) {
  return function (val, name) {
    if (val < min) {
      return name + ' is less than ' + min
    }
  }
})

prop.register('max', function (max) {
  return function (val, name) {
    if (val > max) {
      return name + ' is greater than ' + max
    }
  }
})

```
```js
// Using the previous customer example
// we can start to build some validation.
var customerSchema = {
  name: prop(String).name('Name').required(),
  age: prop(Number).name('Age').required().min(0).max(150),
  address: {
    line1: prop(String).name('Line 1').required(),
    line2: prop(String).name('Line 2').required(),
    postcode: prop(String).name('Postcode'),
    get fullAddress () {
      return this.line1 + ', ' + this.line2
    }
  },
  orders: [{
    productCode: String,
    price: Number,
    quantity: prop(Number).name('Quantity').required().value(1).min(1).max(10),
    get total () {
      return '$' + (this.price * this.quantity)
    }
  }],
  comments: [Comment]
}

var Customer = supermodels(customerSchema)

var customer = new Customer()

// All model objects have a special `errors` property.
// Accessing this property will run the validators and
// return an array of `ValidationError`s
console.log(customer.address.errors)
// => ['Line 1 is required', 'Line 2 is required']

console.log(customer.orders.errors)
// => Returns all `orders` errors

console.log(customer.comments.errors)
// => Returns all `comments` errors

console.log(customer.errors)
// => Returns all errors
```



## Events
Events are propagated up through models is an similar fashion to how DOM events do. Event handlers are added and removed using the `on` and `off` methods.

A `change` event occurs for all modifications to the model. Other more specific events are also available:

- `set`
  - Occurs when a value is updated. Event detail will include the new value and the old value. `set` events also occur when array items are updated. See the note on updating array values.
- `push`
- `pop`
- `unshift`
- `shift`
- `sort`
- `reverse`
- `splice`

```js
customer.on('change', function(e) {
  console.log(e.path, e.detail.newValue, e.detail.oldValue);
})
customer.address.line1 = 'Line 1'
customer.address.line1 = 'Line 2'

// Listeners can be added to any level of the model
customer.address.on('change', function(e) {})
customer.orders.on('push', function(e) {
  console.log('Order count: ', e.detail.value)
})
```

[![js-standard-style](https://cdn.rawgit.com/feross/standard/master/badge.svg)](https://github.com/feross/standard)


## Testing

```
$ npm test
```

# License

  MIT
