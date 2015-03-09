var EmitterEvent = require('emitter-event');
var ValidationError = require('./validation-error');
var Wrapper = require('./wrapper');

var descriptors = {
  __supermodel: {
    value: true
  },
  __keys: {
    get: function() {
      var keys = Object.keys(this);
      
      if (Array.isArray(this)) {
        var omit = [
          'addEventListener', 'on', 'once', 'removeEventListener', 'removeAllListeners',
          'removeListener', 'off', 'emit', 'listeners', 'hasListeners', 'pop', 'push',
          'reverse', 'shift', 'sort', 'splice', 'update', 'unshift', 'create',
           '__setNotifyChange', '__notifyChange', '__set', '__get'
        ];
  
        keys = keys.filter(function(item) {
          return omit.indexOf(item) < 0;
        });
      }

      return keys;
    }
  },
  __name: {
    get: function() {
      if (this.__isRoot) {
        return '';
      }

      // Work out the 'name' of the model
      // Look up to the parent and loop through it's keys,
      // Any value or array found to contain the value of this (this model)
      // then we return the key and index in the case we found the model in an array.
      var parentKeys = this.__parent.__keys;
      var parentKey, parentValue, isArray;

      for (var i = 0; i < parentKeys.length; i++) {
        parentKey = parentKeys[i];
        parentValue = this.__parent[parentKey];
        isArray = Array.isArray(parentValue);

        if (parentValue === this) {
          return parentKey;
        }
      }
    }
  },
  __path: {
    get: function() {
      if (this.__hasAncestors && !this.__parent.__isRoot) {
        return this.__parent.__path + '.' + this.__name;
      } else {
        return this.__name;
      }
    }
  },
  __isRoot: {
    get: function() {
      return !this.__hasAncestors;
    }
  },
  __children: {
    get: function() {
      var children = [];

      var keys = this.__keys;
      var key, value;

      for (var i = 0; i < keys.length; i++) {

        key = keys[i];
        value = this[key];

        if (value && value.__supermodel) {

          children.push(value);

        }
      }

      return children;
    }
  },
  __ancestors: {
    get: function() {
      var ancestors = [],
        r = this;

      while (r.__parent) {
        ancestors.push(r.__parent);
        r = r.__parent;
      }

      return ancestors;
    }
  },
  __descendants: {
    get: function() {
      var descendants = [];

      function checkAndAddDescendantIfModel(obj) {

        var keys = obj.__keys;
        var key, value;

        for (var i = 0; i < keys.length; i++) {

          key = keys[i];
          value = obj[key];

          if (value && value.__supermodel) {

            descendants.push(value);
            checkAndAddDescendantIfModel(value);

          }
        }

      }

      checkAndAddDescendantIfModel(this);

      return descendants;
    }
  },
  __hasAncestors: {
    get: function() {
      return !!this.__ancestors.length;
    }
  },
  __hasDecendants: {
    get: function() {
      return !!this.__descendants.length;
    }
  },
  __validators: {
    get: function() {
      var validators = this.__def.validators.slice(0);
      
      var keys = this.__keys;
      var key, value;

      for (var i = 0; i < keys.length; i++) {

        key = keys[i];
        value = this__[key];

        if (value instanceof Wrapper) {

          Array.prototype.push.apply(validators, value.validators);

        }
      }
      
      return validators;
    }
  },
  errors: {
    get: function() {
      var errors = [];
      var validators = this.__validators;
      var validator, key, error, child, i;

      if (validators) {

        for (i = 0; i < validators.length; i++) {
          validator = validators[i];
          key = validator.key;
          error = validator.test.call(this, key ? this[key] : this, key);

          if (error) {
            errors.push(new ValidationError(this, error, validator, key));
          }
        }
      }

      for (i = 0; i < this.__children.length; i++) {
        child = this.__children[i];
        Array.prototype.push.apply(errors, child.errors);
      }

      return errors;
    }
  }
};

var proto = {
  __get: function(key) {
    return this.__[key].value;
  },
  __set: function(key, value) {

    if (value && value.__supermodel) {
      if (value.__parent !== this) {
        value.__parent = this;
      }
    }
    
    // Accomodate for the case of the 
    // value already being a Wrapper instance
    // if (value instanceof Wrapper) {
    //   this.__[key] = value;
    // } else {
      this.__[key].value = value;
    // }

    var newValue = this.__get[key];
  },
  __notifyChange: function(key, newValue, oldValue) {
    // Emit change event against this model
    this.emit('change', new EmitterEvent('change', this, {
      name: key,
      value: newValue,
      oldValue: oldValue
    }));

    // Emit specific key change event against this model
    this.emit('change:' + key, new EmitterEvent('change:' + key, this, {
      value: newValue,
      oldValue: oldValue
    }));

    // Bubble the change event up against the ancestors
    var name;
    for (var i = 0; i < this.__ancestors.length; i++) {

      name = this.__path + '.' + key;

      // Emit change event against this ancestor
      this.__ancestors[i].emit('change', new EmitterEvent('change', this, {
        name: name,
        value: newValue,
        oldValue: oldValue
      }));

      // Emit specific change event against this ancestor
      this.__ancestors[i].emit('change:' + name, new EmitterEvent('change:' + name, this, {
        name: name,
        value: newValue,
        oldValue: oldValue
      }));
    }
  },
  __setNotifyChange: function(key, value) {
    var oldValue = this.__get(key);
    this.__set(key, value);
    var newValue = this.__get(key);
    this.__notifyChange(key, newValue, oldValue);
  }
};

module.exports = {
  proto: proto,
  descriptors: descriptors,
};