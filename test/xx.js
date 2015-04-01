// // type: String, Number, Date, Boolean, Array, Object subSchema, SuperModel Ctor, or an Array instance with optional schema at index 0.
// var emitter = require('emitter-object');
// var EmitterEvent = require('emitter-event');
// var emitterArray = require('emitter-array');
// var modelDescriptors = require('./model');

var util = {
  typeOf: function(obj) {
    return Object.prototype.toString.call(obj).match(/\s([a-zA-Z]+)/)[1].toLowerCase();
  },
  isObject: function(value) {
    return this.typeOf(value) === 'object';
  },
  isArray: function(value) {
    return Array.isArray(value);
  },
  isSimple: function(value) {
    // 'Simple' here means anything 
    // other than an Object or an Array
    // i.e. number, string, date, bool, null, undefined, regex...
    return !this.isObject(value) && !this.isArray(value);
  },
  isFunction: function(value) {
    return this.typeOf(value) === 'function';
  },
  isDate: function(value) {
    return this.typeOf(value) === 'date';
  },
  cast: function(value, type) {
    if (!type) {
      return value;
    }
    
    switch (type) {
    case String:
      {
        if (value === undefined || value === null || util.typeOf(value) === 'string') {
          return value;
        }
        return value.toString && value.toString();
      }
      break;
    case Number:
      {
        if (value === undefined || value === null) {
          return NaN;
        }
        if (util.typeOf(value) === 'number') {
          return value;
        }
        return Number(value);
      }
      break;
    case Boolean:
      {
        if (!value) {
          return false;
        }
        var falsey = ['0', 'false', 'off', 'no'];
        return falsey.indexOf(value) === -1;
      }
      break;
    case Date:
      {
        if (value === undefined || value === null || util.typeOf(value) === 'date') {
          return value;
        }
        return new Date(value);
      }
      break;
    case Object:
    case Function:
      {
        return value;
      }
    default:
      throw new Error('Invalid cast');
  }
},
};

function resolve(value) {
  switch (value) {
    case String:
    case Number:
    case Boolean:
    case Date:
    case Array:
      return {
        __type: value
      };
    default:
      return value;
  }
}

function createSetter(key, fn, type) {
  return function(value) {
    
    var oldValue = this.__[key];
  
    if (fn) {
      fn.call(this, value);
    } else {
      this.__[key] = util.cast(value, type);
    }
  
    var newValue = this.__[key];
  };
}

function createGetter(key) {
  return function() {
    return this.__[key];
  };
}

function createFromDescriptor(key, obj) {
  var data;
  var descriptor = Object.getOwnPropertyDescriptor(obj, key);
  var descriptorValue = resolve(descriptor.value);
  
  if (util.isSimple(descriptorValue)) {
    data = {};
    data.__value = descriptorValue;
      
    if (descriptor.get) {
      data.__get = descriptor.get;
    }
    if (descriptor.set) {
      data.__set = descriptor.set;
    }
    if (descriptor.configurable) {
      data.__configurable = true;
    }
    
  } else {
    data = descriptorValue;
    
    // '__' take priority over the natural descriptor settings if there are any
    if (descriptor.configurable === true && descriptorValue.__configurable !== false) {
      data.__configurable = true;
    }
  }
  
  return data;
}
  
function SchemaItem(obj) {

  // // If it's anything other than an object or an
  // // array just set the value property and return
  // if (util.isSimple(obj)) {
  //   this.value = obj;
  //   return;  
  // }
  
  var self = this;
  var __VALIDATORS = '__validators';
  var __VALUE = '__value';
  var __TYPE = '__type';
  var __INIT = '__init';
  var __DISPLAYNAME = '__displayName';
  var __GET = '__get';
  var __SET = '__set';
  var __CONFIGURABLE = '__configurable';
  var __ENUMERABLE = '__enumerable';
  var __SPECIAL_PROPS = [__VALIDATORS, __VALUE, __TYPE, __DISPLAYNAME, __INIT, __GET, __SET, __CONFIGURABLE, __ENUMERABLE];
  
  var keys = Object.keys(obj), count = 0, i;
  
  function checkSchemaKey(keyName) {
    var name = keyName.substr(2);
    if (keyName in obj) {
       count++;
       self[name] = obj[keyName];
    }
  }

  for (i = 0; i < __SPECIAL_PROPS.length; i++) {
    checkSchemaKey(__SPECIAL_PROPS[i]);
  }
  
  if (this.value) {
    // cast the default value
    this.value = this.type ? util.cast(this.value, this.type) : this.value;
    return;
  }
  
  if (this.type === Array) {
    this.isArray = true;
  } 
  
  if (util.isArray(obj)) {
    this.isArray = true;
    if (obj.length === 1) {
      this.subSchema = obj[0];
    }
  }
  
  
  if (!this.type) {
    var childKeys = keys.filter(function(item) {
      return __SPECIAL_PROPS.indexOf(item) === -1;
    });
    if (childKeys.length) {
      this.children = {};
      for (i = 0; i < childKeys.length; i++) {
        this.children[childKeys[i]] = obj[childKeys[i]];
      }
    }
  }
}

function Schema(obj) {
  var schemaItems = Object.create(null), d = Object.create(null), v = [], f = Object.create(null), p;
  
  var keys = Object.keys(obj), key, i;
  var isArray = util.isArray(obj);
  
  if (isArray && obj.length > 1) {
    throw new Error('Array schema [' + key + '] should have max length 1');
  }
  
  for (i = 0; i < keys.length; i++) {
    key = keys[i];
    if (key === '0' && isArray) {
      // Assume first item to be subSchema
      //this.subSchema = new Schema(obj[0]);
      this.Model = obj[0].__ctor ? obj[0] : supermodels(resolve(obj[0]));
    } else {
      schemaItems[key] = new SchemaItem(createFromDescriptor(key, obj));
    }
  }

  var item;
  keys = Object.keys(schemaItems);
  
  function addToProto(name, value) {
    if (!p) {
      p = {};
    }
    p[name] = value;
  }
  
  for (i = 0; i < keys.length; i++) {
    key = keys[i];
    item = schemaItems[key];
    
    if (util.isFunction(item.value)) {
      // Function Type
      
      // Todo
      // Check it's not a supermodel ctor
      //
      
      // Set the fn on the prototype
      addToProto(key, item.value);
      
    } else if (item.isArray) {
      // Array
      
      // Set a descriptor property
      d[key] = {
        enumerable: item.enumerable === false ? false : true,
        configurable: item.configurable
      };
      
      // set the default
      f[key] = new Schema(obj[key]);
      
      // Every Array type gets a getter and
      // a setter if delcared as `writable`
      d[key].get = item.get || createGetter(key);
      if (item.writable === true) {
        d[key].set = createSetter(key, item.set, item.type);
      }
      
    } else if (item.children) {
      // Object
      
      // Set a descriptor property
      d[key] = {
        enumerable: item.enumerable === false ? false : true,
        configurable: item.configurable
      };
      
      // set the default
      f[key] = new Schema(item.children);
      
      // Every Object type gets a getter and
      // a setter if delcared as `writable`
      d[key].get = item.get || createGetter(key);
      if (item.writable === true) {
        d[key].set = createSetter(key, item.set, item.type);
      }
      
    } else {
      
      // Value Type
      
      // Set a descriptor property
      d[key] = {
        enumerable: item.enumerable === false ? false : true,
        configurable: item.configurable
      };
      
      // set the default
      f[key] = item.value;
      
      // Every value type gets a getter
      // and setter unless declared otherwise
      d[key].get = item.get || createGetter(key);
      if (!item.get && item.writable === false) {
        d[key].set = createSetter(key, item.set, item.type);
      }
    }
  }
  
  this.isArray = isArray;
  this.propertyDescriptors = d;
  this.validators = v;
  this.prot = p;
  this.defaultValues = f;
}

function applySchema(def) {

    // Give me some internal data
    Object.defineProperties(this, {
      __: {
        value: {}
      }
    });
    
    // Apply any property descriptors
    Object.defineProperties(this, def.propertyDescriptors);
    
    // Apply any default values
    var defaultValue, model;
    for (var defaultValueKey in def.defaultValues) {
      
      defaultValue = def.defaultValues[defaultValueKey];
      
      if (defaultValue instanceof Schema) {
        model = defaultValue.isArray ? createArray(defaultValue.Model) : {};
        applySchema.call(model, defaultValue);
        this.__[defaultValueKey] = model;
      } else {
        // silently set up default value
        this.__[defaultValueKey] = defaultValue;
      }
    }
    
    if (def.isArray && def.Model) {
      this.create = function() {
        return new def.Model();
      }
    }
}

function createArray(Model) {
  var arr = [];
  
  if (Model) {
    overrideEmitterArrayAddingMutators(arr, Model);
  }
  
  return arr;
}

function ensureValidPrototypes(obj, toValidate) {
  // var test;
  // for (var i = 0; i < toValidate.length; i++) {
  //   test = toValidate[i];
  //   if (!obj.isPrototypeOf(test)) {
  //     throw new Error('Invalid type');
  //   }
  // }
  var test;
  for (var i = 0; i < toValidate.length; i++) {
    test = toValidate[i];
    if (!(test instanceof obj)) {
      throw new Error('Invalid type');
    }
  }
}

function overrideEmitterArrayAddingMutators(arr, obj) {
  var push = arr.push;
  var unshift = arr.unshift;
  var splice = arr.splice;

  if (push) {
    arr.push = function() {
      ensureValidPrototypes(obj, arguments);
      return push.apply(arr, arguments);
    };
  }

  if (unshift) {
    arr.unshift = function() {
      ensureValidPrototypes(obj, arguments);
      return unshift.apply(arr, arguments);
    };
  }

  if (splice) {
    arr.splice = function() {
      ensureValidPrototypes(obj, Array.prototype.slice.call(arguments, 2));
      return splice.apply(arr, arguments);
    };
  }
}

function supermodels(schema, init, parent) {
  
  if (util.isObject(init)) {
    parent = init;
    init = null;
  }
  
  var def = new Schema(schema);
  
  // declare a constructor
  // for the model to be created
  var fn = function() {
    var ctx = def.isArray ? createArray(def.Model) : this;
    
    applySchema.call(ctx, def, init);
    
    // Call any initializer
    if (init) {
      init.apply(ctx, arguments);
    }
    
    return ctx;
    
  };

  // Set any prototype
  if (def.prot) {
    fn.prototype = def.prot;
  }
  
  fn.__ctor = true;
  
  return fn;
  
}


// var orderLineSchema = { name: String, quantity: String, total: Number };
// var OrderLine = supermodels(orderLineSchema);
// //var orderLinesSchema = [orderLineSchema];
// var orderLinesSchema = [OrderLine];

// orderLinesSchema.addLine = function(data) {
//   // supply a create method but
//   // if the supplied array-schema
//   // is an sm ctor, proxy to that 
//   // instead onf an internal implementation
//   var line = this.create();
  
//   //...
// };
// orderLinesSchema.quantityTotal = {
//   __get: function() {
//       var i = this.length, total = 0;
//       while (i--) {
//         total += this[i].quantity;
//       }
//       return total;
//   }
// };
// Object.defineProperties(orderLinesSchema, {
//   linesTotal: {
//     get: function() {
//       var i = this.length, total = 0;
//       while (i--) {
//         total += this[i].total;
//       }
//       return total;
//     },
//     enumerable: true
//   }
// });

// var OrderLines = supermodels(orderLinesSchema);
// var orderLines = new OrderLines();

var addressSchema = {
  //arrSimple: [],
  arrSimple1: [Number],
  //arr: [{a: 1, b: 2}],
  // a: 1,
  // b: {
  //   __type: Number,
  //   __value: 3
  // },
  // sub: {
  //   inner1: String,
  //   subSub: {
  //     inner2: {
  //       __type: String,
  //       __value: 3
  //     }
  //   }
  // },
  // sub1: {
  //   inner1: {
  //     __type: String,
  //     __value: 32
  //   }
  // },
  // // regexp: RegExp,
  // udf: undefined,
  // nll: null, // i should be null
  // line1: String,
  // line2: {
  //   __type: String,
  //   __value: 'default'
  // },
  // quirky1: { // What am I? a String or an Object with property inner? You are a String, any inner properties should be ignored
  //   __type: String,
  //   __value: 'default',
  //   inner: String
  // },
  // quirky2: { // What am I? a String or an Object with property inner? You are a String, value will become '[object Object]'
  //   __type: String,
  //   __value: {
  //     inner: Number
  //   }
  // },
  // quirky3: { // What am I? an Object or an Object with property inner? You are an Object, the inner property will have a default value set to the Number function.
  //   __type: Object,
  //   __value: {
  //     inner1: Number
  //   },
  //   inner: ''
  // },
  // sharedAcrossInstances: {
  //   __type: Object,
  //   __value: {
  //     staticData: {
  //       foo: 'bar'
  //     },
  //     sharedCount: Number
  //   },
  //   iWillBeIgnored: ':('
  // },
  // sharedAcrossInstances1: {
  //   __type: Function,
  //   __value: function() {return 'i should be on the prototype';},
  //   iWillBeIgnored: ':('
  // },
  // sharedAcrossInstances2: {
  //   __value: function() {return 'i should be on the prototype';},
  //   iWillBeIgnored: ':('
  // },
  // sharedAcrossInstances1: {
  //   __type: Function,
  //   __value: { shared: { a: 1}},
  //   iWillBeIgnored: ':('
  // },
  // // wrongDefault: {
  // //   __type: Number,
  // //   __value: '0'// i should be cast to 0 as default value
  // // },
  // age: 2,
  // fn: function() {
  //   return 'i should be on the prototype';
  // }
};

var Address = supermodels(addressSchema, function(data) {
  if (!data) {
    return;
  }
  
  this.line1 = data.line1;
});
var addressData = { line1: 'sdff' };
var address = new Address(addressData);

// var personSchema = {
//   name: String,
//   ownedAddress: addressSchema,
//   //address: Address // supports lazy loading via sm constructor
// };

// var Person = supermodels(personSchema, function(data) {
//   console.log('Person initializer', data);
// });

// var personData = { };
// var person = new Person(personData);