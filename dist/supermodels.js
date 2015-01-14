!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.supermodels=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);throw new Error("Cannot find module '"+o+"'")}var f=n[o]={exports:{}};t[o][0].call(f.exports,function(e){var n=t[o][1][e];return s(n?n:e)},f,f.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(_dereq_,module,exports){
var EmitterEvent = _dereq_('emitter-event');
var emitterArray = _dereq_('emitter-array');
var mdl = _dereq_('./model');

var __VALIDATORS = '__validators';
var __VALUE = '__value';
var __TYPE = '__type';
var __SPECIAL_PROPS = [__VALIDATORS, __VALUE, __TYPE];

var util = {
  toType: function(obj) {
    return Object.prototype.toString.call(obj).match(/\s([a-zA-Z]+)/)[1].toLowerCase();
  },
  isObject: function(value) {
    return this.toType(value) === 'object';
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
    return this.toType(value) === 'function';
  },
  isDate: function(value) {
    return this.toType(value) === 'date';
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
      return this.isSpecialProp(obj[item]);
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
        return String(value);
      case Number:
        return Number(value);
      case Boolean:
        return Boolean(value);
      case Date:
        return Date(value);
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
  var isPrimitive = !isArray && !isObject;
  var getter = descriptor.get;
  var setter = descriptor.set;
  var hasGetter = !!getter;
  var hasSetter = !!setter;

  var desc = {
    configurable: false,
    enumerable: true,
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

      if (hasSetter) {
        setter.call(this, value);
      } else {
        _[key] = util.cast(value, descriptorValue && descriptorValue[__TYPE]);
      }

      var newValue = this[key];

      // Emit change event against this model
      this.emit('change', new EmitterEvent('change', this, {
        name: key,
        value: newValue
      }));

      // Emit specific change event against this model
      this.emit('change:' + key, new EmitterEvent('change:' + key, this, {
        value: newValue
      }));

      // Bubble the change event up against the ancestors
      for (var i = 0; i < this.__ancestors.length; i++) {
        this.__ancestors[i].emit('change', new EmitterEvent('change', this, {
          name: this.__path + '.' + key,
          value: newValue
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
    var arr = emitterArray();

    if (descriptorValue.length) {

      // Create an intermediate model that
      // represents the array. All events are 
      // proxied up through this. todo??
      var arrModelPrototype = createModel(ctx);
      
      // Create a new prototype we can use to
      // create and validate the items in the array
      var arrItemModelPrototype = createModel(arrModelPrototype);

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

      // rethrow array events against this model and any ancestors
      arr.on('change', function(e) {
        
        // Emit change event against this model
        ctx.emit('change', new EmitterEvent('change', ctx, {
          name: key,
          originalEvent: e
        }));
  
        // Emit specific change event against this model
        ctx.emit('change:' + key, new EmitterEvent('change:' + key, this, {
          originalEvent: e
        }));
  
        // Bubble the change event up against the ancestors
        for (var i = 0; i < ctx.__ancestors.length; i++) {
          ctx.__ancestors[i].emit('change', new EmitterEvent('change', this, {
            name: ctx.__path + '.' + key,
            originalEvent: e
          }));
        }
        
      });
    }
    
    _[key] = arr;
    
  } else if (hasProps) {
    // silently set up an inner model
    _[key] = makeModel(descriptorValue, ctx);
  } else if (isPrimitive) {
    // silently set up an inner model
    _[key] = descriptorValue;
  } else if (descriptorValue && descriptorValue[__VALUE]) {
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

function createModel(parent) {

  var model = Object.create(mdl, {
    __parent: {
      value: parent,
      enumerable: false,
      writable: false,
      configurable: false
    }
  });

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
},{"./model":2,"emitter-array":3,"emitter-event":5}],2:[function(_dereq_,module,exports){
var Emitter = _dereq_('emitter-component');
var ValidationError = _dereq_('./validation-error');

var model = Object.create(Emitter.prototype, {
  __name: {
    get: function() {
      if (this.__isRoot) {
        return '';
      }

      // Work out the 'name' of the model
      // Look up to the parent and loop through it's keys,
      // Any value or array found to contain the value of this (this model)
      // then we return the key and index in the case we found the model in an array.
      var parentKeys = Object.keys(this.__parent);
      var parentKey, parentValue, isArray, index;

      for (var i = 0; i < parentKeys.length; i++) {
        parentKey = parentKeys[i];
        parentValue = this.__parent[parentKey];
        // isArray = Array.isArray(parentValue);

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
      
      throw new Error('Not found in parent');
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

        var keys = Object.keys(obj);
        var key, value;

        for (var i = 0; i < keys.length; i++) {

          key = keys[i];
          value = obj[key];

          if (model.isPrototypeOf(value)) {

            descendants.push(value);
            checkAndAddDescendantIfModel(value);

          } else if (Array.isArray(value) && value.create) {
            for (var j = 0; j < value.length; j++) {

              var arrValue = value[j];

              if (model.isPrototypeOf(arrValue)) {
                descendants.push(arrValue);
                checkAndAddDescendantIfModel(arrValue);
              }

            }
          }
        }

      }

      checkAndAddDescendantIfModel(this);

      return descendants;
    }
  },
  __children: {
    get: function() {
      var children = [];

      var keys = Object.keys(this);
      var key, value;
  
      for (var i = 0; i < keys.length; i++) {
  
        key = keys[i];
        value = this[key];
  
        if (model.isPrototypeOf(value)) {
  
          children.push(value);
  
        } else if (Array.isArray(value) && value.create) {
          for (var j = 0; j < value.length; j++) {
  
            var arrValue = value[j];
  
            if (model.isPrototypeOf(arrValue)) {
              children.push(arrValue);
            }
  
          }
        }
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
      
      for (i = 0; i < validators.length; i++) {
        validator = validators[i];
        key = validator.key;
        error = validator.test.call(this, key ? this[key] : this, key);
        
        if (error) {
          errors.push(new ValidationError(this, error, validator, key));
        }
      }
      
      for (i = 0; i < this.__children.length; i++) {
        child = this.__children[i];
        Array.prototype.push.apply(errors, child.errors);
      }

      return errors;
    }
  }
});

module.exports = model;
},{"./validation-error":6,"emitter-component":4}],3:[function(_dereq_,module,exports){
var Emitter = _dereq_('emitter-component');

var createEvent = function(name, target, value) {
  var e = {
    name: name,
    target: target
  };

  if (value) {
    e.value = value;
  }

  return e;
};

function raiseEvent(name, arr, value) {
  var e = createEvent(name, arr, value);

  arr.emit(name, e);
  arr.emit('change', e);
}
module.exports = function() {

  /**
   * Construct an Array from the passed arguments
   */
  var arrCtorArgs = arguments;
  var arr = Array.apply(null, arrCtorArgs);

  /**
   * Mixin Emitter to the Array instance
   */
  Emitter(arr);

  /**
   * Proxied array mutators methods
   *
   * @param {Object} obj
   * @return {Object}
   * @api private
   */
  var pop = function() {

    var ret = Array.prototype.pop.apply(arr);

    raiseEvent('pop', arr, ret);

    return ret;
  };
  var push = function() {

    var ret = Array.prototype.push.apply(arr, arguments);

    raiseEvent('push', arr, ret);

    return ret;
  };
  var reverse = function() {

    var ret = Array.prototype.reverse.apply(arr);

    raiseEvent('reverse', arr, ret);

    return ret;
  };
  var shift = function() {

    var ret = Array.prototype.shift.apply(arr);

    raiseEvent('shift', arr, ret);

    return ret;
  };
  var sort = function() {

    var ret = Array.prototype.sort.apply(arr, arguments);

    raiseEvent('sort', arr, ret);

    return ret;
  };
  var unshift = function() {

    var ret = Array.prototype.unshift.apply(arr, arguments);

    raiseEvent('unshift', arr, ret);

    return ret;
  };
  var splice = function() {

    if (!arguments.length) {
      return;
    }

    var ret = Array.prototype.splice.apply(arr, arguments);

    raiseEvent('splice', arr, {
      removed: ret,
      added: arguments.slice(2)
    });

    return ret;
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

    var newValue = arr[index] = value;
    
    raiseEvent('update', arr, newValue);
    
    return newValue;
  };

  return arr;
};
},{"emitter-component":4}],4:[function(_dereq_,module,exports){

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
  if (obj) return mixin(obj);
};

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
  this._callbacks = this._callbacks || {};
  (this._callbacks[event] = this._callbacks[event] || [])
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
  var self = this;
  this._callbacks = this._callbacks || {};

  function on() {
    self.off(event, on);
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
  this._callbacks = this._callbacks || {};

  // all
  if (0 == arguments.length) {
    this._callbacks = {};
    return this;
  }

  // specific event
  var callbacks = this._callbacks[event];
  if (!callbacks) return this;

  // remove all handlers
  if (1 == arguments.length) {
    delete this._callbacks[event];
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

Emitter.prototype.emit = function(event){
  this._callbacks = this._callbacks || {};
  var args = [].slice.call(arguments, 1)
    , callbacks = this._callbacks[event];

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

Emitter.prototype.listeners = function(event){
  this._callbacks = this._callbacks || {};
  return this._callbacks[event] || [];
};

/**
 * Check if this emitter has `event` handlers.
 *
 * @param {String} event
 * @return {Boolean}
 * @api public
 */

Emitter.prototype.hasListeners = function(event){
  return !! this.listeners(event).length;
};

},{}],5:[function(_dereq_,module,exports){
module.exports = function EmitterEvent(name, target, detail) {
  var e = {
    name: name,
    target: target
  };

  if (detail) {
    e.detail = detail;
  }

  return e;
};
},{}],6:[function(_dereq_,module,exports){
function ValidationError(target, error, validator, key) {
  this.target = target;
  this.error = error;
  this.validator = validator;

  if (key) {
    this.key = key;
  }
}

module.exports = ValidationError;
},{}]},{},[1])
(1)
});