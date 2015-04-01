var emitter = require('emitter-object');
var emitterArray = require('emitter-array');

var extend = require('./util').extend;
var modelProto = require('./model').proto;
var modelDescriptors = require('./model').descriptors;

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