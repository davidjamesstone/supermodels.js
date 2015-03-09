var createDef = require('./lib/def');
var createModelPrototype = require('./lib/proto');
var Supermodel = require('./lib/supermodel');

function supermodels(schema, initializer, parent) {
  
  var def = createDef(schema);
  
  // Wrap any simple definitions
  // in an object with a value property
  // if (def.isSimple) {
  //   def = createDef({
  //     value: from
  //   });
  // }
  
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
  })
  SupermodelConstructor.prototype = Supermodel; // this shared object is used, as a prototype, to identify SupermodelConstructors
  SupermodelConstructor.constructor = SupermodelConstructor;
  
  return SupermodelConstructor;
}

module.exports = supermodels;