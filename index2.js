var emitter = require('emitter-object');
var emitterArray = require('emitter-array');
var modelProto = require('./model').proto;
var modelDescriptors = require('./model').descriptors;
var modelPrototype = Object.create(modelProto, modelDescriptors);

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
        return utils.castString(value);
      case Number:
        return utils.castNumber(value);
      case Boolean:
        return utils.castBoolean(value);
      case Date:
        return utils.castDate(value);
      case Object:
      case Function:
        return value;
      default:
        throw new Error('Invalid cast');
    }
  },
  castString: function(value) {
    if (value === undefined || value === null || util.typeOf(value) === 'string') {
      return value;
    }
    return value.toString && value.toString();
  },
  castNumber: function(value) {
    if (value === undefined || value === null) {
      return NaN;
    }
    if (util.typeOf(value) === 'number') {
      return value;
    }
    return Number(value);
  },
  castBoolean: function(value) {
    if (!value) {
      return false;
    }
    var falsey = ['0', 'false', 'off', 'no'];
    return falsey.indexOf(value) === -1;
  },
  castDate: function(value) {
    if (value === undefined || value === null || util.typeOf(value) === 'date') {
      return value;
    }
    return new Date(value);
  }
};

function extend(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || typeof add !== 'object') return origin;

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
}

function defineProperties(model, properties, __) {
  for (var prop in properties) {
    defineProperty(model, prop, properties[prop], __);
  }
}

function defineProperty(model, key, prop, __) {

  var caster = prop.cast;
  var desc = {
    get: prop.getter || function() {
      return this.__get(key);
    },
    enumerable: prop.enumerable,
    configurable: prop.configurable
  };

  if (prop.setter) {
    desc.set = function(value) {
      prop.setter.call(this, value);
      this.__notify(key, value);
    };
  } else {
    desc.set = function(value) {
      var val = caster ? caster(value) : value;
      this.__setNotifyChange(key, val);
    };
  }

  Object.defineProperty(model, key, desc);
  
  // Silently initialize the property value
  __[key] = prop.value(model);
}

function createRuntimeModelDescriptors(__, properties, parent) {
  return {
    __: {
      value: __
    },
    __properties: {
      value: properties
    },
    __parent: {
      value: parent
    }
  };
}

function createObjectModel(def, parent) {
  
  var __ = {};
  var properties = def.properties;
  var descriptors = createRuntimeModelDescriptors(__, properties, parent);
  var model = Object.create(modelPrototype, descriptors);
  
  emitter(model);
  
  defineProperties(model, properties, __);
  
  return model;
}

function createArrayModel(def, parent) {
  
  var __ = {};
  var properties = def.properties;
  var descriptors = createRuntimeModelDescriptors(__, properties, parent);
  var model = emitterArray(function() {}); 
  
  Object.defineProperties(model, modelDescriptors);
  
  emitter(model);
  
  Object.defineProperties(model, descriptors);
  
  extend(model, modelProto);

  defineProperties(model, properties, __);
  
  var itemDef = def.def;
  if (itemDef) {
    
    // We have a definition for the items 
    // that belong in this array.

      // Create a new prototype we can use to
      // create and validate the items in the array.
      // Set the parent of the prototype to the array
      //var arrItemModelPrototype = createModel(arr);

      // Validate new models by overriding the emitter array 
      // mutators that can cause new items to enter the array
      //overrideEmitterArrayAddingMutators(arr, arrItemModelPrototype);

      // Provide a convenient model factory 
      // for creating array item instances
      if (!itemDef.isSimple) {
        model.create = function() {
          return createModel(itemDef, model);
        };
      }
      
  }
  
  return model;
}

function createModel(def, parent) {
  if (def.isArray) {
    return createArrayModel(def, parent);
  } else {
    return createObjectModel(def, parent);
  }
}

function resolve(from) {
  var isCtor = ~[String, Number, Date, Boolean, Array, Object].indexOf(from);
  var isArray = util.isArray(from);

  if (isCtor || isArray) {
    return {
      __type: from
    };
  }

  var isValue = !util.isObject(from);
  if (isValue) {
    return {
      __value: from
    };
  }

  return from;
}

function createDef(from) {

  from = resolve(from);

  var __VALIDATORS = '__validators',
    __VALUE = '__value',
    __TYPE = '__type',
    __DISPLAYNAME = '__displayName',
    __GET = '__get',
    __SET = '__set',
    __CONFIGURABLE = '__configurable',
    __ENUMERABLE = '__enumerable',
    __SPECIAL_PROPS = [__VALIDATORS, __VALUE, __TYPE, __DISPLAYNAME, __GET, __SET, __CONFIGURABLE, __ENUMERABLE];

  var def = {
    validators: from[__VALIDATORS] || [],
    enumerable: from[__ENUMERABLE] === false ? false : true,
    configurable: from[__CONFIGURABLE] ? true : false,
    displayName: from[__DISPLAYNAME],
    getter: from[__GET],
    setter: from[__SET]
  };

  var type = from[__TYPE];

  // Simple 'Constructor' Type
  if (~[String, Number, Date, Boolean].indexOf(type)) {

    def.isSimple = true;

    def.cast = function(value) {
      return util.cast(value, type);
    };
    def.value = function() {
      return def.cast(from.__value);
    };

  } else {

    // If a value is present, use 
    // that and short-circuit the rest
    if (from.__value) {

      def.value = function() {
        return from.__value;
      };

      return def;
    }

    
    var keys = Object.keys(from);
    var childKeys = keys.filter(function(item) {
      return __SPECIAL_PROPS.indexOf(item) === -1;
    });

    var properties = {};
    
    childKeys.forEach(function(key) {
      child = createDef(from[key]);
      properties[key] = child;
    });
    
    def.properties = properties;

    // Check for Array
    if (type === Array || util.isArray(type)) {

      def.isArray = true;

      if (type.length > 0) {
        def.def = createDef(type[0]);
      }

    }
    
    def.value = function(parent) {
      return createModel(def, parent);
    };
    
  }

  return def;
}

function createFactory(from) {
  /**
   * Create a function that will take in anything and
   * return a function that will create the thing
   */

  var def = createDef(from);
  
  // Wrap any simple definitions
  // in an object with a value property
  if (def.isSimple) {
    def = createDef({
      value: from
    });
  }
  
  return function() {
    return def.value();
  };

}

window.createDef = createDef;
window.createFactory = createFactory;


// function Box(context, key, value, cast, validators, assert) {
//   this._context = context;
//   this._key = key;
//   this._wrapper = new Wrpper(value, cast, validators, assert);
// }
// Object.defineProperties(Box.prototype, {
//   errors: {
//     var errors = [];
//     var key = this._key;
//     var context = this._context;
//     var validators = this._wrapper.validators;
    
//     for (var i = 0; i < validators.length; i++) {
//       validator = validators[i];
//       key = validator.key;
//       error = validator.test.call(context, key ? context[key] : context, key);

//       if (error) {
//         errors.push(new ValidationError(this, error, validator, key));
//       }
//     }
    
//     return errors;
//   }
// });

// function Wrpper(value, cast, validators, assert) {
//   this.validators = validators;
//   if (cast) {
//     this._cast = cast;
//   }
  
//   if (assert) {
//     this._assert = assert;
//   }
  
//   this.value = value;
// }
// Object.defineProperties(Wrpper.prototype, {
//   value: {
//     get: function() {
//       return this._value;
//     },
//     set: function(value) {
//       var val = this._cast ? this._cast(value) : value;
//       if (this._assert) {
//         this._assert(val);
//       }
//       this._value = val;
//     }
//   }
// });
