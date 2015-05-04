module.exports = function EmitterEvent(name, path, target, detail) {
  this.name = name;
  this.path = path;
  this.target = target;

  if (detail) {
    this.detail = detail;
  }
};