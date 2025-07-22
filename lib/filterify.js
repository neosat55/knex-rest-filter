const { Keeper, Remover } = require('./plugins');
const { isObject, isPrimitive, isOrAnd } = require('./utils/is');

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

const clone = (v) => JSON.parse(JSON.stringify(v));

const clone2 = (v) => structuredClone(v);
const clone3 = (v) => structuredClone(v);
const clone4 = (v) => structuredClone(v);

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
   * @param {{parentKey?: string, parentMethod?: string}} args
   */
  _apply(query, params, args = {}) {
    const { parentKey, parentMethod } = args;

    // обработка случаев когда внутри $or или $and примитивные условия
    // например $or: [1, 2] -> col = 1 or col = 2
    // $or: [null, [1, 2]] -> col is null or col in (1, 2)
    if (!isObject(params)) {
      return this._baseCase(query, parentKey, params, parentKey, parentMethod);
    }

    const keys = Object.keys(params);

    keys.forEach((key) => {
      const val = params[key];

      const column = parentKey || key;
      const method = METHODS[key];

      if (isObject(val)) {
        return this._apply(query, val, { parentKey: key });
      }

      if (method) {
        if (isOrAnd(key)) {
          return query[parentMethod || method]((q) => this._orAnd(q, val, method, parentKey));
        }

        if (parentMethod === METHODS.$or) {
          return query[parentMethod]((ind) => {
            return ind[method].call(ind, column, val);
          });
        }

        return query[method].call(query, column, val);
      }

      return this._baseCase(query, key, val, column, parentMethod);
    });
  }

  _orAnd(query, filter, method, parentKey) {
    const args = { parentKey, parentMethod: method };

    return filter.forEach((condition) => {
      if (Array.isArray(condition)) {
        return query[method]((inq) => {
          let every = condition.every(isPrimitive);

          if (every) {
            return this._apply(inq, condition, args);
          }

          return condition.forEach((cond) => {
            this._apply(inq, cond, args);
          });
        });
      } else {
        this._apply(query, condition, args);
      }
    });
  }
}

Filterify.remover = (keys) => Filterify.of([Remover.of(keys)]);
Filterify.keeper = (keys) => Filterify.of([Keeper.of(keys)]);

const filterify = (query, filter) => Filterify.of().apply(query, filter);

module.exports = { Filterify, Remover, Keeper, filterify };
