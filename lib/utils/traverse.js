const { isArray, isObject } = require('./is')
const isOrAnd = (key) => key === '$or' || key === '$and';

const deepTraverse = (val, fn) => {
  if (isArray(val)) {
    return val.forEach((obj) => Object.keys(obj).forEach((k) => fn(obj, k)))
  }

  if (isObject(val)) {
    return Object.keys(val).forEach((k) => isOrAnd(k) ?
      deepTraverse(val[k], fn) :
      fn(val, k)
    )
  }
};

const traverseFilter = (filter, fn) => {
  Object.keys(filter || {}).forEach((key) => {
    const val = filter[key];

    if (isOrAnd(key)) {
      return val.forEach((v) => deepTraverse(v, fn));
    }

    return fn(filter, key);
  });
};

module.exports = {
  traverseFilter
};