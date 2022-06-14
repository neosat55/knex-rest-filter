const METHODS = {
  $or: 'orWhere',
  $and: 'andWhere',
  $ne: 'whereNot',
  $in: 'whereIn',
  $nin: 'whereNotIn'
};

const OPERATORS = {
  $eq: '=',
  $lt: '<',
  $lte: '<=',
  $gt: '>',
  $gte: '>=',
  $like: 'like',
  $notlike: 'not like',
  $ilike: 'ilike'
};

const isObject = (v) => Object.prototype.toString.call(v) === '[object Object]';
const isPrimitive = (v) => !isObject(v) && !Array.isArray(v);
const clone = (v) => JSON.parse(JSON.stringify(v));

const helpers = {};

helpers.checkAdditionalDeep = (filter, key) => {
  const simple = filter[key].every(isObject);

  if (simple) {
    return 1;
  }

  return filter[key].length;
};

helpers.level = (filter) => {
  let len = Object.keys(filter || {}).length;

  if (filter.$or) {
    // Не считаем $or
    len--;
    len += helpers.checkAdditionalDeep(filter, '$or');
  }

  if (filter.$and) {
    // Не считаем $and
    len--;
    len += helpers.checkAdditionalDeep(filter, '$and');
  }

  return len;
};

class Filterify {
  /**
   * @private
   */
  _plugins = [];
  _deep = 0;

  constructor(plugins) {
    this._plugins = plugins ?? [];
  }

  static of(plugins = []) {
    return new Filterify(plugins);
  }

  apply(query, filter) {
    this._filter = clone(filter);

    this._plugins.forEach((plugin) => {
      plugin.execute(this._filter);
    });

    this._apply(query, this._filter);
  }

  _baseCase(query, key, val, column, parentMethod) {
    const operator = OPERATORS[key] || '=';

    if (Array.isArray(val)) {
      return query.whereIn(key, val);
    }

    if (val === null) {
      return query.whereNull(column);
    }

    return parentMethod ?
      query[parentMethod](column, operator, val) :
      query.where(column, operator, val);
  }

  /**
   * @private
   * @param {*} query
   * @param {Object<*>} params
   * @param {{parentKey: string, parentMethod: string}} args
   */
  _apply(query, params, args = {}) {
    const {parentKey, parentMethod} = args;
    const keys = Object.keys(params || {});

    keys.forEach((key) => {
      const val = params[key];

      const column = parentKey || key;
      const method = METHODS[key];

      if (isObject(val)) {
        this._deep++;

        return this._apply(query, val, {parentKey: key, parentMethod});
      }

      if (method) {
        if (key === '$or' || key === '$and') {
          return query[method]((q) => this._orAnd(q, val, method, parentKey));
        }

        return query[method].call(query, column, val);
      }

      return this._baseCase(query, key, val, column, parentMethod);
    });
  }

  _orAnd(query, filter, method, parentKey) {
    const args = {parentKey, parentMethod: method};

    return filter.forEach((condition) => {
      if (Array.isArray(condition)) {
        return condition.forEach((cond) => {
          this._apply(query, cond, args);
        });
      } else {
        this._apply(query, condition, args);
      }
    });
  }
}

class Remover {
  /**
   * @param {string[]} keys
   */
  constructor(keys = []) {
    this.keys = keys;
  }

  static of(keys) {
    return new Remover(keys);
  }

  /**
   * @private
   */
  _remove(filter, key) {
    const [par] = key.split('.');

    if (this.keys.includes(par) || this.keys.includes(key)) {
      delete filter[key];
    }
  }

  execute(filter) {
    if (!this.keys?.length) {
      return;
    }

    return traverseFilter(filter, this._remove.bind(this));
  }
}

class Keeper {
  constructor(keys = []) {
    this.keys = keys;
  }

  static of(keys) {
    return new Keeper(keys);
  }

  _keep(filter, key) {
    const [par] = key.split('.');

    if (!this.keys.includes(par) && !this.keys.includes(key)) {
      delete filter[key];
    }
  }

  execute(filter) {
    if (!this.keys?.length) {
      return;
    }

    return traverseFilter(filter, this._keep.bind(this));
  }
}

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

Filterify.remover = (keys) => Filterify.of([Remover.of(keys)]);
Filterify.keeper = (keys) => Filterify.of([Keeper.of(keys)]);

module.exports = {Filterify, Remover, Keeper, helpers};
