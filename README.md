# supermodels.js

  Turn plain old javascript objects into observable, traversable, validatable and composable supermodels.
  
  They can be used for all sorts of purposes including the `M` and `C` in an MVC paradigm or for defining your 
  Business Objects (Customer, Address, Order ect.).
  
  For use in Node.js, the browser (5Kb gzipped) or any other JavaScript environment.

## API

### supermodels(schema [, parent])

  Create a new model with the given `schema`.

```js
var model = supermodels({
  a: 1,
  b: 2
});

model.a
// => 1
=======

#### Simple example
```js
var simpleSchema = {
  a: 1,
  b: 2,
  get c() {
    return this.a + this.b;
  },
  d: {
    e: 'something',
    f: 'else'
  }
};

var simple = supermodels(simpleSchema);

simple.a
// => 1

// models are observable
simple.on('change', function(e) {
  // fires whenever `simple` changes
  console.log('simple changed');
});

// models are observable at all levels in the object
simple.d.on('change', function(e) {
  // fires whenever `simple.d` changes
  console.log('simple.d changed');
});

simple.d.e = 'egg';
// simple.d changed
// simple changed
// => "egg"
```

#### Real world example
  This example introduces type casting and a little more on how events are propaged throuhg the object 

```js
var personSchema = {
  firstName: String, // Property will  be cast to a String
  lastName: String,
  get fullName() {
    return this.firstName + ' ' + this.lastName;
  },
  set fullName(value) {
    var parts = value.split(' ');
    this.firstName = parts[0];
    this.lastName = parts[1];
  },
  age: Number, // Property will  be cast to a Number
  address: {
    line1: String,
    line2: String,
    country: String,
    latLong: {
      lat: Number,
      long: Number
    }
  }
};

var person = supermodels(personSchema);

/**
 * Events
 * Events are propagated up through the object (person)
 * is an similar fashion to how DOM events do.
 */
 
// Fires when any change is made to the person
person.on('change', function(e) {});

// Fires when any change is made to the address
person.address.on('change', function(e) {});

// Fires when any change is made to the latLong
person.address.latLong.on('change', function(e) {});

// Fires when any change is made to just the latitude
person.address.latLong.on('change:lat', function(e) {});

// Fires when any change is made to just the latitude.
// This is equivilent to the previous handler although
// the `this` context and event argument `e` will differ
person.on('change:address.latLong.lat', function(e) {});
```

### Traversing

  The following properties are available at each level of the supermodel object (person) to help navigate
  `__name`, `__parent`, `__ancestors`, `__descendants`, `__keys`, `__children`, `__isRoot`, `__hasAncestors`, `__path`, `__hasDecendants`

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

### schema

  A schema is any valid javascript object.
  The object can also contain special metadata
  properties that describe the data. These properties are:
  `__validators`,  `__value`, `__type`, `__get`, `__set`, `__configurable` and `__enumerable'
  

```js
var model = supermodels({
  a: Number,
  b: {
    __type: Number,
    __value: 2
  }
});
=======
  A schema is any valid javascript object as shown above.
  The schema can also contain special metadata
  properties that describe the data. These properties are:
  `__validators`,  `__value`, `__type`, `__get`, `__set`, `__configurable` and `__enumerable`

#### Type casting
  
  Have your properties cast their value on set using `__type`.
  Supported types are `String`, `Number`, `Date` and `Boolean`.
  
  There are two ways to give a property a type:

  The simple short hand as above:
```js
var o = {
  typedString: String,
  typedNumber: Number
}
```
  or using the special  `__type` property

```js
var o = {
  typedString: {
    __type: String
  },
  typedNumber: {
    __type: Number
  }
}
```

#### Validators

  Validate your properties and models using including a `__validators` array.
  The array should a list of functions. Validators can be applied at both the "property" level e.g. `line1` and the  "object" level e.g. `address` or `person`.
  
  
```js
var myValidator1 = function(value[, key]) {};
```
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
  
  In addition to declaring validators a simple function like above, they can also be defined as objects with a  'test' (fn) property. Any other data contained on the object will be passed through and available in the errors.

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


```js
function Required(displayName, predicate) {
  this.displayName = displayName;
  this.predicate = predicate;
}
Required.prototype.name = 'required';
Required.prototype.test = function(value, key) {
  if (!value && (this.predicate && this.predicate())) {
    return this.displayName + ' is required';
  }
};

var over18 = function(value, key) {
  if (value && value < 18) {
    return (this.firstName || 'Person') + ' ' + key + ' should be over 18';
  }
};

var otherTitleRequired = function(value, key) {
  if (value && value < 18) {
    return (this.firstName || 'Person') + ' ' + key + ' should be over 18';
  }
};
  
var personSchema = {
  title: {
    id: Number,
    
    __type: String,
    __validators: [new Required('Title')]
  },
  firstName: {
    __type: String,
    __validators: [new Required('First name')]
  },
  lastName: {
    __type: String,
    __validators: [new Required('Last name')]
  },
  age: {
    __type: Number,
    __validators: [required, over18]
  },
  __validators: [noBigBadWolves]
};

var person = supermodels(personSchema);

// Simple example
var model = supermodels({
  a: 1, // Property will have an initial value of 1
  b: Number, // Property will be cast to a `Number` and have an initial value of `undefined`
  c: {
    __type: Number, // Property will also be cast to a `Number` and have an initial value of 2
    __value: 2
  },
  o: {
    d: String,
    e: 'Initial value'
  }
});

JSON.stringify(model, null, 2);
//"{
//  "a": 1,
//  "c": 2,
//  "o": {
//    "e": "Initial value"
//  }
//}"

model.a = '42'
// => "42" Property not cast
model.b = '42'
// => 42 Property has been cast to a Number

```

  With meta data used by plugins:

```js
var model = require('model');

var Post = model('Post')
  .attr('id', { required: true, type: 'number' })
  .attr('title', { required: true, type: 'string' })
  .attr('body', { required: true, type: 'string' })
  .attr('created_at', { type: 'date' })
  .attr('updated_at', { type: 'date' })
```

### .validate(fn)

  TODO: validation callback docs

### .use(fn)

  TODO: plugin docs

### .url([path])

  Return base url, or url to `path`.

```js
User.url()
// => "/users"

User.url('add')
// => "/users/add"
```

### .route(path)

  Set base path for urls.
  Note this is defaulted to `'/' + modelName.toLowerCase() + 's'`

```js
User.route('/api/u')

User.url()
// => "/api/u"

User.url('add')
// => "/api/u/add"
```
 
### .headers({header: value})

  Sets custom headers for static and method requests on the model.

```js  
User.headers({
  'X-CSRF-Token': 'some token',
  'X-API-Token': 'api token' 
});
```

### .ATTR()

  "Getter" function generated when `Model.attr(name)` is called.

```js
var Post = model('Post')
  .attr('title')
  .attr('body')

var post = new Post({ title: 'Cats' });

post.title()
// => "Cats"
```

### .ATTR(value)

  "Setter" function generated when `Model.attr(name)` is called.

```js
var Post = model('Post')
  .attr('title')
  .attr('body')

var post = new Post;

post.title('Ferrets')
post.title()
// => "Ferrets"
```

  - Emits "change" event with `(name, value, previousValue)`.
  - Emits "change ATTR" event with `(value, previousValue)`.

```js
post.on('change', function(name, val, prev){
  console.log('changed %s from %s to %s', name, prev, val)
})

post.on('change title', function(val, prev){
  console.log('changed title')
})

```

### .isNew()

  Returns `true` if the model is unsaved.

### .toJSON()

  Return a JSON representation of the model (its attributes).

### .has(attr)

  Check if `attr` is non-`null`.

### .get(attr)

  Get `attr`'s value.

### .set(attrs)

  Set multiple `attrs`.

```js
user.set({ name: 'Tobi', age: 2 })
```

### .changed([attr])

  Check if the model is "dirty" and return an object
  of changed attributes. Optionally check a specific `attr`
  and return a `Boolean`.

### .error(attr, msg)

  Define error `msg` for `attr`.

### .isValid()

  Run validations and check if the model is valid.

```js
user.isValid()
// => false

user.errors
// => [{ attr: ..., message: ... }]
```

### .url([path])

  Return this model's base url or relative to `path`:

```js
var user = new User({ id: 5 });
user.url('edit');
// => "/users/5/edit"
```

### .save(fn)

  Save or update and invoke the given callback `fn(err)`.

```js
var user = new User({ name: 'Tobi' })

user.save(function(err){

})
```

  Emits "save" when complete.

### .destroy([fn])

  Destroy and invoke optional `fn(err)`.

  Emits "destroy" when successfully deleted.

## Links

  - [Plugins](https://github.com/component/model/wiki/Plugins) for model

## Testing

```
$ npm install
$ make test &
$ open http://localhost:3000
```

# License

  MIT