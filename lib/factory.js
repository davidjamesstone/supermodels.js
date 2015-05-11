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
    __callbacks: { // 
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
