'use strict';

var Supermodel = require('./supermodel');

function extend(origin, add) {
  // Don't do anything if add isn't an object
  if (!add || typeof add !== 'object') {
    return origin;
  }

  var keys = Object.keys(add);
  var i = keys.length;
  while (i--) {
    origin[keys[i]] = add[keys[i]];
  }
  return origin;
}

var util = {
  extend: extend,
  typeOf: function(obj) {
    return Object.prototype.toString.call(obj).match(/\s([a-zA-Z]+)/)[1].toLowerCase();
  },
  isObject: function(value) {
    return this.typeOf(value) === 'object';
  },
  isArray: function(value) {
    return Array.isArray(value);
  },
  isSimple: function(value) {
    // 'Simple' here means anything
    // other than an Object or an Array
    // i.e. number, string, date, bool, null, undefined, regex...
    return !this.isObject(value) && !this.isArray(value);
  },
  isFunction: function(value) {
    return this.typeOf(value) === 'function';
  },
  isDate: function(value) {
    return this.typeOf(value) === 'date';
  },
  isNull: function(value) {
    return value === null;
  },
  isUndefined: function(value) {
    return typeof(value) === 'undefined';
  },
  isNullOrUndefined: function(value) {
    return this.isNull(value) || this.isUndefined(value);
  },
  cast: function(value, type) {
    if (!type) {
      return value;
    }

    switch (type) {
      case String:
        return util.castString(value);
      case Number:
        return util.castNumber(value);
      case Boolean:
        return util.castBoolean(value);
      case Date:
        return util.castDate(value);
      case Object:
      case Function:
        return value;
      default:
        throw new Error('Invalid cast');
    }
  },
  castString: function(value) {
    if (value === undefined || value === null || util.typeOf(value) === 'string') {
      return value;
    }
    return value.toString && value.toString();
  },
  castNumber: function(value) {
    if (value === undefined || value === null) {
      return NaN;
    }
    if (util.typeOf(value) === 'number') {
      return value;
    }
    return Number(value);
  },
  castBoolean: function(value) {
    if (!value) {
      return false;
    }
    var falsey = ['0', 'false', 'off', 'no'];
    return falsey.indexOf(value) === -1;
  },
  castDate: function(value) {
    if (value === undefined || value === null || util.typeOf(value) === 'date') {
      return value;
    }
    return new Date(value);
  },
  isConstructor: function(value) {
    return this.isSimpleConstructor(value) || [Array, Object].indexOf(value) > -1;
  },
  isSimpleConstructor: function(value) {
    return [String, Number, Date, Boolean].indexOf(value) > -1;
  },
  isSupermodelConstructor: function(value) {
    return this.isFunction(value) && value.prototype === Supermodel;
  }
};

module.exports = util;
