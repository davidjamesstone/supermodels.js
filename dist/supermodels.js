!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.supermodels=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
var emitter = require('emitter-object');
var EmitterEvent = require('emitter-event');
var emitterArray = require('emitter-array');
var mdl = require('./model');

var __VALIDATORS = '__validators';
var __VALUE = '__value';
var __TYPE = '__type';
var __GET = '__get';
var __SET = '__set';
var __CONFIGURABLE = '__configurable';
var __ENUMERABLE = '__enumerable';

var __SPECIAL_PROPS = [__VALIDATORS, __VALUE, __TYPE, __GET, __SET, __CONFIGURABLE, __ENUMERABLE];

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
  isSpecialProp: function(key) {
    return __SPECIAL_PROPS.indexOf(key) !== -1;
  },
  getProps: function(obj) {
    if (!this.isObject(obj)) {
      return null;
    }

    return Object.keys(obj).filter(function(item) {
      return !this.isSpecialProp(item);
    }, this);
  },
  getSpecialProps: function(obj) {
    if (!this.isObject(obj)) {
      return null;
    }

    return Object.keys(obj).filter(function(item) {
      return this.isSpecialProp(item);
    }, this);
  },
  hasProps: function(obj) {
    var props = this.getProps(obj);
    return props && !!props.length;
  },
  hasSpecialProps: function(obj) {
    var specialProps = this.getSpecialProps(obj);
    return specialProps && !!specialProps.length;
  },
  hasOnlySpecialProps: function(obj) {
    if (!this.isObject(obj)) {
      return false;
    }

    var keys = Object.keys(obj);
    return keys.every(function(item) {
      return __SPECIAL_PROPS.indexOf(item) !== -1;
    });
  },
  hasMixedProps: function(obj) {
    return this.hasSpecialProps(obj) && !this.hasOnlySpecialProps(obj);
  },
  hasNoSpecialProps: function(obj) {
    return !this.hasSpecialProps(obj);
  },
  cast: function(value, type) {
    //todo: proper casting
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
        return value;
    }
  },
  resolveDescriptorValue: function(descriptor) {
    switch (descriptor.value) {
      case String:
      case Number:
      case Boolean:
      case Date:
        return {
          __type: descriptor.value
        };
      default:
        return descriptor.value;
    }
  }
};

/**
 * Adds a property 'key' to a context object
 * using the 'descriptor' to provide schema information
 */
function makeProp(key, descriptor, ctx, _, validators) {
  var descriptorValue = util.resolveDescriptorValue(descriptor);

  if (util.isFunction(descriptorValue)) {
    ctx[key] = descriptorValue;
    return;
  }

  var isArray = util.isArray(descriptorValue);
  var isObject = util.isObject(descriptorValue);
  var hasProps = util.hasProps(descriptorValue);
  var hasOnlySpecialProps = util.hasOnlySpecialProps(descriptorValue);
  var hasSpecialProps = util.hasSpecialProps(descriptorValue);
  var isPrimitive = !isArray && !isObject;
  
  var configurable = hasSpecialProps && (typeof descriptorValue[__CONFIGURABLE] !== 'undefined') ?  descriptorValue[__CONFIGURABLE] : descriptor.configurable;
  var enumerable = hasSpecialProps && (typeof descriptorValue[__ENUMERABLE] !== 'undefined') ?  descriptorValue[__ENUMERABLE] : descriptor.enumerable;

  var getter = descriptor.get || (hasSpecialProps && descriptorValue[__GET]);
  var setter = descriptor.set || (hasSpecialProps && descriptorValue[__SET]);
  var hasGetter = !!getter;
  var hasSetter = !!setter;

  var desc = {
    configurable: configurable,
    enumerable: enumerable,
    get: function() {
      return hasGetter ? getter.call(this) : _[key];
    }
  };

  // Give the property a setter if any of the following are met
  // - The key schema explicitly has a setter (we need to proxy the call)
  // - It has no getter or setter and it's a primitive
  // - It's an object that only has special properties
  if (hasSetter || (isPrimitive && !hasGetter) || hasOnlySpecialProps) {

    desc.set = function(value) {

      var oldValue = _[key];

      if (hasSetter) {
        setter.call(this, value);
      } else {
        _[key] = util.cast(value, descriptorValue && descriptorValue[__TYPE]);
      }

      var newValue = this[key];

      // Emit change event against this model
      this.emit('change', new EmitterEvent('change', this, {
        name: key,
        value: newValue,
        oldValue: oldValue
      }));

      // Emit specific change event against this model
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
    };

  }

  // define the decriptior
  // property on the context object
  Object.defineProperty(ctx, key, desc);

  // Add validators if the are any present and it is an object
  // with only special properties. If it is a mixed object the 
  // validators will be added to the child model.
  if (hasOnlySpecialProps && util.isArray(descriptorValue[__VALIDATORS])) {
    addValidators(descriptorValue[__VALIDATORS], validators, key);
  }

  if (isArray) {

    //
    var arr = emitterArray(function(name, target, detail) {

      // Emit change event against this model
      arr.emit('change', new EmitterEvent('change', arr, mixin({
        type: name,
      }, detail)));

      // Emit specific array event against this model
      arr.emit(name, new EmitterEvent(name, arr, detail));

      // Bubble the change event up against the ancestors
      for (var i = 0; i < arr.__ancestors.length; i++) {
        arr.__ancestors[i].emit('change', new EmitterEvent('change', arr, mixin({
          name: arr.__path,
          type: name,
        }, detail)));
      }
    });

    emitter(arr);

    var descriptors = createModelDescriptors(ctx);
    Object.defineProperties(arr, descriptors);

    if (descriptorValue.length) {

      // Create a new prototype we can use to
      // create and validate the items in the array
      var arrItemModelPrototype = createModel(arr);

      // Validate new models by overriding the emitter array 
      // mutators that can cause new items to enter the array
      overrideEmitterArrayAddingMutators(arr, arrItemModelPrototype);

      // Provide a convenient model factory 
      // for creating array item instances
      arr.create = function() {
        var newModel = Object.create(arrItemModelPrototype);

        addKeys(descriptorValue[0], newModel);

        return newModel;
      };

      // // rethrow array events against this model and any ancestors
      // arr.on('change', function(e) {


      // });
    }

    _[key] = arr;

  } else if (hasProps) {
    // silently set up an inner model
    _[key] = makeModel(descriptorValue, ctx);
  } else if (isPrimitive) {
    // silently set up an inner model
    _[key] = descriptorValue;
  } else if (descriptorValue && descriptorValue.hasOwnProperty(__VALUE)) {
    // set the default value
    _[key] = descriptorValue[__VALUE];
  }
}

function ensureValidPrototypes(obj, toValidate) {
  var test;
  for (var i = 0; i < toValidate.length; i++) {
    test = toValidate[i];
    if (!obj.isPrototypeOf(test)) {
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
      ensureValidPrototypes(obj, arguments.slice(2));
      return splice.apply(arr, arguments);
    };
  }
}

function createModelDescriptors(parent) {
  var descriptors = mixin({
    __parent: {
      value: parent,
      enumerable: false,
      writable: false,
      configurable: false
    }
  }, mdl);

  return descriptors;
}

function createModel(parent) {
  var descriptors = createModelDescriptors(parent);
  var model = Object.create({}, descriptors);

  emitter(model);

  return model;
}

function mixin(source, target) {
  if (source && target) {
    for (var prop in source) {
      target[prop] = source[prop];
    }
  }

  return target;
}

function addValidators(from, to, key) {
  var validator, source;

  for (var i = 0; i < from.length; i++) {
    source = from[i];
    if (util.isFunction(source)) {
      validator = {
        test: source
      };
    } else {
      validator = mixin(source, {});
    }

    if (key) {
      validator.key = key;
    }

    to.push(validator);
  }
}

function addKeys(schema, model) {
  var _ = {}; // contains private scope data
  var keys = Object.keys(schema);
  var validators = [];

  for (var i = 0; i < keys.length; i++) {
    var key = keys[i];
    if (__VALIDATORS === key) {
      // Model level validators
      addValidators(schema[key], validators);
    } else {
      var descriptor = Object.getOwnPropertyDescriptor(schema, key);
      makeProp(key, descriptor, model, _, validators);
    }
  }

  Object.defineProperty(model, '__validators', {
    value: validators
  });
}

function makeModel(schema, parent) {
  var model = createModel(parent);
  addKeys(schema, model);
  return model;
}

module.exports = makeModel;
},{"./model":2,"emitter-array":3,"emitter-event":6,"emitter-object":7}],2:[function(require,module,exports){
//var Emitter = require('emitter-component');
var ValidationError = require('./validation-error');

var descriptors = {
  __supermodel: {
    value: true
  },
  __keys: {
    get: function() {
      var keys = Object.keys(this);
      var omit = [
        'addEventListener', 'on', 'once', 'removeEventListener', 'removeAllListeners',
        'removeListener', 'off', 'emit', 'listeners', 'hasListeners', 'pop', 'push',
        'reverse', 'shift', 'sort', 'splice', 'update', 'unshift', 'create'
      ];
      if (Array.isArray(this)) {
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
      var parentKey, parentValue, isArray; //, index;

      for (var i = 0; i < parentKeys.length; i++) {
        parentKey = parentKeys[i];
        parentValue = this.__parent[parentKey];
        isArray = Array.isArray(parentValue);

        // if (isArray) {
        //   index = parentValue.indexOf(this);
        //   if (index !== -1) {
        //     return parentKey + '[' + index + ']';
        //   }
        // } else 
        if (parentValue === this) {
          return parentKey;
        }
      }
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
          // else if (Array.isArray(value) && value.create) {
          //   for (var j = 0; j < value.length; j++) {

          //     var arrValue = value[j];

          //     if (arrValue && arrValue.__supermodel) {
          //       descendants.push(arrValue);
          //       checkAndAddDescendantIfModel(arrValue);
          //     }

          //   }
          // }
        }

      }

      checkAndAddDescendantIfModel(this);

      return descendants;
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

        } // else if (Array.isArray(value) && value.__supermodel && value.create) {
        //   for (var j = 0; j < value.length; j++) {

        //     var arrValue = value[j];

        //     if (arrValue && arrValue.__supermodel) {
        //       children.push(arrValue);
        //     }

        //   }
        // }
      }

      return children;
    }
  },
  __isRoot: {
    get: function() {
      return !this.__hasAncestors;
    }
  },
  __hasAncestors: {
    get: function() {
      return !!this.__ancestors.length;
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
  __hasDecendants: {
    get: function() {
      return !!this.__descendants.length;
    }
  },
  errors: {
    get: function() {
      var errors = [];
      var validators = this.__validators;
      var validator, key, error, child, i;

      if (validators) {

        for (i = 0; i < validators.length; i++) {
          validator = validators[i];
          key = validator.key;
          error = validator.test.call(this, key ? this[key] : this, key);

          if (error) {
            errors.push(new ValidationError(this, error, validator, key));
          }
        }
      }

      for (i = 0; i < this.__children.length; i++) {
        child = this.__children[i];
        Array.prototype.push.apply(errors, child.errors);
      }

      return errors;
    }
  }
};

//var model = Object.create(Emitter.prototype, descriptors);

module.exports = descriptors;
},{"./validation-error":8}],3:[function(require,module,exports){
var Emitter = require('emitter-object');
var EmitterEvent = require('emitter-event');

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
      added: arguments.slice(2)
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
},{"emitter-event":4,"emitter-object":5}],4:[function(require,module,exports){
module.exports = function EmitterEvent(name, target, detail) {
  this.name = name;
  this.target = target;
  
  if (detail) {
    this.detail = detail;
  }
};
},{}],5:[function(require,module,exports){

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

},{}],6:[function(require,module,exports){
arguments[4][4][0].apply(exports,arguments)
},{"dup":4}],7:[function(require,module,exports){
arguments[4][5][0].apply(exports,arguments)
},{"dup":5}],8:[function(require,module,exports){
function ValidationError(target, error, validator, key) {
  this.target = target;
  this.error = error;
  this.validator = validator;

  if (key) {
    this.key = key;
  }
}

module.exports = ValidationError;
},{}]},{},[1])(1)
});