# filterify

Данная утилита нужна для динамической генерации условий поиска.

Доступные директивы:

- `$and` - [конъюнкция](#and_or)
- `$or` - [дизъюнкция](#and_or)
- `$eq` - [реализует равно](#eq_ne)
- `$ne` - [реализует не равно](#eq_ne)
- `$lt` - [реализует оператор меньше](#lt_lte)
- `$lte` - [реализует оператор меньше либо равно](#lt_lte)
- `$gt` - [реализует оператор больше](#gt_gte)
- `$gte` - [реализует оператор больше либо равно](#gt_gte)
- `$like` - [реализует оператор like](#like_notlike_ilike)
- `$ilike` - [реализует оператор ilike](#like_notlike_ilike)
- `$notlike` - [реализует оператор not like](#like_notlike_ilike)
- `$in` - [реализует оператор in](#in_nin)
- `$nin` - [реализут оператор not in](#in_nin)

## Синтаксис

### $eq, $ne {#eq_ne}

```jsx
{
 // можно писать сразу значение, эти записи одинаковы
 id: 1, id: {$eq: 1}, // where id = 1
 city: {$ne: 1} // where not city = 1
}
```

### $lt, $lte {#lt_lte}

```jsx
{
 id: {$lt: 1}, // where id < 1
 id: {$lte: 1} // where id <= 1
}
```

### $gt, $gte {#gt_gte}

```jsx
{
 id: {$gt: 1}, // where id > 1
 id: {$gte: 1} // where id >= 1
}
```

### $like, $notlike, $ilike {#like_notlike_ilike}

```jsx
{
  name: {$like: '%test%'} // where name like '%test%'
  name: {$notlike: '%test%'} // where name not like '%test%'
  name: {$ilike: '%test%'} // where name ilike '%test%'
}
```

### $in, $nin {#in_nin}

```jsx
{
 // можно писать сразу массив, эти записи одинаковы
 id: {$in: [1, 2, 3]}, id: [1, 2, 3] // where id in (1, 2, 3)
 id: {$nin: [1, 2, 3]} // where id not in (1, 2, 3)
}
```

### $and, $or {#and_or}

```jsx
{
 $and: [
  {id: 1},
  {name: 'test'}
 ], // where id = 1 and name = 'test'
 $or: [
  {id: 23},
  {name: 'Hello'}
 ] // where id = 1 or name = 'test'
} // where (id = 1 and name = 'test') and (id = 23 or name = 'Hello')
```

Внутри директив(`$and`,`$or`) можно использовать вложенность для написания более сложных условий

```jsx
{
 $and: [
   {id: {$lte: 1}},
   {$or: [{name: 'test'}, {city: 12}]}
 ] // where (id <= 1 and (name = 'test' or city = 12))
}
```

```jsx
{
 $or: [
  {$and: [{entityId: 1}, {entityType: 2}]},
  {$and: [{entityId: 3}, {entityType: 3}]}
 ]
} // (("entityId" = 1 and "entityType" = 2) or ("entityId" = 3 and "entityType" = 3))
```

```jsx
{
  $or: [
    [{ name: 1 }, { city: 2 }],
    [{ name: 2 }, { city: 5 }]
  ]
} // (("name" = 1 or "city" = 2) or ("name" = 2 or "city" = 5))
```

---

### Пример использования

```jsx
const {Filterify, filterify} = require('@ecosystem/esoft-tools-backend');

const filter = {name: 'test', city: 12}
const model = db('clients')
const dynFilter = new Filterify()

dynFilter.apply(model, filter);
// или
Filterify.of().apply(model, filter)
// если нет необходимости в плагинах, можно так
filterify(model, filter)

model.toQuery() // select * from clients where name = 'test' and city = 12
```

## Плагины

Плагины нужны для предобработки фильтра (например чтобы удалить какие-то поля, перед применением к модели, или наоборот, оставить некоторые)

Такой функционал нужен если фильтр будет применяться к нескольким таблицам, если например использовать appends при дополнительной агрегации. 

Пока написано два плагина, `Keeper` и `Remover`. Можно реализовать свои плагины для какой-то другой логики (как реализовано можно глянуть в тулзах)

### Remover

Плагин удаляет поля, которые переданы в keys.

```js
const {Filterify} = require('@ecosystem/esoft-tools-backend');
 
const filter = {
  'remove.that': 1,
  'remove.this': 2,
  'thisneedtostay': 12,
  'thiswillberemove': 3
};
 
const model = db('clients');
const removeFilter = Filterify.remover(['remove', 'thiswillberemove']);

removeFilter(model, filter)

model.toQuery() // select * from clients where "thisneedtostay" = 12
```

### Keeper

Плагин сохраняет поля, которые переданы в keys.

```js
const {Filterify} = require('@ecosystem/esoft-tools-backend');
 
const filter = {
  'keep.that': 1,
  'keep.this': 2,
  'thisneedtostay': 12,
  'thiswillberemove': 3
};
const model = db('clients');
const keepFilter = Filterify.keeper(['keep', 'thisneedtostay']);

keepFilter(model, filter)

model.toQuery()
// select * from clients where "keep.that" = 1 and "keep.this" = 2 and "thisneedtostay" = 12
```

## Спеки

Встаёт вопрос, как же всё это добро описать в спеках? Чтож, для этих целей используется директива `filter://` она чем-то похожа на директиву `shared://` и использует те же типы, но генерирует весь набор параметров которые могут быть применены к полю. Не все шаредные типы могут быть применены к фильтру. 

`$and` и `$or` всегда должны быть описаны как в примере

```yaml
SearchClientsFilter:
	type: object
  properties:
    $and:
			$ref: 'filter://And'
		$or:
			$ref: 'filter://Or'
    id:
			$ref: 'filter://PositiveInteger'
    city:
			$ref: 'filter://NotEmptyString'
    gender:
			$ref: 'filter://enum/shared/gender' # можно использовать енумы
```

На выходе получим такую спеку

> todo тут добавить картинки
{.is-warning}


### Доступные типы

- filter://Boolean
- filter://Float
- filter://PositiveInteger
- filter://Integer
- filter://Double
- filter://String
- filter://NotEmptyString
- filter://DateTime
- filter://Date
- filter://DateShortFormat
- filter://Time
- filter://NotEmptyText
- filter://Text
- filter://Email
- filter://Url
- filter://Uuid
- filter://PhoneWithPlus
- filter://HexColor
