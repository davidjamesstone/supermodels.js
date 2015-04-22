var emitter = require('emitter-object');
var emitterArray = require('emitter-array');
var EmitterEvent = require('emitter-event');

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

      // Emit change event against this model
      arr.emit(name, new EmitterEvent(name, arr, e));

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
  var update = arr.update;

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

  if (update) {
    arr.update = function() {
      var args = wrapArrayItems(itemWrapper, [arguments[1]]);
      args.unshift(arguments[0]);
      return update.apply(arr, args);
    };
  }
}

function createModelPrototype(def) {
  return def.isArray ? createArrayModelPrototype(def.proto, def.def) : createObjectModelPrototype(def.proto);
}

module.exports = createModelPrototype;