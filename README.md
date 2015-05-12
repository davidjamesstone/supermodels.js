# supermodels.js

Turn plain old javascript objects into observable, traversable, validatable and composable supermodels.

`npm install supermodels.js`

supermodels can be used for all sorts of purposes including:

 1. Acting as the `M` and `C|P` in an MV* paradigm
 2. Defining your Business Objects (Customer, Address, Order etc.), their relationships and any validation rules.
 3. Building blocks like Services, Factories, Singletons.
 
For use in Node.js, the browser (3Kb gzipped) or any other JavaScript environment.

### supermodels(schema [, initializer])

Returns a model constructor function for the given `schema` value. The optional `initializer` can be passed as a function that will be called on creating each instance of a model.

```js
var customerSchema = {
  name: String,
  age: Number,
  address: {
    line1: String,
    line2: String,
    postcode: String,
    get fullAddress() {
      return this.line1 + ' ' + this.line2;
    }
  },
  orders: [{
    productCode: String,
    quantity: Number
  }]
};

var initializer = function(name, age) {
  this.name = name;
  this.age = age;
};

// Call supermodels to get our Customer constructor
var Customer = supermodels(customerSchema, initializer);

// Call constructor like you would
// Note the `new` keyword is optional
var customer = new Customer('foo', 42);
var customer1 = new Customer('bar', 43);

/*
 * Models are observable
 */
customer.on('change', function(e) {
  console.log(e.path, e.detail.newValue, e.detail.oldValue);
});
customer.address.line1 = 'Line 1';
customer.address.line1 = 'Line 2';

// Listeners can be added to any level of the model
customer.address.on('change', function(e) {});
customer.orders.on('push', function(e) {
  console.log('Order count: ', e.detail.value);
});

// models are validatable
console.log(customer.errors);
console.log(customer.address.errors);

// => [] Empty Arrays are returned as we haven't defined any validators yet

```
### schema definition

  A schema is any valid javascript object like `customerSchema` above.
  The object can also contain special metadata
  properties that describe the data. These properties are:
  

 - __type
   - `String`, `Number`, `Date`, `Boolean`, `Array` or `Object`
   - Can also be set to another supermodel constructor function
   - Values will be cast on supported types `String`, `Number`, `Date` and `Boolean`.
 - __value
   - The default value of the property. If a function is passed, it will be called and the return value used e.g. `Date.now` can be used to timestamp the model.
 - __validators (Array)
   - An array of functions that will be used to validate the model. Validators can be applied at both the "property" level e.g. `line1` and the  "object" level e.g. `address`. 
   - Use can choose whatever validation library you wish or roll your own.
   - Validators are called in series when the .errors property is accessed, if a validator returns a truthy value an error is added to the list.
 - __get
   - A getter function.
 - __set
 - __configurable
 - __enumerable


Building on the above example we can start applying in some validations rules. We'll also introduce how to compose models together.
```js
// Create a simple "required" field validator
function required(value) {
  if (!value) {
    return 'Field is required';
  }
} 

// Split out the Order into it's own constructor
// so it can be shared with other models
var Order = supermodel({
  productCode: String,
  quantity: Number
});

var Address = supermodels({
  line1: String,
  line2: String,
  postcode: String,
  latLong: {
    lat: Number,
    long: Number
  }
  get fullAddress() {
    return this.line1 + ' ' + this.line2;
  }
});
  
var customerSchema = {
  // add a basic auto generated id field 
  id: {
    __type: String,
    __value: function() { return Math.random }
  },
  // add a required field validator to name 
  name: {
    __type: String,
    __validators: [required]
  },
  age: Number,
  address: Address,
  orders: [Order]
};

var Customer = supermodels(customerSchema);
var customer = new Customer();
customer.orders.push(new Order());

var errors = customer.errors;
console.log(errors);
```

#### Events
 Events are propagated up through the object (person) is an similar fashion to how DOM events do.

```js
// Fires when any change is made to the person
person.on('change', function(e) {});

// Fires when any change is made to the address
person.address.on('change', function(e) {});

// Fires when any change is made to the latLong
person.address.latLong.on('change', function(e) {});
```

#### Traversing
The following properties are available on each Object and Array of the model object to help navigate:
  `__name`, `__parent`, `__ancestors`, `__descendants`, `__keys`, `__children`, `__isRoot`, `__hasAncestors`, `__path`, `__hasDescendants`. These are not often required but can be useful to look up ancestor properties.

```js
 person.__isRoot;
 // => true
 
 person.address.__parent;
 // => person
 
 person.address.latLong.__parent;
 // => person.address
 
 person.address.latLong.__descendants;
 // => []
 
 person.__children;
 // => [person.address]
 
 person.__descendants;
 // => [person.address, person.address.latLong]
 
 person.address.latLong.__ancestors;
 // => [person.address, person]
 
 person.address.__name
 // => 'address'
 
 person.address.latLong.__path
 // => 'address.latLong'
```


```js
var model = supermodels({
  a: Number,
  b: {
    __type: Number,
    __value: 2
  }
});
```
#### Validation
  Each validator function get passed the current value as the first argument.
  The `this` context is the current "object" level e.g. `address` or `person`.
  If a `key` is present, it will be passed as a second argument.
  
  If a validator returns nothing (`undefined`) then we assume everything is good.
  Any other response will yield a `ValidationError` into the `.errors` properties.

```js
// 
// Continuing the example from above you can see that errors, 
// like events, propagate up the object to the root

person.errors //=> [] an array containing any errors for the entire person
person.address.errors //=> [] an array containing any errors for address and below
person.address.latLong.errors //=> [] an array containing any errors for just the latLong

```

##### Simple example

```js
// Declare a simple truthy function.
// You can do your own validation methods
// like this or use a separate library, or both.
var required = function(value, key) {
  if (!value) {
    return key + ' is required';
  }
};

var personSchema = {
  name: {
    __type: String,
    __validators: [required]
  },
  address: {
    line1: {
      __type: String,
      __validators: [required]
    },
    line2: {
      __type: String,
      __validators: [required]
    }
  }
}

var person = supermodels(personSchema);

person.errors
// => [ 3 x ValidationErrors: name, line1, line 2 are required ]

person.address.errors
// => [ 3 x ValidationErrors: line1, line 2 are required]

person.name = 'Jane Doe';
person.address.line1 = 'Buckingham Palace';
person.address.line2 = 'London';

person.errors
// => []

person.address.errors
// => []
```

##### Real world example
```js

// Moving away from the person example, here we
// show how supermodels can act as a UI controller
var loginController = {
  userName: {
    __type: String,
    __validators: [required]
  },
  password: {
    __type: String,
    __validators: [yourPasswordValidator]
  },
  address: addressSchema,
  acceptedTermsConditions: {
    __type: Boolean,
    __validators: [required]
  },
  __validators: [someModelLevelValidator]
};
```


## Testing

```
$ npm test
```

# License

  MIT
