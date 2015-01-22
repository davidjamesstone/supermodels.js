//var Emitter = require('emitter-component');
var ValidationError = require('./validation-error');

var descriptors = {
  __supermodel: {
    value: true
  },
  __keys: {
    get: function() {
      var keys = Object.keys(this);
      var omit = [
        'addEventListener', 'on', 'once', 'removeEventListener', 'removeAllListeners',
        'removeListener', 'off', 'emit', 'listeners', 'hasListeners', 'pop', 'push',
        'reverse', 'shift', 'sort', 'splice', 'update', 'unshift', 'create'
      ];
      if (Array.isArray(this)) {
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
      var parentKey, parentValue, isArray; //, index;

      for (var i = 0; i < parentKeys.length; i++) {
        parentKey = parentKeys[i];
        parentValue = this.__parent[parentKey];
        isArray = Array.isArray(parentValue);

        // if (isArray) {
        //   index = parentValue.indexOf(this);
        //   if (index !== -1) {
        //     return parentKey + '[' + index + ']';
        //   }
        // } else 
        if (parentValue === this) {
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

        var keys = obj.__keys;
        var key, value;

        for (var i = 0; i < keys.length; i++) {

          key = keys[i];
          value = obj[key];

          if (value && value.__supermodel) {

            descendants.push(value);
            checkAndAddDescendantIfModel(value);

          }
          // else if (Array.isArray(value) && value.create) {
          //   for (var j = 0; j < value.length; j++) {

          //     var arrValue = value[j];

          //     if (arrValue && arrValue.__supermodel) {
          //       descendants.push(arrValue);
          //       checkAndAddDescendantIfModel(arrValue);
          //     }

          //   }
          // }
        }

      }

      checkAndAddDescendantIfModel(this);

      return descendants;
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

        } // else if (Array.isArray(value) && value.__supermodel && value.create) {
        //   for (var j = 0; j < value.length; j++) {

        //     var arrValue = value[j];

        //     if (arrValue && arrValue.__supermodel) {
        //       children.push(arrValue);
        //     }

        //   }
        // }
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
  __hasDecendants: {
    get: function() {
      return !!this.__descendants.length;
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

//var model = Object.create(Emitter.prototype, descriptors);

module.exports = descriptors;