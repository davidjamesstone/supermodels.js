'use strict';

//var merge = require('./merge');
var createDef = require('./def');
var Supermodel = require('./supermodel');

function supermodels(schema, initializer) {

  var def = createDef(schema);

  function SupermodelConstructor(data) {
    var model = def.isSimple ? def.create() : def.create().getValue({});

    // Call any initializer
    if (initializer) {
      initializer.apply(model, arguments);
    } else if (data) {
      // if there's no initializer
      // but we have been passed some
      // data, merge it into the model.
      model.__merge(data);
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
