var util = require('./util');
var createWrapperFactory = require('./factory');

function resolve(from) {
  var isCtor = util.isConstructor(from);
  var isSupermodelCtor = util.isSupermodelConstructor(from);
  var isArray = util.isArray(from);

  if (isCtor || isSupermodelCtor || isArray) {
    return {
      __type: from
    };
  }

  var isValue = !util.isObject(from);
  if (isValue) {
    return {
      __value: from
    };
  }

  return from;
}

function createDef(from) {

  from = resolve(from);

  var __VALIDATORS = '__validators',
    __VALUE = '__value',
    __TYPE = '__type',
    __DISPLAYNAME = '__displayName',
    __GET = '__get',
    __SET = '__set',
    __ENUMERABLE = '__enumerable',
    __CONFIGURABLE = '__configurable',
    __WRITABLE = '__writable',
    __SPECIAL_PROPS = [__VALIDATORS, __VALUE, __TYPE, __DISPLAYNAME, __GET, __SET, __ENUMERABLE, __CONFIGURABLE, __WRITABLE];

  var def = {
    from: from,
    type: from[__TYPE],
    value: from[__VALUE],
    validators: from[__VALIDATORS] || [],
    enumerable: from[__ENUMERABLE] === false ? false : true,
    configurable: from[__CONFIGURABLE] ? true : false,
    writable: from[__WRITABLE] === false ? false : true,
    displayName: from[__DISPLAYNAME],
    getter: from[__GET],
    setter: from[__SET]
  };

  var type = def.type;

  // Simple 'Constructor' Type
  if (util.isSimpleConstructor(type)) {

    def.isSimple = true;

    def.cast = function(value) {
      return util.cast(value, type);
    };

  } else if (util.isSupermodelConstructor(type)) {

    def.isReference = true;
  } else if (def.value) {
    // If a value is present, use 
    // that and short-circuit the rest
    def.isSimple = true;

  } else {

    // Otherwise look for other non-special
    // keys and also any item definition
    // in the case of Arrays

    var keys = Object.keys(from);
    var childKeys = keys.filter(function(item) {
      return __SPECIAL_PROPS.indexOf(item) === -1;
    });

    if (childKeys.length) {

      var defs = {};
      var proto;

      childKeys.forEach(function(key) {
        var value = from[key];
        if (!util.isConstructor(value) && !util.isSupermodelConstructor(value) && util.isFunction(value)) {
          if (!proto) {
            proto = {};
          }
          proto[key] = value;
        } else {
          defs[key] = createDef(value);
        }
      });

      def.defs = defs;
      def.proto = proto;

    }

    // Check for Array
    if (type === Array || util.isArray(type)) {

      def.isArray = true;

      if (type.length > 0) {
        def.def = createDef(type[0]);
      }

    } else if (childKeys.length === 0) {
      def.isSimple = true;
    }

  }

  def.create = createWrapperFactory(def);

  return def;
}

module.exports = createDef;
