!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.supermodels=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
var createDef = _dereq_('./lib/def');
var createModelPrototype = _dereq_('./lib/proto');
var Supermodel = _dereq_('./lib/supermodel');

function supermodels(schema, initializer, parent) {
  
  var def = createDef(schema);

  function SupermodelConstructor() {
    var model = def.isSimple ? def.create(parent) : def.create(parent).value;

    // Call any initializer
    if (initializer) {
      initializer.apply(model, arguments);
    }
    
    return model;
  }
  Object.defineProperty(SupermodelConstructor, 'def', {
    value: def // this is used to validate referenced SupermodelConstructors
  });
  SupermodelConstructor.prototype = Supermodel; // this shared object is used, as a prototype, to identify SupermodelConstructors
  SupermodelConstructor.constructor = SupermodelConstructor;
  
  return SupermodelConstructor;
}

module.exports = supermodels;
},{"./lib/def":2,"./lib/proto":5,"./lib/supermodel":6}],2:[function(_dereq_,module,exports){
var util = _dereq_('./util');
var createWrapperFactory = _dereq_('./factory');

function resolve(from) {
  var isCtor = util.isConstructor(from);
  var isSupermodelCtor = util.isSupermodelConstructor(from);
  var isArray = util.isArray(from);

  if (isCtor || isSupermodelCtor || isArray) {
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
    __ENUMERABLE = '__enumerable',
    __CONFIGURABLE = '__configurable',
    __WRITABLE = '__writable',
    __SPECIAL_PROPS = [__VALIDATORS, __VALUE, __TYPE, __DISPLAYNAME, __GET, __SET, __ENUMERABLE, __CONFIGURABLE, __WRITABLE];

  var def = {
    from: from,
    type: from[__TYPE],
    value: from[__VALUE],
    validators: from[__VALIDATORS] || [],
    enumerable: from[__ENUMERABLE] === false ? false : true,
    configurable: from[__CONFIGURABLE] ? true : false,
    writable: from[__WRITABLE] === false ? false : true,
    displayName: from[__DISPLAYNAME],
    getter: from[__GET],
    setter: from[__SET]
  };

  var type = def.type;

  // Simple 'Constructor' Type
  if (util.isSimpleConstructor(type)) {

    def.isSimple = true;

    def.cast = function(value) {
      return util.cast(value, type);
    };

  } else if (util.isSupermodelConstructor(type)) {
    
    def.isReference = true;
  } else if (def.value) {
    // If a value is present, use 
    // that and short-circuit the rest
    def.isSimple = true;
    
  } else {

    // Otherwise look for other non-special
    // keys and also any item definition
    // in the case of Arrays

    var keys = Object.keys(from);
    var childKeys = keys.filter(function(item) {
      return __SPECIAL_PROPS.indexOf(item) === -1;
    });

    if (childKeys.length) {

      var defs = {};
      var proto;

      childKeys.forEach(function(key) {
        var value = from[key];
        if (!util.isConstructor(value) && !util.isSupermodelConstructor(value) && util.isFunction(value)) {
          if (!proto) {
            proto = {};
          }
          proto[key] = value;
        } else {
          defs[key] = createDef(value);
        }
      });

      def.defs = defs;
      def.proto = proto;

    }

    // Check for Array
    if (type === Array || util.isArray(type)) {

      def.isArray = true;

      if (type.length > 0) {
        def.def = createDef(type[0]);
      }

    } else if (childKeys.length === 0) {
      def.isSimple = true;
    }

  }

  def.create = createWrapperFactory(def);

  return def;
}

module.exports = createDef;
},{"./factory":3,"./util":7}],3:[function(_dereq_,module,exports){
var util = _dereq_('./util');
var createModelPrototype = _dereq_('./proto');
var Wrapper = _dereq_('./wrapper');

function createModelDescriptors(def, parent) {
  
  var __ = {};
  
  var desc = {
    __: {
      value: __
    },
    __def: {
      value: def
    },
    __parent: {
      value: parent,
      writable: true
    }
  };
  
  return desc;
}

function defineProperties(model) {
  var defs = model.__def.defs;
  for (var key in defs) {
    defineProperty(model, key, defs[key]);
  }
}

function defineProperty(model, key, def) {

  var desc = {
    get: function() {
      return this.__get(key);
    },
    enumerable: def.enumerable,
    configurable: def.configurable
  };

  if (def.writable) {
    desc.set = function(value) {
      this.__setNotifyChange(key, value);
    };
  }

  Object.defineProperty(model, key, desc);
  
  // Silently initialize the property value
  model.__[key] = def.create(model);
}

function createWrapperFactory(def) {
  
  var wrapper, defaultValue, assert;
  
  if (def.isSimple) {
    wrapper = new Wrapper(def.value, def.writable, def.validators, def.cast, null);
  } else if (def.isReference) {

    // Hold a reference to the 
    // refererenced types' definition
    var refDef = def.type.def;
    
    if (refDef.isSimple) {
      // If the referenced type is itself simple, 
      // we can set just return a wrapper and
      // the property will get initialized.
      wrapper = new Wrapper(refDef.value, refDef.writable, refDef.validators, refDef.cast, null);
    } else {
      
      // If we're not dealing with a simple reference model
      // we need to define an assertion that the instance
      // being set is of the correct type. We do this be 
      // comparing the defs.
      
      assert = function(value) {
        // compare the defintions of the value instance
        // being passed and the def property attached
        // to the type SupermodelConstructor. Allow the
        // value to be undefined or null also.
        var isCorrectType = false;
        
        if (util.isNullOrUndefined(value)) {
          isCorrectType = true;
        } else {
          isCorrectType = refDef === value.__def;
        }
        
        if (!isCorrectType) {
          throw new Error('Value should be an instance of the referenced model, null or undefined');
        }
      };

      wrapper = new Wrapper(def.value, def.writable, def.validators, null, assert);
      
    }
    
  } else if (def.isArray) {
    
    defaultValue = function(parent) {
      // for Arrays, we create a new Array and each
      // time, mixing the model properties into it
      var model = createModelPrototype(def);
      Object.defineProperties(model, createModelDescriptors(def, parent));
      defineProperties(model);
      return model;
    };
    
    assert = function(value) {
      // todo: further array type validation
      if (!util.isArray(value)) {
        throw new Error('Value should be an array');
      }
    };
    
    wrapper = new Wrapper(defaultValue, def.writable, def.validators, null, assert);
    
  } else {
    
    // for Objects, we can create and reuse 
    // a prototype object. We then need to only
    // define the defs and the `runtime` properties
    // e.g. __, parent etc.
    var proto = createModelPrototype(def);
    
    defaultValue = function(parent) {
      var model = Object.create(proto, createModelDescriptors(def, parent));
      defineProperties(model);
      return model;
    };
    
    assert = function(value) {
      if (!proto.isPrototypeOf(value)) {
        throw new Error('Invalid prototype');
      }
    };
    
    wrapper = new Wrapper(defaultValue, def.writable, def.validators, null, assert);
  }
  
  var factory = function(parent) {
    var w = Object.create(wrapper);
    if (!w.isInitialized) {
      w.initialize(parent);
    }
    return w;
  };
  
  // expose the wrapper, this is useful 
  // for validating array items later
  factory.wrapper = wrapper;
  
  return factory;
}

module.exports = createWrapperFactory;
},{"./proto":5,"./util":7,"./wrapper":9}],4:[function(_dereq_,module,exports){
var EmitterEvent = _dereq_('emitter-event');
var ValidationError = _dereq_('./validation-error');
var Wrapper = _dereq_('./wrapper');

var descriptors = {
  __supermodel: {
    value: true
  },
  __keys: {
    get: function() {
      var keys = Object.keys(this);

      if (Array.isArray(this)) {
        var omit = [
          'addEventListener', 'on', 'once', 'removeEventListener', 'removeAllListeners',
          'removeListener', 'off', 'emit', 'listeners', 'hasListeners', 'pop', 'push',
          'reverse', 'shift', 'sort', 'splice', 'update', 'unshift', 'create',
          '__setNotifyChange', '__notifyChange', '__set', '__get'
        ];

        keys = keys.filter(function(item) {
          return omit.indexOf(item) < 0;
        });
      }

      return keys;
    }
  },
  __name: {
    get: function() {
      if (this.__isRoot) {
        return '';
      }

      // Work out the 'name' of the model
      // Look up to the parent and loop through it's keys,
      // Any value or array found to contain the value of this (this model)
      // then we return the key and index in the case we found the model in an array.
      var parentKeys = this.__parent.__keys;
      var parentKey, parentValue, isArray;

      for (var i = 0; i < parentKeys.length; i++) {
        parentKey = parentKeys[i];
        parentValue = this.__parent[parentKey];
        isArray = Array.isArray(parentValue);

        if (parentValue === this) {
          return parentKey;
        }
      }
    }
  },
  __path: {
    get: function() {
      if (this.__hasAncestors && !this.__parent.__isRoot) {
        return this.__parent.__path + '.' + this.__name;
      } else {
        return this.__name;
      }
    }
  },
  __isRoot: {
    get: function() {
      return !this.__hasAncestors;
    }
  },
  __children: {
    get: function() {
      var children = [];

      var keys = this.__keys;
      var key, value;

      for (var i = 0; i < keys.length; i++) {

        key = keys[i];
        value = this[key];

        if (value && value.__supermodel) {

          children.push(value);

        }
      }

      return children;
    }
  },
  __ancestors: {
    get: function() {
      var ancestors = [],
        r = this;

      while (r.__parent) {
        ancestors.push(r.__parent);
        r = r.__parent;
      }

      return ancestors;
    }
  },
  __descendants: {
    get: function() {
      var descendants = [];

      function checkAndAddDescendantIfModel(obj) {

        var keys = obj.__keys;
        var key, value;

        for (var i = 0; i < keys.length; i++) {

          key = keys[i];
          value = obj[key];

          if (value && value.__supermodel) {

            descendants.push(value);
            checkAndAddDescendantIfModel(value);

          }
        }

      }

      checkAndAddDescendantIfModel(this);

      return descendants;
    }
  },
  __hasAncestors: {
    get: function() {
      return !!this.__ancestors.length;
    }
  },
  __hasDecendants: {
    get: function() {
      return !!this.__descendants.length;
    }
  },
  errors: {
    get: function() {
      var errors = [],
        def = this.__def;
      var validator, error, i, j;

      // Run own validators
      var own = def.validators.slice(0);
      for (i = 0; i < own.length; i++) {
        validator = own[i];
        error = validator.call(this, this);

        if (error) {
          errors.push(new ValidationError(this, error, validator));
        }
      }

      // Run through keys and evaluate validators
      var keys = this.__keys;
      var value, key, itemDef;

      for (i = 0; i < keys.length; i++) {

        key = keys[i];

        // If we are an Array with an item definition
        // then we have to look into the Array for our value
        // and also get hold of the wrapper. We only need to 
        // do this if the key is not a property of the array.
        // We check the defs to work this out (i.e. 0, 1, 2).
        // todo: This could be better to check !NaN on the key?
        if (def.isArray && def.def && (!def.defs || !(key in def.defs))) {

          // If we are an Array with a simple item definition 
          // or a reference to a simple type definition
          // substitute the value with the wrapper we get from the
          // create factory function. Otherwise set the value to 
          // the real value of the property.
          itemDef = def.def;

          if (itemDef.isSimple) {
            value = itemDef.create.wrapper;
            value.value = this[key];
          } else if (itemDef.isReference && itemDef.type.def.isSimple) {
            value = itemDef.type.def.create.wrapper;
            value.value = this[key];
          } else {
            value = this[key];
          }
        } else {
          
          // Set the value to the wrapped value of the property
          value = this.__[key];
        }

        if (value) {

          if (value.__supermodel) {
            Array.prototype.push.apply(errors, value.errors);
          } else if (value instanceof Wrapper) {

            var wrapperValue = value.value;
            // `Simple` properties can be identified by not having an
            // assertion. Todo: This may need to become more explicit.
            if (!value._assert) {

              var simple = value.validators;
              for (j = 0; j < simple.length; j++) {
                validator = simple[j];
                error = validator.call(this, wrapperValue, key);

                if (error) {
                  errors.push(new ValidationError(this, error, validator, key));
                }
              }
              
            } else if (wrapperValue && wrapperValue.__supermodel) {
              Array.prototype.push.apply(errors, wrapperValue.errors);
            } else {
              throw 'just checking';
            }
          }
        }
      }

      // // Run through children and push their errors
      // var children = this.__children;
      // for (i = 0; i < children.length; i++) {
      // }

      return errors;
    }
  }
};

var proto = {
  __get: function(key) {
    return this.__[key].value;
  },
  __set: function(key, value) {

    if (value && value.__supermodel) {
      if (value.__parent !== this) {
        value.__parent = this;
      }
    }

    this.__[key].value = value;
  },
  __notifyChange: function(key, newValue, oldValue) {
    // Emit change event against this model
    this.emit('change', new EmitterEvent('change', this, {
      name: key,
      value: newValue,
      oldValue: oldValue
    }));

    // Emit specific key change event against this model
    this.emit('change:' + key, new EmitterEvent('change:' + key, this, {
      value: newValue,
      oldValue: oldValue
    }));

    // Bubble the change event up against the ancestors
    var name;
    for (var i = 0; i < this.__ancestors.length; i++) {

      name = this.__path + '.' + key;

      // Emit change event against this ancestor
      this.__ancestors[i].emit('change', new EmitterEvent('change', this, {
        name: name,
        value: newValue,
        oldValue: oldValue
      }));

      // Emit specific change event against this ancestor
      this.__ancestors[i].emit('change:' + name, new EmitterEvent('change:' + name, this, {
        name: name,
        value: newValue,
        oldValue: oldValue
      }));
    }
  },
  __setNotifyChange: function(key, value) {
    var oldValue = this.__get(key);
    this.__set(key, value);
    var newValue = this.__get(key);
    this.__notifyChange(key, newValue, oldValue);
  }
};

module.exports = {
  proto: proto,
  descriptors: descriptors,
};
},{"./validation-error":8,"./wrapper":9,"emitter-event":13}],5:[function(_dereq_,module,exports){
var emitter = _dereq_('emitter-object');
var emitterArray = _dereq_('emitter-array');

var extend = _dereq_('./util').extend;
var modelProto = _dereq_('./model').proto;
var modelDescriptors = _dereq_('./model').descriptors;

var modelPrototype = Object.create(modelProto, modelDescriptors);
var objectPrototype = (function () {

  var p = Object.create(modelPrototype);
  
  emitter(p);
  
  return p;
})();


function createArrayPrototype() {

  var p = emitterArray(function() {}); 
  
  Object.defineProperties(p, modelDescriptors);
  
  emitter(p);
  
  extend(p, modelProto);
  
  return p;
}

function createObjectModelPrototype(proto) {
  var p = Object.create(objectPrototype);
  
  if (proto) {
    extend(p, proto);
  }
  
  return p;
}

function createArrayModelPrototype(proto, itemDef) {
  
  // We do not to attempt to subclass Array,
  // instead create a new instance each time.
  var p = createArrayPrototype();
  
  if (proto) {
    extend(p, proto);
  }

  if (itemDef) {
    
    // We have a definition for the items 
    // that belong in this array.
      
    // Use the `wrapper` prototype property as a 
    // virtual Wrapper object we can use 
    // validate the items in the array.
    var arrItemWrapper = itemDef.create.wrapper;

    // Validate new models by overriding the emitter array 
    // mutators that can cause new items to enter the array.
    overrideArrayAddingMutators(p, arrItemWrapper);

    // Provide a convenient model factory 
    // for creating array item instances
    // if the right conditions are met.
    if (!itemDef.isSimple && !itemDef.isReference) {
      p.create = function() {
        return itemDef.create(this).value;
      };
    }
  }
  
  return p;
}

function wrapArrayItems(itemWrapper, items) {
  var args = [];
  for (var i = 0; i < items.length; i++) {
    itemWrapper.value = items[i];
    args.push(itemWrapper.value);
  }
  return args;
}

function overrideArrayAddingMutators(arr, itemWrapper) {
  
  var push = arr.push;
  var unshift = arr.unshift;
  var splice = arr.splice;

  if (push) {
    arr.push = function() {
      var args = wrapArrayItems(itemWrapper, arguments);
      return push.apply(arr, args);
    };
  }

  if (unshift) {
    arr.unshift = function() {
      var args = wrapArrayItems(itemWrapper, arguments);
      return unshift.apply(arr, args);
    };
  }

  if (splice) {
    arr.splice = function() {
      var args = wrapArrayItems(itemWrapper, Array.prototype.slice.call(arguments, 2));
      args.unshift(arguments[1]);
      args.unshift(arguments[0]);
      return splice.apply(arr, args);
    };
  }
}

function createModelPrototype(def) {
  return def.isArray ? createArrayModelPrototype(def.proto, def.def) : createObjectModelPrototype(def.proto);
}

module.exports = createModelPrototype;
},{"./model":4,"./util":7,"emitter-array":10,"emitter-object":14}],6:[function(_dereq_,module,exports){
module.exports = {};
},{}],7:[function(_dereq_,module,exports){
var Supermodel = _dereq_('./supermodel');

function extend(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || typeof add !== 'object') {
    return origin;
  }

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
}

var util = {
  extend: extend,
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
  isNull: function(value) {
    return value === null;
  },
  isUndefined: function(value) {
    return typeof(value) === 'undefined';
  },
  isNullOrUndefined: function(value) {
    return this.isNull(value) || this.isUndefined(value);
  },
  cast: function(value, type) {
    if (!type) {
      return value;
    }

    switch (type) {
      case String:
        return util.castString(value);
      case Number:
        return util.castNumber(value);
      case Boolean:
        return util.castBoolean(value);
      case Date:
        return util.castDate(value);
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
  },
  isConstructor: function(value) {
    return this.isSimpleConstructor(value) || [Array, Object].indexOf(value) > -1;
  },
  isSimpleConstructor: function(value) {
    return [String, Number, Date, Boolean].indexOf(value) > -1;
  },
  isSupermodelConstructor: function(value) {
    return this.isFunction(value) && value.prototype === Supermodel;
  }
};

module.exports = util;
},{"./supermodel":6}],8:[function(_dereq_,module,exports){
function ValidationError(target, error, validator, key) {
  this.target = target;
  this.error = error;
  this.validator = validator;

  if (key) {
    this.key = key;
  }
}

module.exports = ValidationError;
},{}],9:[function(_dereq_,module,exports){
var util = _dereq_('./util');

function Wrapper(defaultValue, writable, validators, beforeSet, assert) {
  this.validators = validators;
  
  this._defaultValue = defaultValue;
  this._writable = writable;
  this._beforeSet = beforeSet;
  this._assert = assert;
  this.isInitialized = false;
  
  if (!util.isFunction(defaultValue)) {
    this.isInitialized = true;
    
    if (!util.isUndefined(defaultValue)) {
      this.value = defaultValue;
    }
  }
}
Wrapper.prototype.initialize = function(parent) {
  if (this.isInitialized) {
    return;
  }
  this.value = this._defaultValue(parent);
  this.isInitialized = true;
};
Object.defineProperties(Wrapper.prototype, {
  value: {
    get: function() {
      return this._getter ? this._getter() : this._value;
    },
    set: function(value) {
      
      if (!this._writable) {
        throw new Error('Value is readonly');
      }
      
      //def.setter.call(this, value);
      var val = this._beforeSet ? this._beforeSet(value) : value;
      
      if (this._assert) {
        this._assert(val);
      }
      
      this._value = val;
    }
  }
});

module.exports = Wrapper;
},{"./util":7}],10:[function(_dereq_,module,exports){
var Emitter = _dereq_('emitter-object');
var EmitterEvent = _dereq_('emitter-event');

function result(name, arr, value) {
  var e = new EmitterEvent(name, arr, value);

  arr.emit(name, e);
  arr.emit('change', e);
}

module.exports = function(callback) {

  callback = callback || raiseEvent;
  
  /**
   * Construct an Array from the passed arguments
   */
  var arrCtorArgs = arguments;
  var arr = [];//Array.apply(null, arrCtorArgs);

  /**
   * Mixin Emitter to the Array instance
   */
  if (!callback) Emitter(arr);

  /**
   * Proxied array mutators methods
   *
   * @param {Object} obj
   * @return {Object}
   * @api private
   */
  var pop = function() {

    var result = Array.prototype.pop.apply(arr);

    callback('pop', arr, { value: result });

    return result;
  };
  var push = function() {

    var result = Array.prototype.push.apply(arr, arguments);

    callback('push', arr, { value: result });

    return result;
  };
  var reverse = function() {

    var result = Array.prototype.reverse.apply(arr);

    callback('reverse', arr, { value: result });

    return result;
  };
  var shift = function() {

    var result = Array.prototype.shift.apply(arr);

    callback('shift', arr, { value: result });

    return result;
  };
  var sort = function() {

    var result = Array.prototype.sort.apply(arr, arguments);

    callback('sort', arr, { value: result });

    return result;
  };
  var unshift = function() {

    var result = Array.prototype.unshift.apply(arr, arguments);

    callback('unshift', arr, { value: result });

    return result;
  };
  var splice = function() {

    if (!arguments.length) {
      return;
    }

    var result = Array.prototype.splice.apply(arr, arguments);

    callback('splice', arr, {
      value: result,
      removed: result,
      added: Array.prototype.slice.call(arguments, 2)
    });

    return result;
  };

  /**
   * Proxy all Array.prototype mutator methods on this array instance
   */
  arr.pop = arr.pop && pop;
  arr.push = arr.push && push;
  arr.reverse = arr.reverse && reverse;
  arr.shift = arr.shift && shift;
  arr.sort = arr.sort && sort;
  arr.splice = arr.splice && splice;

  /**
   * Special update function
   */
  arr.update = function(index, value) {

    var oldValue = arr[index];
    var newValue = arr[index] = value;

    callback('update', arr, {
      value: newValue,
      oldValue: oldValue
    });

    return newValue;
  };

  return arr;
};
},{"emitter-event":11,"emitter-object":12}],11:[function(_dereq_,module,exports){
module.exports = function EmitterEvent(name, target, detail) {
  this.name = name;
  this.target = target;
  
  if (detail) {
    this.detail = detail;
  }
};
},{}],12:[function(_dereq_,module,exports){

/**
 * Expose `Emitter`.
 */

module.exports = Emitter;

/**
 * Initialize a new `Emitter`.
 *
 * @api public
 */

function Emitter(obj) {
  var ctx = obj || this;
  
  var callbacks;
  Object.defineProperty(ctx, '__callbacks', {
    get: function() {
      return callbacks = callbacks || {};
    },
    set: function(value) {
      callbacks = value;
    }
  });
  
  if (obj) {
    ctx = mixin(obj);
    return ctx;
  }
}

/**
 * Mixin the emitter properties.
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */

function mixin(obj) {
  for (var key in Emitter.prototype) {
    obj[key] = Emitter.prototype[key];
  }
  return obj;
}

/**
 * Listen on the given `event` with `fn`.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.on =
Emitter.prototype.addEventListener = function(event, fn){
  (this.__callbacks[event] = this.__callbacks[event] || [])
    .push(fn);
  return this;
};

/**
 * Adds an `event` listener that will be invoked a single
 * time then automatically removed.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.once = function(event, fn){
  function on() {
    this.off(event, on);
    fn.apply(this, arguments);
  }

  on.fn = fn;
  this.on(event, on);
  return this;
};

/**
 * Remove the given callback for `event` or all
 * registered callbacks.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.off =
Emitter.prototype.removeListener =
Emitter.prototype.removeAllListeners =
Emitter.prototype.removeEventListener = function(event, fn){
  
  // all
  if (0 == arguments.length) {
    this.__callbacks = {};
    return this;
  }

  // specific event
  var callbacks = this.__callbacks[event];
  if (!callbacks) return this;

  // remove all handlers
  if (1 == arguments.length) {
    delete this.__callbacks[event];
    return this;
  }

  // remove specific handler
  var cb;
  for (var i = 0; i < callbacks.length; i++) {
    cb = callbacks[i];
    if (cb === fn || cb.fn === fn) {
      callbacks.splice(i, 1);
      break;
    }
  }
  return this;
};

/**
 * Emit `event` with the given args.
 *
 * @param {String} event
 * @param {Mixed} ...
 * @return {Emitter}
 */

Emitter.prototype.emit = function(event) {
  var args = [].slice.call(arguments, 1)
    , callbacks = this.__callbacks[event];

  if (callbacks) {
    callbacks = callbacks.slice(0);
    for (var i = 0, len = callbacks.length; i < len; ++i) {
      callbacks[i].apply(this, args);
    }
  }

  return this;
};

/**
 * Return array of callbacks for `event`.
 *
 * @param {String} event
 * @return {Array}
 * @api public
 */

Emitter.prototype.listeners = function(event) {
  return this.__callbacks[event] || [];
};

/**
 * Check if this emitter has `event` handlers.
 *
 * @param {String} event
 * @return {Boolean}
 * @api public
 */

Emitter.prototype.hasListeners = function(event) {
  return !!this.listeners(event).length;
};

},{}],13:[function(_dereq_,module,exports){
module.exports=_dereq_(11)
},{}],14:[function(_dereq_,module,exports){
module.exports=_dereq_(12)
},{}]},{},[1])
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIi91c3IvbG9jYWwvbGliL25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC9zdXBlcm1vZGVscy5qcy9pbmRleC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3N1cGVybW9kZWxzLmpzL2xpYi9kZWYuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC9zdXBlcm1vZGVscy5qcy9saWIvZmFjdG9yeS5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3N1cGVybW9kZWxzLmpzL2xpYi9tb2RlbC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3N1cGVybW9kZWxzLmpzL2xpYi9wcm90by5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3N1cGVybW9kZWxzLmpzL2xpYi9zdXBlcm1vZGVsLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvc3VwZXJtb2RlbHMuanMvbGliL3V0aWwuanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC9zdXBlcm1vZGVscy5qcy9saWIvdmFsaWRhdGlvbi1lcnJvci5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3N1cGVybW9kZWxzLmpzL2xpYi93cmFwcGVyLmpzIiwiL1VzZXJzL2d1ZXN0L0RvY3VtZW50cy90ZXF1aWQvc3VwZXJtb2RlbHMuanMvbm9kZV9tb2R1bGVzL2VtaXR0ZXItYXJyYXkvaW5kZXguanMiLCIvVXNlcnMvZ3Vlc3QvRG9jdW1lbnRzL3RlcXVpZC9zdXBlcm1vZGVscy5qcy9ub2RlX21vZHVsZXMvZW1pdHRlci1hcnJheS9ub2RlX21vZHVsZXMvZW1pdHRlci1ldmVudC9pbmRleC5qcyIsIi9Vc2Vycy9ndWVzdC9Eb2N1bWVudHMvdGVxdWlkL3N1cGVybW9kZWxzLmpzL25vZGVfbW9kdWxlcy9lbWl0dGVyLWFycmF5L25vZGVfbW9kdWxlcy9lbWl0dGVyLW9iamVjdC9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdKQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3ZTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3pIQTs7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM1R0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNWQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2pEQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ1BBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dGhyb3cgbmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKX12YXIgZj1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwoZi5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxmLGYuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIGNyZWF0ZURlZiA9IHJlcXVpcmUoJy4vbGliL2RlZicpO1xudmFyIGNyZWF0ZU1vZGVsUHJvdG90eXBlID0gcmVxdWlyZSgnLi9saWIvcHJvdG8nKTtcbnZhciBTdXBlcm1vZGVsID0gcmVxdWlyZSgnLi9saWIvc3VwZXJtb2RlbCcpO1xuXG5mdW5jdGlvbiBzdXBlcm1vZGVscyhzY2hlbWEsIGluaXRpYWxpemVyLCBwYXJlbnQpIHtcbiAgXG4gIHZhciBkZWYgPSBjcmVhdGVEZWYoc2NoZW1hKTtcblxuICBmdW5jdGlvbiBTdXBlcm1vZGVsQ29uc3RydWN0b3IoKSB7XG4gICAgdmFyIG1vZGVsID0gZGVmLmlzU2ltcGxlID8gZGVmLmNyZWF0ZShwYXJlbnQpIDogZGVmLmNyZWF0ZShwYXJlbnQpLnZhbHVlO1xuXG4gICAgLy8gQ2FsbCBhbnkgaW5pdGlhbGl6ZXJcbiAgICBpZiAoaW5pdGlhbGl6ZXIpIHtcbiAgICAgIGluaXRpYWxpemVyLmFwcGx5KG1vZGVsLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBcbiAgICByZXR1cm4gbW9kZWw7XG4gIH1cbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KFN1cGVybW9kZWxDb25zdHJ1Y3RvciwgJ2RlZicsIHtcbiAgICB2YWx1ZTogZGVmIC8vIHRoaXMgaXMgdXNlZCB0byB2YWxpZGF0ZSByZWZlcmVuY2VkIFN1cGVybW9kZWxDb25zdHJ1Y3RvcnNcbiAgfSk7XG4gIFN1cGVybW9kZWxDb25zdHJ1Y3Rvci5wcm90b3R5cGUgPSBTdXBlcm1vZGVsOyAvLyB0aGlzIHNoYXJlZCBvYmplY3QgaXMgdXNlZCwgYXMgYSBwcm90b3R5cGUsIHRvIGlkZW50aWZ5IFN1cGVybW9kZWxDb25zdHJ1Y3RvcnNcbiAgU3VwZXJtb2RlbENvbnN0cnVjdG9yLmNvbnN0cnVjdG9yID0gU3VwZXJtb2RlbENvbnN0cnVjdG9yO1xuICBcbiAgcmV0dXJuIFN1cGVybW9kZWxDb25zdHJ1Y3Rvcjtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBzdXBlcm1vZGVsczsiLCJ2YXIgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xudmFyIGNyZWF0ZVdyYXBwZXJGYWN0b3J5ID0gcmVxdWlyZSgnLi9mYWN0b3J5Jyk7XG5cbmZ1bmN0aW9uIHJlc29sdmUoZnJvbSkge1xuICB2YXIgaXNDdG9yID0gdXRpbC5pc0NvbnN0cnVjdG9yKGZyb20pO1xuICB2YXIgaXNTdXBlcm1vZGVsQ3RvciA9IHV0aWwuaXNTdXBlcm1vZGVsQ29uc3RydWN0b3IoZnJvbSk7XG4gIHZhciBpc0FycmF5ID0gdXRpbC5pc0FycmF5KGZyb20pO1xuXG4gIGlmIChpc0N0b3IgfHwgaXNTdXBlcm1vZGVsQ3RvciB8fCBpc0FycmF5KSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIF9fdHlwZTogZnJvbVxuICAgIH07XG4gIH1cblxuICB2YXIgaXNWYWx1ZSA9ICF1dGlsLmlzT2JqZWN0KGZyb20pO1xuICBpZiAoaXNWYWx1ZSkge1xuICAgIHJldHVybiB7XG4gICAgICBfX3ZhbHVlOiBmcm9tXG4gICAgfTtcbiAgfVxuXG4gIHJldHVybiBmcm9tO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVEZWYoZnJvbSkge1xuXG4gIGZyb20gPSByZXNvbHZlKGZyb20pO1xuXG4gIHZhciBfX1ZBTElEQVRPUlMgPSAnX192YWxpZGF0b3JzJyxcbiAgICBfX1ZBTFVFID0gJ19fdmFsdWUnLFxuICAgIF9fVFlQRSA9ICdfX3R5cGUnLFxuICAgIF9fRElTUExBWU5BTUUgPSAnX19kaXNwbGF5TmFtZScsXG4gICAgX19HRVQgPSAnX19nZXQnLFxuICAgIF9fU0VUID0gJ19fc2V0JyxcbiAgICBfX0VOVU1FUkFCTEUgPSAnX19lbnVtZXJhYmxlJyxcbiAgICBfX0NPTkZJR1VSQUJMRSA9ICdfX2NvbmZpZ3VyYWJsZScsXG4gICAgX19XUklUQUJMRSA9ICdfX3dyaXRhYmxlJyxcbiAgICBfX1NQRUNJQUxfUFJPUFMgPSBbX19WQUxJREFUT1JTLCBfX1ZBTFVFLCBfX1RZUEUsIF9fRElTUExBWU5BTUUsIF9fR0VULCBfX1NFVCwgX19FTlVNRVJBQkxFLCBfX0NPTkZJR1VSQUJMRSwgX19XUklUQUJMRV07XG5cbiAgdmFyIGRlZiA9IHtcbiAgICBmcm9tOiBmcm9tLFxuICAgIHR5cGU6IGZyb21bX19UWVBFXSxcbiAgICB2YWx1ZTogZnJvbVtfX1ZBTFVFXSxcbiAgICB2YWxpZGF0b3JzOiBmcm9tW19fVkFMSURBVE9SU10gfHwgW10sXG4gICAgZW51bWVyYWJsZTogZnJvbVtfX0VOVU1FUkFCTEVdID09PSBmYWxzZSA/IGZhbHNlIDogdHJ1ZSxcbiAgICBjb25maWd1cmFibGU6IGZyb21bX19DT05GSUdVUkFCTEVdID8gdHJ1ZSA6IGZhbHNlLFxuICAgIHdyaXRhYmxlOiBmcm9tW19fV1JJVEFCTEVdID09PSBmYWxzZSA/IGZhbHNlIDogdHJ1ZSxcbiAgICBkaXNwbGF5TmFtZTogZnJvbVtfX0RJU1BMQVlOQU1FXSxcbiAgICBnZXR0ZXI6IGZyb21bX19HRVRdLFxuICAgIHNldHRlcjogZnJvbVtfX1NFVF1cbiAgfTtcblxuICB2YXIgdHlwZSA9IGRlZi50eXBlO1xuXG4gIC8vIFNpbXBsZSAnQ29uc3RydWN0b3InIFR5cGVcbiAgaWYgKHV0aWwuaXNTaW1wbGVDb25zdHJ1Y3Rvcih0eXBlKSkge1xuXG4gICAgZGVmLmlzU2ltcGxlID0gdHJ1ZTtcblxuICAgIGRlZi5jYXN0ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHJldHVybiB1dGlsLmNhc3QodmFsdWUsIHR5cGUpO1xuICAgIH07XG5cbiAgfSBlbHNlIGlmICh1dGlsLmlzU3VwZXJtb2RlbENvbnN0cnVjdG9yKHR5cGUpKSB7XG4gICAgXG4gICAgZGVmLmlzUmVmZXJlbmNlID0gdHJ1ZTtcbiAgfSBlbHNlIGlmIChkZWYudmFsdWUpIHtcbiAgICAvLyBJZiBhIHZhbHVlIGlzIHByZXNlbnQsIHVzZSBcbiAgICAvLyB0aGF0IGFuZCBzaG9ydC1jaXJjdWl0IHRoZSByZXN0XG4gICAgZGVmLmlzU2ltcGxlID0gdHJ1ZTtcbiAgICBcbiAgfSBlbHNlIHtcblxuICAgIC8vIE90aGVyd2lzZSBsb29rIGZvciBvdGhlciBub24tc3BlY2lhbFxuICAgIC8vIGtleXMgYW5kIGFsc28gYW55IGl0ZW0gZGVmaW5pdGlvblxuICAgIC8vIGluIHRoZSBjYXNlIG9mIEFycmF5c1xuXG4gICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyhmcm9tKTtcbiAgICB2YXIgY2hpbGRLZXlzID0ga2V5cy5maWx0ZXIoZnVuY3Rpb24oaXRlbSkge1xuICAgICAgcmV0dXJuIF9fU1BFQ0lBTF9QUk9QUy5pbmRleE9mKGl0ZW0pID09PSAtMTtcbiAgICB9KTtcblxuICAgIGlmIChjaGlsZEtleXMubGVuZ3RoKSB7XG5cbiAgICAgIHZhciBkZWZzID0ge307XG4gICAgICB2YXIgcHJvdG87XG5cbiAgICAgIGNoaWxkS2V5cy5mb3JFYWNoKGZ1bmN0aW9uKGtleSkge1xuICAgICAgICB2YXIgdmFsdWUgPSBmcm9tW2tleV07XG4gICAgICAgIGlmICghdXRpbC5pc0NvbnN0cnVjdG9yKHZhbHVlKSAmJiAhdXRpbC5pc1N1cGVybW9kZWxDb25zdHJ1Y3Rvcih2YWx1ZSkgJiYgdXRpbC5pc0Z1bmN0aW9uKHZhbHVlKSkge1xuICAgICAgICAgIGlmICghcHJvdG8pIHtcbiAgICAgICAgICAgIHByb3RvID0ge307XG4gICAgICAgICAgfVxuICAgICAgICAgIHByb3RvW2tleV0gPSB2YWx1ZTtcbiAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICBkZWZzW2tleV0gPSBjcmVhdGVEZWYodmFsdWUpO1xuICAgICAgICB9XG4gICAgICB9KTtcblxuICAgICAgZGVmLmRlZnMgPSBkZWZzO1xuICAgICAgZGVmLnByb3RvID0gcHJvdG87XG5cbiAgICB9XG5cbiAgICAvLyBDaGVjayBmb3IgQXJyYXlcbiAgICBpZiAodHlwZSA9PT0gQXJyYXkgfHwgdXRpbC5pc0FycmF5KHR5cGUpKSB7XG5cbiAgICAgIGRlZi5pc0FycmF5ID0gdHJ1ZTtcblxuICAgICAgaWYgKHR5cGUubGVuZ3RoID4gMCkge1xuICAgICAgICBkZWYuZGVmID0gY3JlYXRlRGVmKHR5cGVbMF0pO1xuICAgICAgfVxuXG4gICAgfSBlbHNlIGlmIChjaGlsZEtleXMubGVuZ3RoID09PSAwKSB7XG4gICAgICBkZWYuaXNTaW1wbGUgPSB0cnVlO1xuICAgIH1cblxuICB9XG5cbiAgZGVmLmNyZWF0ZSA9IGNyZWF0ZVdyYXBwZXJGYWN0b3J5KGRlZik7XG5cbiAgcmV0dXJuIGRlZjtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBjcmVhdGVEZWY7IiwidmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcbnZhciBjcmVhdGVNb2RlbFByb3RvdHlwZSA9IHJlcXVpcmUoJy4vcHJvdG8nKTtcbnZhciBXcmFwcGVyID0gcmVxdWlyZSgnLi93cmFwcGVyJyk7XG5cbmZ1bmN0aW9uIGNyZWF0ZU1vZGVsRGVzY3JpcHRvcnMoZGVmLCBwYXJlbnQpIHtcbiAgXG4gIHZhciBfXyA9IHt9O1xuICBcbiAgdmFyIGRlc2MgPSB7XG4gICAgX186IHtcbiAgICAgIHZhbHVlOiBfX1xuICAgIH0sXG4gICAgX19kZWY6IHtcbiAgICAgIHZhbHVlOiBkZWZcbiAgICB9LFxuICAgIF9fcGFyZW50OiB7XG4gICAgICB2YWx1ZTogcGFyZW50LFxuICAgICAgd3JpdGFibGU6IHRydWVcbiAgICB9XG4gIH07XG4gIFxuICByZXR1cm4gZGVzYztcbn1cblxuZnVuY3Rpb24gZGVmaW5lUHJvcGVydGllcyhtb2RlbCkge1xuICB2YXIgZGVmcyA9IG1vZGVsLl9fZGVmLmRlZnM7XG4gIGZvciAodmFyIGtleSBpbiBkZWZzKSB7XG4gICAgZGVmaW5lUHJvcGVydHkobW9kZWwsIGtleSwgZGVmc1trZXldKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBkZWZpbmVQcm9wZXJ0eShtb2RlbCwga2V5LCBkZWYpIHtcblxuICB2YXIgZGVzYyA9IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuX19nZXQoa2V5KTtcbiAgICB9LFxuICAgIGVudW1lcmFibGU6IGRlZi5lbnVtZXJhYmxlLFxuICAgIGNvbmZpZ3VyYWJsZTogZGVmLmNvbmZpZ3VyYWJsZVxuICB9O1xuXG4gIGlmIChkZWYud3JpdGFibGUpIHtcbiAgICBkZXNjLnNldCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICB0aGlzLl9fc2V0Tm90aWZ5Q2hhbmdlKGtleSwgdmFsdWUpO1xuICAgIH07XG4gIH1cblxuICBPYmplY3QuZGVmaW5lUHJvcGVydHkobW9kZWwsIGtleSwgZGVzYyk7XG4gIFxuICAvLyBTaWxlbnRseSBpbml0aWFsaXplIHRoZSBwcm9wZXJ0eSB2YWx1ZVxuICBtb2RlbC5fX1trZXldID0gZGVmLmNyZWF0ZShtb2RlbCk7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVdyYXBwZXJGYWN0b3J5KGRlZikge1xuICBcbiAgdmFyIHdyYXBwZXIsIGRlZmF1bHRWYWx1ZSwgYXNzZXJ0O1xuICBcbiAgaWYgKGRlZi5pc1NpbXBsZSkge1xuICAgIHdyYXBwZXIgPSBuZXcgV3JhcHBlcihkZWYudmFsdWUsIGRlZi53cml0YWJsZSwgZGVmLnZhbGlkYXRvcnMsIGRlZi5jYXN0LCBudWxsKTtcbiAgfSBlbHNlIGlmIChkZWYuaXNSZWZlcmVuY2UpIHtcblxuICAgIC8vIEhvbGQgYSByZWZlcmVuY2UgdG8gdGhlIFxuICAgIC8vIHJlZmVyZXJlbmNlZCB0eXBlcycgZGVmaW5pdGlvblxuICAgIHZhciByZWZEZWYgPSBkZWYudHlwZS5kZWY7XG4gICAgXG4gICAgaWYgKHJlZkRlZi5pc1NpbXBsZSkge1xuICAgICAgLy8gSWYgdGhlIHJlZmVyZW5jZWQgdHlwZSBpcyBpdHNlbGYgc2ltcGxlLCBcbiAgICAgIC8vIHdlIGNhbiBzZXQganVzdCByZXR1cm4gYSB3cmFwcGVyIGFuZFxuICAgICAgLy8gdGhlIHByb3BlcnR5IHdpbGwgZ2V0IGluaXRpYWxpemVkLlxuICAgICAgd3JhcHBlciA9IG5ldyBXcmFwcGVyKHJlZkRlZi52YWx1ZSwgcmVmRGVmLndyaXRhYmxlLCByZWZEZWYudmFsaWRhdG9ycywgcmVmRGVmLmNhc3QsIG51bGwpO1xuICAgIH0gZWxzZSB7XG4gICAgICBcbiAgICAgIC8vIElmIHdlJ3JlIG5vdCBkZWFsaW5nIHdpdGggYSBzaW1wbGUgcmVmZXJlbmNlIG1vZGVsXG4gICAgICAvLyB3ZSBuZWVkIHRvIGRlZmluZSBhbiBhc3NlcnRpb24gdGhhdCB0aGUgaW5zdGFuY2VcbiAgICAgIC8vIGJlaW5nIHNldCBpcyBvZiB0aGUgY29ycmVjdCB0eXBlLiBXZSBkbyB0aGlzIGJlIFxuICAgICAgLy8gY29tcGFyaW5nIHRoZSBkZWZzLlxuICAgICAgXG4gICAgICBhc3NlcnQgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgICAvLyBjb21wYXJlIHRoZSBkZWZpbnRpb25zIG9mIHRoZSB2YWx1ZSBpbnN0YW5jZVxuICAgICAgICAvLyBiZWluZyBwYXNzZWQgYW5kIHRoZSBkZWYgcHJvcGVydHkgYXR0YWNoZWRcbiAgICAgICAgLy8gdG8gdGhlIHR5cGUgU3VwZXJtb2RlbENvbnN0cnVjdG9yLiBBbGxvdyB0aGVcbiAgICAgICAgLy8gdmFsdWUgdG8gYmUgdW5kZWZpbmVkIG9yIG51bGwgYWxzby5cbiAgICAgICAgdmFyIGlzQ29ycmVjdFR5cGUgPSBmYWxzZTtcbiAgICAgICAgXG4gICAgICAgIGlmICh1dGlsLmlzTnVsbE9yVW5kZWZpbmVkKHZhbHVlKSkge1xuICAgICAgICAgIGlzQ29ycmVjdFR5cGUgPSB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlzQ29ycmVjdFR5cGUgPSByZWZEZWYgPT09IHZhbHVlLl9fZGVmO1xuICAgICAgICB9XG4gICAgICAgIFxuICAgICAgICBpZiAoIWlzQ29ycmVjdFR5cGUpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1ZhbHVlIHNob3VsZCBiZSBhbiBpbnN0YW5jZSBvZiB0aGUgcmVmZXJlbmNlZCBtb2RlbCwgbnVsbCBvciB1bmRlZmluZWQnKTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgd3JhcHBlciA9IG5ldyBXcmFwcGVyKGRlZi52YWx1ZSwgZGVmLndyaXRhYmxlLCBkZWYudmFsaWRhdG9ycywgbnVsbCwgYXNzZXJ0KTtcbiAgICAgIFxuICAgIH1cbiAgICBcbiAgfSBlbHNlIGlmIChkZWYuaXNBcnJheSkge1xuICAgIFxuICAgIGRlZmF1bHRWYWx1ZSA9IGZ1bmN0aW9uKHBhcmVudCkge1xuICAgICAgLy8gZm9yIEFycmF5cywgd2UgY3JlYXRlIGEgbmV3IEFycmF5IGFuZCBlYWNoXG4gICAgICAvLyB0aW1lLCBtaXhpbmcgdGhlIG1vZGVsIHByb3BlcnRpZXMgaW50byBpdFxuICAgICAgdmFyIG1vZGVsID0gY3JlYXRlTW9kZWxQcm90b3R5cGUoZGVmKTtcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKG1vZGVsLCBjcmVhdGVNb2RlbERlc2NyaXB0b3JzKGRlZiwgcGFyZW50KSk7XG4gICAgICBkZWZpbmVQcm9wZXJ0aWVzKG1vZGVsKTtcbiAgICAgIHJldHVybiBtb2RlbDtcbiAgICB9O1xuICAgIFxuICAgIGFzc2VydCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAvLyB0b2RvOiBmdXJ0aGVyIGFycmF5IHR5cGUgdmFsaWRhdGlvblxuICAgICAgaWYgKCF1dGlsLmlzQXJyYXkodmFsdWUpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignVmFsdWUgc2hvdWxkIGJlIGFuIGFycmF5Jyk7XG4gICAgICB9XG4gICAgfTtcbiAgICBcbiAgICB3cmFwcGVyID0gbmV3IFdyYXBwZXIoZGVmYXVsdFZhbHVlLCBkZWYud3JpdGFibGUsIGRlZi52YWxpZGF0b3JzLCBudWxsLCBhc3NlcnQpO1xuICAgIFxuICB9IGVsc2Uge1xuICAgIFxuICAgIC8vIGZvciBPYmplY3RzLCB3ZSBjYW4gY3JlYXRlIGFuZCByZXVzZSBcbiAgICAvLyBhIHByb3RvdHlwZSBvYmplY3QuIFdlIHRoZW4gbmVlZCB0byBvbmx5XG4gICAgLy8gZGVmaW5lIHRoZSBkZWZzIGFuZCB0aGUgYHJ1bnRpbWVgIHByb3BlcnRpZXNcbiAgICAvLyBlLmcuIF9fLCBwYXJlbnQgZXRjLlxuICAgIHZhciBwcm90byA9IGNyZWF0ZU1vZGVsUHJvdG90eXBlKGRlZik7XG4gICAgXG4gICAgZGVmYXVsdFZhbHVlID0gZnVuY3Rpb24ocGFyZW50KSB7XG4gICAgICB2YXIgbW9kZWwgPSBPYmplY3QuY3JlYXRlKHByb3RvLCBjcmVhdGVNb2RlbERlc2NyaXB0b3JzKGRlZiwgcGFyZW50KSk7XG4gICAgICBkZWZpbmVQcm9wZXJ0aWVzKG1vZGVsKTtcbiAgICAgIHJldHVybiBtb2RlbDtcbiAgICB9O1xuICAgIFxuICAgIGFzc2VydCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICBpZiAoIXByb3RvLmlzUHJvdG90eXBlT2YodmFsdWUpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBwcm90b3R5cGUnKTtcbiAgICAgIH1cbiAgICB9O1xuICAgIFxuICAgIHdyYXBwZXIgPSBuZXcgV3JhcHBlcihkZWZhdWx0VmFsdWUsIGRlZi53cml0YWJsZSwgZGVmLnZhbGlkYXRvcnMsIG51bGwsIGFzc2VydCk7XG4gIH1cbiAgXG4gIHZhciBmYWN0b3J5ID0gZnVuY3Rpb24ocGFyZW50KSB7XG4gICAgdmFyIHcgPSBPYmplY3QuY3JlYXRlKHdyYXBwZXIpO1xuICAgIGlmICghdy5pc0luaXRpYWxpemVkKSB7XG4gICAgICB3LmluaXRpYWxpemUocGFyZW50KTtcbiAgICB9XG4gICAgcmV0dXJuIHc7XG4gIH07XG4gIFxuICAvLyBleHBvc2UgdGhlIHdyYXBwZXIsIHRoaXMgaXMgdXNlZnVsIFxuICAvLyBmb3IgdmFsaWRhdGluZyBhcnJheSBpdGVtcyBsYXRlclxuICBmYWN0b3J5LndyYXBwZXIgPSB3cmFwcGVyO1xuICBcbiAgcmV0dXJuIGZhY3Rvcnk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gY3JlYXRlV3JhcHBlckZhY3Rvcnk7IiwidmFyIEVtaXR0ZXJFdmVudCA9IHJlcXVpcmUoJ2VtaXR0ZXItZXZlbnQnKTtcbnZhciBWYWxpZGF0aW9uRXJyb3IgPSByZXF1aXJlKCcuL3ZhbGlkYXRpb24tZXJyb3InKTtcbnZhciBXcmFwcGVyID0gcmVxdWlyZSgnLi93cmFwcGVyJyk7XG5cbnZhciBkZXNjcmlwdG9ycyA9IHtcbiAgX19zdXBlcm1vZGVsOiB7XG4gICAgdmFsdWU6IHRydWVcbiAgfSxcbiAgX19rZXlzOiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXModGhpcyk7XG5cbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHRoaXMpKSB7XG4gICAgICAgIHZhciBvbWl0ID0gW1xuICAgICAgICAgICdhZGRFdmVudExpc3RlbmVyJywgJ29uJywgJ29uY2UnLCAncmVtb3ZlRXZlbnRMaXN0ZW5lcicsICdyZW1vdmVBbGxMaXN0ZW5lcnMnLFxuICAgICAgICAgICdyZW1vdmVMaXN0ZW5lcicsICdvZmYnLCAnZW1pdCcsICdsaXN0ZW5lcnMnLCAnaGFzTGlzdGVuZXJzJywgJ3BvcCcsICdwdXNoJyxcbiAgICAgICAgICAncmV2ZXJzZScsICdzaGlmdCcsICdzb3J0JywgJ3NwbGljZScsICd1cGRhdGUnLCAndW5zaGlmdCcsICdjcmVhdGUnLFxuICAgICAgICAgICdfX3NldE5vdGlmeUNoYW5nZScsICdfX25vdGlmeUNoYW5nZScsICdfX3NldCcsICdfX2dldCdcbiAgICAgICAgXTtcblxuICAgICAgICBrZXlzID0ga2V5cy5maWx0ZXIoZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICAgIHJldHVybiBvbWl0LmluZGV4T2YoaXRlbSkgPCAwO1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGtleXM7XG4gICAgfVxuICB9LFxuICBfX25hbWU6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKHRoaXMuX19pc1Jvb3QpIHtcbiAgICAgICAgcmV0dXJuICcnO1xuICAgICAgfVxuXG4gICAgICAvLyBXb3JrIG91dCB0aGUgJ25hbWUnIG9mIHRoZSBtb2RlbFxuICAgICAgLy8gTG9vayB1cCB0byB0aGUgcGFyZW50IGFuZCBsb29wIHRocm91Z2ggaXQncyBrZXlzLFxuICAgICAgLy8gQW55IHZhbHVlIG9yIGFycmF5IGZvdW5kIHRvIGNvbnRhaW4gdGhlIHZhbHVlIG9mIHRoaXMgKHRoaXMgbW9kZWwpXG4gICAgICAvLyB0aGVuIHdlIHJldHVybiB0aGUga2V5IGFuZCBpbmRleCBpbiB0aGUgY2FzZSB3ZSBmb3VuZCB0aGUgbW9kZWwgaW4gYW4gYXJyYXkuXG4gICAgICB2YXIgcGFyZW50S2V5cyA9IHRoaXMuX19wYXJlbnQuX19rZXlzO1xuICAgICAgdmFyIHBhcmVudEtleSwgcGFyZW50VmFsdWUsIGlzQXJyYXk7XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGFyZW50S2V5cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBwYXJlbnRLZXkgPSBwYXJlbnRLZXlzW2ldO1xuICAgICAgICBwYXJlbnRWYWx1ZSA9IHRoaXMuX19wYXJlbnRbcGFyZW50S2V5XTtcbiAgICAgICAgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkocGFyZW50VmFsdWUpO1xuXG4gICAgICAgIGlmIChwYXJlbnRWYWx1ZSA9PT0gdGhpcykge1xuICAgICAgICAgIHJldHVybiBwYXJlbnRLZXk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIF9fcGF0aDoge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICBpZiAodGhpcy5fX2hhc0FuY2VzdG9ycyAmJiAhdGhpcy5fX3BhcmVudC5fX2lzUm9vdCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fX3BhcmVudC5fX3BhdGggKyAnLicgKyB0aGlzLl9fbmFtZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9fbmFtZTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIF9faXNSb290OiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiAhdGhpcy5fX2hhc0FuY2VzdG9ycztcbiAgICB9XG4gIH0sXG4gIF9fY2hpbGRyZW46IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGNoaWxkcmVuID0gW107XG5cbiAgICAgIHZhciBrZXlzID0gdGhpcy5fX2tleXM7XG4gICAgICB2YXIga2V5LCB2YWx1ZTtcblxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XG5cbiAgICAgICAga2V5ID0ga2V5c1tpXTtcbiAgICAgICAgdmFsdWUgPSB0aGlzW2tleV07XG5cbiAgICAgICAgaWYgKHZhbHVlICYmIHZhbHVlLl9fc3VwZXJtb2RlbCkge1xuXG4gICAgICAgICAgY2hpbGRyZW4ucHVzaCh2YWx1ZSk7XG5cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gY2hpbGRyZW47XG4gICAgfVxuICB9LFxuICBfX2FuY2VzdG9yczoge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgYW5jZXN0b3JzID0gW10sXG4gICAgICAgIHIgPSB0aGlzO1xuXG4gICAgICB3aGlsZSAoci5fX3BhcmVudCkge1xuICAgICAgICBhbmNlc3RvcnMucHVzaChyLl9fcGFyZW50KTtcbiAgICAgICAgciA9IHIuX19wYXJlbnQ7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBhbmNlc3RvcnM7XG4gICAgfVxuICB9LFxuICBfX2Rlc2NlbmRhbnRzOiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBkZXNjZW5kYW50cyA9IFtdO1xuXG4gICAgICBmdW5jdGlvbiBjaGVja0FuZEFkZERlc2NlbmRhbnRJZk1vZGVsKG9iaikge1xuXG4gICAgICAgIHZhciBrZXlzID0gb2JqLl9fa2V5cztcbiAgICAgICAgdmFyIGtleSwgdmFsdWU7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XG5cbiAgICAgICAgICBrZXkgPSBrZXlzW2ldO1xuICAgICAgICAgIHZhbHVlID0gb2JqW2tleV07XG5cbiAgICAgICAgICBpZiAodmFsdWUgJiYgdmFsdWUuX19zdXBlcm1vZGVsKSB7XG5cbiAgICAgICAgICAgIGRlc2NlbmRhbnRzLnB1c2godmFsdWUpO1xuICAgICAgICAgICAgY2hlY2tBbmRBZGREZXNjZW5kYW50SWZNb2RlbCh2YWx1ZSk7XG5cbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgfVxuXG4gICAgICBjaGVja0FuZEFkZERlc2NlbmRhbnRJZk1vZGVsKHRoaXMpO1xuXG4gICAgICByZXR1cm4gZGVzY2VuZGFudHM7XG4gICAgfVxuICB9LFxuICBfX2hhc0FuY2VzdG9yczoge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gISF0aGlzLl9fYW5jZXN0b3JzLmxlbmd0aDtcbiAgICB9XG4gIH0sXG4gIF9faGFzRGVjZW5kYW50czoge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gISF0aGlzLl9fZGVzY2VuZGFudHMubGVuZ3RoO1xuICAgIH1cbiAgfSxcbiAgZXJyb3JzOiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBlcnJvcnMgPSBbXSxcbiAgICAgICAgZGVmID0gdGhpcy5fX2RlZjtcbiAgICAgIHZhciB2YWxpZGF0b3IsIGVycm9yLCBpLCBqO1xuXG4gICAgICAvLyBSdW4gb3duIHZhbGlkYXRvcnNcbiAgICAgIHZhciBvd24gPSBkZWYudmFsaWRhdG9ycy5zbGljZSgwKTtcbiAgICAgIGZvciAoaSA9IDA7IGkgPCBvd24ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFsaWRhdG9yID0gb3duW2ldO1xuICAgICAgICBlcnJvciA9IHZhbGlkYXRvci5jYWxsKHRoaXMsIHRoaXMpO1xuXG4gICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgIGVycm9ycy5wdXNoKG5ldyBWYWxpZGF0aW9uRXJyb3IodGhpcywgZXJyb3IsIHZhbGlkYXRvcikpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIFJ1biB0aHJvdWdoIGtleXMgYW5kIGV2YWx1YXRlIHZhbGlkYXRvcnNcbiAgICAgIHZhciBrZXlzID0gdGhpcy5fX2tleXM7XG4gICAgICB2YXIgdmFsdWUsIGtleSwgaXRlbURlZjtcblxuICAgICAgZm9yIChpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcblxuICAgICAgICBrZXkgPSBrZXlzW2ldO1xuXG4gICAgICAgIC8vIElmIHdlIGFyZSBhbiBBcnJheSB3aXRoIGFuIGl0ZW0gZGVmaW5pdGlvblxuICAgICAgICAvLyB0aGVuIHdlIGhhdmUgdG8gbG9vayBpbnRvIHRoZSBBcnJheSBmb3Igb3VyIHZhbHVlXG4gICAgICAgIC8vIGFuZCBhbHNvIGdldCBob2xkIG9mIHRoZSB3cmFwcGVyLiBXZSBvbmx5IG5lZWQgdG8gXG4gICAgICAgIC8vIGRvIHRoaXMgaWYgdGhlIGtleSBpcyBub3QgYSBwcm9wZXJ0eSBvZiB0aGUgYXJyYXkuXG4gICAgICAgIC8vIFdlIGNoZWNrIHRoZSBkZWZzIHRvIHdvcmsgdGhpcyBvdXQgKGkuZS4gMCwgMSwgMikuXG4gICAgICAgIC8vIHRvZG86IFRoaXMgY291bGQgYmUgYmV0dGVyIHRvIGNoZWNrICFOYU4gb24gdGhlIGtleT9cbiAgICAgICAgaWYgKGRlZi5pc0FycmF5ICYmIGRlZi5kZWYgJiYgKCFkZWYuZGVmcyB8fCAhKGtleSBpbiBkZWYuZGVmcykpKSB7XG5cbiAgICAgICAgICAvLyBJZiB3ZSBhcmUgYW4gQXJyYXkgd2l0aCBhIHNpbXBsZSBpdGVtIGRlZmluaXRpb24gXG4gICAgICAgICAgLy8gb3IgYSByZWZlcmVuY2UgdG8gYSBzaW1wbGUgdHlwZSBkZWZpbml0aW9uXG4gICAgICAgICAgLy8gc3Vic3RpdHV0ZSB0aGUgdmFsdWUgd2l0aCB0aGUgd3JhcHBlciB3ZSBnZXQgZnJvbSB0aGVcbiAgICAgICAgICAvLyBjcmVhdGUgZmFjdG9yeSBmdW5jdGlvbi4gT3RoZXJ3aXNlIHNldCB0aGUgdmFsdWUgdG8gXG4gICAgICAgICAgLy8gdGhlIHJlYWwgdmFsdWUgb2YgdGhlIHByb3BlcnR5LlxuICAgICAgICAgIGl0ZW1EZWYgPSBkZWYuZGVmO1xuXG4gICAgICAgICAgaWYgKGl0ZW1EZWYuaXNTaW1wbGUpIHtcbiAgICAgICAgICAgIHZhbHVlID0gaXRlbURlZi5jcmVhdGUud3JhcHBlcjtcbiAgICAgICAgICAgIHZhbHVlLnZhbHVlID0gdGhpc1trZXldO1xuICAgICAgICAgIH0gZWxzZSBpZiAoaXRlbURlZi5pc1JlZmVyZW5jZSAmJiBpdGVtRGVmLnR5cGUuZGVmLmlzU2ltcGxlKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IGl0ZW1EZWYudHlwZS5kZWYuY3JlYXRlLndyYXBwZXI7XG4gICAgICAgICAgICB2YWx1ZS52YWx1ZSA9IHRoaXNba2V5XTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFsdWUgPSB0aGlzW2tleV07XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIFxuICAgICAgICAgIC8vIFNldCB0aGUgdmFsdWUgdG8gdGhlIHdyYXBwZWQgdmFsdWUgb2YgdGhlIHByb3BlcnR5XG4gICAgICAgICAgdmFsdWUgPSB0aGlzLl9fW2tleV07XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodmFsdWUpIHtcblxuICAgICAgICAgIGlmICh2YWx1ZS5fX3N1cGVybW9kZWwpIHtcbiAgICAgICAgICAgIEFycmF5LnByb3RvdHlwZS5wdXNoLmFwcGx5KGVycm9ycywgdmFsdWUuZXJyb3JzKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKHZhbHVlIGluc3RhbmNlb2YgV3JhcHBlcikge1xuXG4gICAgICAgICAgICB2YXIgd3JhcHBlclZhbHVlID0gdmFsdWUudmFsdWU7XG4gICAgICAgICAgICAvLyBgU2ltcGxlYCBwcm9wZXJ0aWVzIGNhbiBiZSBpZGVudGlmaWVkIGJ5IG5vdCBoYXZpbmcgYW5cbiAgICAgICAgICAgIC8vIGFzc2VydGlvbi4gVG9kbzogVGhpcyBtYXkgbmVlZCB0byBiZWNvbWUgbW9yZSBleHBsaWNpdC5cbiAgICAgICAgICAgIGlmICghdmFsdWUuX2Fzc2VydCkge1xuXG4gICAgICAgICAgICAgIHZhciBzaW1wbGUgPSB2YWx1ZS52YWxpZGF0b3JzO1xuICAgICAgICAgICAgICBmb3IgKGogPSAwOyBqIDwgc2ltcGxlLmxlbmd0aDsgaisrKSB7XG4gICAgICAgICAgICAgICAgdmFsaWRhdG9yID0gc2ltcGxlW2pdO1xuICAgICAgICAgICAgICAgIGVycm9yID0gdmFsaWRhdG9yLmNhbGwodGhpcywgd3JhcHBlclZhbHVlLCBrZXkpO1xuXG4gICAgICAgICAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgICAgICAgICBlcnJvcnMucHVzaChuZXcgVmFsaWRhdGlvbkVycm9yKHRoaXMsIGVycm9yLCB2YWxpZGF0b3IsIGtleSkpO1xuICAgICAgICAgICAgICAgIH1cbiAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICBcbiAgICAgICAgICAgIH0gZWxzZSBpZiAod3JhcHBlclZhbHVlICYmIHdyYXBwZXJWYWx1ZS5fX3N1cGVybW9kZWwpIHtcbiAgICAgICAgICAgICAgQXJyYXkucHJvdG90eXBlLnB1c2guYXBwbHkoZXJyb3JzLCB3cmFwcGVyVmFsdWUuZXJyb3JzKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHRocm93ICdqdXN0IGNoZWNraW5nJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gLy8gUnVuIHRocm91Z2ggY2hpbGRyZW4gYW5kIHB1c2ggdGhlaXIgZXJyb3JzXG4gICAgICAvLyB2YXIgY2hpbGRyZW4gPSB0aGlzLl9fY2hpbGRyZW47XG4gICAgICAvLyBmb3IgKGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICAgIC8vIH1cblxuICAgICAgcmV0dXJuIGVycm9ycztcbiAgICB9XG4gIH1cbn07XG5cbnZhciBwcm90byA9IHtcbiAgX19nZXQ6IGZ1bmN0aW9uKGtleSkge1xuICAgIHJldHVybiB0aGlzLl9fW2tleV0udmFsdWU7XG4gIH0sXG4gIF9fc2V0OiBmdW5jdGlvbihrZXksIHZhbHVlKSB7XG5cbiAgICBpZiAodmFsdWUgJiYgdmFsdWUuX19zdXBlcm1vZGVsKSB7XG4gICAgICBpZiAodmFsdWUuX19wYXJlbnQgIT09IHRoaXMpIHtcbiAgICAgICAgdmFsdWUuX19wYXJlbnQgPSB0aGlzO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuX19ba2V5XS52YWx1ZSA9IHZhbHVlO1xuICB9LFxuICBfX25vdGlmeUNoYW5nZTogZnVuY3Rpb24oa2V5LCBuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAvLyBFbWl0IGNoYW5nZSBldmVudCBhZ2FpbnN0IHRoaXMgbW9kZWxcbiAgICB0aGlzLmVtaXQoJ2NoYW5nZScsIG5ldyBFbWl0dGVyRXZlbnQoJ2NoYW5nZScsIHRoaXMsIHtcbiAgICAgIG5hbWU6IGtleSxcbiAgICAgIHZhbHVlOiBuZXdWYWx1ZSxcbiAgICAgIG9sZFZhbHVlOiBvbGRWYWx1ZVxuICAgIH0pKTtcblxuICAgIC8vIEVtaXQgc3BlY2lmaWMga2V5IGNoYW5nZSBldmVudCBhZ2FpbnN0IHRoaXMgbW9kZWxcbiAgICB0aGlzLmVtaXQoJ2NoYW5nZTonICsga2V5LCBuZXcgRW1pdHRlckV2ZW50KCdjaGFuZ2U6JyArIGtleSwgdGhpcywge1xuICAgICAgdmFsdWU6IG5ld1ZhbHVlLFxuICAgICAgb2xkVmFsdWU6IG9sZFZhbHVlXG4gICAgfSkpO1xuXG4gICAgLy8gQnViYmxlIHRoZSBjaGFuZ2UgZXZlbnQgdXAgYWdhaW5zdCB0aGUgYW5jZXN0b3JzXG4gICAgdmFyIG5hbWU7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLl9fYW5jZXN0b3JzLmxlbmd0aDsgaSsrKSB7XG5cbiAgICAgIG5hbWUgPSB0aGlzLl9fcGF0aCArICcuJyArIGtleTtcblxuICAgICAgLy8gRW1pdCBjaGFuZ2UgZXZlbnQgYWdhaW5zdCB0aGlzIGFuY2VzdG9yXG4gICAgICB0aGlzLl9fYW5jZXN0b3JzW2ldLmVtaXQoJ2NoYW5nZScsIG5ldyBFbWl0dGVyRXZlbnQoJ2NoYW5nZScsIHRoaXMsIHtcbiAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAgdmFsdWU6IG5ld1ZhbHVlLFxuICAgICAgICBvbGRWYWx1ZTogb2xkVmFsdWVcbiAgICAgIH0pKTtcblxuICAgICAgLy8gRW1pdCBzcGVjaWZpYyBjaGFuZ2UgZXZlbnQgYWdhaW5zdCB0aGlzIGFuY2VzdG9yXG4gICAgICB0aGlzLl9fYW5jZXN0b3JzW2ldLmVtaXQoJ2NoYW5nZTonICsgbmFtZSwgbmV3IEVtaXR0ZXJFdmVudCgnY2hhbmdlOicgKyBuYW1lLCB0aGlzLCB7XG4gICAgICAgIG5hbWU6IG5hbWUsXG4gICAgICAgIHZhbHVlOiBuZXdWYWx1ZSxcbiAgICAgICAgb2xkVmFsdWU6IG9sZFZhbHVlXG4gICAgICB9KSk7XG4gICAgfVxuICB9LFxuICBfX3NldE5vdGlmeUNoYW5nZTogZnVuY3Rpb24oa2V5LCB2YWx1ZSkge1xuICAgIHZhciBvbGRWYWx1ZSA9IHRoaXMuX19nZXQoa2V5KTtcbiAgICB0aGlzLl9fc2V0KGtleSwgdmFsdWUpO1xuICAgIHZhciBuZXdWYWx1ZSA9IHRoaXMuX19nZXQoa2V5KTtcbiAgICB0aGlzLl9fbm90aWZ5Q2hhbmdlKGtleSwgbmV3VmFsdWUsIG9sZFZhbHVlKTtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIHByb3RvOiBwcm90byxcbiAgZGVzY3JpcHRvcnM6IGRlc2NyaXB0b3JzLFxufTsiLCJ2YXIgZW1pdHRlciA9IHJlcXVpcmUoJ2VtaXR0ZXItb2JqZWN0Jyk7XG52YXIgZW1pdHRlckFycmF5ID0gcmVxdWlyZSgnZW1pdHRlci1hcnJheScpO1xuXG52YXIgZXh0ZW5kID0gcmVxdWlyZSgnLi91dGlsJykuZXh0ZW5kO1xudmFyIG1vZGVsUHJvdG8gPSByZXF1aXJlKCcuL21vZGVsJykucHJvdG87XG52YXIgbW9kZWxEZXNjcmlwdG9ycyA9IHJlcXVpcmUoJy4vbW9kZWwnKS5kZXNjcmlwdG9ycztcblxudmFyIG1vZGVsUHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShtb2RlbFByb3RvLCBtb2RlbERlc2NyaXB0b3JzKTtcbnZhciBvYmplY3RQcm90b3R5cGUgPSAoZnVuY3Rpb24gKCkge1xuXG4gIHZhciBwID0gT2JqZWN0LmNyZWF0ZShtb2RlbFByb3RvdHlwZSk7XG4gIFxuICBlbWl0dGVyKHApO1xuICBcbiAgcmV0dXJuIHA7XG59KSgpO1xuXG5cbmZ1bmN0aW9uIGNyZWF0ZUFycmF5UHJvdG90eXBlKCkge1xuXG4gIHZhciBwID0gZW1pdHRlckFycmF5KGZ1bmN0aW9uKCkge30pOyBcbiAgXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHAsIG1vZGVsRGVzY3JpcHRvcnMpO1xuICBcbiAgZW1pdHRlcihwKTtcbiAgXG4gIGV4dGVuZChwLCBtb2RlbFByb3RvKTtcbiAgXG4gIHJldHVybiBwO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVPYmplY3RNb2RlbFByb3RvdHlwZShwcm90bykge1xuICB2YXIgcCA9IE9iamVjdC5jcmVhdGUob2JqZWN0UHJvdG90eXBlKTtcbiAgXG4gIGlmIChwcm90bykge1xuICAgIGV4dGVuZChwLCBwcm90byk7XG4gIH1cbiAgXG4gIHJldHVybiBwO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVBcnJheU1vZGVsUHJvdG90eXBlKHByb3RvLCBpdGVtRGVmKSB7XG4gIFxuICAvLyBXZSBkbyBub3QgdG8gYXR0ZW1wdCB0byBzdWJjbGFzcyBBcnJheSxcbiAgLy8gaW5zdGVhZCBjcmVhdGUgYSBuZXcgaW5zdGFuY2UgZWFjaCB0aW1lLlxuICB2YXIgcCA9IGNyZWF0ZUFycmF5UHJvdG90eXBlKCk7XG4gIFxuICBpZiAocHJvdG8pIHtcbiAgICBleHRlbmQocCwgcHJvdG8pO1xuICB9XG5cbiAgaWYgKGl0ZW1EZWYpIHtcbiAgICBcbiAgICAvLyBXZSBoYXZlIGEgZGVmaW5pdGlvbiBmb3IgdGhlIGl0ZW1zIFxuICAgIC8vIHRoYXQgYmVsb25nIGluIHRoaXMgYXJyYXkuXG4gICAgICBcbiAgICAvLyBVc2UgdGhlIGB3cmFwcGVyYCBwcm90b3R5cGUgcHJvcGVydHkgYXMgYSBcbiAgICAvLyB2aXJ0dWFsIFdyYXBwZXIgb2JqZWN0IHdlIGNhbiB1c2UgXG4gICAgLy8gdmFsaWRhdGUgdGhlIGl0ZW1zIGluIHRoZSBhcnJheS5cbiAgICB2YXIgYXJySXRlbVdyYXBwZXIgPSBpdGVtRGVmLmNyZWF0ZS53cmFwcGVyO1xuXG4gICAgLy8gVmFsaWRhdGUgbmV3IG1vZGVscyBieSBvdmVycmlkaW5nIHRoZSBlbWl0dGVyIGFycmF5IFxuICAgIC8vIG11dGF0b3JzIHRoYXQgY2FuIGNhdXNlIG5ldyBpdGVtcyB0byBlbnRlciB0aGUgYXJyYXkuXG4gICAgb3ZlcnJpZGVBcnJheUFkZGluZ011dGF0b3JzKHAsIGFyckl0ZW1XcmFwcGVyKTtcblxuICAgIC8vIFByb3ZpZGUgYSBjb252ZW5pZW50IG1vZGVsIGZhY3RvcnkgXG4gICAgLy8gZm9yIGNyZWF0aW5nIGFycmF5IGl0ZW0gaW5zdGFuY2VzXG4gICAgLy8gaWYgdGhlIHJpZ2h0IGNvbmRpdGlvbnMgYXJlIG1ldC5cbiAgICBpZiAoIWl0ZW1EZWYuaXNTaW1wbGUgJiYgIWl0ZW1EZWYuaXNSZWZlcmVuY2UpIHtcbiAgICAgIHAuY3JlYXRlID0gZnVuY3Rpb24oKSB7XG4gICAgICAgIHJldHVybiBpdGVtRGVmLmNyZWF0ZSh0aGlzKS52YWx1ZTtcbiAgICAgIH07XG4gICAgfVxuICB9XG4gIFxuICByZXR1cm4gcDtcbn1cblxuZnVuY3Rpb24gd3JhcEFycmF5SXRlbXMoaXRlbVdyYXBwZXIsIGl0ZW1zKSB7XG4gIHZhciBhcmdzID0gW107XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgaXRlbXMubGVuZ3RoOyBpKyspIHtcbiAgICBpdGVtV3JhcHBlci52YWx1ZSA9IGl0ZW1zW2ldO1xuICAgIGFyZ3MucHVzaChpdGVtV3JhcHBlci52YWx1ZSk7XG4gIH1cbiAgcmV0dXJuIGFyZ3M7XG59XG5cbmZ1bmN0aW9uIG92ZXJyaWRlQXJyYXlBZGRpbmdNdXRhdG9ycyhhcnIsIGl0ZW1XcmFwcGVyKSB7XG4gIFxuICB2YXIgcHVzaCA9IGFyci5wdXNoO1xuICB2YXIgdW5zaGlmdCA9IGFyci51bnNoaWZ0O1xuICB2YXIgc3BsaWNlID0gYXJyLnNwbGljZTtcblxuICBpZiAocHVzaCkge1xuICAgIGFyci5wdXNoID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgYXJncyA9IHdyYXBBcnJheUl0ZW1zKGl0ZW1XcmFwcGVyLCBhcmd1bWVudHMpO1xuICAgICAgcmV0dXJuIHB1c2guYXBwbHkoYXJyLCBhcmdzKTtcbiAgICB9O1xuICB9XG5cbiAgaWYgKHVuc2hpZnQpIHtcbiAgICBhcnIudW5zaGlmdCA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGFyZ3MgPSB3cmFwQXJyYXlJdGVtcyhpdGVtV3JhcHBlciwgYXJndW1lbnRzKTtcbiAgICAgIHJldHVybiB1bnNoaWZ0LmFwcGx5KGFyciwgYXJncyk7XG4gICAgfTtcbiAgfVxuXG4gIGlmIChzcGxpY2UpIHtcbiAgICBhcnIuc3BsaWNlID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgYXJncyA9IHdyYXBBcnJheUl0ZW1zKGl0ZW1XcmFwcGVyLCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpKTtcbiAgICAgIGFyZ3MudW5zaGlmdChhcmd1bWVudHNbMV0pO1xuICAgICAgYXJncy51bnNoaWZ0KGFyZ3VtZW50c1swXSk7XG4gICAgICByZXR1cm4gc3BsaWNlLmFwcGx5KGFyciwgYXJncyk7XG4gICAgfTtcbiAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGVNb2RlbFByb3RvdHlwZShkZWYpIHtcbiAgcmV0dXJuIGRlZi5pc0FycmF5ID8gY3JlYXRlQXJyYXlNb2RlbFByb3RvdHlwZShkZWYucHJvdG8sIGRlZi5kZWYpIDogY3JlYXRlT2JqZWN0TW9kZWxQcm90b3R5cGUoZGVmLnByb3RvKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBjcmVhdGVNb2RlbFByb3RvdHlwZTsiLCJtb2R1bGUuZXhwb3J0cyA9IHt9OyIsInZhciBTdXBlcm1vZGVsID0gcmVxdWlyZSgnLi9zdXBlcm1vZGVsJyk7XG5cbmZ1bmN0aW9uIGV4dGVuZChvcmlnaW4sIGFkZCkge1xuICAvLyBEb24ndCBkbyBhbnl0aGluZyBpZiBhZGQgaXNuJ3QgYW4gb2JqZWN0XG4gIGlmICghYWRkIHx8IHR5cGVvZiBhZGQgIT09ICdvYmplY3QnKSB7XG4gICAgcmV0dXJuIG9yaWdpbjtcbiAgfVxuXG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMoYWRkKTtcbiAgdmFyIGkgPSBrZXlzLmxlbmd0aDtcbiAgd2hpbGUgKGktLSkge1xuICAgIG9yaWdpbltrZXlzW2ldXSA9IGFkZFtrZXlzW2ldXTtcbiAgfVxuICByZXR1cm4gb3JpZ2luO1xufVxuXG52YXIgdXRpbCA9IHtcbiAgZXh0ZW5kOiBleHRlbmQsXG4gIHR5cGVPZjogZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopLm1hdGNoKC9cXHMoW2EtekEtWl0rKS8pWzFdLnRvTG93ZXJDYXNlKCk7XG4gIH0sXG4gIGlzT2JqZWN0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJldHVybiB0aGlzLnR5cGVPZih2YWx1ZSkgPT09ICdvYmplY3QnO1xuICB9LFxuICBpc0FycmF5OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJldHVybiBBcnJheS5pc0FycmF5KHZhbHVlKTtcbiAgfSxcbiAgaXNTaW1wbGU6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgLy8gJ1NpbXBsZScgaGVyZSBtZWFucyBhbnl0aGluZyBcbiAgICAvLyBvdGhlciB0aGFuIGFuIE9iamVjdCBvciBhbiBBcnJheVxuICAgIC8vIGkuZS4gbnVtYmVyLCBzdHJpbmcsIGRhdGUsIGJvb2wsIG51bGwsIHVuZGVmaW5lZCwgcmVnZXguLi5cbiAgICByZXR1cm4gIXRoaXMuaXNPYmplY3QodmFsdWUpICYmICF0aGlzLmlzQXJyYXkodmFsdWUpO1xuICB9LFxuICBpc0Z1bmN0aW9uOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJldHVybiB0aGlzLnR5cGVPZih2YWx1ZSkgPT09ICdmdW5jdGlvbic7XG4gIH0sXG4gIGlzRGF0ZTogZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gdGhpcy50eXBlT2YodmFsdWUpID09PSAnZGF0ZSc7XG4gIH0sXG4gIGlzTnVsbDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gdmFsdWUgPT09IG51bGw7XG4gIH0sXG4gIGlzVW5kZWZpbmVkOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJldHVybiB0eXBlb2YodmFsdWUpID09PSAndW5kZWZpbmVkJztcbiAgfSxcbiAgaXNOdWxsT3JVbmRlZmluZWQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuIHRoaXMuaXNOdWxsKHZhbHVlKSB8fCB0aGlzLmlzVW5kZWZpbmVkKHZhbHVlKTtcbiAgfSxcbiAgY2FzdDogZnVuY3Rpb24odmFsdWUsIHR5cGUpIHtcbiAgICBpZiAoIXR5cGUpIHtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG5cbiAgICBzd2l0Y2ggKHR5cGUpIHtcbiAgICAgIGNhc2UgU3RyaW5nOlxuICAgICAgICByZXR1cm4gdXRpbC5jYXN0U3RyaW5nKHZhbHVlKTtcbiAgICAgIGNhc2UgTnVtYmVyOlxuICAgICAgICByZXR1cm4gdXRpbC5jYXN0TnVtYmVyKHZhbHVlKTtcbiAgICAgIGNhc2UgQm9vbGVhbjpcbiAgICAgICAgcmV0dXJuIHV0aWwuY2FzdEJvb2xlYW4odmFsdWUpO1xuICAgICAgY2FzZSBEYXRlOlxuICAgICAgICByZXR1cm4gdXRpbC5jYXN0RGF0ZSh2YWx1ZSk7XG4gICAgICBjYXNlIE9iamVjdDpcbiAgICAgIGNhc2UgRnVuY3Rpb246XG4gICAgICAgIHJldHVybiB2YWx1ZTtcbiAgICAgIGRlZmF1bHQ6XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBjYXN0Jyk7XG4gICAgfVxuICB9LFxuICBjYXN0U3RyaW5nOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSBudWxsIHx8IHV0aWwudHlwZU9mKHZhbHVlKSA9PT0gJ3N0cmluZycpIHtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG4gICAgcmV0dXJuIHZhbHVlLnRvU3RyaW5nICYmIHZhbHVlLnRvU3RyaW5nKCk7XG4gIH0sXG4gIGNhc3ROdW1iZXI6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09IG51bGwpIHtcbiAgICAgIHJldHVybiBOYU47XG4gICAgfVxuICAgIGlmICh1dGlsLnR5cGVPZih2YWx1ZSkgPT09ICdudW1iZXInKSB7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuICAgIHJldHVybiBOdW1iZXIodmFsdWUpO1xuICB9LFxuICBjYXN0Qm9vbGVhbjogZnVuY3Rpb24odmFsdWUpIHtcbiAgICBpZiAoIXZhbHVlKSB7XG4gICAgICByZXR1cm4gZmFsc2U7XG4gICAgfVxuICAgIHZhciBmYWxzZXkgPSBbJzAnLCAnZmFsc2UnLCAnb2ZmJywgJ25vJ107XG4gICAgcmV0dXJuIGZhbHNleS5pbmRleE9mKHZhbHVlKSA9PT0gLTE7XG4gIH0sXG4gIGNhc3REYXRlOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSBudWxsIHx8IHV0aWwudHlwZU9mKHZhbHVlKSA9PT0gJ2RhdGUnKSB7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuICAgIHJldHVybiBuZXcgRGF0ZSh2YWx1ZSk7XG4gIH0sXG4gIGlzQ29uc3RydWN0b3I6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuIHRoaXMuaXNTaW1wbGVDb25zdHJ1Y3Rvcih2YWx1ZSkgfHwgW0FycmF5LCBPYmplY3RdLmluZGV4T2YodmFsdWUpID4gLTE7XG4gIH0sXG4gIGlzU2ltcGxlQ29uc3RydWN0b3I6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuIFtTdHJpbmcsIE51bWJlciwgRGF0ZSwgQm9vbGVhbl0uaW5kZXhPZih2YWx1ZSkgPiAtMTtcbiAgfSxcbiAgaXNTdXBlcm1vZGVsQ29uc3RydWN0b3I6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuIHRoaXMuaXNGdW5jdGlvbih2YWx1ZSkgJiYgdmFsdWUucHJvdG90eXBlID09PSBTdXBlcm1vZGVsO1xuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHV0aWw7IiwiZnVuY3Rpb24gVmFsaWRhdGlvbkVycm9yKHRhcmdldCwgZXJyb3IsIHZhbGlkYXRvciwga2V5KSB7XG4gIHRoaXMudGFyZ2V0ID0gdGFyZ2V0O1xuICB0aGlzLmVycm9yID0gZXJyb3I7XG4gIHRoaXMudmFsaWRhdG9yID0gdmFsaWRhdG9yO1xuXG4gIGlmIChrZXkpIHtcbiAgICB0aGlzLmtleSA9IGtleTtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFZhbGlkYXRpb25FcnJvcjsiLCJ2YXIgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xuXG5mdW5jdGlvbiBXcmFwcGVyKGRlZmF1bHRWYWx1ZSwgd3JpdGFibGUsIHZhbGlkYXRvcnMsIGJlZm9yZVNldCwgYXNzZXJ0KSB7XG4gIHRoaXMudmFsaWRhdG9ycyA9IHZhbGlkYXRvcnM7XG4gIFxuICB0aGlzLl9kZWZhdWx0VmFsdWUgPSBkZWZhdWx0VmFsdWU7XG4gIHRoaXMuX3dyaXRhYmxlID0gd3JpdGFibGU7XG4gIHRoaXMuX2JlZm9yZVNldCA9IGJlZm9yZVNldDtcbiAgdGhpcy5fYXNzZXJ0ID0gYXNzZXJ0O1xuICB0aGlzLmlzSW5pdGlhbGl6ZWQgPSBmYWxzZTtcbiAgXG4gIGlmICghdXRpbC5pc0Z1bmN0aW9uKGRlZmF1bHRWYWx1ZSkpIHtcbiAgICB0aGlzLmlzSW5pdGlhbGl6ZWQgPSB0cnVlO1xuICAgIFxuICAgIGlmICghdXRpbC5pc1VuZGVmaW5lZChkZWZhdWx0VmFsdWUpKSB7XG4gICAgICB0aGlzLnZhbHVlID0gZGVmYXVsdFZhbHVlO1xuICAgIH1cbiAgfVxufVxuV3JhcHBlci5wcm90b3R5cGUuaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uKHBhcmVudCkge1xuICBpZiAodGhpcy5pc0luaXRpYWxpemVkKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIHRoaXMudmFsdWUgPSB0aGlzLl9kZWZhdWx0VmFsdWUocGFyZW50KTtcbiAgdGhpcy5pc0luaXRpYWxpemVkID0gdHJ1ZTtcbn07XG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyhXcmFwcGVyLnByb3RvdHlwZSwge1xuICB2YWx1ZToge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5fZ2V0dGVyID8gdGhpcy5fZ2V0dGVyKCkgOiB0aGlzLl92YWx1ZTtcbiAgICB9LFxuICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIFxuICAgICAgaWYgKCF0aGlzLl93cml0YWJsZSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1ZhbHVlIGlzIHJlYWRvbmx5Jyk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIC8vZGVmLnNldHRlci5jYWxsKHRoaXMsIHZhbHVlKTtcbiAgICAgIHZhciB2YWwgPSB0aGlzLl9iZWZvcmVTZXQgPyB0aGlzLl9iZWZvcmVTZXQodmFsdWUpIDogdmFsdWU7XG4gICAgICBcbiAgICAgIGlmICh0aGlzLl9hc3NlcnQpIHtcbiAgICAgICAgdGhpcy5fYXNzZXJ0KHZhbCk7XG4gICAgICB9XG4gICAgICBcbiAgICAgIHRoaXMuX3ZhbHVlID0gdmFsO1xuICAgIH1cbiAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gV3JhcHBlcjsiLCJ2YXIgRW1pdHRlciA9IHJlcXVpcmUoJ2VtaXR0ZXItb2JqZWN0Jyk7XG52YXIgRW1pdHRlckV2ZW50ID0gcmVxdWlyZSgnZW1pdHRlci1ldmVudCcpO1xuXG5mdW5jdGlvbiByZXN1bHQobmFtZSwgYXJyLCB2YWx1ZSkge1xuICB2YXIgZSA9IG5ldyBFbWl0dGVyRXZlbnQobmFtZSwgYXJyLCB2YWx1ZSk7XG5cbiAgYXJyLmVtaXQobmFtZSwgZSk7XG4gIGFyci5lbWl0KCdjaGFuZ2UnLCBlKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuXG4gIGNhbGxiYWNrID0gY2FsbGJhY2sgfHwgcmFpc2VFdmVudDtcbiAgXG4gIC8qKlxuICAgKiBDb25zdHJ1Y3QgYW4gQXJyYXkgZnJvbSB0aGUgcGFzc2VkIGFyZ3VtZW50c1xuICAgKi9cbiAgdmFyIGFyckN0b3JBcmdzID0gYXJndW1lbnRzO1xuICB2YXIgYXJyID0gW107Ly9BcnJheS5hcHBseShudWxsLCBhcnJDdG9yQXJncyk7XG5cbiAgLyoqXG4gICAqIE1peGluIEVtaXR0ZXIgdG8gdGhlIEFycmF5IGluc3RhbmNlXG4gICAqL1xuICBpZiAoIWNhbGxiYWNrKSBFbWl0dGVyKGFycik7XG5cbiAgLyoqXG4gICAqIFByb3hpZWQgYXJyYXkgbXV0YXRvcnMgbWV0aG9kc1xuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gICAqIEByZXR1cm4ge09iamVjdH1cbiAgICogQGFwaSBwcml2YXRlXG4gICAqL1xuICB2YXIgcG9wID0gZnVuY3Rpb24oKSB7XG5cbiAgICB2YXIgcmVzdWx0ID0gQXJyYXkucHJvdG90eXBlLnBvcC5hcHBseShhcnIpO1xuXG4gICAgY2FsbGJhY2soJ3BvcCcsIGFyciwgeyB2YWx1ZTogcmVzdWx0IH0pO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcbiAgdmFyIHB1c2ggPSBmdW5jdGlvbigpIHtcblxuICAgIHZhciByZXN1bHQgPSBBcnJheS5wcm90b3R5cGUucHVzaC5hcHBseShhcnIsIGFyZ3VtZW50cyk7XG5cbiAgICBjYWxsYmFjaygncHVzaCcsIGFyciwgeyB2YWx1ZTogcmVzdWx0IH0pO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcbiAgdmFyIHJldmVyc2UgPSBmdW5jdGlvbigpIHtcblxuICAgIHZhciByZXN1bHQgPSBBcnJheS5wcm90b3R5cGUucmV2ZXJzZS5hcHBseShhcnIpO1xuXG4gICAgY2FsbGJhY2soJ3JldmVyc2UnLCBhcnIsIHsgdmFsdWU6IHJlc3VsdCB9KTtcblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG4gIHZhciBzaGlmdCA9IGZ1bmN0aW9uKCkge1xuXG4gICAgdmFyIHJlc3VsdCA9IEFycmF5LnByb3RvdHlwZS5zaGlmdC5hcHBseShhcnIpO1xuXG4gICAgY2FsbGJhY2soJ3NoaWZ0JywgYXJyLCB7IHZhbHVlOiByZXN1bHQgfSk7XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuICB2YXIgc29ydCA9IGZ1bmN0aW9uKCkge1xuXG4gICAgdmFyIHJlc3VsdCA9IEFycmF5LnByb3RvdHlwZS5zb3J0LmFwcGx5KGFyciwgYXJndW1lbnRzKTtcblxuICAgIGNhbGxiYWNrKCdzb3J0JywgYXJyLCB7IHZhbHVlOiByZXN1bHQgfSk7XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuICB2YXIgdW5zaGlmdCA9IGZ1bmN0aW9uKCkge1xuXG4gICAgdmFyIHJlc3VsdCA9IEFycmF5LnByb3RvdHlwZS51bnNoaWZ0LmFwcGx5KGFyciwgYXJndW1lbnRzKTtcblxuICAgIGNhbGxiYWNrKCd1bnNoaWZ0JywgYXJyLCB7IHZhbHVlOiByZXN1bHQgfSk7XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuICB2YXIgc3BsaWNlID0gZnVuY3Rpb24oKSB7XG5cbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgcmVzdWx0ID0gQXJyYXkucHJvdG90eXBlLnNwbGljZS5hcHBseShhcnIsIGFyZ3VtZW50cyk7XG5cbiAgICBjYWxsYmFjaygnc3BsaWNlJywgYXJyLCB7XG4gICAgICB2YWx1ZTogcmVzdWx0LFxuICAgICAgcmVtb3ZlZDogcmVzdWx0LFxuICAgICAgYWRkZWQ6IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMilcbiAgICB9KTtcblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgLyoqXG4gICAqIFByb3h5IGFsbCBBcnJheS5wcm90b3R5cGUgbXV0YXRvciBtZXRob2RzIG9uIHRoaXMgYXJyYXkgaW5zdGFuY2VcbiAgICovXG4gIGFyci5wb3AgPSBhcnIucG9wICYmIHBvcDtcbiAgYXJyLnB1c2ggPSBhcnIucHVzaCAmJiBwdXNoO1xuICBhcnIucmV2ZXJzZSA9IGFyci5yZXZlcnNlICYmIHJldmVyc2U7XG4gIGFyci5zaGlmdCA9IGFyci5zaGlmdCAmJiBzaGlmdDtcbiAgYXJyLnNvcnQgPSBhcnIuc29ydCAmJiBzb3J0O1xuICBhcnIuc3BsaWNlID0gYXJyLnNwbGljZSAmJiBzcGxpY2U7XG5cbiAgLyoqXG4gICAqIFNwZWNpYWwgdXBkYXRlIGZ1bmN0aW9uXG4gICAqL1xuICBhcnIudXBkYXRlID0gZnVuY3Rpb24oaW5kZXgsIHZhbHVlKSB7XG5cbiAgICB2YXIgb2xkVmFsdWUgPSBhcnJbaW5kZXhdO1xuICAgIHZhciBuZXdWYWx1ZSA9IGFycltpbmRleF0gPSB2YWx1ZTtcblxuICAgIGNhbGxiYWNrKCd1cGRhdGUnLCBhcnIsIHtcbiAgICAgIHZhbHVlOiBuZXdWYWx1ZSxcbiAgICAgIG9sZFZhbHVlOiBvbGRWYWx1ZVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIG5ld1ZhbHVlO1xuICB9O1xuXG4gIHJldHVybiBhcnI7XG59OyIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gRW1pdHRlckV2ZW50KG5hbWUsIHRhcmdldCwgZGV0YWlsKSB7XG4gIHRoaXMubmFtZSA9IG5hbWU7XG4gIHRoaXMudGFyZ2V0ID0gdGFyZ2V0O1xuICBcbiAgaWYgKGRldGFpbCkge1xuICAgIHRoaXMuZGV0YWlsID0gZGV0YWlsO1xuICB9XG59OyIsIlxuLyoqXG4gKiBFeHBvc2UgYEVtaXR0ZXJgLlxuICovXG5cbm1vZHVsZS5leHBvcnRzID0gRW1pdHRlcjtcblxuLyoqXG4gKiBJbml0aWFsaXplIGEgbmV3IGBFbWl0dGVyYC5cbiAqXG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbmZ1bmN0aW9uIEVtaXR0ZXIob2JqKSB7XG4gIHZhciBjdHggPSBvYmogfHwgdGhpcztcbiAgXG4gIHZhciBjYWxsYmFja3M7XG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0eShjdHgsICdfX2NhbGxiYWNrcycsIHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGNhbGxiYWNrcyA9IGNhbGxiYWNrcyB8fCB7fTtcbiAgICB9LFxuICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIGNhbGxiYWNrcyA9IHZhbHVlO1xuICAgIH1cbiAgfSk7XG4gIFxuICBpZiAob2JqKSB7XG4gICAgY3R4ID0gbWl4aW4ob2JqKTtcbiAgICByZXR1cm4gY3R4O1xuICB9XG59XG5cbi8qKlxuICogTWl4aW4gdGhlIGVtaXR0ZXIgcHJvcGVydGllcy5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBtaXhpbihvYmopIHtcbiAgZm9yICh2YXIga2V5IGluIEVtaXR0ZXIucHJvdG90eXBlKSB7XG4gICAgb2JqW2tleV0gPSBFbWl0dGVyLnByb3RvdHlwZVtrZXldO1xuICB9XG4gIHJldHVybiBvYmo7XG59XG5cbi8qKlxuICogTGlzdGVuIG9uIHRoZSBnaXZlbiBgZXZlbnRgIHdpdGggYGZuYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAcmV0dXJuIHtFbWl0dGVyfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5FbWl0dGVyLnByb3RvdHlwZS5vbiA9XG5FbWl0dGVyLnByb3RvdHlwZS5hZGRFdmVudExpc3RlbmVyID0gZnVuY3Rpb24oZXZlbnQsIGZuKXtcbiAgKHRoaXMuX19jYWxsYmFja3NbZXZlbnRdID0gdGhpcy5fX2NhbGxiYWNrc1tldmVudF0gfHwgW10pXG4gICAgLnB1c2goZm4pO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogQWRkcyBhbiBgZXZlbnRgIGxpc3RlbmVyIHRoYXQgd2lsbCBiZSBpbnZva2VkIGEgc2luZ2xlXG4gKiB0aW1lIHRoZW4gYXV0b21hdGljYWxseSByZW1vdmVkLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAqIEByZXR1cm4ge0VtaXR0ZXJ9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbkVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbihldmVudCwgZm4pe1xuICBmdW5jdGlvbiBvbigpIHtcbiAgICB0aGlzLm9mZihldmVudCwgb24pO1xuICAgIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH1cblxuICBvbi5mbiA9IGZuO1xuICB0aGlzLm9uKGV2ZW50LCBvbik7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZW1vdmUgdGhlIGdpdmVuIGNhbGxiYWNrIGZvciBgZXZlbnRgIG9yIGFsbFxuICogcmVnaXN0ZXJlZCBjYWxsYmFja3MuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICogQHJldHVybiB7RW1pdHRlcn1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuRW1pdHRlci5wcm90b3R5cGUub2ZmID1cbkVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID1cbkVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9XG5FbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVFdmVudExpc3RlbmVyID0gZnVuY3Rpb24oZXZlbnQsIGZuKXtcbiAgXG4gIC8vIGFsbFxuICBpZiAoMCA9PSBhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgdGhpcy5fX2NhbGxiYWNrcyA9IHt9O1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gc3BlY2lmaWMgZXZlbnRcbiAgdmFyIGNhbGxiYWNrcyA9IHRoaXMuX19jYWxsYmFja3NbZXZlbnRdO1xuICBpZiAoIWNhbGxiYWNrcykgcmV0dXJuIHRoaXM7XG5cbiAgLy8gcmVtb3ZlIGFsbCBoYW5kbGVyc1xuICBpZiAoMSA9PSBhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgZGVsZXRlIHRoaXMuX19jYWxsYmFja3NbZXZlbnRdO1xuICAgIHJldHVybiB0aGlzO1xuICB9XG5cbiAgLy8gcmVtb3ZlIHNwZWNpZmljIGhhbmRsZXJcbiAgdmFyIGNiO1xuICBmb3IgKHZhciBpID0gMDsgaSA8IGNhbGxiYWNrcy5sZW5ndGg7IGkrKykge1xuICAgIGNiID0gY2FsbGJhY2tzW2ldO1xuICAgIGlmIChjYiA9PT0gZm4gfHwgY2IuZm4gPT09IGZuKSB7XG4gICAgICBjYWxsYmFja3Muc3BsaWNlKGksIDEpO1xuICAgICAgYnJlYWs7XG4gICAgfVxuICB9XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBFbWl0IGBldmVudGAgd2l0aCB0aGUgZ2l2ZW4gYXJncy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcbiAqIEBwYXJhbSB7TWl4ZWR9IC4uLlxuICogQHJldHVybiB7RW1pdHRlcn1cbiAqL1xuXG5FbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSlcbiAgICAsIGNhbGxiYWNrcyA9IHRoaXMuX19jYWxsYmFja3NbZXZlbnRdO1xuXG4gIGlmIChjYWxsYmFja3MpIHtcbiAgICBjYWxsYmFja3MgPSBjYWxsYmFja3Muc2xpY2UoMCk7XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGNhbGxiYWNrcy5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuICAgICAgY2FsbGJhY2tzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZXR1cm4gYXJyYXkgb2YgY2FsbGJhY2tzIGZvciBgZXZlbnRgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxuICogQHJldHVybiB7QXJyYXl9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbkVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gIHJldHVybiB0aGlzLl9fY2FsbGJhY2tzW2V2ZW50XSB8fCBbXTtcbn07XG5cbi8qKlxuICogQ2hlY2sgaWYgdGhpcyBlbWl0dGVyIGhhcyBgZXZlbnRgIGhhbmRsZXJzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuRW1pdHRlci5wcm90b3R5cGUuaGFzTGlzdGVuZXJzID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgcmV0dXJuICEhdGhpcy5saXN0ZW5lcnMoZXZlbnQpLmxlbmd0aDtcbn07XG4iXX0=
(1)
});
