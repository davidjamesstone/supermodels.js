/**
 * A Model Value encapsulates the value part of an object
 * Given an object { a: 1 }, the value part would be the '1'.
 * The key part is 'a'. A 'property' is a combination of both.
 * 
 * We encapsulate the value part here and provide a getter, setter
 * to enable us to proxy (and report) any changes to a property
 */

// function Box(context, key, value, cast, validators, assert) {
//   this._context = context;
//   this._key = key;
// }
// Object.defineProperties(Box.prototype, {
//   errors: {
//     get: function() {
//       var errors = [];
//       var key = this._key;
//       var context = this._context;
//       var validators = this._wrapper.validators;
      
//       for (var i = 0; i < validators.length; i++) {
//         validator = validators[i];
//         key = validator.key;
//         error = validator.test.call(context, key ? context[key] : context, key);
  
//         if (error) {
//           errors.push(new ValidationError(this, error, validator, key));
//         }
//       }
      
//       return errors;
//     }
//   }
// });

var util = require('./util');

function Wrapper(defaultValue, writable, validators, beforeSet, assert) {
  this.validators = validators;
  
  this._defaultValue = defaultValue;
  this._writable = writable;
  this._beforeSet = beforeSet;
  this._assert = assert;
  this.isInitialized = false;
  
  if (!util.isFunction(defaultValue)) {
    this.isInitialized = true;
    
    if (!util.isUndefined(defaultValue)) {
      this.value = defaultValue;
    }
  }
}
Wrapper.prototype.initialize = function(parent) {
  if (this.isInitialized) {
    return;
  }
  this.value = this._defaultValue(parent);
  this.isInitialized = true;
};
Object.defineProperties(Wrapper.prototype, {
  value: {
    get: function() {
      return this._getter ? this._getter() : this._value;
    },
    set: function(value) {
      
      if (!this._writable) {
        throw new Error('Value is readonly');
      }
      
      //def.setter.call(this, value);
      var val = this._beforeSet ? this._beforeSet(value) : value;
      
      if (this._assert) {
        this._assert(val);
      }
      
      this._value = val;
    }
  }
});

module.exports = Wrapper;