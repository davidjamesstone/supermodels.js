module.exports = function EmitterEvent(name, target, detail) {
  var e = {
    name: name,
    target: target
  };

  if (detail) {
    e.detail = detail;
  }

  return e;
};