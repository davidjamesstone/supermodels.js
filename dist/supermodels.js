!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.supermodels=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var createDef = require('./lib/def');
var createModelPrototype = require('./lib/proto');
var Supermodel = require('./lib/supermodel');

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
},{"./lib/def":2,"./lib/proto":5,"./lib/supermodel":6}],2:[function(require,module,exports){
var util = require('./util');
var createWrapperFactory = require('./factory');

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

},{"./factory":3,"./util":7}],3:[function(require,module,exports){
var util = require('./util');
var createModelPrototype = require('./proto');
var Wrapper = require('./wrapper');

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
    },
    __callbacks: {
      value: {}
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

},{"./proto":5,"./util":7,"./wrapper":9}],4:[function(require,module,exports){
var EmitterEvent = require('emitter-event');
var ValidationError = require('./validation-error');
var Wrapper = require('./wrapper');

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

},{"./validation-error":8,"./wrapper":9,"emitter-event":13}],5:[function(require,module,exports){
var emitter = require('emitter-object');
var emitterArray = require('emitter-array');

var extend = require('./util').extend;
var modelProto = require('./model').proto;
var modelDescriptors = require('./model').descriptors;

var modelPrototype = Object.create(modelProto, modelDescriptors);
var objectPrototype = (function() {

  var p = Object.create(modelPrototype);

  //emitter(p);

  return p;
})();


function createArrayPrototype() {

  var p = emitterArray(function(name, arr, e) {
    if (name === 'update') {
      arr.__notifyChange(e.index, e.value, e.oldValue);
    } else {

    }
  });

  Object.defineProperties(p, modelDescriptors);

  emitter(p);

  extend(p, modelProto);

  return p;
}

function createObjectModelPrototype(proto) {
  var p = Object.create(objectPrototype);

  emitter(p);

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

},{"./model":4,"./util":7,"emitter-array":10,"emitter-object":14}],6:[function(require,module,exports){
module.exports = {};

},{}],7:[function(require,module,exports){
var Supermodel = require('./supermodel');

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

},{"./supermodel":6}],8:[function(require,module,exports){
function ValidationError(target, error, validator, key) {
  this.target = target;
  this.error = error;
  this.validator = validator;

  if (key) {
    this.key = key;
  }
}

module.exports = ValidationError;

},{}],9:[function(require,module,exports){
var util = require('./util');

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

},{"./util":7}],10:[function(require,module,exports){
var Emitter = require('emitter-object');
var EmitterEvent = require('emitter-event');

function raiseEvent(name, arr, value) {
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
  var arr = []; //Array.apply(null, arrCtorArgs);

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

    callback('pop', arr, {
      value: result
    });

    return result;
  };
  var push = function() {

    var result = Array.prototype.push.apply(arr, arguments);

    callback('push', arr, {
      value: result
    });

    return result;
  };
  var reverse = function() {

    var result = Array.prototype.reverse.apply(arr);

    callback('reverse', arr, {
      value: result
    });

    return result;
  };
  var shift = function() {

    var result = Array.prototype.shift.apply(arr);

    callback('shift', arr, {
      value: result
    });

    return result;
  };
  var sort = function() {

    var result = Array.prototype.sort.apply(arr, arguments);

    callback('sort', arr, {
      value: result
    });

    return result;
  };
  var unshift = function() {

    var result = Array.prototype.unshift.apply(arr, arguments);

    callback('unshift', arr, {
      value: result
    });

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
   * Special update function since we can't detect
   * assignment by index e.g. arr[0] = 'something'
   */
  arr.update = function(index, value) {

    var oldValue = arr[index];
    var newValue = arr[index] = value;

    callback('update', arr, {
      index: index,
      value: newValue,
      oldValue: oldValue
    });

    return newValue;
  };

  return arr;
};

},{"emitter-event":11,"emitter-object":12}],11:[function(require,module,exports){
module.exports = function EmitterEvent(name, target, detail) {
  this.name = name;
  this.target = target;
  
  if (detail) {
    this.detail = detail;
  }
};
},{}],12:[function(require,module,exports){
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

  // var callbacks;
  // Object.defineProperty(ctx, '__callbacks', {
  //   get: function() {
  //     return callbacks = callbacks || {};
  //   },
  //   set: function(value) {
  //     callbacks = value;
  //   }
  // });

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
  Emitter.prototype.addEventListener = function(event, fn) {
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

Emitter.prototype.once = function(event, fn) {
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
  Emitter.prototype.removeEventListener = function(event, fn) {

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
  var args = [].slice.call(arguments, 1),
    callbacks = this.__callbacks[event];

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

},{}],13:[function(require,module,exports){
arguments[4][11][0].apply(exports,arguments)
},{"dup":11}],14:[function(require,module,exports){
arguments[4][12][0].apply(exports,arguments)
},{"dup":12}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsImxpYi9kZWYuanMiLCJsaWIvZmFjdG9yeS5qcyIsImxpYi9tb2RlbC5qcyIsImxpYi9wcm90by5qcyIsImxpYi9zdXBlcm1vZGVsLmpzIiwibGliL3V0aWwuanMiLCJsaWIvdmFsaWRhdGlvbi1lcnJvci5qcyIsImxpYi93cmFwcGVyLmpzIiwibm9kZV9tb2R1bGVzL2VtaXR0ZXItYXJyYXkvaW5kZXguanMiLCJub2RlX21vZHVsZXMvZW1pdHRlci1hcnJheS9ub2RlX21vZHVsZXMvZW1pdHRlci1ldmVudC9pbmRleC5qcyIsIm5vZGVfbW9kdWxlcy9lbWl0dGVyLWFycmF5L25vZGVfbW9kdWxlcy9lbWl0dGVyLW9iamVjdC9pbmRleC5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzNCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNqS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3hTQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2xJQTtBQUNBOztBQ0RBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDM0lBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDUEE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwidmFyIGNyZWF0ZURlZiA9IHJlcXVpcmUoJy4vbGliL2RlZicpO1xudmFyIGNyZWF0ZU1vZGVsUHJvdG90eXBlID0gcmVxdWlyZSgnLi9saWIvcHJvdG8nKTtcbnZhciBTdXBlcm1vZGVsID0gcmVxdWlyZSgnLi9saWIvc3VwZXJtb2RlbCcpO1xuXG5mdW5jdGlvbiBzdXBlcm1vZGVscyhzY2hlbWEsIGluaXRpYWxpemVyLCBwYXJlbnQpIHtcbiAgXG4gIHZhciBkZWYgPSBjcmVhdGVEZWYoc2NoZW1hKTtcblxuICBmdW5jdGlvbiBTdXBlcm1vZGVsQ29uc3RydWN0b3IoKSB7XG4gICAgdmFyIG1vZGVsID0gZGVmLmlzU2ltcGxlID8gZGVmLmNyZWF0ZShwYXJlbnQpIDogZGVmLmNyZWF0ZShwYXJlbnQpLnZhbHVlO1xuXG4gICAgLy8gQ2FsbCBhbnkgaW5pdGlhbGl6ZXJcbiAgICBpZiAoaW5pdGlhbGl6ZXIpIHtcbiAgICAgIGluaXRpYWxpemVyLmFwcGx5KG1vZGVsLCBhcmd1bWVudHMpO1xuICAgIH1cbiAgICBcbiAgICByZXR1cm4gbW9kZWw7XG4gIH1cbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KFN1cGVybW9kZWxDb25zdHJ1Y3RvciwgJ2RlZicsIHtcbiAgICB2YWx1ZTogZGVmIC8vIHRoaXMgaXMgdXNlZCB0byB2YWxpZGF0ZSByZWZlcmVuY2VkIFN1cGVybW9kZWxDb25zdHJ1Y3RvcnNcbiAgfSk7XG4gIFN1cGVybW9kZWxDb25zdHJ1Y3Rvci5wcm90b3R5cGUgPSBTdXBlcm1vZGVsOyAvLyB0aGlzIHNoYXJlZCBvYmplY3QgaXMgdXNlZCwgYXMgYSBwcm90b3R5cGUsIHRvIGlkZW50aWZ5IFN1cGVybW9kZWxDb25zdHJ1Y3RvcnNcbiAgU3VwZXJtb2RlbENvbnN0cnVjdG9yLmNvbnN0cnVjdG9yID0gU3VwZXJtb2RlbENvbnN0cnVjdG9yO1xuICBcbiAgcmV0dXJuIFN1cGVybW9kZWxDb25zdHJ1Y3Rvcjtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBzdXBlcm1vZGVsczsiLCJ2YXIgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xudmFyIGNyZWF0ZVdyYXBwZXJGYWN0b3J5ID0gcmVxdWlyZSgnLi9mYWN0b3J5Jyk7XG5cbmZ1bmN0aW9uIHJlc29sdmUoZnJvbSkge1xuICB2YXIgaXNDdG9yID0gdXRpbC5pc0NvbnN0cnVjdG9yKGZyb20pO1xuICB2YXIgaXNTdXBlcm1vZGVsQ3RvciA9IHV0aWwuaXNTdXBlcm1vZGVsQ29uc3RydWN0b3IoZnJvbSk7XG4gIHZhciBpc0FycmF5ID0gdXRpbC5pc0FycmF5KGZyb20pO1xuXG4gIGlmIChpc0N0b3IgfHwgaXNTdXBlcm1vZGVsQ3RvciB8fCBpc0FycmF5KSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIF9fdHlwZTogZnJvbVxuICAgIH07XG4gIH1cblxuICB2YXIgaXNWYWx1ZSA9ICF1dGlsLmlzT2JqZWN0KGZyb20pO1xuICBpZiAoaXNWYWx1ZSkge1xuICAgIHJldHVybiB7XG4gICAgICBfX3ZhbHVlOiBmcm9tXG4gICAgfTtcbiAgfVxuXG4gIHJldHVybiBmcm9tO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVEZWYoZnJvbSkge1xuXG4gIGZyb20gPSByZXNvbHZlKGZyb20pO1xuXG4gIHZhciBfX1ZBTElEQVRPUlMgPSAnX192YWxpZGF0b3JzJyxcbiAgICBfX1ZBTFVFID0gJ19fdmFsdWUnLFxuICAgIF9fVFlQRSA9ICdfX3R5cGUnLFxuICAgIF9fRElTUExBWU5BTUUgPSAnX19kaXNwbGF5TmFtZScsXG4gICAgX19HRVQgPSAnX19nZXQnLFxuICAgIF9fU0VUID0gJ19fc2V0JyxcbiAgICBfX0VOVU1FUkFCTEUgPSAnX19lbnVtZXJhYmxlJyxcbiAgICBfX0NPTkZJR1VSQUJMRSA9ICdfX2NvbmZpZ3VyYWJsZScsXG4gICAgX19XUklUQUJMRSA9ICdfX3dyaXRhYmxlJyxcbiAgICBfX1NQRUNJQUxfUFJPUFMgPSBbX19WQUxJREFUT1JTLCBfX1ZBTFVFLCBfX1RZUEUsIF9fRElTUExBWU5BTUUsIF9fR0VULCBfX1NFVCwgX19FTlVNRVJBQkxFLCBfX0NPTkZJR1VSQUJMRSwgX19XUklUQUJMRV07XG5cbiAgdmFyIGRlZiA9IHtcbiAgICBmcm9tOiBmcm9tLFxuICAgIHR5cGU6IGZyb21bX19UWVBFXSxcbiAgICB2YWx1ZTogZnJvbVtfX1ZBTFVFXSxcbiAgICB2YWxpZGF0b3JzOiBmcm9tW19fVkFMSURBVE9SU10gfHwgW10sXG4gICAgZW51bWVyYWJsZTogZnJvbVtfX0VOVU1FUkFCTEVdID09PSBmYWxzZSA/IGZhbHNlIDogdHJ1ZSxcbiAgICBjb25maWd1cmFibGU6IGZyb21bX19DT05GSUdVUkFCTEVdID8gdHJ1ZSA6IGZhbHNlLFxuICAgIHdyaXRhYmxlOiBmcm9tW19fV1JJVEFCTEVdID09PSBmYWxzZSA/IGZhbHNlIDogdHJ1ZSxcbiAgICBkaXNwbGF5TmFtZTogZnJvbVtfX0RJU1BMQVlOQU1FXSxcbiAgICBnZXR0ZXI6IGZyb21bX19HRVRdLFxuICAgIHNldHRlcjogZnJvbVtfX1NFVF1cbiAgfTtcblxuICB2YXIgdHlwZSA9IGRlZi50eXBlO1xuXG4gIC8vIFNpbXBsZSAnQ29uc3RydWN0b3InIFR5cGVcbiAgaWYgKHV0aWwuaXNTaW1wbGVDb25zdHJ1Y3Rvcih0eXBlKSkge1xuXG4gICAgZGVmLmlzU2ltcGxlID0gdHJ1ZTtcblxuICAgIGRlZi5jYXN0ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHJldHVybiB1dGlsLmNhc3QodmFsdWUsIHR5cGUpO1xuICAgIH07XG5cbiAgfSBlbHNlIGlmICh1dGlsLmlzU3VwZXJtb2RlbENvbnN0cnVjdG9yKHR5cGUpKSB7XG5cbiAgICBkZWYuaXNSZWZlcmVuY2UgPSB0cnVlO1xuICB9IGVsc2UgaWYgKGRlZi52YWx1ZSkge1xuICAgIC8vIElmIGEgdmFsdWUgaXMgcHJlc2VudCwgdXNlIFxuICAgIC8vIHRoYXQgYW5kIHNob3J0LWNpcmN1aXQgdGhlIHJlc3RcbiAgICBkZWYuaXNTaW1wbGUgPSB0cnVlO1xuXG4gIH0gZWxzZSB7XG5cbiAgICAvLyBPdGhlcndpc2UgbG9vayBmb3Igb3RoZXIgbm9uLXNwZWNpYWxcbiAgICAvLyBrZXlzIGFuZCBhbHNvIGFueSBpdGVtIGRlZmluaXRpb25cbiAgICAvLyBpbiB0aGUgY2FzZSBvZiBBcnJheXNcblxuICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMoZnJvbSk7XG4gICAgdmFyIGNoaWxkS2V5cyA9IGtleXMuZmlsdGVyKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgIHJldHVybiBfX1NQRUNJQUxfUFJPUFMuaW5kZXhPZihpdGVtKSA9PT0gLTE7XG4gICAgfSk7XG5cbiAgICBpZiAoY2hpbGRLZXlzLmxlbmd0aCkge1xuXG4gICAgICB2YXIgZGVmcyA9IHt9O1xuICAgICAgdmFyIHByb3RvO1xuXG4gICAgICBjaGlsZEtleXMuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgdmFyIHZhbHVlID0gZnJvbVtrZXldO1xuICAgICAgICBpZiAoIXV0aWwuaXNDb25zdHJ1Y3Rvcih2YWx1ZSkgJiYgIXV0aWwuaXNTdXBlcm1vZGVsQ29uc3RydWN0b3IodmFsdWUpICYmIHV0aWwuaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICAgICAgICBpZiAoIXByb3RvKSB7XG4gICAgICAgICAgICBwcm90byA9IHt9O1xuICAgICAgICAgIH1cbiAgICAgICAgICBwcm90b1trZXldID0gdmFsdWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZGVmc1trZXldID0gY3JlYXRlRGVmKHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIGRlZi5kZWZzID0gZGVmcztcbiAgICAgIGRlZi5wcm90byA9IHByb3RvO1xuXG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgZm9yIEFycmF5XG4gICAgaWYgKHR5cGUgPT09IEFycmF5IHx8IHV0aWwuaXNBcnJheSh0eXBlKSkge1xuXG4gICAgICBkZWYuaXNBcnJheSA9IHRydWU7XG5cbiAgICAgIGlmICh0eXBlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgZGVmLmRlZiA9IGNyZWF0ZURlZih0eXBlWzBdKTtcbiAgICAgIH1cblxuICAgIH0gZWxzZSBpZiAoY2hpbGRLZXlzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgZGVmLmlzU2ltcGxlID0gdHJ1ZTtcbiAgICB9XG5cbiAgfVxuXG4gIGRlZi5jcmVhdGUgPSBjcmVhdGVXcmFwcGVyRmFjdG9yeShkZWYpO1xuXG4gIHJldHVybiBkZWY7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gY3JlYXRlRGVmO1xuIiwidmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcbnZhciBjcmVhdGVNb2RlbFByb3RvdHlwZSA9IHJlcXVpcmUoJy4vcHJvdG8nKTtcbnZhciBXcmFwcGVyID0gcmVxdWlyZSgnLi93cmFwcGVyJyk7XG5cbmZ1bmN0aW9uIGNyZWF0ZU1vZGVsRGVzY3JpcHRvcnMoZGVmLCBwYXJlbnQpIHtcblxuICB2YXIgX18gPSB7fTtcblxuICB2YXIgZGVzYyA9IHtcbiAgICBfXzoge1xuICAgICAgdmFsdWU6IF9fXG4gICAgfSxcbiAgICBfX2RlZjoge1xuICAgICAgdmFsdWU6IGRlZlxuICAgIH0sXG4gICAgX19wYXJlbnQ6IHtcbiAgICAgIHZhbHVlOiBwYXJlbnQsXG4gICAgICB3cml0YWJsZTogdHJ1ZVxuICAgIH0sXG4gICAgX19jYWxsYmFja3M6IHtcbiAgICAgIHZhbHVlOiB7fVxuICAgIH1cbiAgfTtcblxuICByZXR1cm4gZGVzYztcbn1cblxuZnVuY3Rpb24gZGVmaW5lUHJvcGVydGllcyhtb2RlbCkge1xuICB2YXIgZGVmcyA9IG1vZGVsLl9fZGVmLmRlZnM7XG4gIGZvciAodmFyIGtleSBpbiBkZWZzKSB7XG4gICAgZGVmaW5lUHJvcGVydHkobW9kZWwsIGtleSwgZGVmc1trZXldKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBkZWZpbmVQcm9wZXJ0eShtb2RlbCwga2V5LCBkZWYpIHtcblxuICB2YXIgZGVzYyA9IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuX19nZXQoa2V5KTtcbiAgICB9LFxuICAgIGVudW1lcmFibGU6IGRlZi5lbnVtZXJhYmxlLFxuICAgIGNvbmZpZ3VyYWJsZTogZGVmLmNvbmZpZ3VyYWJsZVxuICB9O1xuXG4gIGlmIChkZWYud3JpdGFibGUpIHtcbiAgICBkZXNjLnNldCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICB0aGlzLl9fc2V0Tm90aWZ5Q2hhbmdlKGtleSwgdmFsdWUpO1xuICAgIH07XG4gIH1cblxuICBPYmplY3QuZGVmaW5lUHJvcGVydHkobW9kZWwsIGtleSwgZGVzYyk7XG5cbiAgLy8gU2lsZW50bHkgaW5pdGlhbGl6ZSB0aGUgcHJvcGVydHkgdmFsdWVcbiAgbW9kZWwuX19ba2V5XSA9IGRlZi5jcmVhdGUobW9kZWwpO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVXcmFwcGVyRmFjdG9yeShkZWYpIHtcblxuICB2YXIgd3JhcHBlciwgZGVmYXVsdFZhbHVlLCBhc3NlcnQ7XG5cbiAgaWYgKGRlZi5pc1NpbXBsZSkge1xuICAgIHdyYXBwZXIgPSBuZXcgV3JhcHBlcihkZWYudmFsdWUsIGRlZi53cml0YWJsZSwgZGVmLnZhbGlkYXRvcnMsIGRlZi5jYXN0LCBudWxsKTtcbiAgfSBlbHNlIGlmIChkZWYuaXNSZWZlcmVuY2UpIHtcblxuICAgIC8vIEhvbGQgYSByZWZlcmVuY2UgdG8gdGhlIFxuICAgIC8vIHJlZmVyZXJlbmNlZCB0eXBlcycgZGVmaW5pdGlvblxuICAgIHZhciByZWZEZWYgPSBkZWYudHlwZS5kZWY7XG5cbiAgICBpZiAocmVmRGVmLmlzU2ltcGxlKSB7XG4gICAgICAvLyBJZiB0aGUgcmVmZXJlbmNlZCB0eXBlIGlzIGl0c2VsZiBzaW1wbGUsIFxuICAgICAgLy8gd2UgY2FuIHNldCBqdXN0IHJldHVybiBhIHdyYXBwZXIgYW5kXG4gICAgICAvLyB0aGUgcHJvcGVydHkgd2lsbCBnZXQgaW5pdGlhbGl6ZWQuXG4gICAgICB3cmFwcGVyID0gbmV3IFdyYXBwZXIocmVmRGVmLnZhbHVlLCByZWZEZWYud3JpdGFibGUsIHJlZkRlZi52YWxpZGF0b3JzLCByZWZEZWYuY2FzdCwgbnVsbCk7XG4gICAgfSBlbHNlIHtcblxuICAgICAgLy8gSWYgd2UncmUgbm90IGRlYWxpbmcgd2l0aCBhIHNpbXBsZSByZWZlcmVuY2UgbW9kZWxcbiAgICAgIC8vIHdlIG5lZWQgdG8gZGVmaW5lIGFuIGFzc2VydGlvbiB0aGF0IHRoZSBpbnN0YW5jZVxuICAgICAgLy8gYmVpbmcgc2V0IGlzIG9mIHRoZSBjb3JyZWN0IHR5cGUuIFdlIGRvIHRoaXMgYmUgXG4gICAgICAvLyBjb21wYXJpbmcgdGhlIGRlZnMuXG5cbiAgICAgIGFzc2VydCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIC8vIGNvbXBhcmUgdGhlIGRlZmludGlvbnMgb2YgdGhlIHZhbHVlIGluc3RhbmNlXG4gICAgICAgIC8vIGJlaW5nIHBhc3NlZCBhbmQgdGhlIGRlZiBwcm9wZXJ0eSBhdHRhY2hlZFxuICAgICAgICAvLyB0byB0aGUgdHlwZSBTdXBlcm1vZGVsQ29uc3RydWN0b3IuIEFsbG93IHRoZVxuICAgICAgICAvLyB2YWx1ZSB0byBiZSB1bmRlZmluZWQgb3IgbnVsbCBhbHNvLlxuICAgICAgICB2YXIgaXNDb3JyZWN0VHlwZSA9IGZhbHNlO1xuXG4gICAgICAgIGlmICh1dGlsLmlzTnVsbE9yVW5kZWZpbmVkKHZhbHVlKSkge1xuICAgICAgICAgIGlzQ29ycmVjdFR5cGUgPSB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlzQ29ycmVjdFR5cGUgPSByZWZEZWYgPT09IHZhbHVlLl9fZGVmO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFpc0NvcnJlY3RUeXBlKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdWYWx1ZSBzaG91bGQgYmUgYW4gaW5zdGFuY2Ugb2YgdGhlIHJlZmVyZW5jZWQgbW9kZWwsIG51bGwgb3IgdW5kZWZpbmVkJyk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIHdyYXBwZXIgPSBuZXcgV3JhcHBlcihkZWYudmFsdWUsIGRlZi53cml0YWJsZSwgZGVmLnZhbGlkYXRvcnMsIG51bGwsIGFzc2VydCk7XG5cbiAgICB9XG5cbiAgfSBlbHNlIGlmIChkZWYuaXNBcnJheSkge1xuXG4gICAgZGVmYXVsdFZhbHVlID0gZnVuY3Rpb24ocGFyZW50KSB7XG4gICAgICAvLyBmb3IgQXJyYXlzLCB3ZSBjcmVhdGUgYSBuZXcgQXJyYXkgYW5kIGVhY2hcbiAgICAgIC8vIHRpbWUsIG1peGluZyB0aGUgbW9kZWwgcHJvcGVydGllcyBpbnRvIGl0XG4gICAgICB2YXIgbW9kZWwgPSBjcmVhdGVNb2RlbFByb3RvdHlwZShkZWYpO1xuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXMobW9kZWwsIGNyZWF0ZU1vZGVsRGVzY3JpcHRvcnMoZGVmLCBwYXJlbnQpKTtcbiAgICAgIGRlZmluZVByb3BlcnRpZXMobW9kZWwpO1xuICAgICAgcmV0dXJuIG1vZGVsO1xuICAgIH07XG5cbiAgICBhc3NlcnQgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgLy8gdG9kbzogZnVydGhlciBhcnJheSB0eXBlIHZhbGlkYXRpb25cbiAgICAgIGlmICghdXRpbC5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1ZhbHVlIHNob3VsZCBiZSBhbiBhcnJheScpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICB3cmFwcGVyID0gbmV3IFdyYXBwZXIoZGVmYXVsdFZhbHVlLCBkZWYud3JpdGFibGUsIGRlZi52YWxpZGF0b3JzLCBudWxsLCBhc3NlcnQpO1xuXG4gIH0gZWxzZSB7XG5cbiAgICAvLyBmb3IgT2JqZWN0cywgd2UgY2FuIGNyZWF0ZSBhbmQgcmV1c2UgXG4gICAgLy8gYSBwcm90b3R5cGUgb2JqZWN0LiBXZSB0aGVuIG5lZWQgdG8gb25seVxuICAgIC8vIGRlZmluZSB0aGUgZGVmcyBhbmQgdGhlIGBydW50aW1lYCBwcm9wZXJ0aWVzXG4gICAgLy8gZS5nLiBfXywgcGFyZW50IGV0Yy5cbiAgICB2YXIgcHJvdG8gPSBjcmVhdGVNb2RlbFByb3RvdHlwZShkZWYpO1xuXG4gICAgZGVmYXVsdFZhbHVlID0gZnVuY3Rpb24ocGFyZW50KSB7XG4gICAgICB2YXIgbW9kZWwgPSBPYmplY3QuY3JlYXRlKHByb3RvLCBjcmVhdGVNb2RlbERlc2NyaXB0b3JzKGRlZiwgcGFyZW50KSk7XG4gICAgICBkZWZpbmVQcm9wZXJ0aWVzKG1vZGVsKTtcbiAgICAgIHJldHVybiBtb2RlbDtcbiAgICB9O1xuXG4gICAgYXNzZXJ0ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIGlmICghcHJvdG8uaXNQcm90b3R5cGVPZih2YWx1ZSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIHByb3RvdHlwZScpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICB3cmFwcGVyID0gbmV3IFdyYXBwZXIoZGVmYXVsdFZhbHVlLCBkZWYud3JpdGFibGUsIGRlZi52YWxpZGF0b3JzLCBudWxsLCBhc3NlcnQpO1xuICB9XG5cbiAgdmFyIGZhY3RvcnkgPSBmdW5jdGlvbihwYXJlbnQpIHtcbiAgICB2YXIgdyA9IE9iamVjdC5jcmVhdGUod3JhcHBlcik7XG4gICAgaWYgKCF3LmlzSW5pdGlhbGl6ZWQpIHtcbiAgICAgIHcuaW5pdGlhbGl6ZShwYXJlbnQpO1xuICAgIH1cbiAgICByZXR1cm4gdztcbiAgfTtcblxuICAvLyBleHBvc2UgdGhlIHdyYXBwZXIsIHRoaXMgaXMgdXNlZnVsIFxuICAvLyBmb3IgdmFsaWRhdGluZyBhcnJheSBpdGVtcyBsYXRlclxuICBmYWN0b3J5LndyYXBwZXIgPSB3cmFwcGVyO1xuXG4gIHJldHVybiBmYWN0b3J5O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNyZWF0ZVdyYXBwZXJGYWN0b3J5O1xuIiwidmFyIEVtaXR0ZXJFdmVudCA9IHJlcXVpcmUoJ2VtaXR0ZXItZXZlbnQnKTtcbnZhciBWYWxpZGF0aW9uRXJyb3IgPSByZXF1aXJlKCcuL3ZhbGlkYXRpb24tZXJyb3InKTtcbnZhciBXcmFwcGVyID0gcmVxdWlyZSgnLi93cmFwcGVyJyk7XG5cbnZhciBkZXNjcmlwdG9ycyA9IHtcbiAgX19zdXBlcm1vZGVsOiB7XG4gICAgdmFsdWU6IHRydWVcbiAgfSxcbiAgX19rZXlzOiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXModGhpcyk7XG5cbiAgICAgIGlmIChBcnJheS5pc0FycmF5KHRoaXMpKSB7XG4gICAgICAgIHZhciBvbWl0ID0gW1xuICAgICAgICAgICdhZGRFdmVudExpc3RlbmVyJywgJ29uJywgJ29uY2UnLCAncmVtb3ZlRXZlbnRMaXN0ZW5lcicsICdyZW1vdmVBbGxMaXN0ZW5lcnMnLFxuICAgICAgICAgICdyZW1vdmVMaXN0ZW5lcicsICdvZmYnLCAnZW1pdCcsICdsaXN0ZW5lcnMnLCAnaGFzTGlzdGVuZXJzJywgJ3BvcCcsICdwdXNoJyxcbiAgICAgICAgICAncmV2ZXJzZScsICdzaGlmdCcsICdzb3J0JywgJ3NwbGljZScsICd1cGRhdGUnLCAndW5zaGlmdCcsICdjcmVhdGUnLFxuICAgICAgICAgICdfX3NldE5vdGlmeUNoYW5nZScsICdfX25vdGlmeUNoYW5nZScsICdfX3NldCcsICdfX2dldCdcbiAgICAgICAgXTtcblxuICAgICAgICBrZXlzID0ga2V5cy5maWx0ZXIoZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICAgIHJldHVybiBvbWl0LmluZGV4T2YoaXRlbSkgPCAwO1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGtleXM7XG4gICAgfVxuICB9LFxuICBfX25hbWU6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKHRoaXMuX19pc1Jvb3QpIHtcbiAgICAgICAgcmV0dXJuICcnO1xuICAgICAgfVxuXG4gICAgICAvLyBXb3JrIG91dCB0aGUgJ25hbWUnIG9mIHRoZSBtb2RlbFxuICAgICAgLy8gTG9vayB1cCB0byB0aGUgcGFyZW50IGFuZCBsb29wIHRocm91Z2ggaXQncyBrZXlzLFxuICAgICAgLy8gQW55IHZhbHVlIG9yIGFycmF5IGZvdW5kIHRvIGNvbnRhaW4gdGhlIHZhbHVlIG9mIHRoaXMgKHRoaXMgbW9kZWwpXG4gICAgICAvLyB0aGVuIHdlIHJldHVybiB0aGUga2V5IGFuZCBpbmRleCBpbiB0aGUgY2FzZSB3ZSBmb3VuZCB0aGUgbW9kZWwgaW4gYW4gYXJyYXkuXG4gICAgICB2YXIgcGFyZW50S2V5cyA9IHRoaXMuX19wYXJlbnQuX19rZXlzO1xuICAgICAgdmFyIHBhcmVudEtleSwgcGFyZW50VmFsdWUsIGlzQXJyYXk7XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGFyZW50S2V5cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBwYXJlbnRLZXkgPSBwYXJlbnRLZXlzW2ldO1xuICAgICAgICBwYXJlbnRWYWx1ZSA9IHRoaXMuX19wYXJlbnRbcGFyZW50S2V5XTtcbiAgICAgICAgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkocGFyZW50VmFsdWUpO1xuXG4gICAgICAgIGlmIChwYXJlbnRWYWx1ZSA9PT0gdGhpcykge1xuICAgICAgICAgIHJldHVybiBwYXJlbnRLZXk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIF9fcGF0aDoge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICBpZiAodGhpcy5fX2hhc0FuY2VzdG9ycyAmJiAhdGhpcy5fX3BhcmVudC5fX2lzUm9vdCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fX3BhcmVudC5fX3BhdGggKyAnLicgKyB0aGlzLl9fbmFtZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9fbmFtZTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIF9faXNSb290OiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiAhdGhpcy5fX2hhc0FuY2VzdG9ycztcbiAgICB9XG4gIH0sXG4gIF9fY2hpbGRyZW46IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGNoaWxkcmVuID0gW107XG5cbiAgICAgIHZhciBrZXlzID0gdGhpcy5fX2tleXM7XG4gICAgICB2YXIga2V5LCB2YWx1ZTtcblxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XG5cbiAgICAgICAga2V5ID0ga2V5c1tpXTtcbiAgICAgICAgdmFsdWUgPSB0aGlzW2tleV07XG5cbiAgICAgICAgaWYgKHZhbHVlICYmIHZhbHVlLl9fc3VwZXJtb2RlbCkge1xuXG4gICAgICAgICAgY2hpbGRyZW4ucHVzaCh2YWx1ZSk7XG5cbiAgICAgICAgfVxuICAgICAgfVxuXG4gICAgICByZXR1cm4gY2hpbGRyZW47XG4gICAgfVxuICB9LFxuICBfX2FuY2VzdG9yczoge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgYW5jZXN0b3JzID0gW10sXG4gICAgICAgIHIgPSB0aGlzO1xuXG4gICAgICB3aGlsZSAoci5fX3BhcmVudCkge1xuICAgICAgICBhbmNlc3RvcnMucHVzaChyLl9fcGFyZW50KTtcbiAgICAgICAgciA9IHIuX19wYXJlbnQ7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBhbmNlc3RvcnM7XG4gICAgfVxuICB9LFxuICBfX2Rlc2NlbmRhbnRzOiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBkZXNjZW5kYW50cyA9IFtdO1xuXG4gICAgICBmdW5jdGlvbiBjaGVja0FuZEFkZERlc2NlbmRhbnRJZk1vZGVsKG9iaikge1xuXG4gICAgICAgIHZhciBrZXlzID0gb2JqLl9fa2V5cztcbiAgICAgICAgdmFyIGtleSwgdmFsdWU7XG5cbiAgICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XG5cbiAgICAgICAgICBrZXkgPSBrZXlzW2ldO1xuICAgICAgICAgIHZhbHVlID0gb2JqW2tleV07XG5cbiAgICAgICAgICBpZiAodmFsdWUgJiYgdmFsdWUuX19zdXBlcm1vZGVsKSB7XG5cbiAgICAgICAgICAgIGRlc2NlbmRhbnRzLnB1c2godmFsdWUpO1xuICAgICAgICAgICAgY2hlY2tBbmRBZGREZXNjZW5kYW50SWZNb2RlbCh2YWx1ZSk7XG5cbiAgICAgICAgICB9XG4gICAgICAgIH1cblxuICAgICAgfVxuXG4gICAgICBjaGVja0FuZEFkZERlc2NlbmRhbnRJZk1vZGVsKHRoaXMpO1xuXG4gICAgICByZXR1cm4gZGVzY2VuZGFudHM7XG4gICAgfVxuICB9LFxuICBfX2hhc0FuY2VzdG9yczoge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gISF0aGlzLl9fYW5jZXN0b3JzLmxlbmd0aDtcbiAgICB9XG4gIH0sXG4gIF9faGFzRGVjZW5kYW50czoge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gISF0aGlzLl9fZGVzY2VuZGFudHMubGVuZ3RoO1xuICAgIH1cbiAgfSxcbiAgZXJyb3JzOiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBlcnJvcnMgPSBbXSxcbiAgICAgICAgZGVmID0gdGhpcy5fX2RlZjtcbiAgICAgIHZhciB2YWxpZGF0b3IsIGVycm9yLCBpLCBqO1xuXG4gICAgICAvLyBSdW4gb3duIHZhbGlkYXRvcnNcbiAgICAgIHZhciBvd24gPSBkZWYudmFsaWRhdG9ycy5zbGljZSgwKTtcbiAgICAgIGZvciAoaSA9IDA7IGkgPCBvd24ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFsaWRhdG9yID0gb3duW2ldO1xuICAgICAgICBlcnJvciA9IHZhbGlkYXRvci5jYWxsKHRoaXMsIHRoaXMpO1xuXG4gICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgIGVycm9ycy5wdXNoKG5ldyBWYWxpZGF0aW9uRXJyb3IodGhpcywgZXJyb3IsIHZhbGlkYXRvcikpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIFJ1biB0aHJvdWdoIGtleXMgYW5kIGV2YWx1YXRlIHZhbGlkYXRvcnNcbiAgICAgIHZhciBrZXlzID0gdGhpcy5fX2tleXM7XG4gICAgICB2YXIgdmFsdWUsIGtleSwgaXRlbURlZjtcblxuICAgICAgZm9yIChpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcblxuICAgICAgICBrZXkgPSBrZXlzW2ldO1xuXG4gICAgICAgIC8vIElmIHdlIGFyZSBhbiBBcnJheSB3aXRoIGFuIGl0ZW0gZGVmaW5pdGlvblxuICAgICAgICAvLyB0aGVuIHdlIGhhdmUgdG8gbG9vayBpbnRvIHRoZSBBcnJheSBmb3Igb3VyIHZhbHVlXG4gICAgICAgIC8vIGFuZCBhbHNvIGdldCBob2xkIG9mIHRoZSB3cmFwcGVyLiBXZSBvbmx5IG5lZWQgdG8gXG4gICAgICAgIC8vIGRvIHRoaXMgaWYgdGhlIGtleSBpcyBub3QgYSBwcm9wZXJ0eSBvZiB0aGUgYXJyYXkuXG4gICAgICAgIC8vIFdlIGNoZWNrIHRoZSBkZWZzIHRvIHdvcmsgdGhpcyBvdXQgKGkuZS4gMCwgMSwgMikuXG4gICAgICAgIC8vIHRvZG86IFRoaXMgY291bGQgYmUgYmV0dGVyIHRvIGNoZWNrICFOYU4gb24gdGhlIGtleT9cbiAgICAgICAgaWYgKGRlZi5pc0FycmF5ICYmIGRlZi5kZWYgJiYgKCFkZWYuZGVmcyB8fCAhKGtleSBpbiBkZWYuZGVmcykpKSB7XG5cbiAgICAgICAgICAvLyBJZiB3ZSBhcmUgYW4gQXJyYXkgd2l0aCBhIHNpbXBsZSBpdGVtIGRlZmluaXRpb24gXG4gICAgICAgICAgLy8gb3IgYSByZWZlcmVuY2UgdG8gYSBzaW1wbGUgdHlwZSBkZWZpbml0aW9uXG4gICAgICAgICAgLy8gc3Vic3RpdHV0ZSB0aGUgdmFsdWUgd2l0aCB0aGUgd3JhcHBlciB3ZSBnZXQgZnJvbSB0aGVcbiAgICAgICAgICAvLyBjcmVhdGUgZmFjdG9yeSBmdW5jdGlvbi4gT3RoZXJ3aXNlIHNldCB0aGUgdmFsdWUgdG8gXG4gICAgICAgICAgLy8gdGhlIHJlYWwgdmFsdWUgb2YgdGhlIHByb3BlcnR5LlxuICAgICAgICAgIGl0ZW1EZWYgPSBkZWYuZGVmO1xuXG4gICAgICAgICAgaWYgKGl0ZW1EZWYuaXNTaW1wbGUpIHtcbiAgICAgICAgICAgIHZhbHVlID0gaXRlbURlZi5jcmVhdGUud3JhcHBlcjtcbiAgICAgICAgICAgIHZhbHVlLnZhbHVlID0gdGhpc1trZXldO1xuICAgICAgICAgIH0gZWxzZSBpZiAoaXRlbURlZi5pc1JlZmVyZW5jZSAmJiBpdGVtRGVmLnR5cGUuZGVmLmlzU2ltcGxlKSB7XG4gICAgICAgICAgICB2YWx1ZSA9IGl0ZW1EZWYudHlwZS5kZWYuY3JlYXRlLndyYXBwZXI7XG4gICAgICAgICAgICB2YWx1ZS52YWx1ZSA9IHRoaXNba2V5XTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFsdWUgPSB0aGlzW2tleV07XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuXG4gICAgICAgICAgLy8gU2V0IHRoZSB2YWx1ZSB0byB0aGUgd3JhcHBlZCB2YWx1ZSBvZiB0aGUgcHJvcGVydHlcbiAgICAgICAgICB2YWx1ZSA9IHRoaXMuX19ba2V5XTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh2YWx1ZSkge1xuXG4gICAgICAgICAgaWYgKHZhbHVlLl9fc3VwZXJtb2RlbCkge1xuICAgICAgICAgICAgQXJyYXkucHJvdG90eXBlLnB1c2guYXBwbHkoZXJyb3JzLCB2YWx1ZS5lcnJvcnMpO1xuICAgICAgICAgIH0gZWxzZSBpZiAodmFsdWUgaW5zdGFuY2VvZiBXcmFwcGVyKSB7XG5cbiAgICAgICAgICAgIHZhciB3cmFwcGVyVmFsdWUgPSB2YWx1ZS52YWx1ZTtcbiAgICAgICAgICAgIC8vIGBTaW1wbGVgIHByb3BlcnRpZXMgY2FuIGJlIGlkZW50aWZpZWQgYnkgbm90IGhhdmluZyBhblxuICAgICAgICAgICAgLy8gYXNzZXJ0aW9uLiBUb2RvOiBUaGlzIG1heSBuZWVkIHRvIGJlY29tZSBtb3JlIGV4cGxpY2l0LlxuICAgICAgICAgICAgaWYgKCF2YWx1ZS5fYXNzZXJ0KSB7XG5cbiAgICAgICAgICAgICAgdmFyIHNpbXBsZSA9IHZhbHVlLnZhbGlkYXRvcnM7XG4gICAgICAgICAgICAgIGZvciAoaiA9IDA7IGogPCBzaW1wbGUubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICB2YWxpZGF0b3IgPSBzaW1wbGVbal07XG4gICAgICAgICAgICAgICAgZXJyb3IgPSB2YWxpZGF0b3IuY2FsbCh0aGlzLCB3cmFwcGVyVmFsdWUsIGtleSk7XG5cbiAgICAgICAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgIGVycm9ycy5wdXNoKG5ldyBWYWxpZGF0aW9uRXJyb3IodGhpcywgZXJyb3IsIHZhbGlkYXRvciwga2V5KSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH0gZWxzZSBpZiAod3JhcHBlclZhbHVlICYmIHdyYXBwZXJWYWx1ZS5fX3N1cGVybW9kZWwpIHtcbiAgICAgICAgICAgICAgQXJyYXkucHJvdG90eXBlLnB1c2guYXBwbHkoZXJyb3JzLCB3cmFwcGVyVmFsdWUuZXJyb3JzKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHRocm93ICdqdXN0IGNoZWNraW5nJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gLy8gUnVuIHRocm91Z2ggY2hpbGRyZW4gYW5kIHB1c2ggdGhlaXIgZXJyb3JzXG4gICAgICAvLyB2YXIgY2hpbGRyZW4gPSB0aGlzLl9fY2hpbGRyZW47XG4gICAgICAvLyBmb3IgKGkgPSAwOyBpIDwgY2hpbGRyZW4ubGVuZ3RoOyBpKyspIHtcbiAgICAgIC8vIH1cblxuICAgICAgcmV0dXJuIGVycm9ycztcbiAgICB9XG4gIH1cbn07XG5cbnZhciBwcm90byA9IHtcbiAgX19nZXQ6IGZ1bmN0aW9uKGtleSkge1xuICAgIHJldHVybiB0aGlzLl9fW2tleV0udmFsdWU7XG4gIH0sXG4gIF9fc2V0OiBmdW5jdGlvbihrZXksIHZhbHVlKSB7XG5cbiAgICBpZiAodmFsdWUgJiYgdmFsdWUuX19zdXBlcm1vZGVsKSB7XG4gICAgICBpZiAodmFsdWUuX19wYXJlbnQgIT09IHRoaXMpIHtcbiAgICAgICAgdmFsdWUuX19wYXJlbnQgPSB0aGlzO1xuICAgICAgfVxuICAgIH1cblxuICAgIHRoaXMuX19ba2V5XS52YWx1ZSA9IHZhbHVlO1xuICB9LFxuICBfX25vdGlmeUNoYW5nZTogZnVuY3Rpb24oa2V5LCBuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICAvLyBFbWl0IGNoYW5nZSBldmVudCBhZ2FpbnN0IHRoaXMgbW9kZWxcbiAgICB0aGlzLmVtaXQoJ2NoYW5nZScsIG5ldyBFbWl0dGVyRXZlbnQoJ2NoYW5nZScsIHRoaXMsIHtcbiAgICAgIG5hbWU6IGtleSxcbiAgICAgIHZhbHVlOiBuZXdWYWx1ZSxcbiAgICAgIG9sZFZhbHVlOiBvbGRWYWx1ZVxuICAgIH0pKTtcblxuICAgIC8vIEVtaXQgc3BlY2lmaWMga2V5IGNoYW5nZSBldmVudCBhZ2FpbnN0IHRoaXMgbW9kZWxcbiAgICB0aGlzLmVtaXQoJ2NoYW5nZTonICsga2V5LCBuZXcgRW1pdHRlckV2ZW50KCdjaGFuZ2U6JyArIGtleSwgdGhpcywge1xuICAgICAgdmFsdWU6IG5ld1ZhbHVlLFxuICAgICAgb2xkVmFsdWU6IG9sZFZhbHVlXG4gICAgfSkpO1xuXG4gICAgLy8gQnViYmxlIHRoZSBjaGFuZ2UgZXZlbnQgdXAgYWdhaW5zdCB0aGUgYW5jZXN0b3JzXG4gICAgdmFyIG5hbWU7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCB0aGlzLl9fYW5jZXN0b3JzLmxlbmd0aDsgaSsrKSB7XG5cbiAgICAgIG5hbWUgPSB0aGlzLl9fcGF0aCArICcuJyArIGtleTtcblxuICAgICAgLy8gRW1pdCBjaGFuZ2UgZXZlbnQgYWdhaW5zdCB0aGlzIGFuY2VzdG9yXG4gICAgICB0aGlzLl9fYW5jZXN0b3JzW2ldLmVtaXQoJ2NoYW5nZScsIG5ldyBFbWl0dGVyRXZlbnQoJ2NoYW5nZScsIHRoaXMsIHtcbiAgICAgICAgbmFtZTogbmFtZSxcbiAgICAgICAgdmFsdWU6IG5ld1ZhbHVlLFxuICAgICAgICBvbGRWYWx1ZTogb2xkVmFsdWVcbiAgICAgIH0pKTtcblxuICAgICAgLy8gRW1pdCBzcGVjaWZpYyBjaGFuZ2UgZXZlbnQgYWdhaW5zdCB0aGlzIGFuY2VzdG9yXG4gICAgICB0aGlzLl9fYW5jZXN0b3JzW2ldLmVtaXQoJ2NoYW5nZTonICsgbmFtZSwgbmV3IEVtaXR0ZXJFdmVudCgnY2hhbmdlOicgKyBuYW1lLCB0aGlzLCB7XG4gICAgICAgIG5hbWU6IG5hbWUsXG4gICAgICAgIHZhbHVlOiBuZXdWYWx1ZSxcbiAgICAgICAgb2xkVmFsdWU6IG9sZFZhbHVlXG4gICAgICB9KSk7XG4gICAgfVxuICB9LFxuICBfX3NldE5vdGlmeUNoYW5nZTogZnVuY3Rpb24oa2V5LCB2YWx1ZSkge1xuICAgIHZhciBvbGRWYWx1ZSA9IHRoaXMuX19nZXQoa2V5KTtcbiAgICB0aGlzLl9fc2V0KGtleSwgdmFsdWUpO1xuICAgIHZhciBuZXdWYWx1ZSA9IHRoaXMuX19nZXQoa2V5KTtcbiAgICB0aGlzLl9fbm90aWZ5Q2hhbmdlKGtleSwgbmV3VmFsdWUsIG9sZFZhbHVlKTtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIHByb3RvOiBwcm90byxcbiAgZGVzY3JpcHRvcnM6IGRlc2NyaXB0b3JzLFxufTtcbiIsInZhciBlbWl0dGVyID0gcmVxdWlyZSgnZW1pdHRlci1vYmplY3QnKTtcbnZhciBlbWl0dGVyQXJyYXkgPSByZXF1aXJlKCdlbWl0dGVyLWFycmF5Jyk7XG5cbnZhciBleHRlbmQgPSByZXF1aXJlKCcuL3V0aWwnKS5leHRlbmQ7XG52YXIgbW9kZWxQcm90byA9IHJlcXVpcmUoJy4vbW9kZWwnKS5wcm90bztcbnZhciBtb2RlbERlc2NyaXB0b3JzID0gcmVxdWlyZSgnLi9tb2RlbCcpLmRlc2NyaXB0b3JzO1xuXG52YXIgbW9kZWxQcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKG1vZGVsUHJvdG8sIG1vZGVsRGVzY3JpcHRvcnMpO1xudmFyIG9iamVjdFByb3RvdHlwZSA9IChmdW5jdGlvbigpIHtcblxuICB2YXIgcCA9IE9iamVjdC5jcmVhdGUobW9kZWxQcm90b3R5cGUpO1xuXG4gIC8vZW1pdHRlcihwKTtcblxuICByZXR1cm4gcDtcbn0pKCk7XG5cblxuZnVuY3Rpb24gY3JlYXRlQXJyYXlQcm90b3R5cGUoKSB7XG5cbiAgdmFyIHAgPSBlbWl0dGVyQXJyYXkoZnVuY3Rpb24obmFtZSwgYXJyLCBlKSB7XG4gICAgaWYgKG5hbWUgPT09ICd1cGRhdGUnKSB7XG4gICAgICBhcnIuX19ub3RpZnlDaGFuZ2UoZS5pbmRleCwgZS52YWx1ZSwgZS5vbGRWYWx1ZSk7XG4gICAgfSBlbHNlIHtcblxuICAgIH1cbiAgfSk7XG5cbiAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXMocCwgbW9kZWxEZXNjcmlwdG9ycyk7XG5cbiAgZW1pdHRlcihwKTtcblxuICBleHRlbmQocCwgbW9kZWxQcm90byk7XG5cbiAgcmV0dXJuIHA7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZU9iamVjdE1vZGVsUHJvdG90eXBlKHByb3RvKSB7XG4gIHZhciBwID0gT2JqZWN0LmNyZWF0ZShvYmplY3RQcm90b3R5cGUpO1xuXG4gIGVtaXR0ZXIocCk7XG5cbiAgaWYgKHByb3RvKSB7XG4gICAgZXh0ZW5kKHAsIHByb3RvKTtcbiAgfVxuXG4gIHJldHVybiBwO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVBcnJheU1vZGVsUHJvdG90eXBlKHByb3RvLCBpdGVtRGVmKSB7XG5cbiAgLy8gV2UgZG8gbm90IHRvIGF0dGVtcHQgdG8gc3ViY2xhc3MgQXJyYXksXG4gIC8vIGluc3RlYWQgY3JlYXRlIGEgbmV3IGluc3RhbmNlIGVhY2ggdGltZS5cbiAgdmFyIHAgPSBjcmVhdGVBcnJheVByb3RvdHlwZSgpO1xuXG4gIGlmIChwcm90bykge1xuICAgIGV4dGVuZChwLCBwcm90byk7XG4gIH1cblxuICBpZiAoaXRlbURlZikge1xuXG4gICAgLy8gV2UgaGF2ZSBhIGRlZmluaXRpb24gZm9yIHRoZSBpdGVtcyBcbiAgICAvLyB0aGF0IGJlbG9uZyBpbiB0aGlzIGFycmF5LlxuXG4gICAgLy8gVXNlIHRoZSBgd3JhcHBlcmAgcHJvdG90eXBlIHByb3BlcnR5IGFzIGEgXG4gICAgLy8gdmlydHVhbCBXcmFwcGVyIG9iamVjdCB3ZSBjYW4gdXNlIFxuICAgIC8vIHZhbGlkYXRlIHRoZSBpdGVtcyBpbiB0aGUgYXJyYXkuXG4gICAgdmFyIGFyckl0ZW1XcmFwcGVyID0gaXRlbURlZi5jcmVhdGUud3JhcHBlcjtcblxuICAgIC8vIFZhbGlkYXRlIG5ldyBtb2RlbHMgYnkgb3ZlcnJpZGluZyB0aGUgZW1pdHRlciBhcnJheSBcbiAgICAvLyBtdXRhdG9ycyB0aGF0IGNhbiBjYXVzZSBuZXcgaXRlbXMgdG8gZW50ZXIgdGhlIGFycmF5LlxuICAgIG92ZXJyaWRlQXJyYXlBZGRpbmdNdXRhdG9ycyhwLCBhcnJJdGVtV3JhcHBlcik7XG5cbiAgICAvLyBQcm92aWRlIGEgY29udmVuaWVudCBtb2RlbCBmYWN0b3J5IFxuICAgIC8vIGZvciBjcmVhdGluZyBhcnJheSBpdGVtIGluc3RhbmNlc1xuICAgIC8vIGlmIHRoZSByaWdodCBjb25kaXRpb25zIGFyZSBtZXQuXG4gICAgaWYgKCFpdGVtRGVmLmlzU2ltcGxlICYmICFpdGVtRGVmLmlzUmVmZXJlbmNlKSB7XG4gICAgICBwLmNyZWF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgICByZXR1cm4gaXRlbURlZi5jcmVhdGUodGhpcykudmFsdWU7XG4gICAgICB9O1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiBwO1xufVxuXG5mdW5jdGlvbiB3cmFwQXJyYXlJdGVtcyhpdGVtV3JhcHBlciwgaXRlbXMpIHtcbiAgdmFyIGFyZ3MgPSBbXTtcbiAgZm9yICh2YXIgaSA9IDA7IGkgPCBpdGVtcy5sZW5ndGg7IGkrKykge1xuICAgIGl0ZW1XcmFwcGVyLnZhbHVlID0gaXRlbXNbaV07XG4gICAgYXJncy5wdXNoKGl0ZW1XcmFwcGVyLnZhbHVlKTtcbiAgfVxuICByZXR1cm4gYXJncztcbn1cblxuZnVuY3Rpb24gb3ZlcnJpZGVBcnJheUFkZGluZ011dGF0b3JzKGFyciwgaXRlbVdyYXBwZXIpIHtcblxuICB2YXIgcHVzaCA9IGFyci5wdXNoO1xuICB2YXIgdW5zaGlmdCA9IGFyci51bnNoaWZ0O1xuICB2YXIgc3BsaWNlID0gYXJyLnNwbGljZTtcblxuICBpZiAocHVzaCkge1xuICAgIGFyci5wdXNoID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgYXJncyA9IHdyYXBBcnJheUl0ZW1zKGl0ZW1XcmFwcGVyLCBhcmd1bWVudHMpO1xuICAgICAgcmV0dXJuIHB1c2guYXBwbHkoYXJyLCBhcmdzKTtcbiAgICB9O1xuICB9XG5cbiAgaWYgKHVuc2hpZnQpIHtcbiAgICBhcnIudW5zaGlmdCA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGFyZ3MgPSB3cmFwQXJyYXlJdGVtcyhpdGVtV3JhcHBlciwgYXJndW1lbnRzKTtcbiAgICAgIHJldHVybiB1bnNoaWZ0LmFwcGx5KGFyciwgYXJncyk7XG4gICAgfTtcbiAgfVxuXG4gIGlmIChzcGxpY2UpIHtcbiAgICBhcnIuc3BsaWNlID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgYXJncyA9IHdyYXBBcnJheUl0ZW1zKGl0ZW1XcmFwcGVyLCBBcnJheS5wcm90b3R5cGUuc2xpY2UuY2FsbChhcmd1bWVudHMsIDIpKTtcbiAgICAgIGFyZ3MudW5zaGlmdChhcmd1bWVudHNbMV0pO1xuICAgICAgYXJncy51bnNoaWZ0KGFyZ3VtZW50c1swXSk7XG4gICAgICByZXR1cm4gc3BsaWNlLmFwcGx5KGFyciwgYXJncyk7XG4gICAgfTtcbiAgfVxufVxuXG5mdW5jdGlvbiBjcmVhdGVNb2RlbFByb3RvdHlwZShkZWYpIHtcbiAgcmV0dXJuIGRlZi5pc0FycmF5ID8gY3JlYXRlQXJyYXlNb2RlbFByb3RvdHlwZShkZWYucHJvdG8sIGRlZi5kZWYpIDogY3JlYXRlT2JqZWN0TW9kZWxQcm90b3R5cGUoZGVmLnByb3RvKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBjcmVhdGVNb2RlbFByb3RvdHlwZTtcbiIsIm1vZHVsZS5leHBvcnRzID0ge307XG4iLCJ2YXIgU3VwZXJtb2RlbCA9IHJlcXVpcmUoJy4vc3VwZXJtb2RlbCcpO1xuXG5mdW5jdGlvbiBleHRlbmQob3JpZ2luLCBhZGQpIHtcbiAgLy8gRG9uJ3QgZG8gYW55dGhpbmcgaWYgYWRkIGlzbid0IGFuIG9iamVjdFxuICBpZiAoIWFkZCB8fCB0eXBlb2YgYWRkICE9PSAnb2JqZWN0Jykge1xuICAgIHJldHVybiBvcmlnaW47XG4gIH1cblxuICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGFkZCk7XG4gIHZhciBpID0ga2V5cy5sZW5ndGg7XG4gIHdoaWxlIChpLS0pIHtcbiAgICBvcmlnaW5ba2V5c1tpXV0gPSBhZGRba2V5c1tpXV07XG4gIH1cbiAgcmV0dXJuIG9yaWdpbjtcbn1cblxudmFyIHV0aWwgPSB7XG4gIGV4dGVuZDogZXh0ZW5kLFxuICB0eXBlT2Y6IGZ1bmN0aW9uKG9iaikge1xuICAgIHJldHVybiBPYmplY3QucHJvdG90eXBlLnRvU3RyaW5nLmNhbGwob2JqKS5tYXRjaCgvXFxzKFthLXpBLVpdKykvKVsxXS50b0xvd2VyQ2FzZSgpO1xuICB9LFxuICBpc09iamVjdDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gdGhpcy50eXBlT2YodmFsdWUpID09PSAnb2JqZWN0JztcbiAgfSxcbiAgaXNBcnJheTogZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gQXJyYXkuaXNBcnJheSh2YWx1ZSk7XG4gIH0sXG4gIGlzU2ltcGxlOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIC8vICdTaW1wbGUnIGhlcmUgbWVhbnMgYW55dGhpbmcgXG4gICAgLy8gb3RoZXIgdGhhbiBhbiBPYmplY3Qgb3IgYW4gQXJyYXlcbiAgICAvLyBpLmUuIG51bWJlciwgc3RyaW5nLCBkYXRlLCBib29sLCBudWxsLCB1bmRlZmluZWQsIHJlZ2V4Li4uXG4gICAgcmV0dXJuICF0aGlzLmlzT2JqZWN0KHZhbHVlKSAmJiAhdGhpcy5pc0FycmF5KHZhbHVlKTtcbiAgfSxcbiAgaXNGdW5jdGlvbjogZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gdGhpcy50eXBlT2YodmFsdWUpID09PSAnZnVuY3Rpb24nO1xuICB9LFxuICBpc0RhdGU6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuIHRoaXMudHlwZU9mKHZhbHVlKSA9PT0gJ2RhdGUnO1xuICB9LFxuICBpc051bGw6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuIHZhbHVlID09PSBudWxsO1xuICB9LFxuICBpc1VuZGVmaW5lZDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gdHlwZW9mKHZhbHVlKSA9PT0gJ3VuZGVmaW5lZCc7XG4gIH0sXG4gIGlzTnVsbE9yVW5kZWZpbmVkOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJldHVybiB0aGlzLmlzTnVsbCh2YWx1ZSkgfHwgdGhpcy5pc1VuZGVmaW5lZCh2YWx1ZSk7XG4gIH0sXG4gIGNhc3Q6IGZ1bmN0aW9uKHZhbHVlLCB0eXBlKSB7XG4gICAgaWYgKCF0eXBlKSB7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuXG4gICAgc3dpdGNoICh0eXBlKSB7XG4gICAgICBjYXNlIFN0cmluZzpcbiAgICAgICAgcmV0dXJuIHV0aWwuY2FzdFN0cmluZyh2YWx1ZSk7XG4gICAgICBjYXNlIE51bWJlcjpcbiAgICAgICAgcmV0dXJuIHV0aWwuY2FzdE51bWJlcih2YWx1ZSk7XG4gICAgICBjYXNlIEJvb2xlYW46XG4gICAgICAgIHJldHVybiB1dGlsLmNhc3RCb29sZWFuKHZhbHVlKTtcbiAgICAgIGNhc2UgRGF0ZTpcbiAgICAgICAgcmV0dXJuIHV0aWwuY2FzdERhdGUodmFsdWUpO1xuICAgICAgY2FzZSBPYmplY3Q6XG4gICAgICBjYXNlIEZ1bmN0aW9uOlxuICAgICAgICByZXR1cm4gdmFsdWU7XG4gICAgICBkZWZhdWx0OlxuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgY2FzdCcpO1xuICAgIH1cbiAgfSxcbiAgY2FzdFN0cmluZzogZnVuY3Rpb24odmFsdWUpIHtcbiAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gbnVsbCB8fCB1dGlsLnR5cGVPZih2YWx1ZSkgPT09ICdzdHJpbmcnKSB7XG4gICAgICByZXR1cm4gdmFsdWU7XG4gICAgfVxuICAgIHJldHVybiB2YWx1ZS50b1N0cmluZyAmJiB2YWx1ZS50b1N0cmluZygpO1xuICB9LFxuICBjYXN0TnVtYmVyOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIGlmICh2YWx1ZSA9PT0gdW5kZWZpbmVkIHx8IHZhbHVlID09PSBudWxsKSB7XG4gICAgICByZXR1cm4gTmFOO1xuICAgIH1cbiAgICBpZiAodXRpbC50eXBlT2YodmFsdWUpID09PSAnbnVtYmVyJykge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbiAgICByZXR1cm4gTnVtYmVyKHZhbHVlKTtcbiAgfSxcbiAgY2FzdEJvb2xlYW46IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgaWYgKCF2YWx1ZSkge1xuICAgICAgcmV0dXJuIGZhbHNlO1xuICAgIH1cbiAgICB2YXIgZmFsc2V5ID0gWycwJywgJ2ZhbHNlJywgJ29mZicsICdubyddO1xuICAgIHJldHVybiBmYWxzZXkuaW5kZXhPZih2YWx1ZSkgPT09IC0xO1xuICB9LFxuICBjYXN0RGF0ZTogZnVuY3Rpb24odmFsdWUpIHtcbiAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gbnVsbCB8fCB1dGlsLnR5cGVPZih2YWx1ZSkgPT09ICdkYXRlJykge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbiAgICByZXR1cm4gbmV3IERhdGUodmFsdWUpO1xuICB9LFxuICBpc0NvbnN0cnVjdG9yOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJldHVybiB0aGlzLmlzU2ltcGxlQ29uc3RydWN0b3IodmFsdWUpIHx8IFtBcnJheSwgT2JqZWN0XS5pbmRleE9mKHZhbHVlKSA+IC0xO1xuICB9LFxuICBpc1NpbXBsZUNvbnN0cnVjdG9yOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJldHVybiBbU3RyaW5nLCBOdW1iZXIsIERhdGUsIEJvb2xlYW5dLmluZGV4T2YodmFsdWUpID4gLTE7XG4gIH0sXG4gIGlzU3VwZXJtb2RlbENvbnN0cnVjdG9yOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJldHVybiB0aGlzLmlzRnVuY3Rpb24odmFsdWUpICYmIHZhbHVlLnByb3RvdHlwZSA9PT0gU3VwZXJtb2RlbDtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSB1dGlsO1xuIiwiZnVuY3Rpb24gVmFsaWRhdGlvbkVycm9yKHRhcmdldCwgZXJyb3IsIHZhbGlkYXRvciwga2V5KSB7XG4gIHRoaXMudGFyZ2V0ID0gdGFyZ2V0O1xuICB0aGlzLmVycm9yID0gZXJyb3I7XG4gIHRoaXMudmFsaWRhdG9yID0gdmFsaWRhdG9yO1xuXG4gIGlmIChrZXkpIHtcbiAgICB0aGlzLmtleSA9IGtleTtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFZhbGlkYXRpb25FcnJvcjtcbiIsInZhciB1dGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XG5cbmZ1bmN0aW9uIFdyYXBwZXIoZGVmYXVsdFZhbHVlLCB3cml0YWJsZSwgdmFsaWRhdG9ycywgYmVmb3JlU2V0LCBhc3NlcnQpIHtcbiAgdGhpcy52YWxpZGF0b3JzID0gdmFsaWRhdG9ycztcblxuICB0aGlzLl9kZWZhdWx0VmFsdWUgPSBkZWZhdWx0VmFsdWU7XG4gIHRoaXMuX3dyaXRhYmxlID0gd3JpdGFibGU7XG4gIHRoaXMuX2JlZm9yZVNldCA9IGJlZm9yZVNldDtcbiAgdGhpcy5fYXNzZXJ0ID0gYXNzZXJ0O1xuICB0aGlzLmlzSW5pdGlhbGl6ZWQgPSBmYWxzZTtcblxuICBpZiAoIXV0aWwuaXNGdW5jdGlvbihkZWZhdWx0VmFsdWUpKSB7XG4gICAgdGhpcy5pc0luaXRpYWxpemVkID0gdHJ1ZTtcblxuICAgIGlmICghdXRpbC5pc1VuZGVmaW5lZChkZWZhdWx0VmFsdWUpKSB7XG4gICAgICB0aGlzLnZhbHVlID0gZGVmYXVsdFZhbHVlO1xuICAgIH1cbiAgfVxufVxuV3JhcHBlci5wcm90b3R5cGUuaW5pdGlhbGl6ZSA9IGZ1bmN0aW9uKHBhcmVudCkge1xuICBpZiAodGhpcy5pc0luaXRpYWxpemVkKSB7XG4gICAgcmV0dXJuO1xuICB9XG4gIHRoaXMudmFsdWUgPSB0aGlzLl9kZWZhdWx0VmFsdWUocGFyZW50KTtcbiAgdGhpcy5pc0luaXRpYWxpemVkID0gdHJ1ZTtcbn07XG5PYmplY3QuZGVmaW5lUHJvcGVydGllcyhXcmFwcGVyLnByb3RvdHlwZSwge1xuICB2YWx1ZToge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gdGhpcy5fZ2V0dGVyID8gdGhpcy5fZ2V0dGVyKCkgOiB0aGlzLl92YWx1ZTtcbiAgICB9LFxuICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcblxuICAgICAgaWYgKCF0aGlzLl93cml0YWJsZSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1ZhbHVlIGlzIHJlYWRvbmx5Jyk7XG4gICAgICB9XG5cbiAgICAgIC8vZGVmLnNldHRlci5jYWxsKHRoaXMsIHZhbHVlKTtcbiAgICAgIHZhciB2YWwgPSB0aGlzLl9iZWZvcmVTZXQgPyB0aGlzLl9iZWZvcmVTZXQodmFsdWUpIDogdmFsdWU7XG5cbiAgICAgIGlmICh0aGlzLl9hc3NlcnQpIHtcbiAgICAgICAgdGhpcy5fYXNzZXJ0KHZhbCk7XG4gICAgICB9XG5cbiAgICAgIHRoaXMuX3ZhbHVlID0gdmFsO1xuICAgIH1cbiAgfVxufSk7XG5cbm1vZHVsZS5leHBvcnRzID0gV3JhcHBlcjtcbiIsInZhciBFbWl0dGVyID0gcmVxdWlyZSgnZW1pdHRlci1vYmplY3QnKTtcbnZhciBFbWl0dGVyRXZlbnQgPSByZXF1aXJlKCdlbWl0dGVyLWV2ZW50Jyk7XG5cbmZ1bmN0aW9uIHJhaXNlRXZlbnQobmFtZSwgYXJyLCB2YWx1ZSkge1xuICB2YXIgZSA9IG5ldyBFbWl0dGVyRXZlbnQobmFtZSwgYXJyLCB2YWx1ZSk7XG5cbiAgYXJyLmVtaXQobmFtZSwgZSk7XG4gIGFyci5lbWl0KCdjaGFuZ2UnLCBlKTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuXG4gIGNhbGxiYWNrID0gY2FsbGJhY2sgfHwgcmFpc2VFdmVudDtcblxuICAvKipcbiAgICogQ29uc3RydWN0IGFuIEFycmF5IGZyb20gdGhlIHBhc3NlZCBhcmd1bWVudHNcbiAgICovXG4gIHZhciBhcnJDdG9yQXJncyA9IGFyZ3VtZW50cztcbiAgdmFyIGFyciA9IFtdOyAvL0FycmF5LmFwcGx5KG51bGwsIGFyckN0b3JBcmdzKTtcblxuICAvKipcbiAgICogTWl4aW4gRW1pdHRlciB0byB0aGUgQXJyYXkgaW5zdGFuY2VcbiAgICovXG4gIGlmICghY2FsbGJhY2spIEVtaXR0ZXIoYXJyKTtcblxuICAvKipcbiAgICogUHJveGllZCBhcnJheSBtdXRhdG9ycyBtZXRob2RzXG4gICAqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcbiAgICogQHJldHVybiB7T2JqZWN0fVxuICAgKiBAYXBpIHByaXZhdGVcbiAgICovXG4gIHZhciBwb3AgPSBmdW5jdGlvbigpIHtcblxuICAgIHZhciByZXN1bHQgPSBBcnJheS5wcm90b3R5cGUucG9wLmFwcGx5KGFycik7XG5cbiAgICBjYWxsYmFjaygncG9wJywgYXJyLCB7XG4gICAgICB2YWx1ZTogcmVzdWx0XG4gICAgfSk7XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuICB2YXIgcHVzaCA9IGZ1bmN0aW9uKCkge1xuXG4gICAgdmFyIHJlc3VsdCA9IEFycmF5LnByb3RvdHlwZS5wdXNoLmFwcGx5KGFyciwgYXJndW1lbnRzKTtcblxuICAgIGNhbGxiYWNrKCdwdXNoJywgYXJyLCB7XG4gICAgICB2YWx1ZTogcmVzdWx0XG4gICAgfSk7XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuICB2YXIgcmV2ZXJzZSA9IGZ1bmN0aW9uKCkge1xuXG4gICAgdmFyIHJlc3VsdCA9IEFycmF5LnByb3RvdHlwZS5yZXZlcnNlLmFwcGx5KGFycik7XG5cbiAgICBjYWxsYmFjaygncmV2ZXJzZScsIGFyciwge1xuICAgICAgdmFsdWU6IHJlc3VsdFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcbiAgdmFyIHNoaWZ0ID0gZnVuY3Rpb24oKSB7XG5cbiAgICB2YXIgcmVzdWx0ID0gQXJyYXkucHJvdG90eXBlLnNoaWZ0LmFwcGx5KGFycik7XG5cbiAgICBjYWxsYmFjaygnc2hpZnQnLCBhcnIsIHtcbiAgICAgIHZhbHVlOiByZXN1bHRcbiAgICB9KTtcblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG4gIHZhciBzb3J0ID0gZnVuY3Rpb24oKSB7XG5cbiAgICB2YXIgcmVzdWx0ID0gQXJyYXkucHJvdG90eXBlLnNvcnQuYXBwbHkoYXJyLCBhcmd1bWVudHMpO1xuXG4gICAgY2FsbGJhY2soJ3NvcnQnLCBhcnIsIHtcbiAgICAgIHZhbHVlOiByZXN1bHRcbiAgICB9KTtcblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG4gIHZhciB1bnNoaWZ0ID0gZnVuY3Rpb24oKSB7XG5cbiAgICB2YXIgcmVzdWx0ID0gQXJyYXkucHJvdG90eXBlLnVuc2hpZnQuYXBwbHkoYXJyLCBhcmd1bWVudHMpO1xuXG4gICAgY2FsbGJhY2soJ3Vuc2hpZnQnLCBhcnIsIHtcbiAgICAgIHZhbHVlOiByZXN1bHRcbiAgICB9KTtcblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG4gIHZhciBzcGxpY2UgPSBmdW5jdGlvbigpIHtcblxuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciByZXN1bHQgPSBBcnJheS5wcm90b3R5cGUuc3BsaWNlLmFwcGx5KGFyciwgYXJndW1lbnRzKTtcblxuICAgIGNhbGxiYWNrKCdzcGxpY2UnLCBhcnIsIHtcbiAgICAgIHZhbHVlOiByZXN1bHQsXG4gICAgICByZW1vdmVkOiByZXN1bHQsXG4gICAgICBhZGRlZDogQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvKipcbiAgICogUHJveHkgYWxsIEFycmF5LnByb3RvdHlwZSBtdXRhdG9yIG1ldGhvZHMgb24gdGhpcyBhcnJheSBpbnN0YW5jZVxuICAgKi9cbiAgYXJyLnBvcCA9IGFyci5wb3AgJiYgcG9wO1xuICBhcnIucHVzaCA9IGFyci5wdXNoICYmIHB1c2g7XG4gIGFyci5yZXZlcnNlID0gYXJyLnJldmVyc2UgJiYgcmV2ZXJzZTtcbiAgYXJyLnNoaWZ0ID0gYXJyLnNoaWZ0ICYmIHNoaWZ0O1xuICBhcnIuc29ydCA9IGFyci5zb3J0ICYmIHNvcnQ7XG4gIGFyci5zcGxpY2UgPSBhcnIuc3BsaWNlICYmIHNwbGljZTtcblxuICAvKipcbiAgICogU3BlY2lhbCB1cGRhdGUgZnVuY3Rpb24gc2luY2Ugd2UgY2FuJ3QgZGV0ZWN0XG4gICAqIGFzc2lnbm1lbnQgYnkgaW5kZXggZS5nLiBhcnJbMF0gPSAnc29tZXRoaW5nJ1xuICAgKi9cbiAgYXJyLnVwZGF0ZSA9IGZ1bmN0aW9uKGluZGV4LCB2YWx1ZSkge1xuXG4gICAgdmFyIG9sZFZhbHVlID0gYXJyW2luZGV4XTtcbiAgICB2YXIgbmV3VmFsdWUgPSBhcnJbaW5kZXhdID0gdmFsdWU7XG5cbiAgICBjYWxsYmFjaygndXBkYXRlJywgYXJyLCB7XG4gICAgICBpbmRleDogaW5kZXgsXG4gICAgICB2YWx1ZTogbmV3VmFsdWUsXG4gICAgICBvbGRWYWx1ZTogb2xkVmFsdWVcbiAgICB9KTtcblxuICAgIHJldHVybiBuZXdWYWx1ZTtcbiAgfTtcblxuICByZXR1cm4gYXJyO1xufTtcbiIsIm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24gRW1pdHRlckV2ZW50KG5hbWUsIHRhcmdldCwgZGV0YWlsKSB7XG4gIHRoaXMubmFtZSA9IG5hbWU7XG4gIHRoaXMudGFyZ2V0ID0gdGFyZ2V0O1xuICBcbiAgaWYgKGRldGFpbCkge1xuICAgIHRoaXMuZGV0YWlsID0gZGV0YWlsO1xuICB9XG59OyIsIi8qKlxuICogRXhwb3NlIGBFbWl0dGVyYC5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IEVtaXR0ZXI7XG5cbi8qKlxuICogSW5pdGlhbGl6ZSBhIG5ldyBgRW1pdHRlcmAuXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiBFbWl0dGVyKG9iaikge1xuICB2YXIgY3R4ID0gb2JqIHx8IHRoaXM7XG5cbiAgLy8gdmFyIGNhbGxiYWNrcztcbiAgLy8gT2JqZWN0LmRlZmluZVByb3BlcnR5KGN0eCwgJ19fY2FsbGJhY2tzJywge1xuICAvLyAgIGdldDogZnVuY3Rpb24oKSB7XG4gIC8vICAgICByZXR1cm4gY2FsbGJhY2tzID0gY2FsbGJhY2tzIHx8IHt9O1xuICAvLyAgIH0sXG4gIC8vICAgc2V0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAvLyAgICAgY2FsbGJhY2tzID0gdmFsdWU7XG4gIC8vICAgfVxuICAvLyB9KTtcblxuICBpZiAob2JqKSB7XG4gICAgY3R4ID0gbWl4aW4ob2JqKTtcbiAgICByZXR1cm4gY3R4O1xuICB9XG59XG5cbi8qKlxuICogTWl4aW4gdGhlIGVtaXR0ZXIgcHJvcGVydGllcy5cbiAqXG4gKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gKiBAcmV0dXJuIHtPYmplY3R9XG4gKiBAYXBpIHByaXZhdGVcbiAqL1xuXG5mdW5jdGlvbiBtaXhpbihvYmopIHtcbiAgZm9yICh2YXIga2V5IGluIEVtaXR0ZXIucHJvdG90eXBlKSB7XG4gICAgb2JqW2tleV0gPSBFbWl0dGVyLnByb3RvdHlwZVtrZXldO1xuICB9XG4gIHJldHVybiBvYmo7XG59XG5cbi8qKlxuICogTGlzdGVuIG9uIHRoZSBnaXZlbiBgZXZlbnRgIHdpdGggYGZuYC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAcmV0dXJuIHtFbWl0dGVyfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5FbWl0dGVyLnByb3RvdHlwZS5vbiA9XG4gIEVtaXR0ZXIucHJvdG90eXBlLmFkZEV2ZW50TGlzdGVuZXIgPSBmdW5jdGlvbihldmVudCwgZm4pIHtcbiAgICAodGhpcy5fX2NhbGxiYWNrc1tldmVudF0gPSB0aGlzLl9fY2FsbGJhY2tzW2V2ZW50XSB8fCBbXSlcbiAgICAucHVzaChmbik7XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbi8qKlxuICogQWRkcyBhbiBgZXZlbnRgIGxpc3RlbmVyIHRoYXQgd2lsbCBiZSBpbnZva2VkIGEgc2luZ2xlXG4gKiB0aW1lIHRoZW4gYXV0b21hdGljYWxseSByZW1vdmVkLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAqIEByZXR1cm4ge0VtaXR0ZXJ9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbkVtaXR0ZXIucHJvdG90eXBlLm9uY2UgPSBmdW5jdGlvbihldmVudCwgZm4pIHtcbiAgZnVuY3Rpb24gb24oKSB7XG4gICAgdGhpcy5vZmYoZXZlbnQsIG9uKTtcbiAgICBmbi5hcHBseSh0aGlzLCBhcmd1bWVudHMpO1xuICB9XG5cbiAgb24uZm4gPSBmbjtcbiAgdGhpcy5vbihldmVudCwgb24pO1xuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUmVtb3ZlIHRoZSBnaXZlbiBjYWxsYmFjayBmb3IgYGV2ZW50YCBvciBhbGxcbiAqIHJlZ2lzdGVyZWQgY2FsbGJhY2tzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAqIEByZXR1cm4ge0VtaXR0ZXJ9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbkVtaXR0ZXIucHJvdG90eXBlLm9mZiA9XG4gIEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUxpc3RlbmVyID1cbiAgRW1pdHRlci5wcm90b3R5cGUucmVtb3ZlQWxsTGlzdGVuZXJzID1cbiAgRW1pdHRlci5wcm90b3R5cGUucmVtb3ZlRXZlbnRMaXN0ZW5lciA9IGZ1bmN0aW9uKGV2ZW50LCBmbikge1xuXG4gICAgLy8gYWxsXG4gICAgaWYgKDAgPT0gYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgdGhpcy5fX2NhbGxiYWNrcyA9IHt9O1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLy8gc3BlY2lmaWMgZXZlbnRcbiAgICB2YXIgY2FsbGJhY2tzID0gdGhpcy5fX2NhbGxiYWNrc1tldmVudF07XG4gICAgaWYgKCFjYWxsYmFja3MpIHJldHVybiB0aGlzO1xuXG4gICAgLy8gcmVtb3ZlIGFsbCBoYW5kbGVyc1xuICAgIGlmICgxID09IGFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIGRlbGV0ZSB0aGlzLl9fY2FsbGJhY2tzW2V2ZW50XTtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8vIHJlbW92ZSBzcGVjaWZpYyBoYW5kbGVyXG4gICAgdmFyIGNiO1xuICAgIGZvciAodmFyIGkgPSAwOyBpIDwgY2FsbGJhY2tzLmxlbmd0aDsgaSsrKSB7XG4gICAgICBjYiA9IGNhbGxiYWNrc1tpXTtcbiAgICAgIGlmIChjYiA9PT0gZm4gfHwgY2IuZm4gPT09IGZuKSB7XG4gICAgICAgIGNhbGxiYWNrcy5zcGxpY2UoaSwgMSk7XG4gICAgICAgIGJyZWFrO1xuICAgICAgfVxuICAgIH1cbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuLyoqXG4gKiBFbWl0IGBldmVudGAgd2l0aCB0aGUgZ2l2ZW4gYXJncy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcbiAqIEBwYXJhbSB7TWl4ZWR9IC4uLlxuICogQHJldHVybiB7RW1pdHRlcn1cbiAqL1xuXG5FbWl0dGVyLnByb3RvdHlwZS5lbWl0ID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgdmFyIGFyZ3MgPSBbXS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMSksXG4gICAgY2FsbGJhY2tzID0gdGhpcy5fX2NhbGxiYWNrc1tldmVudF07XG5cbiAgaWYgKGNhbGxiYWNrcykge1xuICAgIGNhbGxiYWNrcyA9IGNhbGxiYWNrcy5zbGljZSgwKTtcbiAgICBmb3IgKHZhciBpID0gMCwgbGVuID0gY2FsbGJhY2tzLmxlbmd0aDsgaSA8IGxlbjsgKytpKSB7XG4gICAgICBjYWxsYmFja3NbaV0uYXBwbHkodGhpcywgYXJncyk7XG4gICAgfVxuICB9XG5cbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJldHVybiBhcnJheSBvZiBjYWxsYmFja3MgZm9yIGBldmVudGAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XG4gKiBAcmV0dXJuIHtBcnJheX1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuRW1pdHRlci5wcm90b3R5cGUubGlzdGVuZXJzID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgcmV0dXJuIHRoaXMuX19jYWxsYmFja3NbZXZlbnRdIHx8IFtdO1xufTtcblxuLyoqXG4gKiBDaGVjayBpZiB0aGlzIGVtaXR0ZXIgaGFzIGBldmVudGAgaGFuZGxlcnMuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XG4gKiBAcmV0dXJuIHtCb29sZWFufVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5FbWl0dGVyLnByb3RvdHlwZS5oYXNMaXN0ZW5lcnMgPSBmdW5jdGlvbihldmVudCkge1xuICByZXR1cm4gISF0aGlzLmxpc3RlbmVycyhldmVudCkubGVuZ3RoO1xufTtcbiJdfQ==
