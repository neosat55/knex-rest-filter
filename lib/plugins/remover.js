const {traverseFilter} = require('../utils/traverse');

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

module.exports = {
  Remover
};