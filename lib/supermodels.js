var createDef = require('./def');
var createModelPrototype = require('./proto');
var Supermodel = require('./supermodel');

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
