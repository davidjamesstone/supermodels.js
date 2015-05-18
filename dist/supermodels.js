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
    __SPECIAL_PROPS = [
      __VALIDATORS, __VALUE, __TYPE, __DISPLAYNAME,
      __GET, __SET, __ENUMERABLE, __CONFIGURABLE, __WRITABLE
    ];

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
            //if (!value._assert) {

            if (wrapperValue && wrapperValue.__supermodel) {
              Array.prototype.push.apply(errors, wrapperValue.errors);
            } else {

              var simple = value.validators;
              for (j = 0; j < simple.length; j++) {
                validator = simple[j];
                error = validator.call(this, wrapperValue, key);

                if (error) {
                  errors.push(new ValidationError(this, error, validator, key));
                }
              }
            }

            //}
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
  // instead create a new instance each time
  // and mixin the proto object
  var p = createArrayPrototype();

  if (proto) {
    extend(p, proto);
  }

  if (itemDef) {

    // We have a definition for the items
    // that belong in this array.

    // Use the `wrapper` prototype property as a
    // virtual Wrapper object we can use
    // validate all the items in the array.
    var arrItemWrapper = itemDef.create.wrapper;

    // Validate new models by overriding the emitter array
    // mutators that can cause new items to enter the array.
    overrideArrayAddingMutators(p, arrItemWrapper);

    // Provide a convenient model factory
    // for creating array item instances
    p.create = function() {
      return itemDef.isReference ? itemDef.type() : itemDef.create().getValue(this);
    };
  }

  return p;
}

function overrideArrayAddingMutators(arr, itemWrapper) {

  function getArrayArgs(items) {
    var args = [];
    for (var i = 0; i < items.length; i++) {
      itemWrapper.setValue(items[i], arr);
      args.push(itemWrapper.getValue(arr));
    }
    return args;
  }

  var push = arr.push;
  var unshift = arr.unshift;
  var splice = arr.splice;
  var update = arr.update;

  if (push) {
    arr.push = function() {
      var args = getArrayArgs(arguments);
      return push.apply(arr, args);
    };
  }

  if (unshift) {
    arr.unshift = function() {
      var args = getArrayArgs(arguments);
      return unshift.apply(arr, args);
    };
  }

  if (splice) {
    arr.splice = function() {
      var args = getArrayArgs(Array.prototype.slice.call(arguments, 2));
      args.unshift(arguments[1]);
      args.unshift(arguments[0]);
      return splice.apply(arr, args);
    };
  }

  if (update) {
    arr.update = function() {
      var args = getArrayArgs([arguments[1]]);
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

  // If up the parent ref if necessary
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

module.exports = Wrapper;

},{"./util":11}]},{},[1])(1)
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJpbmRleC5qcyIsImxpYi9kZWYuanMiLCJsaWIvZW1pdHRlci1hcnJheS5qcyIsImxpYi9lbWl0dGVyLWV2ZW50LmpzIiwibGliL2VtaXR0ZXItb2JqZWN0LmpzIiwibGliL2ZhY3RvcnkuanMiLCJsaWIvbW9kZWwuanMiLCJsaWIvcHJvdG8uanMiLCJsaWIvc3VwZXJtb2RlbC5qcyIsImxpYi9zdXBlcm1vZGVscy5qcyIsImxpYi91dGlsLmpzIiwibGliL3ZhbGlkYXRpb24tZXJyb3IuanMiLCJsaWIvd3JhcHBlci5qcyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiQUFBQTtBQ0FBO0FBQ0E7O0FDREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDMUlBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNYQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNyS0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDbEtBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDclJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVKQTtBQUNBO0FBQ0E7QUFDQTs7QUNIQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDN0JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQy9HQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQSIsImZpbGUiOiJnZW5lcmF0ZWQuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlc0NvbnRlbnQiOlsiKGZ1bmN0aW9uIGUodCxuLHIpe2Z1bmN0aW9uIHMobyx1KXtpZighbltvXSl7aWYoIXRbb10pe3ZhciBhPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7aWYoIXUmJmEpcmV0dXJuIGEobywhMCk7aWYoaSlyZXR1cm4gaShvLCEwKTt2YXIgZj1uZXcgRXJyb3IoXCJDYW5ub3QgZmluZCBtb2R1bGUgJ1wiK28rXCInXCIpO3Rocm93IGYuY29kZT1cIk1PRFVMRV9OT1RfRk9VTkRcIixmfXZhciBsPW5bb109e2V4cG9ydHM6e319O3Rbb11bMF0uY2FsbChsLmV4cG9ydHMsZnVuY3Rpb24oZSl7dmFyIG49dFtvXVsxXVtlXTtyZXR1cm4gcyhuP246ZSl9LGwsbC5leHBvcnRzLGUsdCxuLHIpfXJldHVybiBuW29dLmV4cG9ydHN9dmFyIGk9dHlwZW9mIHJlcXVpcmU9PVwiZnVuY3Rpb25cIiYmcmVxdWlyZTtmb3IodmFyIG89MDtvPHIubGVuZ3RoO28rKylzKHJbb10pO3JldHVybiBzfSkiLCJtb2R1bGUuZXhwb3J0cyA9IHJlcXVpcmUoJy4vbGliL3N1cGVybW9kZWxzJyk7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XG52YXIgY3JlYXRlV3JhcHBlckZhY3RvcnkgPSByZXF1aXJlKCcuL2ZhY3RvcnknKTtcblxuZnVuY3Rpb24gcmVzb2x2ZShmcm9tKSB7XG4gIHZhciBpc0N0b3IgPSB1dGlsLmlzQ29uc3RydWN0b3IoZnJvbSk7XG4gIHZhciBpc1N1cGVybW9kZWxDdG9yID0gdXRpbC5pc1N1cGVybW9kZWxDb25zdHJ1Y3Rvcihmcm9tKTtcbiAgdmFyIGlzQXJyYXkgPSB1dGlsLmlzQXJyYXkoZnJvbSk7XG5cbiAgaWYgKGlzQ3RvciB8fCBpc1N1cGVybW9kZWxDdG9yIHx8IGlzQXJyYXkpIHtcbiAgICByZXR1cm4ge1xuICAgICAgX190eXBlOiBmcm9tXG4gICAgfTtcbiAgfVxuXG4gIHZhciBpc1ZhbHVlID0gIXV0aWwuaXNPYmplY3QoZnJvbSk7XG4gIGlmIChpc1ZhbHVlKSB7XG4gICAgcmV0dXJuIHtcbiAgICAgIF9fdmFsdWU6IGZyb21cbiAgICB9O1xuICB9XG5cbiAgcmV0dXJuIGZyb207XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZURlZihmcm9tKSB7XG5cbiAgZnJvbSA9IHJlc29sdmUoZnJvbSk7XG5cbiAgdmFyIF9fVkFMSURBVE9SUyA9ICdfX3ZhbGlkYXRvcnMnLFxuICAgIF9fVkFMVUUgPSAnX192YWx1ZScsXG4gICAgX19UWVBFID0gJ19fdHlwZScsXG4gICAgX19ESVNQTEFZTkFNRSA9ICdfX2Rpc3BsYXlOYW1lJyxcbiAgICBfX0dFVCA9ICdfX2dldCcsXG4gICAgX19TRVQgPSAnX19zZXQnLFxuICAgIF9fRU5VTUVSQUJMRSA9ICdfX2VudW1lcmFibGUnLFxuICAgIF9fQ09ORklHVVJBQkxFID0gJ19fY29uZmlndXJhYmxlJyxcbiAgICBfX1dSSVRBQkxFID0gJ19fd3JpdGFibGUnLFxuICAgIF9fU1BFQ0lBTF9QUk9QUyA9IFtcbiAgICAgIF9fVkFMSURBVE9SUywgX19WQUxVRSwgX19UWVBFLCBfX0RJU1BMQVlOQU1FLFxuICAgICAgX19HRVQsIF9fU0VULCBfX0VOVU1FUkFCTEUsIF9fQ09ORklHVVJBQkxFLCBfX1dSSVRBQkxFXG4gICAgXTtcblxuICB2YXIgZGVmID0ge1xuICAgIGZyb206IGZyb20sXG4gICAgdHlwZTogZnJvbVtfX1RZUEVdLFxuICAgIHZhbHVlOiBmcm9tW19fVkFMVUVdLFxuICAgIHZhbGlkYXRvcnM6IGZyb21bX19WQUxJREFUT1JTXSB8fCBbXSxcbiAgICBlbnVtZXJhYmxlOiBmcm9tW19fRU5VTUVSQUJMRV0gPT09IGZhbHNlID8gZmFsc2UgOiB0cnVlLFxuICAgIGNvbmZpZ3VyYWJsZTogZnJvbVtfX0NPTkZJR1VSQUJMRV0gPyB0cnVlIDogZmFsc2UsXG4gICAgd3JpdGFibGU6IGZyb21bX19XUklUQUJMRV0gPT09IGZhbHNlID8gZmFsc2UgOiB0cnVlLFxuICAgIGRpc3BsYXlOYW1lOiBmcm9tW19fRElTUExBWU5BTUVdLFxuICAgIGdldHRlcjogZnJvbVtfX0dFVF0sXG4gICAgc2V0dGVyOiBmcm9tW19fU0VUXVxuICB9O1xuXG4gIHZhciB0eXBlID0gZGVmLnR5cGU7XG5cbiAgLy8gU2ltcGxlICdDb25zdHJ1Y3RvcicgVHlwZVxuICBpZiAodXRpbC5pc1NpbXBsZUNvbnN0cnVjdG9yKHR5cGUpKSB7XG5cbiAgICBkZWYuaXNTaW1wbGUgPSB0cnVlO1xuXG4gICAgZGVmLmNhc3QgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgcmV0dXJuIHV0aWwuY2FzdCh2YWx1ZSwgdHlwZSk7XG4gICAgfTtcbiAgfSBlbHNlIGlmICh1dGlsLmlzU3VwZXJtb2RlbENvbnN0cnVjdG9yKHR5cGUpKSB7XG5cbiAgICBkZWYuaXNSZWZlcmVuY2UgPSB0cnVlO1xuICB9IGVsc2UgaWYgKGRlZi52YWx1ZSkge1xuICAgIC8vIElmIGEgdmFsdWUgaXMgcHJlc2VudCwgdXNlXG4gICAgLy8gdGhhdCBhbmQgc2hvcnQtY2lyY3VpdCB0aGUgcmVzdFxuICAgIGRlZi5pc1NpbXBsZSA9IHRydWU7XG4gIH0gZWxzZSB7XG5cbiAgICAvLyBPdGhlcndpc2UgbG9vayBmb3Igb3RoZXIgbm9uLXNwZWNpYWxcbiAgICAvLyBrZXlzIGFuZCBhbHNvIGFueSBpdGVtIGRlZmluaXRpb25cbiAgICAvLyBpbiB0aGUgY2FzZSBvZiBBcnJheXNcblxuICAgIHZhciBrZXlzID0gT2JqZWN0LmtleXMoZnJvbSk7XG4gICAgdmFyIGNoaWxkS2V5cyA9IGtleXMuZmlsdGVyKGZ1bmN0aW9uKGl0ZW0pIHtcbiAgICAgIHJldHVybiBfX1NQRUNJQUxfUFJPUFMuaW5kZXhPZihpdGVtKSA9PT0gLTE7XG4gICAgfSk7XG5cbiAgICBpZiAoY2hpbGRLZXlzLmxlbmd0aCkge1xuXG4gICAgICB2YXIgZGVmcyA9IHt9O1xuICAgICAgdmFyIHByb3RvO1xuXG4gICAgICBjaGlsZEtleXMuZm9yRWFjaChmdW5jdGlvbihrZXkpIHtcbiAgICAgICAgdmFyIGRlc2NyaXB0b3IgPSBPYmplY3QuZ2V0T3duUHJvcGVydHlEZXNjcmlwdG9yKGZyb20sIGtleSk7XG4gICAgICAgIHZhciB2YWx1ZTtcblxuICAgICAgICBpZiAoZGVzY3JpcHRvci5nZXQgfHwgZGVzY3JpcHRvci5zZXQpIHtcbiAgICAgICAgICB2YWx1ZSA9IHtcbiAgICAgICAgICAgIF9fZ2V0OiBkZXNjcmlwdG9yLmdldCxcbiAgICAgICAgICAgIF9fc2V0OiBkZXNjcmlwdG9yLnNldFxuICAgICAgICAgIH07XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgdmFsdWUgPSBmcm9tW2tleV07XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIXV0aWwuaXNDb25zdHJ1Y3Rvcih2YWx1ZSkgJiYgIXV0aWwuaXNTdXBlcm1vZGVsQ29uc3RydWN0b3IodmFsdWUpICYmIHV0aWwuaXNGdW5jdGlvbih2YWx1ZSkpIHtcbiAgICAgICAgICBpZiAoIXByb3RvKSB7XG4gICAgICAgICAgICBwcm90byA9IHt9O1xuICAgICAgICAgIH1cbiAgICAgICAgICBwcm90b1trZXldID0gdmFsdWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgZGVmc1trZXldID0gY3JlYXRlRGVmKHZhbHVlKTtcbiAgICAgICAgfVxuICAgICAgfSk7XG5cbiAgICAgIGRlZi5kZWZzID0gZGVmcztcbiAgICAgIGRlZi5wcm90byA9IHByb3RvO1xuXG4gICAgfVxuXG4gICAgLy8gQ2hlY2sgZm9yIEFycmF5XG4gICAgaWYgKHR5cGUgPT09IEFycmF5IHx8IHV0aWwuaXNBcnJheSh0eXBlKSkge1xuXG4gICAgICBkZWYuaXNBcnJheSA9IHRydWU7XG5cbiAgICAgIGlmICh0eXBlLmxlbmd0aCA+IDApIHtcbiAgICAgICAgZGVmLmRlZiA9IGNyZWF0ZURlZih0eXBlWzBdKTtcbiAgICAgIH1cblxuICAgIH0gZWxzZSBpZiAoY2hpbGRLZXlzLmxlbmd0aCA9PT0gMCkge1xuICAgICAgZGVmLmlzU2ltcGxlID0gdHJ1ZTtcbiAgICB9XG4gIH1cblxuICBkZWYuY3JlYXRlID0gY3JlYXRlV3JhcHBlckZhY3RvcnkoZGVmKTtcblxuICByZXR1cm4gZGVmO1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNyZWF0ZURlZjtcbiIsIid1c2Ugc3RyaWN0JztcblxubW9kdWxlLmV4cG9ydHMgPSBmdW5jdGlvbihjYWxsYmFjaykge1xuXG4gIHZhciBhcnIgPSBbXTtcblxuICAvKipcbiAgICogUHJveGllZCBhcnJheSBtdXRhdG9ycyBtZXRob2RzXG4gICAqXG4gICAqIEBwYXJhbSB7T2JqZWN0fSBvYmpcbiAgICogQHJldHVybiB7T2JqZWN0fVxuICAgKiBAYXBpIHByaXZhdGVcbiAgICovXG4gIHZhciBwb3AgPSBmdW5jdGlvbigpIHtcblxuICAgIHZhciByZXN1bHQgPSBBcnJheS5wcm90b3R5cGUucG9wLmFwcGx5KGFycik7XG5cbiAgICBjYWxsYmFjaygncG9wJywgYXJyLCB7XG4gICAgICB2YWx1ZTogcmVzdWx0XG4gICAgfSk7XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuICB2YXIgcHVzaCA9IGZ1bmN0aW9uKCkge1xuXG4gICAgdmFyIHJlc3VsdCA9IEFycmF5LnByb3RvdHlwZS5wdXNoLmFwcGx5KGFyciwgYXJndW1lbnRzKTtcblxuICAgIGNhbGxiYWNrKCdwdXNoJywgYXJyLCB7XG4gICAgICB2YWx1ZTogcmVzdWx0XG4gICAgfSk7XG5cbiAgICByZXR1cm4gcmVzdWx0O1xuICB9O1xuICB2YXIgc2hpZnQgPSBmdW5jdGlvbigpIHtcblxuICAgIHZhciByZXN1bHQgPSBBcnJheS5wcm90b3R5cGUuc2hpZnQuYXBwbHkoYXJyKTtcblxuICAgIGNhbGxiYWNrKCdzaGlmdCcsIGFyciwge1xuICAgICAgdmFsdWU6IHJlc3VsdFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcbiAgdmFyIHNvcnQgPSBmdW5jdGlvbigpIHtcblxuICAgIHZhciByZXN1bHQgPSBBcnJheS5wcm90b3R5cGUuc29ydC5hcHBseShhcnIsIGFyZ3VtZW50cyk7XG5cbiAgICBjYWxsYmFjaygnc29ydCcsIGFyciwge1xuICAgICAgdmFsdWU6IHJlc3VsdFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcbiAgdmFyIHVuc2hpZnQgPSBmdW5jdGlvbigpIHtcblxuICAgIHZhciByZXN1bHQgPSBBcnJheS5wcm90b3R5cGUudW5zaGlmdC5hcHBseShhcnIsIGFyZ3VtZW50cyk7XG5cbiAgICBjYWxsYmFjaygndW5zaGlmdCcsIGFyciwge1xuICAgICAgdmFsdWU6IHJlc3VsdFxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcbiAgdmFyIHJldmVyc2UgPSBmdW5jdGlvbigpIHtcblxuICAgIHZhciByZXN1bHQgPSBBcnJheS5wcm90b3R5cGUucmV2ZXJzZS5hcHBseShhcnIpO1xuXG4gICAgY2FsbGJhY2soJ3JldmVyc2UnLCBhcnIsIHtcbiAgICAgIHZhbHVlOiByZXN1bHRcbiAgICB9KTtcblxuICAgIHJldHVybiByZXN1bHQ7XG4gIH07XG4gIHZhciBzcGxpY2UgPSBmdW5jdGlvbigpIHtcblxuICAgIGlmICghYXJndW1lbnRzLmxlbmd0aCkge1xuICAgICAgcmV0dXJuO1xuICAgIH1cblxuICAgIHZhciByZXN1bHQgPSBBcnJheS5wcm90b3R5cGUuc3BsaWNlLmFwcGx5KGFyciwgYXJndW1lbnRzKTtcblxuICAgIGNhbGxiYWNrKCdzcGxpY2UnLCBhcnIsIHtcbiAgICAgIHZhbHVlOiByZXN1bHQsXG4gICAgICByZW1vdmVkOiByZXN1bHQsXG4gICAgICBhZGRlZDogQXJyYXkucHJvdG90eXBlLnNsaWNlLmNhbGwoYXJndW1lbnRzLCAyKVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIHJlc3VsdDtcbiAgfTtcblxuICAvKipcbiAgICogUHJveHkgYWxsIEFycmF5LnByb3RvdHlwZSBtdXRhdG9yIG1ldGhvZHMgb24gdGhpcyBhcnJheSBpbnN0YW5jZVxuICAgKi9cbiAgYXJyLnBvcCA9IGFyci5wb3AgJiYgcG9wO1xuICBhcnIucHVzaCA9IGFyci5wdXNoICYmIHB1c2g7XG4gIGFyci5zaGlmdCA9IGFyci5zaGlmdCAmJiBzaGlmdDtcbiAgYXJyLnVuc2hpZnQgPSBhcnIudW5zaGlmdCAmJiB1bnNoaWZ0O1xuICBhcnIuc29ydCA9IGFyci5zb3J0ICYmIHNvcnQ7XG4gIGFyci5yZXZlcnNlID0gYXJyLnJldmVyc2UgJiYgcmV2ZXJzZTtcbiAgYXJyLnNwbGljZSA9IGFyci5zcGxpY2UgJiYgc3BsaWNlO1xuXG4gIC8qKlxuICAgKiBTcGVjaWFsIHVwZGF0ZSBmdW5jdGlvbiBzaW5jZSB3ZSBjYW4ndCBkZXRlY3RcbiAgICogYXNzaWdubWVudCBieSBpbmRleCBlLmcuIGFyclswXSA9ICdzb21ldGhpbmcnXG4gICAqL1xuICBhcnIudXBkYXRlID0gZnVuY3Rpb24oaW5kZXgsIHZhbHVlKSB7XG5cbiAgICB2YXIgb2xkVmFsdWUgPSBhcnJbaW5kZXhdO1xuICAgIHZhciBuZXdWYWx1ZSA9IGFycltpbmRleF0gPSB2YWx1ZTtcblxuICAgIGNhbGxiYWNrKCd1cGRhdGUnLCBhcnIsIHtcbiAgICAgIGluZGV4OiBpbmRleCxcbiAgICAgIHZhbHVlOiBuZXdWYWx1ZSxcbiAgICAgIG9sZFZhbHVlOiBvbGRWYWx1ZVxuICAgIH0pO1xuXG4gICAgcmV0dXJuIG5ld1ZhbHVlO1xuICB9O1xuXG4gIHJldHVybiBhcnI7XG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG5tb2R1bGUuZXhwb3J0cyA9IGZ1bmN0aW9uIEVtaXR0ZXJFdmVudChuYW1lLCBwYXRoLCB0YXJnZXQsIGRldGFpbCkge1xuICB0aGlzLm5hbWUgPSBuYW1lO1xuICB0aGlzLnBhdGggPSBwYXRoO1xuICB0aGlzLnRhcmdldCA9IHRhcmdldDtcblxuICBpZiAoZGV0YWlsKSB7XG4gICAgdGhpcy5kZXRhaWwgPSBkZXRhaWw7XG4gIH1cbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbi8qKlxuICogRXhwb3NlIGBFbWl0dGVyYC5cbiAqL1xuXG5tb2R1bGUuZXhwb3J0cyA9IEVtaXR0ZXI7XG5cbi8qKlxuICogSW5pdGlhbGl6ZSBhIG5ldyBgRW1pdHRlcmAuXG4gKlxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5mdW5jdGlvbiBFbWl0dGVyKG9iaikge1xuICB2YXIgY3R4ID0gb2JqIHx8IHRoaXM7XG5cbiAgaWYgKG9iaikge1xuICAgIGN0eCA9IG1peGluKG9iaik7XG4gICAgcmV0dXJuIGN0eDtcbiAgfVxufVxuXG4vKipcbiAqIE1peGluIHRoZSBlbWl0dGVyIHByb3BlcnRpZXMuXG4gKlxuICogQHBhcmFtIHtPYmplY3R9IG9ialxuICogQHJldHVybiB7T2JqZWN0fVxuICogQGFwaSBwcml2YXRlXG4gKi9cblxuZnVuY3Rpb24gbWl4aW4ob2JqKSB7XG4gIGZvciAodmFyIGtleSBpbiBFbWl0dGVyLnByb3RvdHlwZSkge1xuICAgIG9ialtrZXldID0gRW1pdHRlci5wcm90b3R5cGVba2V5XTtcbiAgfVxuICByZXR1cm4gb2JqO1xufVxuXG4vKipcbiAqIExpc3RlbiBvbiB0aGUgZ2l2ZW4gYGV2ZW50YCB3aXRoIGBmbmAuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XG4gKiBAcGFyYW0ge0Z1bmN0aW9ufSBmblxuICogQHJldHVybiB7RW1pdHRlcn1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuRW1pdHRlci5wcm90b3R5cGUub24gPVxuICBFbWl0dGVyLnByb3RvdHlwZS5hZGRFdmVudExpc3RlbmVyID0gZnVuY3Rpb24oZXZlbnQsIGZuKSB7XG4gICAgKHRoaXMuX19jYWxsYmFja3NbZXZlbnRdID0gdGhpcy5fX2NhbGxiYWNrc1tldmVudF0gfHwgW10pXG4gICAgLnB1c2goZm4pO1xuICAgIHJldHVybiB0aGlzO1xuICB9O1xuXG4vKipcbiAqIEFkZHMgYW4gYGV2ZW50YCBsaXN0ZW5lciB0aGF0IHdpbGwgYmUgaW52b2tlZCBhIHNpbmdsZVxuICogdGltZSB0aGVuIGF1dG9tYXRpY2FsbHkgcmVtb3ZlZC5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAcmV0dXJuIHtFbWl0dGVyfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5FbWl0dGVyLnByb3RvdHlwZS5vbmNlID0gZnVuY3Rpb24oZXZlbnQsIGZuKSB7XG4gIGZ1bmN0aW9uIG9uKCkge1xuICAgIHRoaXMub2ZmKGV2ZW50LCBvbik7XG4gICAgZm4uYXBwbHkodGhpcywgYXJndW1lbnRzKTtcbiAgfVxuXG4gIG9uLmZuID0gZm47XG4gIHRoaXMub24oZXZlbnQsIG9uKTtcbiAgcmV0dXJuIHRoaXM7XG59O1xuXG4vKipcbiAqIFJlbW92ZSB0aGUgZ2l2ZW4gY2FsbGJhY2sgZm9yIGBldmVudGAgb3IgYWxsXG4gKiByZWdpc3RlcmVkIGNhbGxiYWNrcy5cbiAqXG4gKiBAcGFyYW0ge1N0cmluZ30gZXZlbnRcbiAqIEBwYXJhbSB7RnVuY3Rpb259IGZuXG4gKiBAcmV0dXJuIHtFbWl0dGVyfVxuICogQGFwaSBwdWJsaWNcbiAqL1xuXG5FbWl0dGVyLnByb3RvdHlwZS5vZmYgPVxuICBFbWl0dGVyLnByb3RvdHlwZS5yZW1vdmVMaXN0ZW5lciA9XG4gIEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUFsbExpc3RlbmVycyA9XG4gIEVtaXR0ZXIucHJvdG90eXBlLnJlbW92ZUV2ZW50TGlzdGVuZXIgPSBmdW5jdGlvbihldmVudCwgZm4pIHtcblxuICAgIC8vIGFsbFxuICAgIGlmICgwID09PSBhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICB0aGlzLl9fY2FsbGJhY2tzID0ge307XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvLyBzcGVjaWZpYyBldmVudFxuICAgIHZhciBjYWxsYmFja3MgPSB0aGlzLl9fY2FsbGJhY2tzW2V2ZW50XTtcbiAgICBpZiAoIWNhbGxiYWNrcykge1xuICAgICAgcmV0dXJuIHRoaXM7XG4gICAgfVxuXG4gICAgLy8gcmVtb3ZlIGFsbCBoYW5kbGVyc1xuICAgIGlmICgxID09PSBhcmd1bWVudHMubGVuZ3RoKSB7XG4gICAgICBkZWxldGUgdGhpcy5fX2NhbGxiYWNrc1tldmVudF07XG4gICAgICByZXR1cm4gdGhpcztcbiAgICB9XG5cbiAgICAvLyByZW1vdmUgc3BlY2lmaWMgaGFuZGxlclxuICAgIHZhciBjYjtcbiAgICBmb3IgKHZhciBpID0gMDsgaSA8IGNhbGxiYWNrcy5sZW5ndGg7IGkrKykge1xuICAgICAgY2IgPSBjYWxsYmFja3NbaV07XG4gICAgICBpZiAoY2IgPT09IGZuIHx8IGNiLmZuID09PSBmbikge1xuICAgICAgICBjYWxsYmFja3Muc3BsaWNlKGksIDEpO1xuICAgICAgICBicmVhaztcbiAgICAgIH1cbiAgICB9XG4gICAgcmV0dXJuIHRoaXM7XG4gIH07XG5cbi8qKlxuICogRW1pdCBgZXZlbnRgIHdpdGggdGhlIGdpdmVuIGFyZ3MuXG4gKlxuICogQHBhcmFtIHtTdHJpbmd9IGV2ZW50XG4gKiBAcGFyYW0ge01peGVkfSAuLi5cbiAqIEByZXR1cm4ge0VtaXR0ZXJ9XG4gKi9cblxuRW1pdHRlci5wcm90b3R5cGUuZW1pdCA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gIHZhciBhcmdzID0gW10uc2xpY2UuY2FsbChhcmd1bWVudHMsIDEpLFxuICAgIGNhbGxiYWNrcyA9IHRoaXMuX19jYWxsYmFja3NbZXZlbnRdO1xuXG4gIGlmIChjYWxsYmFja3MpIHtcbiAgICBjYWxsYmFja3MgPSBjYWxsYmFja3Muc2xpY2UoMCk7XG4gICAgZm9yICh2YXIgaSA9IDAsIGxlbiA9IGNhbGxiYWNrcy5sZW5ndGg7IGkgPCBsZW47ICsraSkge1xuICAgICAgY2FsbGJhY2tzW2ldLmFwcGx5KHRoaXMsIGFyZ3MpO1xuICAgIH1cbiAgfVxuXG4gIHJldHVybiB0aGlzO1xufTtcblxuLyoqXG4gKiBSZXR1cm4gYXJyYXkgb2YgY2FsbGJhY2tzIGZvciBgZXZlbnRgLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxuICogQHJldHVybiB7QXJyYXl9XG4gKiBAYXBpIHB1YmxpY1xuICovXG5cbkVtaXR0ZXIucHJvdG90eXBlLmxpc3RlbmVycyA9IGZ1bmN0aW9uKGV2ZW50KSB7XG4gIHJldHVybiB0aGlzLl9fY2FsbGJhY2tzW2V2ZW50XSB8fCBbXTtcbn07XG5cbi8qKlxuICogQ2hlY2sgaWYgdGhpcyBlbWl0dGVyIGhhcyBgZXZlbnRgIGhhbmRsZXJzLlxuICpcbiAqIEBwYXJhbSB7U3RyaW5nfSBldmVudFxuICogQHJldHVybiB7Qm9vbGVhbn1cbiAqIEBhcGkgcHVibGljXG4gKi9cblxuRW1pdHRlci5wcm90b3R5cGUuaGFzTGlzdGVuZXJzID0gZnVuY3Rpb24oZXZlbnQpIHtcbiAgcmV0dXJuICEhdGhpcy5saXN0ZW5lcnMoZXZlbnQpLmxlbmd0aDtcbn07XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciB1dGlsID0gcmVxdWlyZSgnLi91dGlsJyk7XG52YXIgY3JlYXRlTW9kZWxQcm90b3R5cGUgPSByZXF1aXJlKCcuL3Byb3RvJyk7XG52YXIgV3JhcHBlciA9IHJlcXVpcmUoJy4vd3JhcHBlcicpO1xuXG5mdW5jdGlvbiBjcmVhdGVNb2RlbERlc2NyaXB0b3JzKGRlZiwgcGFyZW50KSB7XG5cbiAgdmFyIF9fID0ge307XG5cbiAgdmFyIGRlc2MgPSB7XG4gICAgX186IHtcbiAgICAgIHZhbHVlOiBfX1xuICAgIH0sXG4gICAgX19kZWY6IHtcbiAgICAgIHZhbHVlOiBkZWZcbiAgICB9LFxuICAgIF9fcGFyZW50OiB7XG4gICAgICB2YWx1ZTogcGFyZW50LFxuICAgICAgd3JpdGFibGU6IHRydWVcbiAgICB9LFxuICAgIF9fY2FsbGJhY2tzOiB7XG4gICAgICB2YWx1ZToge30sXG4gICAgICB3cml0YWJsZTogdHJ1ZVxuICAgIH1cbiAgfTtcblxuICByZXR1cm4gZGVzYztcbn1cblxuZnVuY3Rpb24gZGVmaW5lUHJvcGVydGllcyhtb2RlbCkge1xuICB2YXIgZGVmcyA9IG1vZGVsLl9fZGVmLmRlZnM7XG4gIGZvciAodmFyIGtleSBpbiBkZWZzKSB7XG4gICAgZGVmaW5lUHJvcGVydHkobW9kZWwsIGtleSwgZGVmc1trZXldKTtcbiAgfVxufVxuXG5mdW5jdGlvbiBkZWZpbmVQcm9wZXJ0eShtb2RlbCwga2V5LCBkZWYpIHtcblxuICB2YXIgZGVzYyA9IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIHRoaXMuX19nZXQoa2V5KTtcbiAgICB9LFxuICAgIGVudW1lcmFibGU6IGRlZi5lbnVtZXJhYmxlLFxuICAgIGNvbmZpZ3VyYWJsZTogZGVmLmNvbmZpZ3VyYWJsZVxuICB9O1xuXG4gIGlmIChkZWYud3JpdGFibGUpIHtcbiAgICBkZXNjLnNldCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICB0aGlzLl9fc2V0Tm90aWZ5Q2hhbmdlKGtleSwgdmFsdWUpO1xuICAgIH07XG4gIH1cblxuICBPYmplY3QuZGVmaW5lUHJvcGVydHkobW9kZWwsIGtleSwgZGVzYyk7XG5cbiAgLy8gU2lsZW50bHkgaW5pdGlhbGl6ZSB0aGUgcHJvcGVydHkgd3JhcHBlclxuICBtb2RlbC5fX1trZXldID0gZGVmLmNyZWF0ZShtb2RlbCk7XG59XG5cbmZ1bmN0aW9uIGNyZWF0ZVdyYXBwZXJGYWN0b3J5KGRlZikge1xuXG4gIHZhciB3cmFwcGVyLCBkZWZhdWx0VmFsdWUsIGFzc2VydDtcblxuICBpZiAoZGVmLmlzU2ltcGxlKSB7XG4gICAgd3JhcHBlciA9IG5ldyBXcmFwcGVyKGRlZi52YWx1ZSwgZGVmLndyaXRhYmxlLCBkZWYudmFsaWRhdG9ycywgZGVmLmdldHRlciwgZGVmLmNhc3QsIG51bGwpO1xuICB9IGVsc2UgaWYgKGRlZi5pc1JlZmVyZW5jZSkge1xuXG4gICAgLy8gSG9sZCBhIHJlZmVyZW5jZSB0byB0aGVcbiAgICAvLyByZWZlcmVyZW5jZWQgdHlwZXMnIGRlZmluaXRpb25cbiAgICB2YXIgcmVmRGVmID0gZGVmLnR5cGUuZGVmO1xuXG4gICAgaWYgKHJlZkRlZi5pc1NpbXBsZSkge1xuICAgICAgLy8gSWYgdGhlIHJlZmVyZW5jZWQgdHlwZSBpcyBpdHNlbGYgc2ltcGxlLFxuICAgICAgLy8gd2UgY2FuIHNldCBqdXN0IHJldHVybiBhIHdyYXBwZXIgYW5kXG4gICAgICAvLyB0aGUgcHJvcGVydHkgd2lsbCBnZXQgaW5pdGlhbGl6ZWQuXG4gICAgICB3cmFwcGVyID0gbmV3IFdyYXBwZXIocmVmRGVmLnZhbHVlLCByZWZEZWYud3JpdGFibGUsIHJlZkRlZi52YWxpZGF0b3JzLCBkZWYuZ2V0dGVyLCByZWZEZWYuY2FzdCwgbnVsbCk7XG4gICAgfSBlbHNlIHtcblxuICAgICAgLy8gSWYgd2UncmUgbm90IGRlYWxpbmcgd2l0aCBhIHNpbXBsZSByZWZlcmVuY2UgbW9kZWxcbiAgICAgIC8vIHdlIG5lZWQgdG8gZGVmaW5lIGFuIGFzc2VydGlvbiB0aGF0IHRoZSBpbnN0YW5jZVxuICAgICAgLy8gYmVpbmcgc2V0IGlzIG9mIHRoZSBjb3JyZWN0IHR5cGUuIFdlIGRvIHRoaXMgYmVcbiAgICAgIC8vIGNvbXBhcmluZyB0aGUgZGVmcy5cblxuICAgICAgYXNzZXJ0ID0gZnVuY3Rpb24odmFsdWUpIHtcbiAgICAgICAgLy8gY29tcGFyZSB0aGUgZGVmaW50aW9ucyBvZiB0aGUgdmFsdWUgaW5zdGFuY2VcbiAgICAgICAgLy8gYmVpbmcgcGFzc2VkIGFuZCB0aGUgZGVmIHByb3BlcnR5IGF0dGFjaGVkXG4gICAgICAgIC8vIHRvIHRoZSB0eXBlIFN1cGVybW9kZWxDb25zdHJ1Y3Rvci4gQWxsb3cgdGhlXG4gICAgICAgIC8vIHZhbHVlIHRvIGJlIHVuZGVmaW5lZCBvciBudWxsIGFsc28uXG4gICAgICAgIHZhciBpc0NvcnJlY3RUeXBlID0gZmFsc2U7XG5cbiAgICAgICAgaWYgKHV0aWwuaXNOdWxsT3JVbmRlZmluZWQodmFsdWUpKSB7XG4gICAgICAgICAgaXNDb3JyZWN0VHlwZSA9IHRydWU7XG4gICAgICAgIH0gZWxzZSB7XG4gICAgICAgICAgaXNDb3JyZWN0VHlwZSA9IHJlZkRlZiA9PT0gdmFsdWUuX19kZWY7XG4gICAgICAgIH1cblxuICAgICAgICBpZiAoIWlzQ29ycmVjdFR5cGUpIHtcbiAgICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1ZhbHVlIHNob3VsZCBiZSBhbiBpbnN0YW5jZSBvZiB0aGUgcmVmZXJlbmNlZCBtb2RlbCwgbnVsbCBvciB1bmRlZmluZWQnKTtcbiAgICAgICAgfVxuICAgICAgfTtcblxuICAgICAgd3JhcHBlciA9IG5ldyBXcmFwcGVyKGRlZi52YWx1ZSwgZGVmLndyaXRhYmxlLCBkZWYudmFsaWRhdG9ycywgZGVmLmdldHRlciwgbnVsbCwgYXNzZXJ0KTtcblxuICAgIH1cbiAgfSBlbHNlIGlmIChkZWYuaXNBcnJheSkge1xuXG4gICAgZGVmYXVsdFZhbHVlID0gZnVuY3Rpb24ocGFyZW50KSB7XG4gICAgICAvLyBmb3IgQXJyYXlzLCB3ZSBjcmVhdGUgYSBuZXcgQXJyYXkgYW5kIGVhY2hcbiAgICAgIC8vIHRpbWUsIG1peCB0aGUgbW9kZWwgcHJvcGVydGllcyBpbnRvIGl0XG4gICAgICB2YXIgbW9kZWwgPSBjcmVhdGVNb2RlbFByb3RvdHlwZShkZWYpO1xuICAgICAgT2JqZWN0LmRlZmluZVByb3BlcnRpZXMobW9kZWwsIGNyZWF0ZU1vZGVsRGVzY3JpcHRvcnMoZGVmLCBwYXJlbnQpKTtcbiAgICAgIGRlZmluZVByb3BlcnRpZXMobW9kZWwpO1xuICAgICAgcmV0dXJuIG1vZGVsO1xuICAgIH07XG5cbiAgICBhc3NlcnQgPSBmdW5jdGlvbih2YWx1ZSkge1xuICAgICAgLy8gdG9kbzogZnVydGhlciBhcnJheSB0eXBlIHZhbGlkYXRpb25cbiAgICAgIGlmICghdXRpbC5pc0FycmF5KHZhbHVlKSkge1xuICAgICAgICB0aHJvdyBuZXcgRXJyb3IoJ1ZhbHVlIHNob3VsZCBiZSBhbiBhcnJheScpO1xuICAgICAgfVxuICAgIH07XG5cbiAgICB3cmFwcGVyID0gbmV3IFdyYXBwZXIoZGVmYXVsdFZhbHVlLCBkZWYud3JpdGFibGUsIGRlZi52YWxpZGF0b3JzLCBkZWYuZ2V0dGVyLCBudWxsLCBhc3NlcnQpO1xuICB9IGVsc2Uge1xuXG4gICAgLy8gZm9yIE9iamVjdHMsIHdlIGNhbiBjcmVhdGUgYW5kIHJldXNlXG4gICAgLy8gYSBwcm90b3R5cGUgb2JqZWN0LiBXZSB0aGVuIG5lZWQgdG8gb25seVxuICAgIC8vIGRlZmluZSB0aGUgZGVmcyBhbmQgdGhlICdpbnN0YW5jZScgcHJvcGVydGllc1xuICAgIC8vIGUuZy4gX18sIHBhcmVudCBldGMuXG4gICAgdmFyIHByb3RvID0gY3JlYXRlTW9kZWxQcm90b3R5cGUoZGVmKTtcblxuICAgIGRlZmF1bHRWYWx1ZSA9IGZ1bmN0aW9uKHBhcmVudCkge1xuICAgICAgdmFyIG1vZGVsID0gT2JqZWN0LmNyZWF0ZShwcm90bywgY3JlYXRlTW9kZWxEZXNjcmlwdG9ycyhkZWYsIHBhcmVudCkpO1xuICAgICAgZGVmaW5lUHJvcGVydGllcyhtb2RlbCk7XG4gICAgICByZXR1cm4gbW9kZWw7XG4gICAgfTtcblxuICAgIGFzc2VydCA9IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgICBpZiAoIXByb3RvLmlzUHJvdG90eXBlT2YodmFsdWUpKSB7XG4gICAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBwcm90b3R5cGUnKTtcbiAgICAgIH1cbiAgICB9O1xuXG4gICAgd3JhcHBlciA9IG5ldyBXcmFwcGVyKGRlZmF1bHRWYWx1ZSwgZGVmLndyaXRhYmxlLCBkZWYudmFsaWRhdG9ycywgZGVmLmdldHRlciwgbnVsbCwgYXNzZXJ0KTtcbiAgfVxuXG4gIHZhciBmYWN0b3J5ID0gZnVuY3Rpb24ocGFyZW50KSB7XG4gICAgdmFyIHdyYXAgPSBPYmplY3QuY3JlYXRlKHdyYXBwZXIpO1xuICAgIC8vaWYgKCF3cmFwLmlzSW5pdGlhbGl6ZWQpIHtcbiAgICB3cmFwLmluaXRpYWxpemUocGFyZW50KTtcbiAgICAvL31cbiAgICByZXR1cm4gd3JhcDtcbiAgfTtcblxuICAvLyBleHBvc2UgdGhlIHdyYXBwZXIsIHRoaXMgaXMgdXNlZFxuICAvLyBmb3IgdmFsaWRhdGluZyBhcnJheSBpdGVtcyBsYXRlclxuICBmYWN0b3J5LndyYXBwZXIgPSB3cmFwcGVyO1xuXG4gIHJldHVybiBmYWN0b3J5O1xufVxuXG5tb2R1bGUuZXhwb3J0cyA9IGNyZWF0ZVdyYXBwZXJGYWN0b3J5O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgRW1pdHRlckV2ZW50ID0gcmVxdWlyZSgnLi9lbWl0dGVyLWV2ZW50Jyk7XG52YXIgVmFsaWRhdGlvbkVycm9yID0gcmVxdWlyZSgnLi92YWxpZGF0aW9uLWVycm9yJyk7XG52YXIgV3JhcHBlciA9IHJlcXVpcmUoJy4vd3JhcHBlcicpO1xuXG52YXIgZGVzY3JpcHRvcnMgPSB7XG4gIF9fc3VwZXJtb2RlbDoge1xuICAgIHZhbHVlOiB0cnVlXG4gIH0sXG4gIF9fa2V5czoge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICB2YXIga2V5cyA9IE9iamVjdC5rZXlzKHRoaXMpO1xuXG4gICAgICBpZiAoQXJyYXkuaXNBcnJheSh0aGlzKSkge1xuICAgICAgICB2YXIgb21pdCA9IFtcbiAgICAgICAgICAnYWRkRXZlbnRMaXN0ZW5lcicsICdvbicsICdvbmNlJywgJ3JlbW92ZUV2ZW50TGlzdGVuZXInLCAncmVtb3ZlQWxsTGlzdGVuZXJzJyxcbiAgICAgICAgICAncmVtb3ZlTGlzdGVuZXInLCAnb2ZmJywgJ2VtaXQnLCAnbGlzdGVuZXJzJywgJ2hhc0xpc3RlbmVycycsICdwb3AnLCAncHVzaCcsXG4gICAgICAgICAgJ3JldmVyc2UnLCAnc2hpZnQnLCAnc29ydCcsICdzcGxpY2UnLCAndXBkYXRlJywgJ3Vuc2hpZnQnLCAnY3JlYXRlJyxcbiAgICAgICAgICAnX19zZXROb3RpZnlDaGFuZ2UnLCAnX19ub3RpZnlDaGFuZ2UnLCAnX19zZXQnLCAnX19nZXQnLCAnX19jaGFpbicsICdfX3JlbGF0aXZlUGF0aCdcbiAgICAgICAgXTtcblxuICAgICAgICBrZXlzID0ga2V5cy5maWx0ZXIoZnVuY3Rpb24oaXRlbSkge1xuICAgICAgICAgIHJldHVybiBvbWl0LmluZGV4T2YoaXRlbSkgPCAwO1xuICAgICAgICB9KTtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGtleXM7XG4gICAgfVxuICB9LFxuICBfX25hbWU6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgaWYgKHRoaXMuX19pc1Jvb3QpIHtcbiAgICAgICAgcmV0dXJuICcnO1xuICAgICAgfVxuXG4gICAgICAvLyBXb3JrIG91dCB0aGUgJ25hbWUnIG9mIHRoZSBtb2RlbFxuICAgICAgLy8gTG9vayB1cCB0byB0aGUgcGFyZW50IGFuZCBsb29wIHRocm91Z2ggaXQncyBrZXlzLFxuICAgICAgLy8gQW55IHZhbHVlIG9yIGFycmF5IGZvdW5kIHRvIGNvbnRhaW4gdGhlIHZhbHVlIG9mIHRoaXMgKHRoaXMgbW9kZWwpXG4gICAgICAvLyB0aGVuIHdlIHJldHVybiB0aGUga2V5IGFuZCBpbmRleCBpbiB0aGUgY2FzZSB3ZSBmb3VuZCB0aGUgbW9kZWwgaW4gYW4gYXJyYXkuXG4gICAgICB2YXIgcGFyZW50S2V5cyA9IHRoaXMuX19wYXJlbnQuX19rZXlzO1xuICAgICAgdmFyIHBhcmVudEtleSwgcGFyZW50VmFsdWUsIGlzQXJyYXk7XG5cbiAgICAgIGZvciAodmFyIGkgPSAwOyBpIDwgcGFyZW50S2V5cy5sZW5ndGg7IGkrKykge1xuICAgICAgICBwYXJlbnRLZXkgPSBwYXJlbnRLZXlzW2ldO1xuICAgICAgICBwYXJlbnRWYWx1ZSA9IHRoaXMuX19wYXJlbnRbcGFyZW50S2V5XTtcbiAgICAgICAgaXNBcnJheSA9IEFycmF5LmlzQXJyYXkocGFyZW50VmFsdWUpO1xuXG4gICAgICAgIGlmIChwYXJlbnRWYWx1ZSA9PT0gdGhpcykge1xuICAgICAgICAgIHJldHVybiBwYXJlbnRLZXk7XG4gICAgICAgIH1cbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIF9fcGF0aDoge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICBpZiAodGhpcy5fX2hhc0FuY2VzdG9ycyAmJiAhdGhpcy5fX3BhcmVudC5fX2lzUm9vdCkge1xuICAgICAgICByZXR1cm4gdGhpcy5fX3BhcmVudC5fX3BhdGggKyAnLicgKyB0aGlzLl9fbmFtZTtcbiAgICAgIH0gZWxzZSB7XG4gICAgICAgIHJldHVybiB0aGlzLl9fbmFtZTtcbiAgICAgIH1cbiAgICB9XG4gIH0sXG4gIF9faXNSb290OiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiAhdGhpcy5fX2hhc0FuY2VzdG9ycztcbiAgICB9XG4gIH0sXG4gIF9fY2hpbGRyZW46IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGNoaWxkcmVuID0gW107XG5cbiAgICAgIHZhciBrZXlzID0gdGhpcy5fX2tleXM7XG4gICAgICB2YXIga2V5LCB2YWx1ZTtcblxuICAgICAgZm9yICh2YXIgaSA9IDA7IGkgPCBrZXlzLmxlbmd0aDsgaSsrKSB7XG5cbiAgICAgICAga2V5ID0ga2V5c1tpXTtcbiAgICAgICAgdmFsdWUgPSB0aGlzW2tleV07XG5cbiAgICAgICAgaWYgKHZhbHVlICYmIHZhbHVlLl9fc3VwZXJtb2RlbCkge1xuICAgICAgICAgIGNoaWxkcmVuLnB1c2godmFsdWUpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBjaGlsZHJlbjtcbiAgICB9XG4gIH0sXG4gIF9fYW5jZXN0b3JzOiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBhbmNlc3RvcnMgPSBbXSxcbiAgICAgICAgciA9IHRoaXM7XG5cbiAgICAgIHdoaWxlIChyLl9fcGFyZW50KSB7XG4gICAgICAgIGFuY2VzdG9ycy5wdXNoKHIuX19wYXJlbnQpO1xuICAgICAgICByID0gci5fX3BhcmVudDtcbiAgICAgIH1cblxuICAgICAgcmV0dXJuIGFuY2VzdG9ycztcbiAgICB9XG4gIH0sXG4gIF9fZGVzY2VuZGFudHM6IHtcbiAgICBnZXQ6IGZ1bmN0aW9uKCkge1xuICAgICAgdmFyIGRlc2NlbmRhbnRzID0gW107XG5cbiAgICAgIGZ1bmN0aW9uIGNoZWNrQW5kQWRkRGVzY2VuZGFudElmTW9kZWwob2JqKSB7XG5cbiAgICAgICAgdmFyIGtleXMgPSBvYmouX19rZXlzO1xuICAgICAgICB2YXIga2V5LCB2YWx1ZTtcblxuICAgICAgICBmb3IgKHZhciBpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcblxuICAgICAgICAgIGtleSA9IGtleXNbaV07XG4gICAgICAgICAgdmFsdWUgPSBvYmpba2V5XTtcblxuICAgICAgICAgIGlmICh2YWx1ZSAmJiB2YWx1ZS5fX3N1cGVybW9kZWwpIHtcblxuICAgICAgICAgICAgZGVzY2VuZGFudHMucHVzaCh2YWx1ZSk7XG4gICAgICAgICAgICBjaGVja0FuZEFkZERlc2NlbmRhbnRJZk1vZGVsKHZhbHVlKTtcblxuICAgICAgICAgIH1cbiAgICAgICAgfVxuXG4gICAgICB9XG5cbiAgICAgIGNoZWNrQW5kQWRkRGVzY2VuZGFudElmTW9kZWwodGhpcyk7XG5cbiAgICAgIHJldHVybiBkZXNjZW5kYW50cztcbiAgICB9XG4gIH0sXG4gIF9faGFzQW5jZXN0b3JzOiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHJldHVybiAhIXRoaXMuX19hbmNlc3RvcnMubGVuZ3RoO1xuICAgIH1cbiAgfSxcbiAgX19oYXNEZXNjZW5kYW50czoge1xuICAgIGdldDogZnVuY3Rpb24oKSB7XG4gICAgICByZXR1cm4gISF0aGlzLl9fZGVzY2VuZGFudHMubGVuZ3RoO1xuICAgIH1cbiAgfSxcbiAgZXJyb3JzOiB7XG4gICAgZ2V0OiBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBlcnJvcnMgPSBbXSxcbiAgICAgICAgZGVmID0gdGhpcy5fX2RlZjtcbiAgICAgIHZhciB2YWxpZGF0b3IsIGVycm9yLCBpLCBqO1xuXG4gICAgICAvLyBSdW4gb3duIHZhbGlkYXRvcnNcbiAgICAgIHZhciBvd24gPSBkZWYudmFsaWRhdG9ycy5zbGljZSgwKTtcbiAgICAgIGZvciAoaSA9IDA7IGkgPCBvd24ubGVuZ3RoOyBpKyspIHtcbiAgICAgICAgdmFsaWRhdG9yID0gb3duW2ldO1xuICAgICAgICBlcnJvciA9IHZhbGlkYXRvci5jYWxsKHRoaXMsIHRoaXMpO1xuXG4gICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgIGVycm9ycy5wdXNoKG5ldyBWYWxpZGF0aW9uRXJyb3IodGhpcywgZXJyb3IsIHZhbGlkYXRvcikpO1xuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIC8vIFJ1biB0aHJvdWdoIGtleXMgYW5kIGV2YWx1YXRlIHZhbGlkYXRvcnNcbiAgICAgIHZhciBrZXlzID0gdGhpcy5fX2tleXM7XG4gICAgICB2YXIgdmFsdWUsIGtleSwgaXRlbURlZjtcblxuICAgICAgZm9yIChpID0gMDsgaSA8IGtleXMubGVuZ3RoOyBpKyspIHtcblxuICAgICAgICBrZXkgPSBrZXlzW2ldO1xuXG4gICAgICAgIC8vIElmIHdlIGFyZSBhbiBBcnJheSB3aXRoIGFuIGl0ZW0gZGVmaW5pdGlvblxuICAgICAgICAvLyB0aGVuIHdlIGhhdmUgdG8gbG9vayBpbnRvIHRoZSBBcnJheSBmb3Igb3VyIHZhbHVlXG4gICAgICAgIC8vIGFuZCBhbHNvIGdldCBob2xkIG9mIHRoZSB3cmFwcGVyLiBXZSBvbmx5IG5lZWQgdG9cbiAgICAgICAgLy8gZG8gdGhpcyBpZiB0aGUga2V5IGlzIG5vdCBhIHByb3BlcnR5IG9mIHRoZSBhcnJheS5cbiAgICAgICAgLy8gV2UgY2hlY2sgdGhlIGRlZnMgdG8gd29yayB0aGlzIG91dCAoaS5lLiAwLCAxLCAyKS5cbiAgICAgICAgLy8gdG9kbzogVGhpcyBjb3VsZCBiZSBiZXR0ZXIgdG8gY2hlY2sgIU5hTiBvbiB0aGUga2V5P1xuICAgICAgICBpZiAoZGVmLmlzQXJyYXkgJiYgZGVmLmRlZiAmJiAoIWRlZi5kZWZzIHx8ICEoa2V5IGluIGRlZi5kZWZzKSkpIHtcblxuICAgICAgICAgIC8vIElmIHdlIGFyZSBhbiBBcnJheSB3aXRoIGEgc2ltcGxlIGl0ZW0gZGVmaW5pdGlvblxuICAgICAgICAgIC8vIG9yIGEgcmVmZXJlbmNlIHRvIGEgc2ltcGxlIHR5cGUgZGVmaW5pdGlvblxuICAgICAgICAgIC8vIHN1YnN0aXR1dGUgdGhlIHZhbHVlIHdpdGggdGhlIHdyYXBwZXIgd2UgZ2V0IGZyb20gdGhlXG4gICAgICAgICAgLy8gY3JlYXRlIGZhY3RvcnkgZnVuY3Rpb24uIE90aGVyd2lzZSBzZXQgdGhlIHZhbHVlIHRvXG4gICAgICAgICAgLy8gdGhlIHJlYWwgdmFsdWUgb2YgdGhlIHByb3BlcnR5LlxuICAgICAgICAgIGl0ZW1EZWYgPSBkZWYuZGVmO1xuXG4gICAgICAgICAgaWYgKGl0ZW1EZWYuaXNTaW1wbGUpIHtcbiAgICAgICAgICAgIHZhbHVlID0gaXRlbURlZi5jcmVhdGUud3JhcHBlcjtcbiAgICAgICAgICAgIHZhbHVlLnNldFZhbHVlKHRoaXNba2V5XSk7XG4gICAgICAgICAgfSBlbHNlIGlmIChpdGVtRGVmLmlzUmVmZXJlbmNlICYmIGl0ZW1EZWYudHlwZS5kZWYuaXNTaW1wbGUpIHtcbiAgICAgICAgICAgIHZhbHVlID0gaXRlbURlZi50eXBlLmRlZi5jcmVhdGUud3JhcHBlcjtcbiAgICAgICAgICAgIHZhbHVlLnNldFZhbHVlKHRoaXNba2V5XSk7XG4gICAgICAgICAgfSBlbHNlIHtcbiAgICAgICAgICAgIHZhbHVlID0gdGhpc1trZXldO1xuICAgICAgICAgIH1cbiAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgIC8vIFNldCB0aGUgdmFsdWUgdG8gdGhlIHdyYXBwZWQgdmFsdWUgb2YgdGhlIHByb3BlcnR5XG4gICAgICAgICAgdmFsdWUgPSB0aGlzLl9fW2tleV07XG4gICAgICAgIH1cblxuICAgICAgICBpZiAodmFsdWUpIHtcblxuICAgICAgICAgIGlmICh2YWx1ZS5fX3N1cGVybW9kZWwpIHtcbiAgICAgICAgICAgIEFycmF5LnByb3RvdHlwZS5wdXNoLmFwcGx5KGVycm9ycywgdmFsdWUuZXJyb3JzKTtcbiAgICAgICAgICB9IGVsc2UgaWYgKHZhbHVlIGluc3RhbmNlb2YgV3JhcHBlcikge1xuXG4gICAgICAgICAgICB2YXIgd3JhcHBlclZhbHVlID0gdmFsdWUuZ2V0VmFsdWUodGhpcyk7XG4gICAgICAgICAgICAvLyBgU2ltcGxlYCBwcm9wZXJ0aWVzIGNhbiBiZSBpZGVudGlmaWVkIGJ5IG5vdCBoYXZpbmcgYW5cbiAgICAgICAgICAgIC8vIGFzc2VydGlvbi4gVG9kbzogVGhpcyBtYXkgbmVlZCB0byBiZWNvbWUgbW9yZSBleHBsaWNpdC5cbiAgICAgICAgICAgIC8vaWYgKCF2YWx1ZS5fYXNzZXJ0KSB7XG5cbiAgICAgICAgICAgIGlmICh3cmFwcGVyVmFsdWUgJiYgd3JhcHBlclZhbHVlLl9fc3VwZXJtb2RlbCkge1xuICAgICAgICAgICAgICBBcnJheS5wcm90b3R5cGUucHVzaC5hcHBseShlcnJvcnMsIHdyYXBwZXJWYWx1ZS5lcnJvcnMpO1xuICAgICAgICAgICAgfSBlbHNlIHtcblxuICAgICAgICAgICAgICB2YXIgc2ltcGxlID0gdmFsdWUudmFsaWRhdG9ycztcbiAgICAgICAgICAgICAgZm9yIChqID0gMDsgaiA8IHNpbXBsZS5sZW5ndGg7IGorKykge1xuICAgICAgICAgICAgICAgIHZhbGlkYXRvciA9IHNpbXBsZVtqXTtcbiAgICAgICAgICAgICAgICBlcnJvciA9IHZhbGlkYXRvci5jYWxsKHRoaXMsIHdyYXBwZXJWYWx1ZSwga2V5KTtcblxuICAgICAgICAgICAgICAgIGlmIChlcnJvcikge1xuICAgICAgICAgICAgICAgICAgZXJyb3JzLnB1c2gobmV3IFZhbGlkYXRpb25FcnJvcih0aGlzLCBlcnJvciwgdmFsaWRhdG9yLCBrZXkpKTtcbiAgICAgICAgICAgICAgICB9XG4gICAgICAgICAgICAgIH1cbiAgICAgICAgICAgIH1cblxuICAgICAgICAgICAgLy99XG4gICAgICAgICAgfVxuICAgICAgICB9XG4gICAgICB9XG5cbiAgICAgIHJldHVybiBlcnJvcnM7XG4gICAgfVxuICB9XG59O1xuXG52YXIgcHJvdG8gPSB7XG4gIF9fZ2V0OiBmdW5jdGlvbihrZXkpIHtcbiAgICByZXR1cm4gdGhpcy5fX1trZXldLmdldFZhbHVlKHRoaXMpO1xuICB9LFxuICBfX3NldDogZnVuY3Rpb24oa2V5LCB2YWx1ZSkge1xuICAgIHRoaXMuX19ba2V5XS5zZXRWYWx1ZSh2YWx1ZSwgdGhpcyk7XG4gIH0sXG4gIF9fcmVsYXRpdmVQYXRoOiBmdW5jdGlvbih0bywga2V5KSB7XG4gICAgdmFyIHJlbGF0aXZlUGF0aCA9IHRoaXMuX19wYXRoID8gdG8uc3Vic3RyKHRoaXMuX19wYXRoLmxlbmd0aCArIDEpIDogdG87XG5cbiAgICBpZiAocmVsYXRpdmVQYXRoKSB7XG4gICAgICByZXR1cm4ga2V5ID8gcmVsYXRpdmVQYXRoICsgJy4nICsga2V5IDogcmVsYXRpdmVQYXRoO1xuICAgIH1cbiAgICByZXR1cm4ga2V5O1xuICB9LFxuICBfX2NoYWluOiBmdW5jdGlvbihmbikge1xuICAgIHJldHVybiBbdGhpc10uY29uY2F0KHRoaXMuX19hbmNlc3RvcnMpLmZvckVhY2goZm4pO1xuICB9LFxuICBfX25vdGlmeUNoYW5nZTogZnVuY3Rpb24oa2V5LCBuZXdWYWx1ZSwgb2xkVmFsdWUpIHtcbiAgICB2YXIgdGFyZ2V0ID0gdGhpcztcbiAgICB2YXIgdGFyZ2V0UGF0aCA9IHRoaXMuX19wYXRoO1xuICAgIHZhciBldmVudE5hbWUgPSAnc2V0JztcbiAgICB2YXIgZGF0YSA9IHtcbiAgICAgIG9sZFZhbHVlOiBvbGRWYWx1ZSxcbiAgICAgIG5ld1ZhbHVlOiBuZXdWYWx1ZVxuICAgIH07XG5cbiAgICB0aGlzLmVtaXQoZXZlbnROYW1lLCBuZXcgRW1pdHRlckV2ZW50KGV2ZW50TmFtZSwga2V5LCB0YXJnZXQsIGRhdGEpKTtcbiAgICB0aGlzLmVtaXQoJ2NoYW5nZScsIG5ldyBFbWl0dGVyRXZlbnQoZXZlbnROYW1lLCBrZXksIHRhcmdldCwgZGF0YSkpO1xuICAgIHRoaXMuX19hbmNlc3RvcnMuZm9yRWFjaChmdW5jdGlvbihpdGVtKSB7XG4gICAgICB2YXIgcGF0aCA9IGl0ZW0uX19yZWxhdGl2ZVBhdGgodGFyZ2V0UGF0aCwga2V5KTtcbiAgICAgIGl0ZW0uZW1pdCgnY2hhbmdlJywgbmV3IEVtaXR0ZXJFdmVudChldmVudE5hbWUsIHBhdGgsIHRhcmdldCwgZGF0YSkpO1xuICAgIH0pO1xuICB9LFxuICBfX3NldE5vdGlmeUNoYW5nZTogZnVuY3Rpb24oa2V5LCB2YWx1ZSkge1xuICAgIHZhciBvbGRWYWx1ZSA9IHRoaXMuX19nZXQoa2V5KTtcbiAgICB0aGlzLl9fc2V0KGtleSwgdmFsdWUpO1xuICAgIHZhciBuZXdWYWx1ZSA9IHRoaXMuX19nZXQoa2V5KTtcbiAgICB0aGlzLl9fbm90aWZ5Q2hhbmdlKGtleSwgbmV3VmFsdWUsIG9sZFZhbHVlKTtcbiAgfVxufTtcblxubW9kdWxlLmV4cG9ydHMgPSB7XG4gIHByb3RvOiBwcm90byxcbiAgZGVzY3JpcHRvcnM6IGRlc2NyaXB0b3JzXG59O1xuIiwiJ3VzZSBzdHJpY3QnO1xuXG52YXIgZW1pdHRlciA9IHJlcXVpcmUoJy4vZW1pdHRlci1vYmplY3QnKTtcbnZhciBlbWl0dGVyQXJyYXkgPSByZXF1aXJlKCcuL2VtaXR0ZXItYXJyYXknKTtcbnZhciBFbWl0dGVyRXZlbnQgPSByZXF1aXJlKCcuL2VtaXR0ZXItZXZlbnQnKTtcblxudmFyIGV4dGVuZCA9IHJlcXVpcmUoJy4vdXRpbCcpLmV4dGVuZDtcbnZhciBtb2RlbCA9IHJlcXVpcmUoJy4vbW9kZWwnKTtcbnZhciBtb2RlbFByb3RvID0gbW9kZWwucHJvdG87XG52YXIgbW9kZWxEZXNjcmlwdG9ycyA9IG1vZGVsLmRlc2NyaXB0b3JzO1xuXG52YXIgbW9kZWxQcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKG1vZGVsUHJvdG8sIG1vZGVsRGVzY3JpcHRvcnMpO1xudmFyIG9iamVjdFByb3RvdHlwZSA9IChmdW5jdGlvbigpIHtcbiAgdmFyIHAgPSBPYmplY3QuY3JlYXRlKG1vZGVsUHJvdG90eXBlKTtcblxuICBlbWl0dGVyKHApO1xuXG4gIHJldHVybiBwO1xufSkoKTtcblxuZnVuY3Rpb24gY3JlYXRlQXJyYXlQcm90b3R5cGUoKSB7XG5cbiAgdmFyIHAgPSBlbWl0dGVyQXJyYXkoZnVuY3Rpb24oZXZlbnROYW1lLCBhcnIsIGUpIHtcblxuICAgIGlmIChldmVudE5hbWUgPT09ICd1cGRhdGUnKSB7XG4gICAgICAvKipcbiAgICAgICAqIEZvcndhcmQgdGhlIHNwZWNpYWwgYXJyYXkgdXBkYXRlXG4gICAgICAgKiBldmVudHMgYXMgc3RhbmRhcmQgX19ub3RpZnlDaGFuZ2UgZXZlbnRzXG4gICAgICAgKi9cbiAgICAgIGFyci5fX25vdGlmeUNoYW5nZShlLmluZGV4LCBlLnZhbHVlLCBlLm9sZFZhbHVlKTtcbiAgICB9IGVsc2Uge1xuICAgICAgLyoqXG4gICAgICAgKiBBbGwgb3RoZXIgZXZlbnRzIGUuZy4gcHVzaCwgc3BsaWNlIGFyZSByZWxheWVkXG4gICAgICAgKi9cbiAgICAgIHZhciB0YXJnZXQgPSBhcnI7XG4gICAgICB2YXIgcGF0aCA9IGFyci5fX3BhdGg7XG4gICAgICB2YXIgZGF0YSA9IGU7XG4gICAgICB2YXIga2V5ID0gZS5pbmRleDtcblxuICAgICAgYXJyLmVtaXQoZXZlbnROYW1lLCBuZXcgRW1pdHRlckV2ZW50KGV2ZW50TmFtZSwgJycsIHRhcmdldCwgZGF0YSkpO1xuICAgICAgYXJyLmVtaXQoJ2NoYW5nZScsIG5ldyBFbWl0dGVyRXZlbnQoZXZlbnROYW1lLCAnJywgdGFyZ2V0LCBkYXRhKSk7XG4gICAgICBhcnIuX19hbmNlc3RvcnMuZm9yRWFjaChmdW5jdGlvbihpdGVtKSB7XG4gICAgICAgIHZhciBuYW1lID0gaXRlbS5fX3JlbGF0aXZlUGF0aChwYXRoLCBrZXkpO1xuICAgICAgICBpdGVtLmVtaXQoJ2NoYW5nZScsIG5ldyBFbWl0dGVyRXZlbnQoZXZlbnROYW1lLCBuYW1lLCB0YXJnZXQsIGRhdGEpKTtcbiAgICAgIH0pO1xuXG4gICAgfVxuICB9KTtcblxuICBPYmplY3QuZGVmaW5lUHJvcGVydGllcyhwLCBtb2RlbERlc2NyaXB0b3JzKTtcblxuICBlbWl0dGVyKHApO1xuXG4gIGV4dGVuZChwLCBtb2RlbFByb3RvKTtcblxuICByZXR1cm4gcDtcbn1cblxuZnVuY3Rpb24gY3JlYXRlT2JqZWN0TW9kZWxQcm90b3R5cGUocHJvdG8pIHtcbiAgdmFyIHAgPSBPYmplY3QuY3JlYXRlKG9iamVjdFByb3RvdHlwZSk7XG5cbiAgaWYgKHByb3RvKSB7XG4gICAgZXh0ZW5kKHAsIHByb3RvKTtcbiAgfVxuXG4gIHJldHVybiBwO1xufVxuXG5mdW5jdGlvbiBjcmVhdGVBcnJheU1vZGVsUHJvdG90eXBlKHByb3RvLCBpdGVtRGVmKSB7XG5cbiAgLy8gV2UgZG8gbm90IHRvIGF0dGVtcHQgdG8gc3ViY2xhc3MgQXJyYXksXG4gIC8vIGluc3RlYWQgY3JlYXRlIGEgbmV3IGluc3RhbmNlIGVhY2ggdGltZVxuICAvLyBhbmQgbWl4aW4gdGhlIHByb3RvIG9iamVjdFxuICB2YXIgcCA9IGNyZWF0ZUFycmF5UHJvdG90eXBlKCk7XG5cbiAgaWYgKHByb3RvKSB7XG4gICAgZXh0ZW5kKHAsIHByb3RvKTtcbiAgfVxuXG4gIGlmIChpdGVtRGVmKSB7XG5cbiAgICAvLyBXZSBoYXZlIGEgZGVmaW5pdGlvbiBmb3IgdGhlIGl0ZW1zXG4gICAgLy8gdGhhdCBiZWxvbmcgaW4gdGhpcyBhcnJheS5cblxuICAgIC8vIFVzZSB0aGUgYHdyYXBwZXJgIHByb3RvdHlwZSBwcm9wZXJ0eSBhcyBhXG4gICAgLy8gdmlydHVhbCBXcmFwcGVyIG9iamVjdCB3ZSBjYW4gdXNlXG4gICAgLy8gdmFsaWRhdGUgYWxsIHRoZSBpdGVtcyBpbiB0aGUgYXJyYXkuXG4gICAgdmFyIGFyckl0ZW1XcmFwcGVyID0gaXRlbURlZi5jcmVhdGUud3JhcHBlcjtcblxuICAgIC8vIFZhbGlkYXRlIG5ldyBtb2RlbHMgYnkgb3ZlcnJpZGluZyB0aGUgZW1pdHRlciBhcnJheVxuICAgIC8vIG11dGF0b3JzIHRoYXQgY2FuIGNhdXNlIG5ldyBpdGVtcyB0byBlbnRlciB0aGUgYXJyYXkuXG4gICAgb3ZlcnJpZGVBcnJheUFkZGluZ011dGF0b3JzKHAsIGFyckl0ZW1XcmFwcGVyKTtcblxuICAgIC8vIFByb3ZpZGUgYSBjb252ZW5pZW50IG1vZGVsIGZhY3RvcnlcbiAgICAvLyBmb3IgY3JlYXRpbmcgYXJyYXkgaXRlbSBpbnN0YW5jZXNcbiAgICBwLmNyZWF0ZSA9IGZ1bmN0aW9uKCkge1xuICAgICAgcmV0dXJuIGl0ZW1EZWYuaXNSZWZlcmVuY2UgPyBpdGVtRGVmLnR5cGUoKSA6IGl0ZW1EZWYuY3JlYXRlKCkuZ2V0VmFsdWUodGhpcyk7XG4gICAgfTtcbiAgfVxuXG4gIHJldHVybiBwO1xufVxuXG5mdW5jdGlvbiBvdmVycmlkZUFycmF5QWRkaW5nTXV0YXRvcnMoYXJyLCBpdGVtV3JhcHBlcikge1xuXG4gIGZ1bmN0aW9uIGdldEFycmF5QXJncyhpdGVtcykge1xuICAgIHZhciBhcmdzID0gW107XG4gICAgZm9yICh2YXIgaSA9IDA7IGkgPCBpdGVtcy5sZW5ndGg7IGkrKykge1xuICAgICAgaXRlbVdyYXBwZXIuc2V0VmFsdWUoaXRlbXNbaV0sIGFycik7XG4gICAgICBhcmdzLnB1c2goaXRlbVdyYXBwZXIuZ2V0VmFsdWUoYXJyKSk7XG4gICAgfVxuICAgIHJldHVybiBhcmdzO1xuICB9XG5cbiAgdmFyIHB1c2ggPSBhcnIucHVzaDtcbiAgdmFyIHVuc2hpZnQgPSBhcnIudW5zaGlmdDtcbiAgdmFyIHNwbGljZSA9IGFyci5zcGxpY2U7XG4gIHZhciB1cGRhdGUgPSBhcnIudXBkYXRlO1xuXG4gIGlmIChwdXNoKSB7XG4gICAgYXJyLnB1c2ggPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBhcmdzID0gZ2V0QXJyYXlBcmdzKGFyZ3VtZW50cyk7XG4gICAgICByZXR1cm4gcHVzaC5hcHBseShhcnIsIGFyZ3MpO1xuICAgIH07XG4gIH1cblxuICBpZiAodW5zaGlmdCkge1xuICAgIGFyci51bnNoaWZ0ID0gZnVuY3Rpb24oKSB7XG4gICAgICB2YXIgYXJncyA9IGdldEFycmF5QXJncyhhcmd1bWVudHMpO1xuICAgICAgcmV0dXJuIHVuc2hpZnQuYXBwbHkoYXJyLCBhcmdzKTtcbiAgICB9O1xuICB9XG5cbiAgaWYgKHNwbGljZSkge1xuICAgIGFyci5zcGxpY2UgPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBhcmdzID0gZ2V0QXJyYXlBcmdzKEFycmF5LnByb3RvdHlwZS5zbGljZS5jYWxsKGFyZ3VtZW50cywgMikpO1xuICAgICAgYXJncy51bnNoaWZ0KGFyZ3VtZW50c1sxXSk7XG4gICAgICBhcmdzLnVuc2hpZnQoYXJndW1lbnRzWzBdKTtcbiAgICAgIHJldHVybiBzcGxpY2UuYXBwbHkoYXJyLCBhcmdzKTtcbiAgICB9O1xuICB9XG5cbiAgaWYgKHVwZGF0ZSkge1xuICAgIGFyci51cGRhdGUgPSBmdW5jdGlvbigpIHtcbiAgICAgIHZhciBhcmdzID0gZ2V0QXJyYXlBcmdzKFthcmd1bWVudHNbMV1dKTtcbiAgICAgIGFyZ3MudW5zaGlmdChhcmd1bWVudHNbMF0pO1xuICAgICAgcmV0dXJuIHVwZGF0ZS5hcHBseShhcnIsIGFyZ3MpO1xuICAgIH07XG4gIH1cbn1cblxuZnVuY3Rpb24gY3JlYXRlTW9kZWxQcm90b3R5cGUoZGVmKSB7XG4gIHJldHVybiBkZWYuaXNBcnJheSA/IGNyZWF0ZUFycmF5TW9kZWxQcm90b3R5cGUoZGVmLnByb3RvLCBkZWYuZGVmKSA6IGNyZWF0ZU9iamVjdE1vZGVsUHJvdG90eXBlKGRlZi5wcm90byk7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gY3JlYXRlTW9kZWxQcm90b3R5cGU7XG4iLCIndXNlIHN0cmljdCc7XG5cbm1vZHVsZS5leHBvcnRzID0ge307XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBjcmVhdGVEZWYgPSByZXF1aXJlKCcuL2RlZicpO1xudmFyIFN1cGVybW9kZWwgPSByZXF1aXJlKCcuL3N1cGVybW9kZWwnKTtcblxuZnVuY3Rpb24gc3VwZXJtb2RlbHMoc2NoZW1hLCBpbml0aWFsaXplcikge1xuXG4gIHZhciBkZWYgPSBjcmVhdGVEZWYoc2NoZW1hKTtcblxuICBmdW5jdGlvbiBTdXBlcm1vZGVsQ29uc3RydWN0b3IoKSB7XG4gICAgdmFyIG1vZGVsID0gZGVmLmlzU2ltcGxlID8gZGVmLmNyZWF0ZSgpIDogZGVmLmNyZWF0ZSgpLmdldFZhbHVlKHt9KTtcblxuICAgIC8vIENhbGwgYW55IGluaXRpYWxpemVyXG4gICAgaWYgKGluaXRpYWxpemVyKSB7XG4gICAgICBpbml0aWFsaXplci5hcHBseShtb2RlbCwgYXJndW1lbnRzKTtcbiAgICB9XG5cbiAgICByZXR1cm4gbW9kZWw7XG4gIH1cbiAgT2JqZWN0LmRlZmluZVByb3BlcnR5KFN1cGVybW9kZWxDb25zdHJ1Y3RvciwgJ2RlZicsIHtcbiAgICB2YWx1ZTogZGVmIC8vIHRoaXMgaXMgdXNlZCB0byB2YWxpZGF0ZSByZWZlcmVuY2VkIFN1cGVybW9kZWxDb25zdHJ1Y3RvcnNcbiAgfSk7XG4gIFN1cGVybW9kZWxDb25zdHJ1Y3Rvci5wcm90b3R5cGUgPSBTdXBlcm1vZGVsOyAvLyB0aGlzIHNoYXJlZCBvYmplY3QgaXMgdXNlZCwgYXMgYSBwcm90b3R5cGUsIHRvIGlkZW50aWZ5IFN1cGVybW9kZWxDb25zdHJ1Y3RvcnNcbiAgU3VwZXJtb2RlbENvbnN0cnVjdG9yLmNvbnN0cnVjdG9yID0gU3VwZXJtb2RlbENvbnN0cnVjdG9yO1xuXG4gIHJldHVybiBTdXBlcm1vZGVsQ29uc3RydWN0b3I7XG59XG5cbm1vZHVsZS5leHBvcnRzID0gc3VwZXJtb2RlbHM7XG4iLCIndXNlIHN0cmljdCc7XG5cbnZhciBTdXBlcm1vZGVsID0gcmVxdWlyZSgnLi9zdXBlcm1vZGVsJyk7XG5cbmZ1bmN0aW9uIGV4dGVuZChvcmlnaW4sIGFkZCkge1xuICAvLyBEb24ndCBkbyBhbnl0aGluZyBpZiBhZGQgaXNuJ3QgYW4gb2JqZWN0XG4gIGlmICghYWRkIHx8IHR5cGVvZiBhZGQgIT09ICdvYmplY3QnKSB7XG4gICAgcmV0dXJuIG9yaWdpbjtcbiAgfVxuXG4gIHZhciBrZXlzID0gT2JqZWN0LmtleXMoYWRkKTtcbiAgdmFyIGkgPSBrZXlzLmxlbmd0aDtcbiAgd2hpbGUgKGktLSkge1xuICAgIG9yaWdpbltrZXlzW2ldXSA9IGFkZFtrZXlzW2ldXTtcbiAgfVxuICByZXR1cm4gb3JpZ2luO1xufVxuXG52YXIgdXRpbCA9IHtcbiAgZXh0ZW5kOiBleHRlbmQsXG4gIHR5cGVPZjogZnVuY3Rpb24ob2JqKSB7XG4gICAgcmV0dXJuIE9iamVjdC5wcm90b3R5cGUudG9TdHJpbmcuY2FsbChvYmopLm1hdGNoKC9cXHMoW2EtekEtWl0rKS8pWzFdLnRvTG93ZXJDYXNlKCk7XG4gIH0sXG4gIGlzT2JqZWN0OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJldHVybiB0aGlzLnR5cGVPZih2YWx1ZSkgPT09ICdvYmplY3QnO1xuICB9LFxuICBpc0FycmF5OiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJldHVybiBBcnJheS5pc0FycmF5KHZhbHVlKTtcbiAgfSxcbiAgaXNTaW1wbGU6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgLy8gJ1NpbXBsZScgaGVyZSBtZWFucyBhbnl0aGluZ1xuICAgIC8vIG90aGVyIHRoYW4gYW4gT2JqZWN0IG9yIGFuIEFycmF5XG4gICAgLy8gaS5lLiBudW1iZXIsIHN0cmluZywgZGF0ZSwgYm9vbCwgbnVsbCwgdW5kZWZpbmVkLCByZWdleC4uLlxuICAgIHJldHVybiAhdGhpcy5pc09iamVjdCh2YWx1ZSkgJiYgIXRoaXMuaXNBcnJheSh2YWx1ZSk7XG4gIH0sXG4gIGlzRnVuY3Rpb246IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuIHRoaXMudHlwZU9mKHZhbHVlKSA9PT0gJ2Z1bmN0aW9uJztcbiAgfSxcbiAgaXNEYXRlOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJldHVybiB0aGlzLnR5cGVPZih2YWx1ZSkgPT09ICdkYXRlJztcbiAgfSxcbiAgaXNOdWxsOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIHJldHVybiB2YWx1ZSA9PT0gbnVsbDtcbiAgfSxcbiAgaXNVbmRlZmluZWQ6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgcmV0dXJuIHR5cGVvZih2YWx1ZSkgPT09ICd1bmRlZmluZWQnO1xuICB9LFxuICBpc051bGxPclVuZGVmaW5lZDogZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gdGhpcy5pc051bGwodmFsdWUpIHx8IHRoaXMuaXNVbmRlZmluZWQodmFsdWUpO1xuICB9LFxuICBjYXN0OiBmdW5jdGlvbih2YWx1ZSwgdHlwZSkge1xuICAgIGlmICghdHlwZSkge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cblxuICAgIHN3aXRjaCAodHlwZSkge1xuICAgICAgY2FzZSBTdHJpbmc6XG4gICAgICAgIHJldHVybiB1dGlsLmNhc3RTdHJpbmcodmFsdWUpO1xuICAgICAgY2FzZSBOdW1iZXI6XG4gICAgICAgIHJldHVybiB1dGlsLmNhc3ROdW1iZXIodmFsdWUpO1xuICAgICAgY2FzZSBCb29sZWFuOlxuICAgICAgICByZXR1cm4gdXRpbC5jYXN0Qm9vbGVhbih2YWx1ZSk7XG4gICAgICBjYXNlIERhdGU6XG4gICAgICAgIHJldHVybiB1dGlsLmNhc3REYXRlKHZhbHVlKTtcbiAgICAgIGNhc2UgT2JqZWN0OlxuICAgICAgY2FzZSBGdW5jdGlvbjpcbiAgICAgICAgcmV0dXJuIHZhbHVlO1xuICAgICAgZGVmYXVsdDpcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIGNhc3QnKTtcbiAgICB9XG4gIH0sXG4gIGNhc3RTdHJpbmc6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09IG51bGwgfHwgdXRpbC50eXBlT2YodmFsdWUpID09PSAnc3RyaW5nJykge1xuICAgICAgcmV0dXJuIHZhbHVlO1xuICAgIH1cbiAgICByZXR1cm4gdmFsdWUudG9TdHJpbmcgJiYgdmFsdWUudG9TdHJpbmcoKTtcbiAgfSxcbiAgY2FzdE51bWJlcjogZnVuY3Rpb24odmFsdWUpIHtcbiAgICBpZiAodmFsdWUgPT09IHVuZGVmaW5lZCB8fCB2YWx1ZSA9PT0gbnVsbCkge1xuICAgICAgcmV0dXJuIE5hTjtcbiAgICB9XG4gICAgaWYgKHV0aWwudHlwZU9mKHZhbHVlKSA9PT0gJ251bWJlcicpIHtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG4gICAgcmV0dXJuIE51bWJlcih2YWx1ZSk7XG4gIH0sXG4gIGNhc3RCb29sZWFuOiBmdW5jdGlvbih2YWx1ZSkge1xuICAgIGlmICghdmFsdWUpIHtcbiAgICAgIHJldHVybiBmYWxzZTtcbiAgICB9XG4gICAgdmFyIGZhbHNleSA9IFsnMCcsICdmYWxzZScsICdvZmYnLCAnbm8nXTtcbiAgICByZXR1cm4gZmFsc2V5LmluZGV4T2YodmFsdWUpID09PSAtMTtcbiAgfSxcbiAgY2FzdERhdGU6IGZ1bmN0aW9uKHZhbHVlKSB7XG4gICAgaWYgKHZhbHVlID09PSB1bmRlZmluZWQgfHwgdmFsdWUgPT09IG51bGwgfHwgdXRpbC50eXBlT2YodmFsdWUpID09PSAnZGF0ZScpIHtcbiAgICAgIHJldHVybiB2YWx1ZTtcbiAgICB9XG4gICAgcmV0dXJuIG5ldyBEYXRlKHZhbHVlKTtcbiAgfSxcbiAgaXNDb25zdHJ1Y3RvcjogZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gdGhpcy5pc1NpbXBsZUNvbnN0cnVjdG9yKHZhbHVlKSB8fCBbQXJyYXksIE9iamVjdF0uaW5kZXhPZih2YWx1ZSkgPiAtMTtcbiAgfSxcbiAgaXNTaW1wbGVDb25zdHJ1Y3RvcjogZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gW1N0cmluZywgTnVtYmVyLCBEYXRlLCBCb29sZWFuXS5pbmRleE9mKHZhbHVlKSA+IC0xO1xuICB9LFxuICBpc1N1cGVybW9kZWxDb25zdHJ1Y3RvcjogZnVuY3Rpb24odmFsdWUpIHtcbiAgICByZXR1cm4gdGhpcy5pc0Z1bmN0aW9uKHZhbHVlKSAmJiB2YWx1ZS5wcm90b3R5cGUgPT09IFN1cGVybW9kZWw7XG4gIH1cbn07XG5cbm1vZHVsZS5leHBvcnRzID0gdXRpbDtcbiIsIid1c2Ugc3RyaWN0JztcblxuZnVuY3Rpb24gVmFsaWRhdGlvbkVycm9yKHRhcmdldCwgZXJyb3IsIHZhbGlkYXRvciwga2V5KSB7XG4gIHRoaXMudGFyZ2V0ID0gdGFyZ2V0O1xuICB0aGlzLmVycm9yID0gZXJyb3I7XG4gIHRoaXMudmFsaWRhdG9yID0gdmFsaWRhdG9yO1xuXG4gIGlmIChrZXkpIHtcbiAgICB0aGlzLmtleSA9IGtleTtcbiAgfVxufVxuXG5tb2R1bGUuZXhwb3J0cyA9IFZhbGlkYXRpb25FcnJvcjtcbiIsIid1c2Ugc3RyaWN0JztcblxudmFyIHV0aWwgPSByZXF1aXJlKCcuL3V0aWwnKTtcblxuZnVuY3Rpb24gV3JhcHBlcihkZWZhdWx0VmFsdWUsIHdyaXRhYmxlLCB2YWxpZGF0b3JzLCBnZXR0ZXIsIGJlZm9yZVNldCwgYXNzZXJ0KSB7XG4gIHRoaXMudmFsaWRhdG9ycyA9IHZhbGlkYXRvcnM7XG5cbiAgdGhpcy5fZGVmYXVsdFZhbHVlID0gZGVmYXVsdFZhbHVlO1xuICB0aGlzLl93cml0YWJsZSA9IHdyaXRhYmxlO1xuICB0aGlzLl9nZXR0ZXIgPSBnZXR0ZXI7XG4gIHRoaXMuX2JlZm9yZVNldCA9IGJlZm9yZVNldDtcbiAgdGhpcy5fYXNzZXJ0ID0gYXNzZXJ0O1xuICB0aGlzLmlzSW5pdGlhbGl6ZWQgPSBmYWxzZTtcblxuICBpZiAoIXV0aWwuaXNGdW5jdGlvbihkZWZhdWx0VmFsdWUpKSB7XG4gICAgdGhpcy5pc0luaXRpYWxpemVkID0gdHJ1ZTtcblxuICAgIGlmICghdXRpbC5pc1VuZGVmaW5lZChkZWZhdWx0VmFsdWUpKSB7XG4gICAgICB0aGlzLl92YWx1ZSA9IGRlZmF1bHRWYWx1ZTtcbiAgICB9XG4gIH1cbn1cbldyYXBwZXIucHJvdG90eXBlLmluaXRpYWxpemUgPSBmdW5jdGlvbihwYXJlbnQpIHtcbiAgaWYgKHRoaXMuaXNJbml0aWFsaXplZCkge1xuICAgIHJldHVybjtcbiAgfVxuXG4gIHRoaXMuc2V0VmFsdWUodGhpcy5fZGVmYXVsdFZhbHVlKHBhcmVudCksIHBhcmVudCk7XG4gIHRoaXMuaXNJbml0aWFsaXplZCA9IHRydWU7XG59O1xuV3JhcHBlci5wcm90b3R5cGUuZ2V0VmFsdWUgPSBmdW5jdGlvbihtb2RlbCkge1xuICByZXR1cm4gdGhpcy5fZ2V0dGVyID8gdGhpcy5fZ2V0dGVyLmNhbGwobW9kZWwpIDogdGhpcy5fdmFsdWU7XG59O1xuV3JhcHBlci5wcm90b3R5cGUuc2V0VmFsdWUgPSBmdW5jdGlvbih2YWx1ZSwgbW9kZWwpIHtcblxuICBpZiAoIXRoaXMuX3dyaXRhYmxlKSB7XG4gICAgdGhyb3cgbmV3IEVycm9yKCdWYWx1ZSBpcyByZWFkb25seScpO1xuICB9XG5cbiAgLy8gSWYgdXAgdGhlIHBhcmVudCByZWYgaWYgbmVjZXNzYXJ5XG4gIGlmICh2YWx1ZSAmJiB2YWx1ZS5fX3N1cGVybW9kZWwgJiYgbW9kZWwpIHtcbiAgICBpZiAodmFsdWUuX19wYXJlbnQgIT09IG1vZGVsKSB7XG4gICAgICB2YWx1ZS5fX3BhcmVudCA9IG1vZGVsO1xuICAgIH1cbiAgfVxuXG4gIHZhciB2YWwgPSB0aGlzLl9iZWZvcmVTZXQgPyB0aGlzLl9iZWZvcmVTZXQodmFsdWUpIDogdmFsdWU7XG5cbiAgaWYgKHRoaXMuX2Fzc2VydCkge1xuICAgIHRoaXMuX2Fzc2VydCh2YWwpO1xuICB9XG5cbiAgdGhpcy5fdmFsdWUgPSB2YWw7XG59O1xuXG5tb2R1bGUuZXhwb3J0cyA9IFdyYXBwZXI7XG4iXX0=
