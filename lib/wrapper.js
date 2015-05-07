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
      this.value = defaultValue;
    }
  }
}
Wrapper.prototype.initialize = function(parent) {
  this._parent = parent;

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

      if (value && value.__supermodel && this._parent) {
        if (value.__parent !== this._parent) {
          value.__parent = this._parent;
        }
      }

      var val = this._beforeSet ? this._beforeSet(value) : value;

      if (this._assert) {
        this._assert(val);
      }

      this._value = val;
    }
  }
});

module.exports = Wrapper;
