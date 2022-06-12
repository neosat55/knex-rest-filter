/* eslint-disable camelcase, max-len*/
const knex = require('knex')({
  client: 'pg',
  connection: {
    database: 'postgres',
    user: 'postgres',
    password: 'root'
  }
});

const {Filterify, Remover, Keeper} = require('./filterify');

const helper = (filter, want) => {
  const model = knex('clients');

  const ff = new Filterify();

  ff.apply(model, filter);

  // language=SQL format=false
  expect(model.toQuery()).toEqual(`select * from "clients" where ${want}`);
};

const helper2 = (plugins, filter, want) => {
  const model = knex('clients');

  const ff = new Filterify(plugins);

  ff.apply(model, filter);

  // language=SQL format=false
  expect(model.toQuery()).toEqual(`select * from "clients" where ${want}`);
};

const methodsTests = [
  [
    `"name" in ('Kate', 'Je')`,
    {name: {$in: ['Kate', 'Je']}}
  ],
  [
    `"name" not in ('Kate', 'Je')`,
    {name: {$nin: ['Kate', 'Je']}}
  ],
  [
    `"name" is not null`,
    {name: {$ne: null}}
  ]
];

const operatorsTests = [
  [
    `"city_id" = 1`,
    {city_id: {$eq: 1}}
  ],
  [
    `"city_id" < 1`,
    {city_id: {$lt: 1}}
  ],
  [
    `"city_id" <= 1`,
    {city_id: {$lte: 1}}
  ],
  [
    `"city_id" > 1`,
    {city_id: {$gt: 1}}
  ],
  [
    `"city_id" >= 1`,
    {city_id: {$gte: 1}}
  ],
  [
    `"name" like 'test'`,
    {name: {$like: 'test'}}
  ],
  [
    `"name" not like 'test'`,
    {name: {$notlike: 'test'}}
  ],
  [
    `"name" ilike 'test'`,
    {name: {$ilike: 'test'}}
  ]
];

describe('filterify', () => {
  it.each(methodsTests)('methods %s', (want, filter) => {
    helper(filter, want);
  });

  it.each(operatorsTests)('operators %s', (want, filter) => {
    helper(filter, want);
  });

  it('should parse base without special symbols filter', () => {
    const filter = {name: 'hey'};
    const want = `"name" = 'hey'`;

    helper(filter, want);
  });
  it('should threat array as `where in` operator', () => {
    const filter = {name: ['test', 'test2']};
    const want = `"name" in ('test', 'test2')`;

    helper(filter, want);
  });
  it('should apply multiply column based filter', () => {
    const filter = {name: {$in: [1, 2]}, city_id: {$gt: 1}};
    const want = `"name" in (1, 2) and "city_id" > 1`;

    helper(filter, want);
  });
  it('should apply multiply operators on one column', () => {
    const filter = {name: {$ne: 'jill', $in: ['Kevin', 'Fate']}};
    const want = `not "name" = 'jill' and "name" in ('Kevin', 'Fate')`;

    helper(filter, want);
  });
  it('should apply `or` statement with special symbols', () => {
    const filter = {city_id: {$or: [{$gt: 1}, {$nin: [10, 11]}]}};
    const want = `(("city_id" > 1) or ("city_id" not in (10, 11)))`;

    helper(filter, want);
  });
  it('should apply `and` statement with special symbols', () => {
    // eslint-disable-next-line camelcase
    const filter = {city_id: {$and: [{$gt: 1}, {$nin: [10, 11]}]}};
    const want = `(("city_id" > 1) and ("city_id" not in (10, 11)))`;

    helper(filter, want);
  });
  it('should generate grouped `and` for many columns', () => {
    const filter = {
      $and: [
        [
          {name: 'Jill'},
          {city_id: 12}
        ],
        [
          {trust: {$gt: 12, $lt: 120}},
          {clamp: {$lt: 120}}
        ]
      ]
    };
    const want = `(("name" = 'Jill' and "city_id" = 12) and ("trust" > 12 and "trust" < 120 and "clamp" < 120))`;

    helper(filter, want);
  });
  it('should generate grouped `and` conditions', () => {
    const filter = {
      $and: [
        [
          {city_id: 1},
          {name: 'test'}
        ]
      ],
      fio: 'test'
    };

    const want = `("city_id" = 1 and "name" = 'test') and "fio" = 'test'`;

    helper(filter, want);
  });
  it('should generate `is null` condition', () => {
    const filter = {
      city_id: null,
      name: {$eq: null}
    };

    const want = `"city_id" is null and "name" is null`;

    helper(filter, want);
  });
  it('should generate `or` conditions', () => {
    const filter = {
      $or: [
        [
          {city_id: 1},
          {name: 'test'}
        ]
      ],
      fio: 'test'
    };

    const want = `("city_id" = 1 or "name" = 'test') and "fio" = 'test'`;

    helper(filter, want);
  });
  it('should generate `or` conditions for many columns', () => {
    const filter = {
      $or: [
        [
          {city_id: 1},
          {name: 'test'}
        ],
        [
          {hello: 1},
          {test: 32}
        ]
      ],
      fio: 'test',
      orTest: {$or: [1, {$gt: 10}]}
    };

    const want = `(("city_id" = 1 or "name" = 'test') or ("hello" = 1 or "test" = 32)) and "fio" = 'test' and (("orTest" = 1) or ("orTest" > 10))`;

    helper(filter, want);
  });
});

describe('nested filter', () => {
  it('single array statements', () => {
    const filter = {
      $or: [
        {name: 1},
        {city: 2}
      ],
      foo: 'bar'
    };

    const want = `("name" = 1 or "city" 2) and "foo" === 'bar'`;

    helper(filter, want);
  });
  // it('')
});

describe('filterify plugins', () => {
  it('should register plugin', () => {
    const fil = new Filterify([]);

    expect(fil._plugins.length).toBe(0);
  });
  it('should call plugin', () => {
    let called = false;
    const mockPlugin = {
      execute() {
        called = true;
      }
    };
    const fil = new Filterify([mockPlugin]);

    fil.apply(knex('clients'), {test: 1});

    expect(called).toBeTruthy();
  });
  it('should call plugins', () => {
    let called = 0;
    const mockPlugin = {
      execute() {
        called++;
      }
    };
    const fil = new Filterify([mockPlugin, mockPlugin]);

    fil.apply(knex('clients'), {test: 1});

    expect(called).toEqual(2);
  });
  it('plugin should not modify original data', () => {
    const mockPlugin = {
      execute(f) {
        f.test = {$and: 32};

        return f;
      }
    };
    const filter = {test: {$or: '12'}};
    const fil = new Filterify([mockPlugin]);

    fil.apply(knex('clients'), filter);

    expect(filter).toMatchObject({test: {$or: '12'}});
  });
  it('remove plugin should ignore empty keys', () => {
    const filter = {
      'remove.me': 1,
      'youshouldremoveme': 2,
      'ineedtostay': 3
    };

    const removeKeys = [];
    const want = `"remove"."me" = 1 and "youshouldremoveme" = 2 and "ineedtostay" = 3`;

    helper2([new Remover(removeKeys)], filter, want);
  });
  it('remove plugin should ignore undefined | null as keys', () => {
    const filter = {
      'remove.me': 1,
      'youshouldremoveme': 2,
      'ineedtostay': 3
    };

    const removeKeys = undefined;
    const want = `"remove"."me" = 1 and "youshouldremoveme" = 2 and "ineedtostay" = 3`;

    helper2([new Remover(removeKeys)], filter, want);
  });
  it('remove plugin should remove given keys', () => {
    const filter = {
      'remove.me': 1,
      'youshouldremoveme': 2,
      'ineedtostay': 3
    };

    const removeKeys = ['remove.me', 'youshouldremoveme'];
    const want = `"ineedtostay" = 3`;

    helper2([new Remover(removeKeys)], filter, want);
  });
  it('remove plugin should remove nested keys', () => {
    const filter = {
      $or: [
        [
          {name: 1},
          {test: 1},
          {removeme: 1}
        ]
      ]
    };

    const removeKeys = ['removeme'];
    const want = `("name" = 1 or "test" = 1)`;

    helper2([new Remover(removeKeys)], filter, want);
  });
  it('remove plugin should remove dotted keys', () => {
    const filter = {
      'remove.that': 1,
      'remove.this': 2,
      'ineedtostay': 3
    };

    const removeKeys = ['remove'];
    const want = `"ineedtostay" = 3`;

    helper2([new Remover(removeKeys)], filter, want);
  });
  it('remove plugin should remove dotted keys', () => {
    const filter = {
      'remove.that': 1,
      'remove.this': 2,
      'ineedtostay': 3
    };

    const removeKeys = ['remove'];
    const want = `"ineedtostay" = 3`;
    const model = knex('clients');

    Filterify.remover(removeKeys).apply(model, filter);

    // language=SQL format=false
    expect(model.toQuery()).toEqual(`select * from "clients" where ${want}`);
  });
  it('remove plugin should remove nested dotted keys', () => {
    const filter = {
      $or: [
        [
          {name: 1},
          {test: 1}
        ]
      ],
      'relations.entityId': 1
    };

    const removeKeys = ['remove', 'relations'];
    const want = `("name" = 1 or "test" = 1)`;

    helper2([new Remover(removeKeys)], filter, want);
  });
  it('remove plugin should remove complex nested dotted keys', () => {
    const filter = {
      $or: [
        [
          {'remove.this': [1, 3]},
          {'remove.me': {$or: [1, 3]}}
        ],
        [
          {'hello.remove': 1},
          {'jopa': 2}
        ]
      ],
      'relations.entityType': {$and: [1, 2]},
      'relations.entityId': {$or: [1, 2]},
      'relations.id': {$lt: 1},
      name: 1
    };

    const removeKeys = ['remove', 'relations', 'hello', 'jopa'];
    const want = `"name" = 1`;

    helper2([new Remover(removeKeys)], filter, want);
  });
  it('keeper plugin should keep given keys', () => {
    const filter = {
      'keep.me': 1,
      'youshouldkeepme': 2,
      'ineedtostay': 3
    };

    const keepKeys = ['keep.me', 'youshouldkeepme'];
    const want = `"keep"."me" = 1 and "youshouldkeepme" = 2`;

    helper2([new Keeper(keepKeys)], filter, want);
  });
  it('keeper plugin should ignore empty keys', () => {
    const filter = {
      'keep.me': 1,
      'youshouldkeepme': 2,
      'ineedtostay': 3
    };

    const keepKeys = [];
    const want = `"keep"."me" = 1 and "youshouldkeepme" = 2 and "ineedtostay" = 3`;

    helper2([new Keeper(keepKeys)], filter, want);
  });
  it('keeper plugin should ignore undefined | null keys', () => {
    const filter = {
      'keep.me': 1,
      'youshouldkeepme': 2,
      'ineedtostay': 3
    };

    const keepKeys = undefined;
    const want = `"keep"."me" = 1 and "youshouldkeepme" = 2 and "ineedtostay" = 3`;

    helper2([new Keeper(keepKeys)], filter, want);
  });
  it('keeper plugin should keep nested keys', () => {
    const filter = {
      $and: [
        [
          {name: 1},
          {test: 1},
          {keepme: 1},
          {keepme: 2}
        ]
      ]
    };

    const keepKeys = ['keepme'];
    const want = `("keepme" = 1 and "keepme" = 2)`;

    helper2([new Keeper(keepKeys)], filter, want);
  });
  it('keeper plugin should keep dotted keys', () => {
    const filter = {
      'keep.that': 1,
      'keep.this': 2,
      'ineedtostay': 3
    };

    const keepKeys = ['keep'];
    const want = `"keep"."that" = 1 and "keep"."this" = 2`;

    helper2([new Keeper(keepKeys)], filter, want);
  });
  it('keep plugin should keep nested dotted keys', () => {
    const filter = {
      $and: [
        [
          {name: 1},
          {test: 1},
          {'keep.me': [1, 2, 3]},
          {'keep.us': 1}
        ]
      ],
      remove: 1
    };

    const keepKeys = ['keep'];
    const want = `("keep"."me" in (1, 2, 3) and "keep"."us" = 1)`;

    helper2([new Keeper(keepKeys)], filter, want);
  });
});
