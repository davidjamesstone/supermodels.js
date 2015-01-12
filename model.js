var Emitter = require('emitter-component');
var ValidationError = require('./validation-error');

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

      function checkAndAddDescendantIfModel(obj) {

        var keys = Object.keys(obj);
        var key, value;

        for (var i = 0; i < keys.length; i++) {

          key = keys[i];
          value = obj[key];

          if (model.isPrototypeOf(value)) {

            descendants.push(value);
            checkAndAddDescendantIfModel(value);

          } else if (Array.isArray(value) && value.create) {
            for (var j = 0; j < value.length; j++) {

              var arrValue = value[j];

              if (model.isPrototypeOf(arrValue)) {
                descendants.push(arrValue);
                checkAndAddDescendantIfModel(arrValue);
              }

            }
          }
        }

      }

      checkAndAddDescendantIfModel(this);

      return descendants;
    }
  },
  __children: {
    get: function() {
      var children = [];

      var keys = Object.keys(this);
      var key, value;
  
      for (var i = 0; i < keys.length; i++) {
  
        key = keys[i];
        value = this[key];
  
        if (model.isPrototypeOf(value)) {
  
          children.push(value);
  
        } else if (Array.isArray(value) && value.create) {
          for (var j = 0; j < value.length; j++) {
  
            var arrValue = value[j];
  
            if (model.isPrototypeOf(arrValue)) {
              children.push(arrValue);
            }
  
          }
        }
      }

      return children;
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
      var validator, key, error, child, i;
      
      for (i = 0; i < validators.length; i++) {
        validator = validators[i];
        key = validator.key;
        error = validator.test.call(this, key ? this[key] : this, key);
        
        if (error) {
          errors.push(new ValidationError(this, error, validator, key));
        }
      }
      
      for (i = 0; i < this.__children.length; i++) {
        child = this.__children[i];
        Array.prototype.push.apply(errors, child.errors);
      }

      return errors;
    }
  }
});

module.exports = model;