!function(e){if("object"==typeof exports&&"undefined"!=typeof module)module.exports=e();else if("function"==typeof define&&define.amd)define([],e);else{var f;"undefined"!=typeof window?f=window:"undefined"!=typeof global?f=global:"undefined"!=typeof self&&(f=self),f.supermodels=e()}}(function(){var define,module,exports;return (function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
module.exports = require('./lib/supermodels');

},{"./lib/supermodels":10}],2:[function(require,module,exports){
'use strict';

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
        var descriptor = Object.getOwnPropertyDescriptor(from, key);
        var value;

        if (descriptor.get || descriptor.set) {
          value = {
            __get: descriptor.get,
            __set: descriptor.set
          };
        } else {
          value = from[key];
        }

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

},{"./factory":6,"./util":11}],3:[function(require,module,exports){
'use strict';

module.exports = function(callback) {

  var arr = [];

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
  var reverse = function() {

    var result = Array.prototype.reverse.apply(arr);

    callback('reverse', arr, {
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
  arr.shift = arr.shift && shift;
  arr.unshift = arr.unshift && unshift;
  arr.sort = arr.sort && sort;
  arr.reverse = arr.reverse && reverse;
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

},{}],4:[function(require,module,exports){
'use strict';

module.exports = function EmitterEvent(name, path, target, detail) {
  this.name = name;
  this.path = path;
  this.target = target;

  if (detail) {
    this.detail = detail;
  }
};

},{}],5:[function(require,module,exports){
'use strict';

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
    if (0 === arguments.length) {
      this.__callbacks = {};
      return this;
    }

    // specific event
    var callbacks = this.__callbacks[event];
    if (!callbacks) {
      return this;
    }

    // remove all handlers
    if (1 === arguments.length) {
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

},{}],6:[function(require,module,exports){
'use strict';

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
      value: {},
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

  // Silently initialize the property wrapper
  model.__[key] = def.create(model);
}

function createWrapperFactory(def) {

  var wrapper, defaultValue, assert;

  if (def.isSimple) {
    wrapper = new Wrapper(def.value, def.writable, def.validators, def.getter, def.cast, null);
  } else if (def.isReference) {

    // Hold a reference to the
    // refererenced types' definition
    var refDef = def.type.def;

    if (refDef.isSimple) {
      // If the referenced type is itself simple,
      // we can set just return a wrapper and
      // the property will get initialized.
      wrapper = new Wrapper(refDef.value, refDef.writable, refDef.validators, def.getter, refDef.cast, null);
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

      wrapper = new Wrapper(def.value, def.writable, def.validators, def.getter, null, assert);

    }
  } else if (def.isArray) {

    defaultValue = function(parent) {
      // for Arrays, we create a new Array and each
      // time, mix the model properties into it
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

    wrapper = new Wrapper(defaultValue, def.writable, def.validators, def.getter, null, assert);
  } else {

    // for Objects, we can create and reuse
    // a prototype object. We then need to only
    // define the defs and the 'instance' properties
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

    wrapper = new Wrapper(defaultValue, def.writable, def.validators, def.getter, null, assert);
  }

  var factory = function(parent) {
    var wrap = Object.create(wrapper);
    //if (!wrap.isInitialized) {
    wrap.initialize(parent);
    //}
    return wrap;
  };

  // expose the wrapper, this is used
  // for validating array items later
  factory.wrapper = wrapper;

  return factory;
}

module.exports = createWrapperFactory;

},{"./proto":8,"./util":11,"./wrapper":13}],7:[function(require,module,exports){
'use strict';

var EmitterEvent = require('./emitter-event');
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
          '__setNotifyChange', '__notifyChange', '__set', '__get', '__chain', '__relativePath'
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
  __hasDescendants: {
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
            value.setValue(this[key]);
          } else if (itemDef.isReference && itemDef.type.def.isSimple) {
            value = itemDef.type.def.create.wrapper;
            value.setValue(this[key]);
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

            var wrapperValue = value.getValue(this);
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

      return errors;
    }
  }
};

var proto = {
  __get: function(key) {
    return this.__[key].getValue(this);
  },
  __set: function(key, value) {
    this.__[key].setValue(value, this);
  },
  __relativePath: function(to, key) {
    var relativePath = this.__path ? to.substr(this.__path.length + 1) : to;

    if (relativePath) {
      return key ? relativePath + '.' + key : relativePath;
    }
    return key;
  },
  __chain: function(fn) {
    return [this].concat(this.__ancestors).forEach(fn);
  },
  __notifyChange: function(key, newValue, oldValue) {
    var target = this;
    var targetPath = this.__path;
    var eventName = 'set';
    var data = {
      oldValue: oldValue,
      newValue: newValue
    };

    this.emit(eventName, new EmitterEvent(eventName, key, target, data));
    this.emit('change', new EmitterEvent(eventName, key, target, data));
    this.__ancestors.forEach(function(item) {
      var path = item.__relativePath(targetPath, key);
      item.emit('change', new EmitterEvent(eventName, path, target, data));
    });
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
  descriptors: descriptors
};

},{"./emitter-event":4,"./validation-error":12,"./wrapper":13}],8:[function(require,module,exports){
'use strict';

var emitter = require('./emitter-object');
var emitterArray = require('./emitter-array');
var EmitterEvent = require('./emitter-event');

var extend = require('./util').extend;
var model = require('./model');
var modelProto = model.proto;
var modelDescriptors = model.descriptors;

var modelPrototype = Object.create(modelProto, modelDescriptors);
var objectPrototype = (function() {
  var p = Object.create(modelPrototype);

  emitter(p);

  return p;
})();

function createArrayPrototype() {

  var p = emitterArray(function(eventName, arr, e) {

    if (eventName === 'update') {
      /**
       * Forward the special array update
       * events as standard __notifyChange events
       */
      arr.__notifyChange(e.index, e.value, e.oldValue);
    } else {
      /**
       * All other events e.g. push, splice are relayed
       */
      var target = arr;
      var path = arr.__path;
      var data = e;
      var key = e.index;

      arr.emit(eventName, new EmitterEvent(eventName, '', target, data));
      arr.emit('change', new EmitterEvent(eventName, '', target, data));
      arr.__ancestors.forEach(function(item) {
        var name = item.__relativePath(path, key);
        item.emit('change', new EmitterEvent(eventName, name, target, data));
      });

    }
  });

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
    //if (!itemDef.isSimple && !itemDef.isReference) {
    p.create = function() {
      return itemDef.isReference ? itemDef.type() : itemDef.create().getValue(this);
    };
    //}
  }

  return p;
}

function getArrayArgs(itemWrapper, items) {
  var args = [];
  for (var i = 0; i < items.length; i++) {
    itemWrapper.setValue(items[i], itemWrapper._parent);
    args.push(itemWrapper.getValue(itemWrapper._parent));
  }
  return args;
}

function overrideArrayAddingMutators(arr, itemWrapper) {
  itemWrapper._parent = arr;

  var push = arr.push;
  var unshift = arr.unshift;
  var splice = arr.splice;
  var update = arr.update;

  if (push) {
    arr.push = function() {
      var args = getArrayArgs(itemWrapper, arguments);
      return push.apply(arr, args);
    };
  }

  if (unshift) {
    arr.unshift = function() {
      var args = getArrayArgs(itemWrapper, arguments);
      return unshift.apply(arr, args);
    };
  }

  if (splice) {
    arr.splice = function() {
      var args = getArrayArgs(itemWrapper, Array.prototype.slice.call(arguments, 2));
      args.unshift(arguments[1]);
      args.unshift(arguments[0]);
      return splice.apply(arr, args);
    };
  }

  if (update) {
    arr.update = function() {
      var args = getArrayArgs(itemWrapper, [arguments[1]]);
      args.unshift(arguments[0]);
      return update.apply(arr, args);
    };
  }
}

function createModelPrototype(def) {
  return def.isArray ? createArrayModelPrototype(def.proto, def.def) : createObjectModelPrototype(def.proto);
}

module.exports = createModelPrototype;

},{"./emitter-array":3,"./emitter-event":4,"./emitter-object":5,"./model":7,"./util":11}],9:[function(require,module,exports){
'use strict';

module.exports = {};

},{}],10:[function(require,module,exports){
'use strict';

var createDef = require('./def');
var Supermodel = require('./supermodel');

function supermodels(schema, initializer) {

  var def = createDef(schema);

  function SupermodelConstructor() {
    var model = def.isSimple ? def.create() : def.create().getValue({});

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

},{"./def":2,"./supermodel":9}],11:[function(require,module,exports){
'use strict';

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

},{"./supermodel":9}],12:[function(require,module,exports){
'use strict';

function ValidationError(target, error, validator, key) {
  this.target = target;
  this.error = error;
  this.validator = validator;

  if (key) {
    this.key = key;
  }
}

module.exports = ValidationError;

},{}],13:[function(require,module,exports){
'use strict';

var util = require('./util');

function Wrapper(defaultValue, writable, validators, getter, beforeSet, assert) {
  this.validators = validators;

  this._defaultValue = defaultValue;
  this._writable = writable;
  this._getter = getter;
  this._beforeSet = beforeSet;
  this._assert = assert;
  this.isInitialized = false;

  if (!util.isFunction(defaultValue)) {
    this.isInitialized = true;

    if (!util.isUndefined(defaultValue)) {
      this._value = defaultValue;
    }
  }
}
Wrapper.prototype.initialize = function(parent) {
  //this._parent = parent;

  if (this.isInitialized) {
    return;
  }

  this.setValue(this._defaultValue(parent), parent);
  this.isInitialized = true;
};
Wrapper.prototype.getValue = function(model) {
  return this._getter ? this._getter.call(model) : this._value;
};
Wrapper.prototype.setValue = function(value, model) {

  if (!this._writable) {
    throw new Error('Value is readonly');
  }

  if (value && value.__supermodel && model) {
    if (value.__parent !== model) {
      value.__parent = model;
    }
  }

  var val = this._beforeSet ? this._beforeSet(value) : value;

  if (this._assert) {
    this._assert(val);
  }

  this._value = val;
};
// Object.defineProperties(Wrapper.prototype, {
//   value: {
//     get: function() {
//       return this._getter ? this._getter() : this._value;
//     },
//     set: function(value) {

//       if (!this._writable) {
//         throw new Error('Value is readonly');
//       }

//       if (value && value.__supermodel && this._parent) {
//         if (value.__parent !== this._parent) {
//           value.__parent = this._parent;
//         }
//       }

//       var val = this._beforeSet ? this._beforeSet(value) : value;

//       if (this._assert) {
//         this._assert(val);
//       }

//       this._value = val;
//     }
//   }
// });

module.exports = Wrapper;

},{"./util":11}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsImxpYi9kZWYuanMiLCJsaWIvZW1pdHRlci1hcnJheS5qcyIsImxpYi9lbWl0dGVyLWV2ZW50LmpzIiwibGliL2VtaXR0ZXItb2JqZWN0LmpzIiwibGliL2ZhY3RvcnkuanMiLCJsaWIvbW9kZWwuanMiLCJsaWIvcHJvdG8uanMiLCJsaWIvc3VwZXJtb2RlbC5qcyIsImxpYi9zdXBlcm1vZGVscy5qcyIsImxpYi91dGlsLmpzIiwibGliL3ZhbGlkYXRpb24tZXJyb3IuanMiLCJsaWIvd3JhcHBlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDdklBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN0UkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0pBO0FBQ0E7QUFDQTtBQUNBOztBQ0hBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUM3QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDL0dBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDYkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwibW9kdWxlLmV4cG9ydHMgPSByZXF1aXJlKCcuL2xpYi9zdXBlcm1vZGVscycpO1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xudmFyIGNyZWF0ZVdyYXBwZXJGYWN0b3J5ID0gcmVxdWlyZSgnLi9mYWN0b3J5Jyk7XG5cbmZ1bmN0aW9uIHJlc29sdmUoZnJvbSkge1xuICB2YXIgaXNDdG9yID0gdXRpbC5pc0NvbnN0cnVjdG9yKGZyb20pO1xuICB2YXIgaXNTdXBlcm1vZGVsQ3RvciA9IHV0aWwuaXNTdXBlcm1vZGVsQ29uc3RydWN0b3IoZnJvbSk7XG4gIHZhciBpc0FycmF5ID0gdXRpbC5pc0FycmF5KGZyb20pO1xuXG4gIGlmIChpc0N0b3IgfHwgaXNTdXBlcm1vZGVsQ3RvciB8fCBpc0FycmF5KSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIF9fdHlwZTogZnJvbVxuICAgIH07XG4gIH1cblxuICB2YXIgaXNWYWx1ZSA9ICF1dGlsLmlzT2JqZWN0KGZyb20pO1xuICBpZiAoaXNWYWx1ZSkge1xuICAgIHJldHVybiB7XG4gICAgICBfX3ZhbHVlOiBmcm9tXG4gICAgfTtcbiAgfVxuXG4gIHJldHVybiBmcm9tO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVEZWYoZnJvbSkge1xuXG4gIGZyb20gPSByZXNvbHZlKGZyb20pO1xuXG4gIHZhciBfX1ZBTElEQVRPUlMgPSAnX192YWxpZGF0b3JzJyxcbiAgICBfX1ZBTFVFID0gJ19fdmFsdWUnLFxuICAgIF9fVFlQRSA9ICdfX3R5cGUnLFxuICAgIF9fRElTUExBWU5BTUUgPSAnX19kaXNwbGF5TmFtZScsXG4gICAgX19HRVQgPSAnX19nZXQnLFxuICAgIF9fU0VUID0gJ19fc2V0JyxcbiAgICBfX0VOVU1FUkFCTEUgPSAnX19lbnVtZXJhYmxlJyxcbiAgICBfX0NPTkZJR1VSQUJMRSA9ICdfX2NvbmZpZ3VyYWJsZScsXG4gICAgX19XUklUQUJMRSA9ICdfX3dyaXRhYmxlJyxcbiAgICBfX1NQRUNJQUxfUFJPUFMgPSBbX19WQUxJREFUT1JTLCBfX1ZBTFVFLCBfX1RZUEUsIF9fRElTUExBWU5BTUUsIF9fR0VULCBfX1NFVCwgX19FTlVNRVJBQkxFLCBfX0NPTkZJR1VSQUJMRSwgX19XUklUQUJMRV07XG5cbiAgdmFyIGRlZiA9IHtcbiAgICBmcm9tOiBmcm9tLFxuICAgIHR5cGU6IGZyb21bX19UWVBFXSxcbiAgICB2YWx1ZTogZnJvbVtfX1ZBTFVFXSxcbiAgICB2YWxpZGF0b3JzOiBmcm9tW19fVkFMSURBVE9SU10gfHwgW10sXG4gICAgZW51bWVyYWJsZTogZnJvbVtfX0VOVU1FUkFCTEVdID09PSBmYWxzZSA/IGZhbHNlIDogdHJ1ZSxcbiAgICBjb25maWd1cmFibGU6IGZyb21bX19DT05GSUdVUkFCTEVdID8gdHJ1ZSA6IGZhbHNlLFxuICAgIHdyaXRhYmxlOiBmcm9tW19fV1JJVEFCTEVdID09PSBmYWxzZSA/IGZhbHNlIDogdHJ1ZSxcbiAgICBkaXNwbGF5TmFtZTogZnJvbVtfX0RJU1BMQVlOQU1FXSxcbiAgICBnZXR0ZXI6IGZyb21bX19HRVRdLFxuICAgIHNldHRlcjogZnJvbVtfX1NFVF1cbiAgfTtcblxuICB2YXIgdHlwZSA9IGRlZi50eXBlO1xuXG4gIC8vIFNpbXBsZSAnQ29uc3RydWN0b3InIFR5cGVcbiAgaWYgKHV0aWwuaXNTaW1wbGVDb25zdHJ1Y3Rvcih0eXBlKSkge1xuXG4gICAgZGVmLmlzU2ltcGxlID0gdHJ1ZTtcblxuICAgIGRlZi5jYXN0ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIHJldHVybiB1dGlsLmNhc3QodmFsdWUsIHR5cGUpO1xuICAgIH07XG4gIH0gZWxzZSBpZiAodXRpbC5pc1N1cGVybW9kZWxDb25zdHJ1Y3Rvcih0eXBlKSkge1xuXG4gICAgZGVmLmlzUmVmZXJlbmNlID0gdHJ1ZTtcbiAgfSBlbHNlIGlmIChkZWYudmFsdWUpIHtcbiAgICAvLyBJZiBhIHZhbHVlIGlzIHByZXNlbnQsIHVzZVxuICAgIC8vIHRoYXQgYW5kIHNob3J0LWNpcmN1aXQgdGhlIHJlc3RcbiAgICBkZWYuaXNTaW1wbGUgPSB0cnVlO1xuICB9IGVsc2Uge1xuXG4gICAgLy8gT3RoZXJ3aXNlIGxvb2sgZm9yIG90aGVyIG5vbi1zcGVjaWFsXG4gICAgLy8ga2V5cyBhbmQgYWxzbyBhbnkgaXRlbSBkZWZpbml0aW9uXG4gICAgLy8gaW4gdGhlIGNhc2Ugb2YgQXJyYXlzXG5cbiAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKGZyb20pO1xuICAgIHZhciBjaGlsZEtleXMgPSBrZXlzLmZpbHRlcihmdW5jdGlvbihpdGVtKSB7XG4gICAgICByZXR1cm4gX19TUEVDSUFMX1BST1BTLmluZGV4T2YoaXRlbSkgPT09IC0xO1xuICAgIH0pO1xuXG4gICAgaWYgKGNoaWxkS2V5cy5sZW5ndGgpIHtcblxuICAgICAgdmFyIGRlZnMgPSB7fTtcbiAgICAgIHZhciBwcm90bztcblxuICAgICAgY2hpbGRLZXlzLmZvckVhY2goZnVuY3Rpb24oa2V5KSB7XG4gICAgICAgIHZhciBkZXNjcmlwdG9yID0gT2JqZWN0LmdldE93blByb3BlcnR5RGVzY3JpcHRvcihmcm9tLCBrZXkpO1xuICAgICAgICB2YXIgdmFsdWU7XG5cbiAgICAgICAgaWYgKGRlc2NyaXB0b3IuZ2V0IHx8IGRlc2NyaXB0b3Iuc2V0KSB7XG4gICAgICAgICAgdmFsdWUgPSB7XG4gICAgICAgICAgICBfX2dldDogZGVzY3JpcHRvci5nZXQsXG4gICAgICAgICAgICBfX3NldDogZGVzY3JpcHRvci5zZXRcbiAgICAgICAgICB9O1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIHZhbHVlID0gZnJvbVtrZXldO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCF1dGlsLmlzQ29uc3RydWN0b3IodmFsdWUpICYmICF1dGlsLmlzU3VwZXJtb2RlbENvbnN0cnVjdG9yKHZhbHVlKSAmJiB1dGlsLmlzRnVuY3Rpb24odmFsdWUpKSB7XG4gICAgICAgICAgaWYgKCFwcm90bykge1xuICAgICAgICAgICAgcHJvdG8gPSB7fTtcbiAgICAgICAgICB9XG4gICAgICAgICAgcHJvdG9ba2V5XSA9IHZhbHVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGRlZnNba2V5XSA9IGNyZWF0ZURlZih2YWx1ZSk7XG4gICAgICAgIH1cbiAgICAgIH0pO1xuXG4gICAgICBkZWYuZGVmcyA9IGRlZnM7XG4gICAgICBkZWYucHJvdG8gPSBwcm90bztcblxuICAgIH1cblxuICAgIC8vIENoZWNrIGZvciBBcnJheVxuICAgIGlmICh0eXBlID09PSBBcnJheSB8fCB1dGlsLmlzQXJyYXkodHlwZSkpIHtcblxuICAgICAgZGVmLmlzQXJyYXkgPSB0cnVlO1xuXG4gICAgICBpZiAodHlwZS5sZW5ndGggPiAwKSB7XG4gICAgICAgIGRlZi5kZWYgPSBjcmVhdGVEZWYodHlwZVswXSk7XG4gICAgICB9XG5cbiAgICB9IGVsc2UgaWYgKGNoaWxkS2V5cy5sZW5ndGggPT09IDApIHtcbiAgICAgIGRlZi5pc1NpbXBsZSA9IHRydWU7XG4gICAgfVxuICB9XG5cbiAgZGVmLmNyZWF0ZSA9IGNyZWF0ZVdyYXBwZXJGYWN0b3J5KGRlZik7XG5cbiAgcmV0dXJuIGRlZjtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBjcmVhdGVEZWY7XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0gZnVuY3Rpb24oY2FsbGJhY2spIHtcblxuICB2YXIgYXJyID0gW107XG5cbiAgLyoqXG4gICAqIFByb3hpZWQgYXJyYXkgbXV0YXRvcnMgbWV0aG9kc1xuICAgKlxuICAgKiBAcGFyYW0ge09iamVjdH0gb2JqXG4gICAqIEByZXR1cm4ge09iamVjdH1cbiAgICogQGFwaSBwcml2YXRlXG4gICAqL1xuICB2YXIgcG9wID0gZnVuY3Rpb24oKSB7XG5cbiAgICB2YXIgcmVzdWx0ID0gQXJyYXkucHJvdG90eXBlLnBvcC5hcHBseShhcnIpO1xuXG4gICAgY2FsbGJhY2soJ3BvcCcsIGFyciwge1xuICAgICAgdmFsdWU6IHJlc3VsdFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcbiAgdmFyIHB1c2ggPSBmdW5jdGlvbigpIHtcblxuICAgIHZhciByZXN1bHQgPSBBcnJheS5wcm90b3R5cGUucHVzaC5hcHBseShhcnIsIGFyZ3VtZW50cyk7XG5cbiAgICBjYWxsYmFjaygncHVzaCcsIGFyciwge1xuICAgICAgdmFsdWU6IHJlc3VsdFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcbiAgdmFyIHNoaWZ0ID0gZnVuY3Rpb24oKSB7XG5cbiAgICB2YXIgcmVzdWx0ID0gQXJyYXkucHJvdG90eXBlLnNoaWZ0LmFwcGx5KGFycik7XG5cbiAgICBjYWxsYmFjaygnc2hpZnQnLCBhcnIsIHtcbiAgICAgIHZhbHVlOiByZXN1bHRcbiAgICB9KTtcblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG4gIHZhciBzb3J0ID0gZnVuY3Rpb24oKSB7XG5cbiAgICB2YXIgcmVzdWx0ID0gQXJyYXkucHJvdG90eXBlLnNvcnQuYXBwbHkoYXJyLCBhcmd1bWVudHMpO1xuXG4gICAgY2FsbGJhY2soJ3NvcnQnLCBhcnIsIHtcbiAgICAgIHZhbHVlOiByZXN1bHRcbiAgICB9KTtcblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG4gIHZhciB1bnNoaWZ0ID0gZnVuY3Rpb24oKSB7XG5cbiAgICB2YXIgcmVzdWx0ID0gQXJyYXkucHJvdG90eXBlLnVuc2hpZnQuYXBwbHkoYXJyLCBhcmd1bWVudHMpO1xuXG4gICAgY2FsbGJhY2soJ3Vuc2hpZnQnLCBhcnIsIHtcbiAgICAgIHZhbHVlOiByZXN1bHRcbiAgICB9KTtcblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG4gIHZhciByZXZlcnNlID0gZnVuY3Rpb24oKSB7XG5cbiAgICB2YXIgcmVzdWx0ID0gQXJyYXkucHJvdG90eXBlLnJldmVyc2UuYXBwbHkoYXJyKTtcblxuICAgIGNhbGxiYWNrKCdyZXZlcnNlJywgYXJyLCB7XG4gICAgICB2YWx1ZTogcmVzdWx0XG4gICAgfSk7XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuICB2YXIgc3BsaWNlID0gZnVuY3Rpb24oKSB7XG5cbiAgICBpZiAoIWFyZ3VtZW50cy5sZW5ndGgpIHtcbiAgICAgIHJldHVybjtcbiAgICB9XG5cbiAgICB2YXIgcmVzdWx0ID0gQXJyYXkucHJvdG90eXBlLnNwbGljZS5hcHBseShhcnIsIGFyZ3VtZW50cyk7XG5cbiAgICBjYWxsYmFjaygnc3BsaWNlJywgYXJyLCB7XG4gICAgICB2YWx1ZTogcmVzdWx0LFxuICAgICAgcmVtb3ZlZDogcmVzdWx0LFxuICAgICAgYWRkZWQ6IEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMilcbiAgICB9KTtcblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG5cbiAgLyoqXG4gICAqIFByb3h5IGFsbCBBcnJheS5wcm90b3R5cGUgbXV0YXRvciBtZXRob2RzIG9uIHRoaXMgYXJyYXkgaW5zdGFuY2VcbiAgICovXG4gIGFyci5wb3AgPSBhcnIucG9wICYmIHBvcDtcbiAgYXJyLnB1c2ggPSBhcnIucHVzaCAmJiBwdXNoO1xuICBhcnIuc2hpZnQgPSBhcnIuc2hpZnQgJiYgc2hpZnQ7XG4gIGFyci51bnNoaWZ0ID0gYXJyLnVuc2hpZnQgJiYgdW5zaGlmdDtcbiAgYXJyLnNvcnQgPSBhcnIuc29ydCAmJiBzb3J0O1xuICBhcnIucmV2ZXJzZSA9IGFyci5yZXZlcnNlICYmIHJldmVyc2U7XG4gIGFyci5zcGxpY2UgPSBhcnIuc3BsaWNlICYmIHNwbGljZTtcblxuICAvKipcbiAgICogU3BlY2lhbCB1cGRhdGUgZnVuY3Rpb24gc2luY2Ugd2UgY2FuJ3QgZGV0ZWN0XG4gICAqIGFzc2lnbm1lbnQgYnkgaW5kZXggZS5nLiBhcnJbMF0gPSAnc29tZXRoaW5nJ1xuICAgKi9cbiAgYXJyLnVwZGF0ZSA9IGZ1bmN0aW9uKGluZGV4LCB2YWx1ZSkge1xuXG4gICAgdmFyIG9sZFZhbHVlID0gYXJyW2luZGV4XTtcbiAgICB2YXIgbmV3VmFsdWUgPSBhcnJbaW5kZXhdID0gdmFsdWU7XG5cbiAgICBjYWxsYmFjaygndXBkYXRlJywgYXJyLCB7XG4gICAgICBpbmRleDogaW5kZXgsXG4gICAgICB2YWx1ZTogbmV3VmFsdWUsXG4gICAgICBvbGRWYWx1ZTogb2xkVmFsdWVcbiAgICB9KTtcblxuICAgIHJldHVybiBuZXdWYWx1ZTtcbiAgfTtcblxuICByZXR1cm4gYXJyO1xufTtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbiBFbWl0dGVyRXZlbnQobmFtZSwgcGF0aCwgdGFyZ2V0LCBkZXRhaWwpIHtcbiAgdGhpcy5uYW1lID0gbmFtZTtcbiAgdGhpcy5wYXRoID0gcGF0aDtcbiAgdGhpcy50YXJnZXQgPSB0YXJnZXQ7XG5cbiAgaWYgKGRldGFpbCkge1xuICAgIHRoaXMuZGV0YWlsID0gZGV0YWlsO1xuICB9XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG4vKipcbiAqIEV4cG9zZSBgRW1pdHRlcmAuXG4gKi9cblxubW9kdWxlLmV4cG9ydHMgPSBFbWl0dGVyO1xuXG4vKipcbiAqIEluaXRpYWxpemUgYSBuZXcgYEVtaXR0ZXJgLlxuICpcbiAqIEBhcGkgcHVibGljXG4gKi9cblxuZnVuY3Rpb24gRW1pdHRlcihvYmopIHtcbiAgdmFyIGN0eCA9IG9iaiB8fCB0aGlzO1xuXG4gIGlmIChvYmopIHtcbiAgICBjdHggPSBtaXhpbihvYmopO1xuICAgIHJldHVybiBjdHg7XG4gIH1cbn1cblxuLyoqXG4gKiBNaXhpbiB0aGUgZW1pdHRlciBwcm9wZXJ0aWVzLlxuICpcbiAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcbiAqIEByZXR1cm4ge09iamVjdH1cbiAqIEBhcGkgcHJpdmF0ZVxuICovXG5cbmZ1bmN0aW9uIG1peGluKG9iaikge1xuICBmb3IgKHZhciBrZXkgaW4gRW1pdHRlci5wcm90b3R5cGUpIHtcbiAgICBvYmpba2V5XSA9IEVtaXR0ZXIucHJvdG90eXBlW2tleV07XG4gIH1cbiAgcmV0dXJuIG9iajtcbn1cblxuLyoqXG4gKiBMaXN0ZW4gb24gdGhlIGdpdmVuIGBldmVudGAgd2l0aCBgZm5gLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxuICogQHBhcmFtIHtGdW5jdGlvbn0gZm5cbiAqIEByZXR1cm4ge0VtaXR0ZXJ9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbkVtaXR0ZXIucHJvdG90eXBlLm9uID1cbiAgRW1pdHRlci5wcm90b3R5cGUuYWRkRXZlbnRMaXN0ZW5lciA9IGZ1bmN0aW9uKGV2ZW50LCBmbikge1xuICAgICh0aGlzLl9fY2FsbGJhY2tzW2V2ZW50XSA9IHRoaXMuX19jYWxsYmFja3NbZXZlbnRdIHx8IFtdKVxuICAgIC5wdXNoKGZuKTtcbiAgICByZXR1cm4gdGhpcztcbiAgfTtcblxuLyoqXG4gKiBBZGRzIGFuIGBldmVudGAgbGlzdGVuZXIgdGhhdCB3aWxsIGJlIGludm9rZWQgYSBzaW5nbGVcbiAqIHRpbWUgdGhlbiBhdXRvbWF0aWNhbGx5IHJlbW92ZWQuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICogQHJldHVybiB7RW1pdHRlcn1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuRW1pdHRlci5wcm90b3R5cGUub25jZSA9IGZ1bmN0aW9uKGV2ZW50LCBmbikge1xuICBmdW5jdGlvbiBvbigpIHtcbiAgICB0aGlzLm9mZihldmVudCwgb24pO1xuICAgIGZuLmFwcGx5KHRoaXMsIGFyZ3VtZW50cyk7XG4gIH1cblxuICBvbi5mbiA9IGZuO1xuICB0aGlzLm9uKGV2ZW50LCBvbik7XG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZW1vdmUgdGhlIGdpdmVuIGNhbGxiYWNrIGZvciBgZXZlbnRgIG9yIGFsbFxuICogcmVnaXN0ZXJlZCBjYWxsYmFja3MuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICogQHJldHVybiB7RW1pdHRlcn1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuRW1pdHRlci5wcm90b3R5cGUub2ZmID1cbiAgRW1pdHRlci5wcm90b3R5cGUucmVtb3ZlTGlzdGVuZXIgPVxuICBFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVBbGxMaXN0ZW5lcnMgPVxuICBFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVFdmVudExpc3RlbmVyID0gZnVuY3Rpb24oZXZlbnQsIGZuKSB7XG5cbiAgICAvLyBhbGxcbiAgICBpZiAoMCA9PT0gYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgdGhpcy5fX2NhbGxiYWNrcyA9IHt9O1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLy8gc3BlY2lmaWMgZXZlbnRcbiAgICB2YXIgY2FsbGJhY2tzID0gdGhpcy5fX2NhbGxiYWNrc1tldmVudF07XG4gICAgaWYgKCFjYWxsYmFja3MpIHtcbiAgICAgIHJldHVybiB0aGlzO1xuICAgIH1cblxuICAgIC8vIHJlbW92ZSBhbGwgaGFuZGxlcnNcbiAgICBpZiAoMSA9PT0gYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgZGVsZXRlIHRoaXMuX19jYWxsYmFja3NbZXZlbnRdO1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLy8gcmVtb3ZlIHNwZWNpZmljIGhhbmRsZXJcbiAgICB2YXIgY2I7XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBjYWxsYmFja3MubGVuZ3RoOyBpKyspIHtcbiAgICAgIGNiID0gY2FsbGJhY2tzW2ldO1xuICAgICAgaWYgKGNiID09PSBmbiB8fCBjYi5mbiA9PT0gZm4pIHtcbiAgICAgICAgY2FsbGJhY2tzLnNwbGljZShpLCAxKTtcbiAgICAgICAgYnJlYWs7XG4gICAgICB9XG4gICAgfVxuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4vKipcbiAqIEVtaXQgYGV2ZW50YCB3aXRoIHRoZSBnaXZlbiBhcmdzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxuICogQHBhcmFtIHtNaXhlZH0gLi4uXG4gKiBAcmV0dXJuIHtFbWl0dGVyfVxuICovXG5cbkVtaXR0ZXIucHJvdG90eXBlLmVtaXQgPSBmdW5jdGlvbihldmVudCkge1xuICB2YXIgYXJncyA9IFtdLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAxKSxcbiAgICBjYWxsYmFja3MgPSB0aGlzLl9fY2FsbGJhY2tzW2V2ZW50XTtcblxuICBpZiAoY2FsbGJhY2tzKSB7XG4gICAgY2FsbGJhY2tzID0gY2FsbGJhY2tzLnNsaWNlKDApO1xuICAgIGZvciAodmFyIGkgPSAwLCBsZW4gPSBjYWxsYmFja3MubGVuZ3RoOyBpIDwgbGVuOyArK2kpIHtcbiAgICAgIGNhbGxiYWNrc1tpXS5hcHBseSh0aGlzLCBhcmdzKTtcbiAgICB9XG4gIH1cblxuICByZXR1cm4gdGhpcztcbn07XG5cbi8qKlxuICogUmV0dXJuIGFycmF5IG9mIGNhbGxiYWNrcyBmb3IgYGV2ZW50YC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcbiAqIEByZXR1cm4ge0FycmF5fVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5FbWl0dGVyLnByb3RvdHlwZS5saXN0ZW5lcnMgPSBmdW5jdGlvbihldmVudCkge1xuICByZXR1cm4gdGhpcy5fX2NhbGxiYWNrc1tldmVudF0gfHwgW107XG59O1xuXG4vKipcbiAqIENoZWNrIGlmIHRoaXMgZW1pdHRlciBoYXMgYGV2ZW50YCBoYW5kbGVycy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcbiAqIEByZXR1cm4ge0Jvb2xlYW59XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbkVtaXR0ZXIucHJvdG90eXBlLmhhc0xpc3RlbmVycyA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gIHJldHVybiAhIXRoaXMubGlzdGVuZXJzKGV2ZW50KS5sZW5ndGg7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgdXRpbCA9IHJlcXVpcmUoJy4vdXRpbCcpO1xudmFyIGNyZWF0ZU1vZGVsUHJvdG90eXBlID0gcmVxdWlyZSgnLi9wcm90bycpO1xudmFyIFdyYXBwZXIgPSByZXF1aXJlKCcuL3dyYXBwZXInKTtcblxuZnVuY3Rpb24gY3JlYXRlTW9kZWxEZXNjcmlwdG9ycyhkZWYsIHBhcmVudCkge1xuXG4gIHZhciBfXyA9IHt9O1xuXG4gIHZhciBkZXNjID0ge1xuICAgIF9fOiB7XG4gICAgICB2YWx1ZTogX19cbiAgICB9LFxuICAgIF9fZGVmOiB7XG4gICAgICB2YWx1ZTogZGVmXG4gICAgfSxcbiAgICBfX3BhcmVudDoge1xuICAgICAgdmFsdWU6IHBhcmVudCxcbiAgICAgIHdyaXRhYmxlOiB0cnVlXG4gICAgfSxcbiAgICBfX2NhbGxiYWNrczoge1xuICAgICAgdmFsdWU6IHt9LFxuICAgICAgd3JpdGFibGU6IHRydWVcbiAgICB9XG4gIH07XG5cbiAgcmV0dXJuIGRlc2M7XG59XG5cbmZ1bmN0aW9uIGRlZmluZVByb3BlcnRpZXMobW9kZWwpIHtcbiAgdmFyIGRlZnMgPSBtb2RlbC5fX2RlZi5kZWZzO1xuICBmb3IgKHZhciBrZXkgaW4gZGVmcykge1xuICAgIGRlZmluZVByb3BlcnR5KG1vZGVsLCBrZXksIGRlZnNba2V5XSk7XG4gIH1cbn1cblxuZnVuY3Rpb24gZGVmaW5lUHJvcGVydHkobW9kZWwsIGtleSwgZGVmKSB7XG5cbiAgdmFyIGRlc2MgPSB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiB0aGlzLl9fZ2V0KGtleSk7XG4gICAgfSxcbiAgICBlbnVtZXJhYmxlOiBkZWYuZW51bWVyYWJsZSxcbiAgICBjb25maWd1cmFibGU6IGRlZi5jb25maWd1cmFibGVcbiAgfTtcblxuICBpZiAoZGVmLndyaXRhYmxlKSB7XG4gICAgZGVzYy5zZXQgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgdGhpcy5fX3NldE5vdGlmeUNoYW5nZShrZXksIHZhbHVlKTtcbiAgICB9O1xuICB9XG5cbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KG1vZGVsLCBrZXksIGRlc2MpO1xuXG4gIC8vIFNpbGVudGx5IGluaXRpYWxpemUgdGhlIHByb3BlcnR5IHdyYXBwZXJcbiAgbW9kZWwuX19ba2V5XSA9IGRlZi5jcmVhdGUobW9kZWwpO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVXcmFwcGVyRmFjdG9yeShkZWYpIHtcblxuICB2YXIgd3JhcHBlciwgZGVmYXVsdFZhbHVlLCBhc3NlcnQ7XG5cbiAgaWYgKGRlZi5pc1NpbXBsZSkge1xuICAgIHdyYXBwZXIgPSBuZXcgV3JhcHBlcihkZWYudmFsdWUsIGRlZi53cml0YWJsZSwgZGVmLnZhbGlkYXRvcnMsIGRlZi5nZXR0ZXIsIGRlZi5jYXN0LCBudWxsKTtcbiAgfSBlbHNlIGlmIChkZWYuaXNSZWZlcmVuY2UpIHtcblxuICAgIC8vIEhvbGQgYSByZWZlcmVuY2UgdG8gdGhlXG4gICAgLy8gcmVmZXJlcmVuY2VkIHR5cGVzJyBkZWZpbml0aW9uXG4gICAgdmFyIHJlZkRlZiA9IGRlZi50eXBlLmRlZjtcblxuICAgIGlmIChyZWZEZWYuaXNTaW1wbGUpIHtcbiAgICAgIC8vIElmIHRoZSByZWZlcmVuY2VkIHR5cGUgaXMgaXRzZWxmIHNpbXBsZSxcbiAgICAgIC8vIHdlIGNhbiBzZXQganVzdCByZXR1cm4gYSB3cmFwcGVyIGFuZFxuICAgICAgLy8gdGhlIHByb3BlcnR5IHdpbGwgZ2V0IGluaXRpYWxpemVkLlxuICAgICAgd3JhcHBlciA9IG5ldyBXcmFwcGVyKHJlZkRlZi52YWx1ZSwgcmVmRGVmLndyaXRhYmxlLCByZWZEZWYudmFsaWRhdG9ycywgZGVmLmdldHRlciwgcmVmRGVmLmNhc3QsIG51bGwpO1xuICAgIH0gZWxzZSB7XG5cbiAgICAgIC8vIElmIHdlJ3JlIG5vdCBkZWFsaW5nIHdpdGggYSBzaW1wbGUgcmVmZXJlbmNlIG1vZGVsXG4gICAgICAvLyB3ZSBuZWVkIHRvIGRlZmluZSBhbiBhc3NlcnRpb24gdGhhdCB0aGUgaW5zdGFuY2VcbiAgICAgIC8vIGJlaW5nIHNldCBpcyBvZiB0aGUgY29ycmVjdCB0eXBlLiBXZSBkbyB0aGlzIGJlXG4gICAgICAvLyBjb21wYXJpbmcgdGhlIGRlZnMuXG5cbiAgICAgIGFzc2VydCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICAgIC8vIGNvbXBhcmUgdGhlIGRlZmludGlvbnMgb2YgdGhlIHZhbHVlIGluc3RhbmNlXG4gICAgICAgIC8vIGJlaW5nIHBhc3NlZCBhbmQgdGhlIGRlZiBwcm9wZXJ0eSBhdHRhY2hlZFxuICAgICAgICAvLyB0byB0aGUgdHlwZSBTdXBlcm1vZGVsQ29uc3RydWN0b3IuIEFsbG93IHRoZVxuICAgICAgICAvLyB2YWx1ZSB0byBiZSB1bmRlZmluZWQgb3IgbnVsbCBhbHNvLlxuICAgICAgICB2YXIgaXNDb3JyZWN0VHlwZSA9IGZhbHNlO1xuXG4gICAgICAgIGlmICh1dGlsLmlzTnVsbE9yVW5kZWZpbmVkKHZhbHVlKSkge1xuICAgICAgICAgIGlzQ29ycmVjdFR5cGUgPSB0cnVlO1xuICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgIGlzQ29ycmVjdFR5cGUgPSByZWZEZWYgPT09IHZhbHVlLl9fZGVmO1xuICAgICAgICB9XG5cbiAgICAgICAgaWYgKCFpc0NvcnJlY3RUeXBlKSB7XG4gICAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdWYWx1ZSBzaG91bGQgYmUgYW4gaW5zdGFuY2Ugb2YgdGhlIHJlZmVyZW5jZWQgbW9kZWwsIG51bGwgb3IgdW5kZWZpbmVkJyk7XG4gICAgICAgIH1cbiAgICAgIH07XG5cbiAgICAgIHdyYXBwZXIgPSBuZXcgV3JhcHBlcihkZWYudmFsdWUsIGRlZi53cml0YWJsZSwgZGVmLnZhbGlkYXRvcnMsIGRlZi5nZXR0ZXIsIG51bGwsIGFzc2VydCk7XG5cbiAgICB9XG4gIH0gZWxzZSBpZiAoZGVmLmlzQXJyYXkpIHtcblxuICAgIGRlZmF1bHRWYWx1ZSA9IGZ1bmN0aW9uKHBhcmVudCkge1xuICAgICAgLy8gZm9yIEFycmF5cywgd2UgY3JlYXRlIGEgbmV3IEFycmF5IGFuZCBlYWNoXG4gICAgICAvLyB0aW1lLCBtaXggdGhlIG1vZGVsIHByb3BlcnRpZXMgaW50byBpdFxuICAgICAgdmFyIG1vZGVsID0gY3JlYXRlTW9kZWxQcm90b3R5cGUoZGVmKTtcbiAgICAgIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKG1vZGVsLCBjcmVhdGVNb2RlbERlc2NyaXB0b3JzKGRlZiwgcGFyZW50KSk7XG4gICAgICBkZWZpbmVQcm9wZXJ0aWVzKG1vZGVsKTtcbiAgICAgIHJldHVybiBtb2RlbDtcbiAgICB9O1xuXG4gICAgYXNzZXJ0ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgIC8vIHRvZG86IGZ1cnRoZXIgYXJyYXkgdHlwZSB2YWxpZGF0aW9uXG4gICAgICBpZiAoIXV0aWwuaXNBcnJheSh2YWx1ZSkpIHtcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdWYWx1ZSBzaG91bGQgYmUgYW4gYXJyYXknKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgd3JhcHBlciA9IG5ldyBXcmFwcGVyKGRlZmF1bHRWYWx1ZSwgZGVmLndyaXRhYmxlLCBkZWYudmFsaWRhdG9ycywgZGVmLmdldHRlciwgbnVsbCwgYXNzZXJ0KTtcbiAgfSBlbHNlIHtcblxuICAgIC8vIGZvciBPYmplY3RzLCB3ZSBjYW4gY3JlYXRlIGFuZCByZXVzZVxuICAgIC8vIGEgcHJvdG90eXBlIG9iamVjdC4gV2UgdGhlbiBuZWVkIHRvIG9ubHlcbiAgICAvLyBkZWZpbmUgdGhlIGRlZnMgYW5kIHRoZSAnaW5zdGFuY2UnIHByb3BlcnRpZXNcbiAgICAvLyBlLmcuIF9fLCBwYXJlbnQgZXRjLlxuICAgIHZhciBwcm90byA9IGNyZWF0ZU1vZGVsUHJvdG90eXBlKGRlZik7XG5cbiAgICBkZWZhdWx0VmFsdWUgPSBmdW5jdGlvbihwYXJlbnQpIHtcbiAgICAgIHZhciBtb2RlbCA9IE9iamVjdC5jcmVhdGUocHJvdG8sIGNyZWF0ZU1vZGVsRGVzY3JpcHRvcnMoZGVmLCBwYXJlbnQpKTtcbiAgICAgIGRlZmluZVByb3BlcnRpZXMobW9kZWwpO1xuICAgICAgcmV0dXJuIG1vZGVsO1xuICAgIH07XG5cbiAgICBhc3NlcnQgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgaWYgKCFwcm90by5pc1Byb3RvdHlwZU9mKHZhbHVlKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgcHJvdG90eXBlJyk7XG4gICAgICB9XG4gICAgfTtcblxuICAgIHdyYXBwZXIgPSBuZXcgV3JhcHBlcihkZWZhdWx0VmFsdWUsIGRlZi53cml0YWJsZSwgZGVmLnZhbGlkYXRvcnMsIGRlZi5nZXR0ZXIsIG51bGwsIGFzc2VydCk7XG4gIH1cblxuICB2YXIgZmFjdG9yeSA9IGZ1bmN0aW9uKHBhcmVudCkge1xuICAgIHZhciB3cmFwID0gT2JqZWN0LmNyZWF0ZSh3cmFwcGVyKTtcbiAgICAvL2lmICghd3JhcC5pc0luaXRpYWxpemVkKSB7XG4gICAgd3JhcC5pbml0aWFsaXplKHBhcmVudCk7XG4gICAgLy99XG4gICAgcmV0dXJuIHdyYXA7XG4gIH07XG5cbiAgLy8gZXhwb3NlIHRoZSB3cmFwcGVyLCB0aGlzIGlzIHVzZWRcbiAgLy8gZm9yIHZhbGlkYXRpbmcgYXJyYXkgaXRlbXMgbGF0ZXJcbiAgZmFjdG9yeS53cmFwcGVyID0gd3JhcHBlcjtcblxuICByZXR1cm4gZmFjdG9yeTtcbn1cblxubW9kdWxlLmV4cG9ydHMgPSBjcmVhdGVXcmFwcGVyRmFjdG9yeTtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIEVtaXR0ZXJFdmVudCA9IHJlcXVpcmUoJy4vZW1pdHRlci1ldmVudCcpO1xudmFyIFZhbGlkYXRpb25FcnJvciA9IHJlcXVpcmUoJy4vdmFsaWRhdGlvbi1lcnJvcicpO1xudmFyIFdyYXBwZXIgPSByZXF1aXJlKCcuL3dyYXBwZXInKTtcblxudmFyIGRlc2NyaXB0b3JzID0ge1xuICBfX3N1cGVybW9kZWw6IHtcbiAgICB2YWx1ZTogdHJ1ZVxuICB9LFxuICBfX2tleXM6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGtleXMgPSBPYmplY3Qua2V5cyh0aGlzKTtcblxuICAgICAgaWYgKEFycmF5LmlzQXJyYXkodGhpcykpIHtcbiAgICAgICAgdmFyIG9taXQgPSBbXG4gICAgICAgICAgJ2FkZEV2ZW50TGlzdGVuZXInLCAnb24nLCAnb25jZScsICdyZW1vdmVFdmVudExpc3RlbmVyJywgJ3JlbW92ZUFsbExpc3RlbmVycycsXG4gICAgICAgICAgJ3JlbW92ZUxpc3RlbmVyJywgJ29mZicsICdlbWl0JywgJ2xpc3RlbmVycycsICdoYXNMaXN0ZW5lcnMnLCAncG9wJywgJ3B1c2gnLFxuICAgICAgICAgICdyZXZlcnNlJywgJ3NoaWZ0JywgJ3NvcnQnLCAnc3BsaWNlJywgJ3VwZGF0ZScsICd1bnNoaWZ0JywgJ2NyZWF0ZScsXG4gICAgICAgICAgJ19fc2V0Tm90aWZ5Q2hhbmdlJywgJ19fbm90aWZ5Q2hhbmdlJywgJ19fc2V0JywgJ19fZ2V0JywgJ19fY2hhaW4nLCAnX19yZWxhdGl2ZVBhdGgnXG4gICAgICAgIF07XG5cbiAgICAgICAga2V5cyA9IGtleXMuZmlsdGVyKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgICByZXR1cm4gb21pdC5pbmRleE9mKGl0ZW0pIDwgMDtcbiAgICAgICAgfSk7XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBrZXlzO1xuICAgIH1cbiAgfSxcbiAgX19uYW1lOiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIGlmICh0aGlzLl9faXNSb290KSB7XG4gICAgICAgIHJldHVybiAnJztcbiAgICAgIH1cblxuICAgICAgLy8gV29yayBvdXQgdGhlICduYW1lJyBvZiB0aGUgbW9kZWxcbiAgICAgIC8vIExvb2sgdXAgdG8gdGhlIHBhcmVudCBhbmQgbG9vcCB0aHJvdWdoIGl0J3Mga2V5cyxcbiAgICAgIC8vIEFueSB2YWx1ZSBvciBhcnJheSBmb3VuZCB0byBjb250YWluIHRoZSB2YWx1ZSBvZiB0aGlzICh0aGlzIG1vZGVsKVxuICAgICAgLy8gdGhlbiB3ZSByZXR1cm4gdGhlIGtleSBhbmQgaW5kZXggaW4gdGhlIGNhc2Ugd2UgZm91bmQgdGhlIG1vZGVsIGluIGFuIGFycmF5LlxuICAgICAgdmFyIHBhcmVudEtleXMgPSB0aGlzLl9fcGFyZW50Ll9fa2V5cztcbiAgICAgIHZhciBwYXJlbnRLZXksIHBhcmVudFZhbHVlLCBpc0FycmF5O1xuXG4gICAgICBmb3IgKHZhciBpID0gMDsgaSA8IHBhcmVudEtleXMubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgcGFyZW50S2V5ID0gcGFyZW50S2V5c1tpXTtcbiAgICAgICAgcGFyZW50VmFsdWUgPSB0aGlzLl9fcGFyZW50W3BhcmVudEtleV07XG4gICAgICAgIGlzQXJyYXkgPSBBcnJheS5pc0FycmF5KHBhcmVudFZhbHVlKTtcblxuICAgICAgICBpZiAocGFyZW50VmFsdWUgPT09IHRoaXMpIHtcbiAgICAgICAgICByZXR1cm4gcGFyZW50S2V5O1xuICAgICAgICB9XG4gICAgICB9XG4gICAgfVxuICB9LFxuICBfX3BhdGg6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKHRoaXMuX19oYXNBbmNlc3RvcnMgJiYgIXRoaXMuX19wYXJlbnQuX19pc1Jvb3QpIHtcbiAgICAgICAgcmV0dXJuIHRoaXMuX19wYXJlbnQuX19wYXRoICsgJy4nICsgdGhpcy5fX25hbWU7XG4gICAgICB9IGVsc2Uge1xuICAgICAgICByZXR1cm4gdGhpcy5fX25hbWU7XG4gICAgICB9XG4gICAgfVxuICB9LFxuICBfX2lzUm9vdDoge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gIXRoaXMuX19oYXNBbmNlc3RvcnM7XG4gICAgfVxuICB9LFxuICBfX2NoaWxkcmVuOiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBjaGlsZHJlbiA9IFtdO1xuXG4gICAgICB2YXIga2V5cyA9IHRoaXMuX19rZXlzO1xuICAgICAgdmFyIGtleSwgdmFsdWU7XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7IGkrKykge1xuXG4gICAgICAgIGtleSA9IGtleXNbaV07XG4gICAgICAgIHZhbHVlID0gdGhpc1trZXldO1xuXG4gICAgICAgIGlmICh2YWx1ZSAmJiB2YWx1ZS5fX3N1cGVybW9kZWwpIHtcblxuICAgICAgICAgIGNoaWxkcmVuLnB1c2godmFsdWUpO1xuXG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGNoaWxkcmVuO1xuICAgIH1cbiAgfSxcbiAgX19hbmNlc3RvcnM6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGFuY2VzdG9ycyA9IFtdLFxuICAgICAgICByID0gdGhpcztcblxuICAgICAgd2hpbGUgKHIuX19wYXJlbnQpIHtcbiAgICAgICAgYW5jZXN0b3JzLnB1c2goci5fX3BhcmVudCk7XG4gICAgICAgIHIgPSByLl9fcGFyZW50O1xuICAgICAgfVxuXG4gICAgICByZXR1cm4gYW5jZXN0b3JzO1xuICAgIH1cbiAgfSxcbiAgX19kZXNjZW5kYW50czoge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgZGVzY2VuZGFudHMgPSBbXTtcblxuICAgICAgZnVuY3Rpb24gY2hlY2tBbmRBZGREZXNjZW5kYW50SWZNb2RlbChvYmopIHtcblxuICAgICAgICB2YXIga2V5cyA9IG9iai5fX2tleXM7XG4gICAgICAgIHZhciBrZXksIHZhbHVlO1xuXG4gICAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7IGkrKykge1xuXG4gICAgICAgICAga2V5ID0ga2V5c1tpXTtcbiAgICAgICAgICB2YWx1ZSA9IG9ialtrZXldO1xuXG4gICAgICAgICAgaWYgKHZhbHVlICYmIHZhbHVlLl9fc3VwZXJtb2RlbCkge1xuXG4gICAgICAgICAgICBkZXNjZW5kYW50cy5wdXNoKHZhbHVlKTtcbiAgICAgICAgICAgIGNoZWNrQW5kQWRkRGVzY2VuZGFudElmTW9kZWwodmFsdWUpO1xuXG4gICAgICAgICAgfVxuICAgICAgICB9XG5cbiAgICAgIH1cblxuICAgICAgY2hlY2tBbmRBZGREZXNjZW5kYW50SWZNb2RlbCh0aGlzKTtcblxuICAgICAgcmV0dXJuIGRlc2NlbmRhbnRzO1xuICAgIH1cbiAgfSxcbiAgX19oYXNBbmNlc3RvcnM6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuICEhdGhpcy5fX2FuY2VzdG9ycy5sZW5ndGg7XG4gICAgfVxuICB9LFxuICBfX2hhc0Rlc2NlbmRhbnRzOiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiAhIXRoaXMuX19kZXNjZW5kYW50cy5sZW5ndGg7XG4gICAgfVxuICB9LFxuICBlcnJvcnM6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGVycm9ycyA9IFtdLFxuICAgICAgICBkZWYgPSB0aGlzLl9fZGVmO1xuICAgICAgdmFyIHZhbGlkYXRvciwgZXJyb3IsIGksIGo7XG5cbiAgICAgIC8vIFJ1biBvd24gdmFsaWRhdG9yc1xuICAgICAgdmFyIG93biA9IGRlZi52YWxpZGF0b3JzLnNsaWNlKDApO1xuICAgICAgZm9yIChpID0gMDsgaSA8IG93bi5sZW5ndGg7IGkrKykge1xuICAgICAgICB2YWxpZGF0b3IgPSBvd25baV07XG4gICAgICAgIGVycm9yID0gdmFsaWRhdG9yLmNhbGwodGhpcywgdGhpcyk7XG5cbiAgICAgICAgaWYgKGVycm9yKSB7XG4gICAgICAgICAgZXJyb3JzLnB1c2gobmV3IFZhbGlkYXRpb25FcnJvcih0aGlzLCBlcnJvciwgdmFsaWRhdG9yKSk7XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgLy8gUnVuIHRocm91Z2gga2V5cyBhbmQgZXZhbHVhdGUgdmFsaWRhdG9yc1xuICAgICAgdmFyIGtleXMgPSB0aGlzLl9fa2V5cztcbiAgICAgIHZhciB2YWx1ZSwga2V5LCBpdGVtRGVmO1xuXG4gICAgICBmb3IgKGkgPSAwOyBpIDwga2V5cy5sZW5ndGg7IGkrKykge1xuXG4gICAgICAgIGtleSA9IGtleXNbaV07XG5cbiAgICAgICAgLy8gSWYgd2UgYXJlIGFuIEFycmF5IHdpdGggYW4gaXRlbSBkZWZpbml0aW9uXG4gICAgICAgIC8vIHRoZW4gd2UgaGF2ZSB0byBsb29rIGludG8gdGhlIEFycmF5IGZvciBvdXIgdmFsdWVcbiAgICAgICAgLy8gYW5kIGFsc28gZ2V0IGhvbGQgb2YgdGhlIHdyYXBwZXIuIFdlIG9ubHkgbmVlZCB0b1xuICAgICAgICAvLyBkbyB0aGlzIGlmIHRoZSBrZXkgaXMgbm90IGEgcHJvcGVydHkgb2YgdGhlIGFycmF5LlxuICAgICAgICAvLyBXZSBjaGVjayB0aGUgZGVmcyB0byB3b3JrIHRoaXMgb3V0IChpLmUuIDAsIDEsIDIpLlxuICAgICAgICAvLyB0b2RvOiBUaGlzIGNvdWxkIGJlIGJldHRlciB0byBjaGVjayAhTmFOIG9uIHRoZSBrZXk/XG4gICAgICAgIGlmIChkZWYuaXNBcnJheSAmJiBkZWYuZGVmICYmICghZGVmLmRlZnMgfHwgIShrZXkgaW4gZGVmLmRlZnMpKSkge1xuXG4gICAgICAgICAgLy8gSWYgd2UgYXJlIGFuIEFycmF5IHdpdGggYSBzaW1wbGUgaXRlbSBkZWZpbml0aW9uXG4gICAgICAgICAgLy8gb3IgYSByZWZlcmVuY2UgdG8gYSBzaW1wbGUgdHlwZSBkZWZpbml0aW9uXG4gICAgICAgICAgLy8gc3Vic3RpdHV0ZSB0aGUgdmFsdWUgd2l0aCB0aGUgd3JhcHBlciB3ZSBnZXQgZnJvbSB0aGVcbiAgICAgICAgICAvLyBjcmVhdGUgZmFjdG9yeSBmdW5jdGlvbi4gT3RoZXJ3aXNlIHNldCB0aGUgdmFsdWUgdG9cbiAgICAgICAgICAvLyB0aGUgcmVhbCB2YWx1ZSBvZiB0aGUgcHJvcGVydHkuXG4gICAgICAgICAgaXRlbURlZiA9IGRlZi5kZWY7XG5cbiAgICAgICAgICBpZiAoaXRlbURlZi5pc1NpbXBsZSkge1xuICAgICAgICAgICAgdmFsdWUgPSBpdGVtRGVmLmNyZWF0ZS53cmFwcGVyO1xuICAgICAgICAgICAgdmFsdWUuc2V0VmFsdWUodGhpc1trZXldKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKGl0ZW1EZWYuaXNSZWZlcmVuY2UgJiYgaXRlbURlZi50eXBlLmRlZi5pc1NpbXBsZSkge1xuICAgICAgICAgICAgdmFsdWUgPSBpdGVtRGVmLnR5cGUuZGVmLmNyZWF0ZS53cmFwcGVyO1xuICAgICAgICAgICAgdmFsdWUuc2V0VmFsdWUodGhpc1trZXldKTtcbiAgICAgICAgICB9IGVsc2Uge1xuICAgICAgICAgICAgdmFsdWUgPSB0aGlzW2tleV07XG4gICAgICAgICAgfVxuICAgICAgICB9IGVsc2Uge1xuXG4gICAgICAgICAgLy8gU2V0IHRoZSB2YWx1ZSB0byB0aGUgd3JhcHBlZCB2YWx1ZSBvZiB0aGUgcHJvcGVydHlcbiAgICAgICAgICB2YWx1ZSA9IHRoaXMuX19ba2V5XTtcbiAgICAgICAgfVxuXG4gICAgICAgIGlmICh2YWx1ZSkge1xuXG4gICAgICAgICAgaWYgKHZhbHVlLl9fc3VwZXJtb2RlbCkge1xuICAgICAgICAgICAgQXJyYXkucHJvdG90eXBlLnB1c2guYXBwbHkoZXJyb3JzLCB2YWx1ZS5lcnJvcnMpO1xuICAgICAgICAgIH0gZWxzZSBpZiAodmFsdWUgaW5zdGFuY2VvZiBXcmFwcGVyKSB7XG5cbiAgICAgICAgICAgIHZhciB3cmFwcGVyVmFsdWUgPSB2YWx1ZS5nZXRWYWx1ZSh0aGlzKTtcbiAgICAgICAgICAgIC8vIGBTaW1wbGVgIHByb3BlcnRpZXMgY2FuIGJlIGlkZW50aWZpZWQgYnkgbm90IGhhdmluZyBhblxuICAgICAgICAgICAgLy8gYXNzZXJ0aW9uLiBUb2RvOiBUaGlzIG1heSBuZWVkIHRvIGJlY29tZSBtb3JlIGV4cGxpY2l0LlxuICAgICAgICAgICAgaWYgKCF2YWx1ZS5fYXNzZXJ0KSB7XG5cbiAgICAgICAgICAgICAgdmFyIHNpbXBsZSA9IHZhbHVlLnZhbGlkYXRvcnM7XG4gICAgICAgICAgICAgIGZvciAoaiA9IDA7IGogPCBzaW1wbGUubGVuZ3RoOyBqKyspIHtcbiAgICAgICAgICAgICAgICB2YWxpZGF0b3IgPSBzaW1wbGVbal07XG4gICAgICAgICAgICAgICAgZXJyb3IgPSB2YWxpZGF0b3IuY2FsbCh0aGlzLCB3cmFwcGVyVmFsdWUsIGtleSk7XG5cbiAgICAgICAgICAgICAgICBpZiAoZXJyb3IpIHtcbiAgICAgICAgICAgICAgICAgIGVycm9ycy5wdXNoKG5ldyBWYWxpZGF0aW9uRXJyb3IodGhpcywgZXJyb3IsIHZhbGlkYXRvciwga2V5KSk7XG4gICAgICAgICAgICAgICAgfVxuICAgICAgICAgICAgICB9XG5cbiAgICAgICAgICAgIH0gZWxzZSBpZiAod3JhcHBlclZhbHVlICYmIHdyYXBwZXJWYWx1ZS5fX3N1cGVybW9kZWwpIHtcbiAgICAgICAgICAgICAgQXJyYXkucHJvdG90eXBlLnB1c2guYXBwbHkoZXJyb3JzLCB3cmFwcGVyVmFsdWUuZXJyb3JzKTtcbiAgICAgICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgICAgIHRocm93ICdqdXN0IGNoZWNraW5nJztcbiAgICAgICAgICAgIH1cbiAgICAgICAgICB9XG4gICAgICAgIH1cbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGVycm9ycztcbiAgICB9XG4gIH1cbn07XG5cbnZhciBwcm90byA9IHtcbiAgX19nZXQ6IGZ1bmN0aW9uKGtleSkge1xuICAgIHJldHVybiB0aGlzLl9fW2tleV0uZ2V0VmFsdWUodGhpcyk7XG4gIH0sXG4gIF9fc2V0OiBmdW5jdGlvbihrZXksIHZhbHVlKSB7XG4gICAgdGhpcy5fX1trZXldLnNldFZhbHVlKHZhbHVlLCB0aGlzKTtcbiAgfSxcbiAgX19yZWxhdGl2ZVBhdGg6IGZ1bmN0aW9uKHRvLCBrZXkpIHtcbiAgICB2YXIgcmVsYXRpdmVQYXRoID0gdGhpcy5fX3BhdGggPyB0by5zdWJzdHIodGhpcy5fX3BhdGgubGVuZ3RoICsgMSkgOiB0bztcblxuICAgIGlmIChyZWxhdGl2ZVBhdGgpIHtcbiAgICAgIHJldHVybiBrZXkgPyByZWxhdGl2ZVBhdGggKyAnLicgKyBrZXkgOiByZWxhdGl2ZVBhdGg7XG4gICAgfVxuICAgIHJldHVybiBrZXk7XG4gIH0sXG4gIF9fY2hhaW46IGZ1bmN0aW9uKGZuKSB7XG4gICAgcmV0dXJuIFt0aGlzXS5jb25jYXQodGhpcy5fX2FuY2VzdG9ycykuZm9yRWFjaChmbik7XG4gIH0sXG4gIF9fbm90aWZ5Q2hhbmdlOiBmdW5jdGlvbihrZXksIG5ld1ZhbHVlLCBvbGRWYWx1ZSkge1xuICAgIHZhciB0YXJnZXQgPSB0aGlzO1xuICAgIHZhciB0YXJnZXRQYXRoID0gdGhpcy5fX3BhdGg7XG4gICAgdmFyIGV2ZW50TmFtZSA9ICdzZXQnO1xuICAgIHZhciBkYXRhID0ge1xuICAgICAgb2xkVmFsdWU6IG9sZFZhbHVlLFxuICAgICAgbmV3VmFsdWU6IG5ld1ZhbHVlXG4gICAgfTtcblxuICAgIHRoaXMuZW1pdChldmVudE5hbWUsIG5ldyBFbWl0dGVyRXZlbnQoZXZlbnROYW1lLCBrZXksIHRhcmdldCwgZGF0YSkpO1xuICAgIHRoaXMuZW1pdCgnY2hhbmdlJywgbmV3IEVtaXR0ZXJFdmVudChldmVudE5hbWUsIGtleSwgdGFyZ2V0LCBkYXRhKSk7XG4gICAgdGhpcy5fX2FuY2VzdG9ycy5mb3JFYWNoKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgIHZhciBwYXRoID0gaXRlbS5fX3JlbGF0aXZlUGF0aCh0YXJnZXRQYXRoLCBrZXkpO1xuICAgICAgaXRlbS5lbWl0KCdjaGFuZ2UnLCBuZXcgRW1pdHRlckV2ZW50KGV2ZW50TmFtZSwgcGF0aCwgdGFyZ2V0LCBkYXRhKSk7XG4gICAgfSk7XG4gIH0sXG4gIF9fc2V0Tm90aWZ5Q2hhbmdlOiBmdW5jdGlvbihrZXksIHZhbHVlKSB7XG4gICAgdmFyIG9sZFZhbHVlID0gdGhpcy5fX2dldChrZXkpO1xuICAgIHRoaXMuX19zZXQoa2V5LCB2YWx1ZSk7XG4gICAgdmFyIG5ld1ZhbHVlID0gdGhpcy5fX2dldChrZXkpO1xuICAgIHRoaXMuX19ub3RpZnlDaGFuZ2Uoa2V5LCBuZXdWYWx1ZSwgb2xkVmFsdWUpO1xuICB9XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IHtcbiAgcHJvdG86IHByb3RvLFxuICBkZXNjcmlwdG9yczogZGVzY3JpcHRvcnNcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBlbWl0dGVyID0gcmVxdWlyZSgnLi9lbWl0dGVyLW9iamVjdCcpO1xudmFyIGVtaXR0ZXJBcnJheSA9IHJlcXVpcmUoJy4vZW1pdHRlci1hcnJheScpO1xudmFyIEVtaXR0ZXJFdmVudCA9IHJlcXVpcmUoJy4vZW1pdHRlci1ldmVudCcpO1xuXG52YXIgZXh0ZW5kID0gcmVxdWlyZSgnLi91dGlsJykuZXh0ZW5kO1xudmFyIG1vZGVsID0gcmVxdWlyZSgnLi9tb2RlbCcpO1xudmFyIG1vZGVsUHJvdG8gPSBtb2RlbC5wcm90bztcbnZhciBtb2RlbERlc2NyaXB0b3JzID0gbW9kZWwuZGVzY3JpcHRvcnM7XG5cbnZhciBtb2RlbFByb3RvdHlwZSA9IE9iamVjdC5jcmVhdGUobW9kZWxQcm90bywgbW9kZWxEZXNjcmlwdG9ycyk7XG52YXIgb2JqZWN0UHJvdG90eXBlID0gKGZ1bmN0aW9uKCkge1xuICB2YXIgcCA9IE9iamVjdC5jcmVhdGUobW9kZWxQcm90b3R5cGUpO1xuXG4gIGVtaXR0ZXIocCk7XG5cbiAgcmV0dXJuIHA7XG59KSgpO1xuXG5mdW5jdGlvbiBjcmVhdGVBcnJheVByb3RvdHlwZSgpIHtcblxuICB2YXIgcCA9IGVtaXR0ZXJBcnJheShmdW5jdGlvbihldmVudE5hbWUsIGFyciwgZSkge1xuXG4gICAgaWYgKGV2ZW50TmFtZSA9PT0gJ3VwZGF0ZScpIHtcbiAgICAgIC8qKlxuICAgICAgICogRm9yd2FyZCB0aGUgc3BlY2lhbCBhcnJheSB1cGRhdGVcbiAgICAgICAqIGV2ZW50cyBhcyBzdGFuZGFyZCBfX25vdGlmeUNoYW5nZSBldmVudHNcbiAgICAgICAqL1xuICAgICAgYXJyLl9fbm90aWZ5Q2hhbmdlKGUuaW5kZXgsIGUudmFsdWUsIGUub2xkVmFsdWUpO1xuICAgIH0gZWxzZSB7XG4gICAgICAvKipcbiAgICAgICAqIEFsbCBvdGhlciBldmVudHMgZS5nLiBwdXNoLCBzcGxpY2UgYXJlIHJlbGF5ZWRcbiAgICAgICAqL1xuICAgICAgdmFyIHRhcmdldCA9IGFycjtcbiAgICAgIHZhciBwYXRoID0gYXJyLl9fcGF0aDtcbiAgICAgIHZhciBkYXRhID0gZTtcbiAgICAgIHZhciBrZXkgPSBlLmluZGV4O1xuXG4gICAgICBhcnIuZW1pdChldmVudE5hbWUsIG5ldyBFbWl0dGVyRXZlbnQoZXZlbnROYW1lLCAnJywgdGFyZ2V0LCBkYXRhKSk7XG4gICAgICBhcnIuZW1pdCgnY2hhbmdlJywgbmV3IEVtaXR0ZXJFdmVudChldmVudE5hbWUsICcnLCB0YXJnZXQsIGRhdGEpKTtcbiAgICAgIGFyci5fX2FuY2VzdG9ycy5mb3JFYWNoKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgICAgdmFyIG5hbWUgPSBpdGVtLl9fcmVsYXRpdmVQYXRoKHBhdGgsIGtleSk7XG4gICAgICAgIGl0ZW0uZW1pdCgnY2hhbmdlJywgbmV3IEVtaXR0ZXJFdmVudChldmVudE5hbWUsIG5hbWUsIHRhcmdldCwgZGF0YSkpO1xuICAgICAgfSk7XG5cbiAgICB9XG4gIH0pO1xuXG4gIE9iamVjdC5kZWZpbmVQcm9wZXJ0aWVzKHAsIG1vZGVsRGVzY3JpcHRvcnMpO1xuXG4gIGVtaXR0ZXIocCk7XG5cbiAgZXh0ZW5kKHAsIG1vZGVsUHJvdG8pO1xuXG4gIHJldHVybiBwO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVPYmplY3RNb2RlbFByb3RvdHlwZShwcm90bykge1xuICB2YXIgcCA9IE9iamVjdC5jcmVhdGUob2JqZWN0UHJvdG90eXBlKTtcblxuICBpZiAocHJvdG8pIHtcbiAgICBleHRlbmQocCwgcHJvdG8pO1xuICB9XG5cbiAgcmV0dXJuIHA7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZUFycmF5TW9kZWxQcm90b3R5cGUocHJvdG8sIGl0ZW1EZWYpIHtcblxuICAvLyBXZSBkbyBub3QgdG8gYXR0ZW1wdCB0byBzdWJjbGFzcyBBcnJheSxcbiAgLy8gaW5zdGVhZCBjcmVhdGUgYSBuZXcgaW5zdGFuY2UgZWFjaCB0aW1lLlxuICB2YXIgcCA9IGNyZWF0ZUFycmF5UHJvdG90eXBlKCk7XG5cbiAgaWYgKHByb3RvKSB7XG4gICAgZXh0ZW5kKHAsIHByb3RvKTtcbiAgfVxuXG4gIGlmIChpdGVtRGVmKSB7XG5cbiAgICAvLyBXZSBoYXZlIGEgZGVmaW5pdGlvbiBmb3IgdGhlIGl0ZW1zXG4gICAgLy8gdGhhdCBiZWxvbmcgaW4gdGhpcyBhcnJheS5cblxuICAgIC8vIFVzZSB0aGUgYHdyYXBwZXJgIHByb3RvdHlwZSBwcm9wZXJ0eSBhcyBhXG4gICAgLy8gdmlydHVhbCBXcmFwcGVyIG9iamVjdCB3ZSBjYW4gdXNlXG4gICAgLy8gdmFsaWRhdGUgdGhlIGl0ZW1zIGluIHRoZSBhcnJheS5cbiAgICB2YXIgYXJySXRlbVdyYXBwZXIgPSBpdGVtRGVmLmNyZWF0ZS53cmFwcGVyO1xuXG4gICAgLy8gVmFsaWRhdGUgbmV3IG1vZGVscyBieSBvdmVycmlkaW5nIHRoZSBlbWl0dGVyIGFycmF5XG4gICAgLy8gbXV0YXRvcnMgdGhhdCBjYW4gY2F1c2UgbmV3IGl0ZW1zIHRvIGVudGVyIHRoZSBhcnJheS5cbiAgICBvdmVycmlkZUFycmF5QWRkaW5nTXV0YXRvcnMocCwgYXJySXRlbVdyYXBwZXIpO1xuXG4gICAgLy8gUHJvdmlkZSBhIGNvbnZlbmllbnQgbW9kZWwgZmFjdG9yeVxuICAgIC8vIGZvciBjcmVhdGluZyBhcnJheSBpdGVtIGluc3RhbmNlc1xuICAgIC8vIGlmIHRoZSByaWdodCBjb25kaXRpb25zIGFyZSBtZXQuXG4gICAgLy9pZiAoIWl0ZW1EZWYuaXNTaW1wbGUgJiYgIWl0ZW1EZWYuaXNSZWZlcmVuY2UpIHtcbiAgICBwLmNyZWF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGl0ZW1EZWYuaXNSZWZlcmVuY2UgPyBpdGVtRGVmLnR5cGUoKSA6IGl0ZW1EZWYuY3JlYXRlKCkuZ2V0VmFsdWUodGhpcyk7XG4gICAgfTtcbiAgICAvL31cbiAgfVxuXG4gIHJldHVybiBwO1xufVxuXG5mdW5jdGlvbiBnZXRBcnJheUFyZ3MoaXRlbVdyYXBwZXIsIGl0ZW1zKSB7XG4gIHZhciBhcmdzID0gW107XG4gIGZvciAodmFyIGkgPSAwOyBpIDwgaXRlbXMubGVuZ3RoOyBpKyspIHtcbiAgICBpdGVtV3JhcHBlci5zZXRWYWx1ZShpdGVtc1tpXSwgaXRlbVdyYXBwZXIuX3BhcmVudCk7XG4gICAgYXJncy5wdXNoKGl0ZW1XcmFwcGVyLmdldFZhbHVlKGl0ZW1XcmFwcGVyLl9wYXJlbnQpKTtcbiAgfVxuICByZXR1cm4gYXJncztcbn1cblxuZnVuY3Rpb24gb3ZlcnJpZGVBcnJheUFkZGluZ011dGF0b3JzKGFyciwgaXRlbVdyYXBwZXIpIHtcbiAgaXRlbVdyYXBwZXIuX3BhcmVudCA9IGFycjtcblxuICB2YXIgcHVzaCA9IGFyci5wdXNoO1xuICB2YXIgdW5zaGlmdCA9IGFyci51bnNoaWZ0O1xuICB2YXIgc3BsaWNlID0gYXJyLnNwbGljZTtcbiAgdmFyIHVwZGF0ZSA9IGFyci51cGRhdGU7XG5cbiAgaWYgKHB1c2gpIHtcbiAgICBhcnIucHVzaCA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGFyZ3MgPSBnZXRBcnJheUFyZ3MoaXRlbVdyYXBwZXIsIGFyZ3VtZW50cyk7XG4gICAgICByZXR1cm4gcHVzaC5hcHBseShhcnIsIGFyZ3MpO1xuICAgIH07XG4gIH1cblxuICBpZiAodW5zaGlmdCkge1xuICAgIGFyci51bnNoaWZ0ID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgYXJncyA9IGdldEFycmF5QXJncyhpdGVtV3JhcHBlciwgYXJndW1lbnRzKTtcbiAgICAgIHJldHVybiB1bnNoaWZ0LmFwcGx5KGFyciwgYXJncyk7XG4gICAgfTtcbiAgfVxuXG4gIGlmIChzcGxpY2UpIHtcbiAgICBhcnIuc3BsaWNlID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgYXJncyA9IGdldEFycmF5QXJncyhpdGVtV3JhcHBlciwgQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKSk7XG4gICAgICBhcmdzLnVuc2hpZnQoYXJndW1lbnRzWzFdKTtcbiAgICAgIGFyZ3MudW5zaGlmdChhcmd1bWVudHNbMF0pO1xuICAgICAgcmV0dXJuIHNwbGljZS5hcHBseShhcnIsIGFyZ3MpO1xuICAgIH07XG4gIH1cblxuICBpZiAodXBkYXRlKSB7XG4gICAgYXJyLnVwZGF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGFyZ3MgPSBnZXRBcnJheUFyZ3MoaXRlbVdyYXBwZXIsIFthcmd1bWVudHNbMV1dKTtcbiAgICAgIGFyZ3MudW5zaGlmdChhcmd1bWVudHNbMF0pO1xuICAgICAgcmV0dXJuIHVwZGF0ZS5hcHBseShhcnIsIGFyZ3MpO1xuICAgIH07XG4gIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlTW9kZWxQcm90b3R5cGUoZGVmKSB7XG4gIHJldHVybiBkZWYuaXNBcnJheSA/IGNyZWF0ZUFycmF5TW9kZWxQcm90b3R5cGUoZGVmLnByb3RvLCBkZWYuZGVmKSA6IGNyZWF0ZU9iamVjdE1vZGVsUHJvdG90eXBlKGRlZi5wcm90byk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gY3JlYXRlTW9kZWxQcm90b3R5cGU7XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge307XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBjcmVhdGVEZWYgPSByZXF1aXJlKCcuL2RlZicpO1xudmFyIFN1cGVybW9kZWwgPSByZXF1aXJlKCcuL3N1cGVybW9kZWwnKTtcblxuZnVuY3Rpb24gc3VwZXJtb2RlbHMoc2NoZW1hLCBpbml0aWFsaXplcikge1xuXG4gIHZhciBkZWYgPSBjcmVhdGVEZWYoc2NoZW1hKTtcblxuICBmdW5jdGlvbiBTdXBlcm1vZGVsQ29uc3RydWN0b3IoKSB7XG4gICAgdmFyIG1vZGVsID0gZGVmLmlzU2ltcGxlID8gZGVmLmNyZWF0ZSgpIDogZGVmLmNyZWF0ZSgpLmdldFZhbHVlKHt9KTtcblxuICAgIC8vIENhbGwgYW55IGluaXRpYWxpemVyXG4gICAgaWYgKGluaXRpYWxpemVyKSB7XG4gICAgICBpbml0aWFsaXplci5hcHBseShtb2RlbCwgYXJndW1lbnRzKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbW9kZWw7XG4gIH1cbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KFN1cGVybW9kZWxDb25zdHJ1Y3RvciwgJ2RlZicsIHtcbiAgICB2YWx1ZTogZGVmIC8vIHRoaXMgaXMgdXNlZCB0byB2YWxpZGF0ZSByZWZlcmVuY2VkIFN1cGVybW9kZWxDb25zdHJ1Y3RvcnNcbiAgfSk7XG4gIFN1cGVybW9kZWxDb25zdHJ1Y3Rvci5wcm90b3R5cGUgPSBTdXBlcm1vZGVsOyAvLyB0aGlzIHNoYXJlZCBvYmplY3QgaXMgdXNlZCwgYXMgYSBwcm90b3R5cGUsIHRvIGlkZW50aWZ5IFN1cGVybW9kZWxDb25zdHJ1Y3RvcnNcbiAgU3VwZXJtb2RlbENvbnN0cnVjdG9yLmNvbnN0cnVjdG9yID0gU3VwZXJtb2RlbENvbnN0cnVjdG9yO1xuXG4gIHJldHVybiBTdXBlcm1vZGVsQ29uc3RydWN0b3I7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gc3VwZXJtb2RlbHM7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBTdXBlcm1vZGVsID0gcmVxdWlyZSgnLi9zdXBlcm1vZGVsJyk7XG5cbmZ1bmN0aW9uIGV4dGVuZChvcmlnaW4sIGFkZCkge1xuICAvLyBEb24ndCBkbyBhbnl0aGluZyBpZiBhZGQgaXNuJ3QgYW4gb2JqZWN0XG4gIGlmICghYWRkIHx8IHR5cGVvZiBhZGQgIT09ICdvYmplY3QnKSB7XG4gICAgcmV0dXJuIG9yaWdpbjtcbiAgfVxuXG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMoYWRkKTtcbiAgdmFyIGkgPSBrZXlzLmxlbmd0aDtcbiAgd2hpbGUgKGktLSkge1xuICAgIG9yaWdpbltrZXlzW2ldXSA9IGFkZFtrZXlzW2ldXTtcbiAgfVxuICByZXR1cm4gb3JpZ2luO1xufVxuXG52YXIgdXRpbCA9IHtcbiAgZXh0ZW5kOiBleHRlbmQsXG4gIHR5cGVPZjogZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopLm1hdGNoKC9cXHMoW2EtekEtWl0rKS8pWzFdLnRvTG93ZXJDYXNlKCk7XG4gIH0sXG4gIGlzT2JqZWN0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJldHVybiB0aGlzLnR5cGVPZih2YWx1ZSkgPT09ICdvYmplY3QnO1xuICB9LFxuICBpc0FycmF5OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJldHVybiBBcnJheS5pc0FycmF5KHZhbHVlKTtcbiAgfSxcbiAgaXNTaW1wbGU6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgLy8gJ1NpbXBsZScgaGVyZSBtZWFucyBhbnl0aGluZ1xuICAgIC8vIG90aGVyIHRoYW4gYW4gT2JqZWN0IG9yIGFuIEFycmF5XG4gICAgLy8gaS5lLiBudW1iZXIsIHN0cmluZywgZGF0ZSwgYm9vbCwgbnVsbCwgdW5kZWZpbmVkLCByZWdleC4uLlxuICAgIHJldHVybiAhdGhpcy5pc09iamVjdCh2YWx1ZSkgJiYgIXRoaXMuaXNBcnJheSh2YWx1ZSk7XG4gIH0sXG4gIGlzRnVuY3Rpb246IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuIHRoaXMudHlwZU9mKHZhbHVlKSA9PT0gJ2Z1bmN0aW9uJztcbiAgfSxcbiAgaXNEYXRlOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJldHVybiB0aGlzLnR5cGVPZih2YWx1ZSkgPT09ICdkYXRlJztcbiAgfSxcbiAgaXNOdWxsOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJldHVybiB2YWx1ZSA9PT0gbnVsbDtcbiAgfSxcbiAgaXNVbmRlZmluZWQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuIHR5cGVvZih2YWx1ZSkgPT09ICd1bmRlZmluZWQnO1xuICB9LFxuICBpc051bGxPclVuZGVmaW5lZDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gdGhpcy5pc051bGwodmFsdWUpIHx8IHRoaXMuaXNVbmRlZmluZWQodmFsdWUpO1xuICB9LFxuICBjYXN0OiBmdW5jdGlvbih2YWx1ZSwgdHlwZSkge1xuICAgIGlmICghdHlwZSkge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cblxuICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgY2FzZSBTdHJpbmc6XG4gICAgICAgIHJldHVybiB1dGlsLmNhc3RTdHJpbmcodmFsdWUpO1xuICAgICAgY2FzZSBOdW1iZXI6XG4gICAgICAgIHJldHVybiB1dGlsLmNhc3ROdW1iZXIodmFsdWUpO1xuICAgICAgY2FzZSBCb29sZWFuOlxuICAgICAgICByZXR1cm4gdXRpbC5jYXN0Qm9vbGVhbih2YWx1ZSk7XG4gICAgICBjYXNlIERhdGU6XG4gICAgICAgIHJldHVybiB1dGlsLmNhc3REYXRlKHZhbHVlKTtcbiAgICAgIGNhc2UgT2JqZWN0OlxuICAgICAgY2FzZSBGdW5jdGlvbjpcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGNhc3QnKTtcbiAgICB9XG4gIH0sXG4gIGNhc3RTdHJpbmc6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09IG51bGwgfHwgdXRpbC50eXBlT2YodmFsdWUpID09PSAnc3RyaW5nJykge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbiAgICByZXR1cm4gdmFsdWUudG9TdHJpbmcgJiYgdmFsdWUudG9TdHJpbmcoKTtcbiAgfSxcbiAgY2FzdE51bWJlcjogZnVuY3Rpb24odmFsdWUpIHtcbiAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIE5hTjtcbiAgICB9XG4gICAgaWYgKHV0aWwudHlwZU9mKHZhbHVlKSA9PT0gJ251bWJlcicpIHtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG4gICAgcmV0dXJuIE51bWJlcih2YWx1ZSk7XG4gIH0sXG4gIGNhc3RCb29sZWFuOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIGlmICghdmFsdWUpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgdmFyIGZhbHNleSA9IFsnMCcsICdmYWxzZScsICdvZmYnLCAnbm8nXTtcbiAgICByZXR1cm4gZmFsc2V5LmluZGV4T2YodmFsdWUpID09PSAtMTtcbiAgfSxcbiAgY2FzdERhdGU6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09IG51bGwgfHwgdXRpbC50eXBlT2YodmFsdWUpID09PSAnZGF0ZScpIHtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBEYXRlKHZhbHVlKTtcbiAgfSxcbiAgaXNDb25zdHJ1Y3RvcjogZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gdGhpcy5pc1NpbXBsZUNvbnN0cnVjdG9yKHZhbHVlKSB8fCBbQXJyYXksIE9iamVjdF0uaW5kZXhPZih2YWx1ZSkgPiAtMTtcbiAgfSxcbiAgaXNTaW1wbGVDb25zdHJ1Y3RvcjogZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gW1N0cmluZywgTnVtYmVyLCBEYXRlLCBCb29sZWFuXS5pbmRleE9mKHZhbHVlKSA+IC0xO1xuICB9LFxuICBpc1N1cGVybW9kZWxDb25zdHJ1Y3RvcjogZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gdGhpcy5pc0Z1bmN0aW9uKHZhbHVlKSAmJiB2YWx1ZS5wcm90b3R5cGUgPT09IFN1cGVybW9kZWw7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gdXRpbDtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gVmFsaWRhdGlvbkVycm9yKHRhcmdldCwgZXJyb3IsIHZhbGlkYXRvciwga2V5KSB7XG4gIHRoaXMudGFyZ2V0ID0gdGFyZ2V0O1xuICB0aGlzLmVycm9yID0gZXJyb3I7XG4gIHRoaXMudmFsaWRhdG9yID0gdmFsaWRhdG9yO1xuXG4gIGlmIChrZXkpIHtcbiAgICB0aGlzLmtleSA9IGtleTtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFZhbGlkYXRpb25FcnJvcjtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcblxuZnVuY3Rpb24gV3JhcHBlcihkZWZhdWx0VmFsdWUsIHdyaXRhYmxlLCB2YWxpZGF0b3JzLCBnZXR0ZXIsIGJlZm9yZVNldCwgYXNzZXJ0KSB7XG4gIHRoaXMudmFsaWRhdG9ycyA9IHZhbGlkYXRvcnM7XG5cbiAgdGhpcy5fZGVmYXVsdFZhbHVlID0gZGVmYXVsdFZhbHVlO1xuICB0aGlzLl93cml0YWJsZSA9IHdyaXRhYmxlO1xuICB0aGlzLl9nZXR0ZXIgPSBnZXR0ZXI7XG4gIHRoaXMuX2JlZm9yZVNldCA9IGJlZm9yZVNldDtcbiAgdGhpcy5fYXNzZXJ0ID0gYXNzZXJ0O1xuICB0aGlzLmlzSW5pdGlhbGl6ZWQgPSBmYWxzZTtcblxuICBpZiAoIXV0aWwuaXNGdW5jdGlvbihkZWZhdWx0VmFsdWUpKSB7XG4gICAgdGhpcy5pc0luaXRpYWxpemVkID0gdHJ1ZTtcblxuICAgIGlmICghdXRpbC5pc1VuZGVmaW5lZChkZWZhdWx0VmFsdWUpKSB7XG4gICAgICB0aGlzLl92YWx1ZSA9IGRlZmF1bHRWYWx1ZTtcbiAgICB9XG4gIH1cbn1cbldyYXBwZXIucHJvdG90eXBlLmluaXRpYWxpemUgPSBmdW5jdGlvbihwYXJlbnQpIHtcbiAgLy90aGlzLl9wYXJlbnQgPSBwYXJlbnQ7XG5cbiAgaWYgKHRoaXMuaXNJbml0aWFsaXplZCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHRoaXMuc2V0VmFsdWUodGhpcy5fZGVmYXVsdFZhbHVlKHBhcmVudCksIHBhcmVudCk7XG4gIHRoaXMuaXNJbml0aWFsaXplZCA9IHRydWU7XG59O1xuV3JhcHBlci5wcm90b3R5cGUuZ2V0VmFsdWUgPSBmdW5jdGlvbihtb2RlbCkge1xuICByZXR1cm4gdGhpcy5fZ2V0dGVyID8gdGhpcy5fZ2V0dGVyLmNhbGwobW9kZWwpIDogdGhpcy5fdmFsdWU7XG59O1xuV3JhcHBlci5wcm90b3R5cGUuc2V0VmFsdWUgPSBmdW5jdGlvbih2YWx1ZSwgbW9kZWwpIHtcblxuICBpZiAoIXRoaXMuX3dyaXRhYmxlKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdWYWx1ZSBpcyByZWFkb25seScpO1xuICB9XG5cbiAgaWYgKHZhbHVlICYmIHZhbHVlLl9fc3VwZXJtb2RlbCAmJiBtb2RlbCkge1xuICAgIGlmICh2YWx1ZS5fX3BhcmVudCAhPT0gbW9kZWwpIHtcbiAgICAgIHZhbHVlLl9fcGFyZW50ID0gbW9kZWw7XG4gICAgfVxuICB9XG5cbiAgdmFyIHZhbCA9IHRoaXMuX2JlZm9yZVNldCA/IHRoaXMuX2JlZm9yZVNldCh2YWx1ZSkgOiB2YWx1ZTtcblxuICBpZiAodGhpcy5fYXNzZXJ0KSB7XG4gICAgdGhpcy5fYXNzZXJ0KHZhbCk7XG4gIH1cblxuICB0aGlzLl92YWx1ZSA9IHZhbDtcbn07XG4vLyBPYmplY3QuZGVmaW5lUHJvcGVydGllcyhXcmFwcGVyLnByb3RvdHlwZSwge1xuLy8gICB2YWx1ZToge1xuLy8gICAgIGdldDogZnVuY3Rpb24oKSB7XG4vLyAgICAgICByZXR1cm4gdGhpcy5fZ2V0dGVyID8gdGhpcy5fZ2V0dGVyKCkgOiB0aGlzLl92YWx1ZTtcbi8vICAgICB9LFxuLy8gICAgIHNldDogZnVuY3Rpb24odmFsdWUpIHtcblxuLy8gICAgICAgaWYgKCF0aGlzLl93cml0YWJsZSkge1xuLy8gICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1ZhbHVlIGlzIHJlYWRvbmx5Jyk7XG4vLyAgICAgICB9XG5cbi8vICAgICAgIGlmICh2YWx1ZSAmJiB2YWx1ZS5fX3N1cGVybW9kZWwgJiYgdGhpcy5fcGFyZW50KSB7XG4vLyAgICAgICAgIGlmICh2YWx1ZS5fX3BhcmVudCAhPT0gdGhpcy5fcGFyZW50KSB7XG4vLyAgICAgICAgICAgdmFsdWUuX19wYXJlbnQgPSB0aGlzLl9wYXJlbnQ7XG4vLyAgICAgICAgIH1cbi8vICAgICAgIH1cblxuLy8gICAgICAgdmFyIHZhbCA9IHRoaXMuX2JlZm9yZVNldCA/IHRoaXMuX2JlZm9yZVNldCh2YWx1ZSkgOiB2YWx1ZTtcblxuLy8gICAgICAgaWYgKHRoaXMuX2Fzc2VydCkge1xuLy8gICAgICAgICB0aGlzLl9hc3NlcnQodmFsKTtcbi8vICAgICAgIH1cblxuLy8gICAgICAgdGhpcy5fdmFsdWUgPSB2YWw7XG4vLyAgICAgfVxuLy8gICB9XG4vLyB9KTtcblxubW9kdWxlLmV4cG9ydHMgPSBXcmFwcGVyO1xuIl19
