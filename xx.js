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
  }
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
  
  var keys = Object.keys(obj), count = 0;
  
  function checkSchemaKey(keyName) {
    var name = keyName.substr(2);
    if (keyName in obj) {
       count++;
       self[name] = obj[keyName];
    }
  }

  for (var i = 0; i < __SPECIAL_PROPS.length; i++) {
    checkSchemaKey(__SPECIAL_PROPS[i]);
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
  
  if (keys.length > count) {
    this.hasChildren = true; 
  }
}


function Schema(obj) {
  var schemaItems = {}, propertyDescriptors = {};
  
  for (var prop in obj) {
    if (obj.hasOwnProperty(prop)) {
      schemaItems[prop] = new SchemaItem(obj[prop]);
    }
  }
  
  var _ = {}, item;
  for (var key in schemaItems) {
    item = schemaItems[item];
    
    _[item] = item.value;
    
    
    propertyDescriptors[item] = {
      get: function() {
        return _[item];
      },
      set: function(value) {
        
      },
      writable: ,
      enumerable: ,
      configurable: 
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
    
    if (def.isArray) {
      return [];
    } else {
    }
    
    Object.defineProperties(this, def.propertyDescriptors)
    
    if (init) {
      init.apply(this, arguments);
    }
  };
  //fn.prototype = null;
  return fn;
  
}



var addressSchema = {
  line1: String
};

var Address = supermodels(addressSchema, function(data) {
  
});

var personSchema = {
  name: String,
  ownedAddress: addressSchema,
  address: Address // supports lazy loading via sm constructor
};

var Person = supermodels(personSchema, function(data) {
  
});

var personData = {};
var person = new Person(personData);