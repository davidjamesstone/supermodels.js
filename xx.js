// type: String, Number, Date, Boolean, Array, Object subSchema, SuperModel Ctor, or an Array instance with optional schema at index 0.

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
  
function SchemaItem(obj) {

  obj = resolve(obj);
  
  // If it's anything other than an object or an
  // array just set the value property and return
  if (util.isSimple(obj)) {
    this.value = obj;
    return;  
  }
  
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
  
  function addPrefix(obj) {
    var keys = Object.keys(obj);
    for (var i = 0; i < keys.length; i++) {
      keys[i]
    }
  }
  
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

  if (this.type === Array) {
    this.isArray = true;
  } else if (this.type && this.value) {
    // cast the default value
    this.value = util.cast(this.value, this.type);
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
        this.children[childKeys[i]] = new SchemaItem(Object.getOwnPropertyDescriptor(obj, childKeys[i]))
      }
    }
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
function createGetter(key, initValue) {
  return function() {
    return this.__[key];
  };
}

function Schema(obj) {
  var schemaItems = Object.create(null), d = Object.create(null), v = [], f = Object.create(null), p;
  
  var keys = Object.keys(obj), key, i;
  var isArray = util.isArray(obj);
  
  for (i = 0; i < keys.length; i++) {
    key = keys[i];
    if (key === '0' && isArray) {
      // Assume first item to be subSchema
    } else {
      schemaItems[key] = new SchemaItem(obj[key]);
    }
  }

  var item;
  keys = Object.keys(schemaItems);
  
  function addToProto(name, value) {
    if (!p) {
      p = Object.create(null);
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
      
    } else if (item.hasChildren) {
      // Object
      
    } else {
      
      // Value Type
      
      // Set a descriptor property
      d[key] = {
        enumerable: item.enumerable === false ? false : true,
        configurable: item.configurable
      };
      
      // set the default
      f[key] = item.value;
      
      // Every value type gets a setter
      d[key].get = item.getter || createGetter(key, item.value);
      if (item.writable === false) {
        d[key].writable = false;
      } else {
        d[key].set = createSetter(key, item.setter, item.type);
      }
    }
  }
  
  this.propertyDescriptors = d;
  this.validators = v;
  this.prot = p;
  this.defaultValues = f;
}

var setter = function(value) {
  
};


function supermodels(schema, init, parent) {
  
  if (util.isObject(init)) {
    parent = init;
    init = null;
  }
  
  var def = new Schema(schema);
  
  // declare a constructor
  // for the model to be created
  var fn = function() {
    
    if (def.isArray) {
      return [];
    } else {
    }
    
    
    // Give me some internal data
    Object.defineProperties(this, {
      __: {
        value: {}
      }
    });
    
    // Apply any property descriptors
    Object.defineProperties(this, def.propertyDescriptors);
    
    // Apply any default values
    for (var defaultValueKey in def.defaultValues) {
      this[defaultValueKey] = def.defaultValues[defaultValueKey];
    }
    
    // Call any initializer
    if (init) {
      init.apply(this, arguments);
    }
  };

  // Set any prototype
  if (def.prot) {
    fn.prototype = def.prot;
  }
  
  return fn;
  
}



var addressSchema = {
  sub: {
    inner1: String
  },
  sub1: {
    inner1: {
      __type: String
    }
  },
  regexp: RegExp,
  udf: undefined,
  nll: null, // i should be null
  line1: String,
  line2: {
    __type: String,
    __value: 'default'
  },
  quirky1: { // What am I? a String or an Object with property inner? You are a String, any inner properties should be ignored
    __type: String,
    __value: 'default',
    inner: String
  },
  quirky2: { // What am I? a String or an Object with property inner? You are a String, value should not be objects
    __type: String,
    __value: {
      inner: Number
    }
  },
  quirky3: { // What am I? a String or an Object with property inner? You are a String, value should not be objects
    __type: Object,
    __value: {
      inner: Number
    }
  },
  wrongDefault: {
    __type: Number,
    __value: '0'// i should be cast to 0 as default value
  },
  age: 2,
  fn: function() {
    return 'i should be on the prototype';
  }
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
//   address: Address // supports lazy loading via sm constructor
// };

// var Person = supermodels(personSchema, function(data) {
  
// });

// var personData = { };
// var person = new Person(personData);