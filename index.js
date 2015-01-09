var EmitterEvent = require('emitter-event');
var emitterArray = require('emitter-array');
var mdl = require('./model');

var __VALIDATORS = '__validators';
var __VALUE = '__value';
var __TYPE = '__type';
var __SPECIAL_PROPS = [__VALIDATORS, __VALUE, __TYPE];

var util = {
  toType: function(obj) {
    return ({}).toString.call(obj).match(/\s([a-zA-Z]+)/)[1].toLowerCase();
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
    return this.toType() === 'date';
  },
  isSpecialProp: function(key) {
    return __SPECIAL_PROPS.indexOf(key) !== -1;
  },
  getProps: function(obj) {
    if (!this.isObject(obj)) return null;

    return Object.keys(obj).filter(function(item) {
      return !this.isSpecialProp(item);
    }, this);
  },
  getSpecialProps: function(descriptor) {
    if (!this.isObject(obj)) return null;

    return Object.keys(obj).filter(function(item) {
      return this.isSpecialProp(obj[item]);
    }, this);
  },
  hasProps: function(obj) {
    var props = this.getProps(obj);
    return props && !!props.length;
  },
  hasSpecialProps: function(obj) {
    var specialProps = getSpecialProps(obj);
    return specialProps && !!specialProps.length;
  },
  hasOnlySpecialProps: function(obj) {
    if (!this.isObject(obj)) return false;

    var keys = Object.keys(obj);
    return keys.every(function(item) {
      return __SPECIAL_PROPS.indexOf(item) != -1;
    });
  },
  hasMixedProps: function(obj) {
    return hasSpecialProps(obj) && !hasOnlySpecialProps(obj);
  },
  hasNoSpecialProps: function(obj) {
    return !hasSpecialProps(obj);
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
  var hasGetterSetter = hasGetter || hasSetter;

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

  if (isObject && util.isArray(descriptorValue[__VALIDATORS])) {
    addValidators(descriptorValue[__VALIDATORS], validators, key);
  }

  if (isArray) {

    //
    var arr = emitterArray();

    if (descriptorValue.length) {

      // Create a new prototype we can use to
      // create and validate the items in the array
      var arrItemModelPrototype = createModel(ctx);

      // Validate new models by override the emitter array 
      // mutators that can cause new items to enter the array
      overrideEmitterArrayAddingMutators(arr, arrItemModelPrototype);

      // Provide a convenient model factory 
      // for creating array item instances
      arr.create = function() {
        var newModel = Object.create(arrItemModelPrototype);

        addKeys(descriptorValue[0], newModel);

        return newModel;
      };

      arr.on('change', function() {
        console.log('changes');
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

function addValidators(validators, model, key) {
  var validator;
  for (var i = 0; i < validators.length; i++) {
    var source = validators[i];
    if (util.isFunction(source)) {
      validator = {
        test: source
      };
    } else {
      validator = mixin(source, {});
    }
    if (key) validator.key = key;
    model.push(validator);
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