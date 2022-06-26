const isObject = (v) => Object.prototype.toString.call(v) === '[object Object]';
const isPrimitive = (v) => !isObject(v) && !Array.isArray(v);

module.exports = {
  isObject,
  isPrimitive
};