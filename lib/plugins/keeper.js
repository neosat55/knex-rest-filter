const {traverseFilter} = require('../utils/traverse')

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

module.exports = {
  Keeper
}