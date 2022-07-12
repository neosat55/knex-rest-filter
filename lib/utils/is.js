const isObject = (v) => Object.prototype.toString.call(v) === '[object Object]';
const isPrimitive = (v) => !isObject(v) && !Array.isArray(v);
const isArray = (v) => Array.isArray(v);
const isOrAnd = (key) => key === '$or' || key === '$and';

module.exports = {
  isObject,
  isPrimitive,
  isArray,
  isOrAnd
};