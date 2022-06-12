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

helpers.checkAdditionalDeep = (filter) => {

};

helpers.isOneLevel = (filter) => {
  const keys = Object.keys(filter);

  if (filter['$or']) {
    return helpers.checkAdditionalDeep(filter['$or']);
  }

  if (filter['$and']) {
    return helpers.checkAdditionalDeep(filter['$and']);
  }

  if (keys.length === 1) {
    return true;
  }
};

class Filterify {
  /**
   * @private
   */
  _plugins = [];

  constructor(plugins) {
    this._plugins = plugins ?? [];
  }

  static of(plugins = []) {
    return new Filterify(plugins);
  }

  /**
   * @private
   */
  _orAndHandler(query, value, method, parentKey, level) {
    return value.forEach((condition) => {
      query[method]((qb) => {
        this._apply(qb, condition, parentKey, level);
      });
    });
  }

  _highOrAnd({query, value, method, level}) {
    return value.forEach((conditions) => {
      query[method]((inner2) => {
        conditions.forEach((condition) => {
          this._apply(inner2, condition, null, level + 1, method);
        });
      });
    });
  }

  _firstLevelOrAnd({query, method, value, level}) {
    if (value.length > 1) {
      return query[method]((inner) => {
        this._highOrAnd({
          query: inner,
          method,
          value,
          level
        });
      });
    }

    return this._highOrAnd({query, method, value, level});
  }

  /**
   * @private
   */
  _apply(query, params, parentKey, level = 0, parentMethod) {
    if (isPrimitive(params)) {
      return query.where(parentKey, params);
    }

    if (!isObject(params) && Array.isArray(params)) {
      return query.whereIn(parentKey, params);
    }

    Object.keys(params || {}).forEach((key) => {
      const value = params[key];

      if (isObject(value)) {
        return this._apply(query, value, key, level + 1);
      }

      const column = parentKey || key;
      const method = parentMethod || METHODS[key];
      const operator = OPERATORS[key] || '=';

      if (method) {
        if (key === '$or' || key === '$and') {
          return query.where((wQb) => this._orAndHandler(wQb, value, method, parentKey, level + 1));
        }

        // eslint-disable-next-line no-useless-call
        return query[method].call(query, column, value);
      }

      if (Array.isArray(value)) {
        return query.whereIn(key, value);
      }

      if (value === null) {
        return query.whereNull(column);
      }

      return query.where(column, operator, value);
    });
  }

  apply(query, filter) {
    this._filter = clone(filter);

    this._plugins.forEach((plugin) => {
      plugin.execute(this._filter);
    });

    this._apply(query, this._filter);
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

module.exports = {Filterify, Remover, Keeper};
