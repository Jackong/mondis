# mondis

标签（空格分隔）： npm usage library

---

## WHY 
* Why this name?
> mondis == mon(goose)(re)dis

* Why need it?
> 
1. We need read from redis first and write to redis last when you are using mongo and redis. Another words, we wrap DB with cache.
2. We don't want to change exist caller and callee for DB, intrusive mood is confused and coupled.
3. So, we use [hooker][1] to decouple it and provide some structs for you.

## WHAT
* We just make redis-mongoose more simple.

## HOW
* `hash`
```js
//just one line, you don't need to change you original code.
/*
 * @Model mongoose model
 * @redis the instance of redis client
 * @prefix for key to redis
 * @ttl time to live for redis
 * @methods ['create', 'remove', 'update', 'findById'] support for Model
 */
mondis.hash(Model, redis, prefix, ttl, methods);
```

  [1]: https://www.npmjs.org/package/hooker