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
