const traverseMany = (val, fn) => {
  val.forEach((obj) => Object.keys(obj).forEach((k) => fn(obj, k)));
};

const traverseFilter = (filter, fn) => {
  Object.keys(filter || {}).forEach((key) => {
    const val = filter[key];

    if (key === '$and' || key === '$or') {
      return val.forEach((v) => traverseMany(v, fn));
    }

    return fn(filter, key);
  });
};

module.exports = {
  traverseFilter
};