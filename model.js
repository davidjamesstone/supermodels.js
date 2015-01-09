var Emitter = require('emitter-component');

function ValidationError(target, error, validator, key) {
  this.target = target;
  this.error = error;
  this.validator = validator;
  
  if (key) {
    this.key = key;
  }
}

var model = Object.create(Emitter.prototype, {
  __name: {
    get: function() {
      if (this.__isRoot) {
        return '';
      }

      // Work out the 'name' of the model
      // Look up to the parent and loop through it's keys,
      // Any value or array found to contain the value of this (this model)
      // then we return the key and index in the case we found the model in an array.
      var parentKeys = Object.keys(this.__parent);
      var parentKey, parentValue, isArray, index;

      for (var i = 0; i < parentKeys.length; i++) {
        parentKey = parentKeys[i];
        parentValue = this.__parent[parentKey];
        isArray = Array.isArray(parentValue);
        
        if (isArray) {
          index = parentValue.indexOf(this);
          if (index !== -1) {
            return parentKey + '[' + index + ']';
          }
        } else if (parentValue === this) {
          return parentKey;
        }
      }
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

      for (var i = 0; i < keys.length; i++) {
        var key = keys[i];
        if (this[key] instanceof Mdl) {
          Array.prototype.push.apply(descendants, this[key].descendants);
        }
      }

      return descendants;
    }
  },
  __isRoot: {
    get: function() {
      return !this.__hasAncestors;
    }
  },
  __hasAncestors: {
    get: function() {
      return !!this.__ancestors.length;
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
  __hasDecendents: {
    get: function() {
      return !!this.__descendants.length;
    }
  },
  errors: {
    get: function() {
      var errors = [];
      
      var validators = this.__validators;
      
      for (var i = 0; i < validators.length; i++) {
        var validator = validators[i];
        var key = validator.key;
        var error = validator.test.call(this, key ? this[key] : this);
        if (error) {
          errors.push(new ValidationError(this, error, validator, key));
        }
      }

      return errors;
    }
  }
});

module.exports = model;