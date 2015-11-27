'use strict'

function factory () {
  function Prop (type) {
    if (!(this instanceof Prop)) {
      return new Prop(type)
    }

    this.__type = type
    this.__validators = []
  }
  Prop.prototype.type = function (type) {
    this.__type = type
    return this
  }
  Prop.prototype.enumerable = function (enumerable) {
    this.__enumerable = enumerable
    return this
  }
  Prop.prototype.configurable = function (configurable) {
    this.__configurable = configurable
    return this
  }
  Prop.prototype.writable = function (writable) {
    this.__writable = writable
    return this
  }
  Prop.prototype.keys = function (keys) {
    if (this.__type !== Array) {
      this.__type = Object
    }
    for (var key in keys) {
      this[key] = keys[key]
    }
    return this
  }
  Prop.prototype.validate = function (fn) {
    this.__validators.push(fn)
    return this
  }
  Prop.prototype.get = function (fn) {
    this.__get = fn
    return this
  }
  Prop.prototype.set = function (fn) {
    this.__set = fn
    return this
  }
  Prop.prototype.value = function (value) {
    this.__value = value
    return this
  }
  Prop.prototype.name = function (name) {
    this.__displayName = name
    return this
  }
  Prop.register = function (name, fn) {
    var wrapper = function () {
      this.__validators.push(fn.apply(this, arguments))
      return this
    }
    Object.defineProperty(Prop.prototype, name, {
      value: wrapper
    })
  }
  return Prop
}

module.exports = factory
