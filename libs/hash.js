var hooker = require('hooker');
var async = require('async');

var Hash = function(Model, redis, prefix, ttl, methods) {
	if (!methods || methods.length < 1) {
		methods = Hash.methods;
	}
	for (var i in methods) {
		this[methods[i]](redis, Model, prefix, ttl);
	}
};

Hash.methods = ['create', 'update', 'remove', 'findById'];

Hash.prototype.remove = function(redis, Model, prefix, ttl) {
	hooker.hook(Model, 'remove', function(conditions, callback) {
		return hooker.filter(this, [conditions, function(err, num, raw) {
			if (err || num < 1) {
				return callback(err, num);
			}
			redis.del(prefix + conditions._id, callback);
		}]);
	});
};

Hash.prototype.findById = function(redis, Model, prefix, ttl) {
	hooker.hook(Model, 'findById', function(id, fields, options, callback) {
		async.waterfall([
			function(callback) {
				redis.hgetall(prefix + id, callback);
			},
			function(user, callback) {
				if (user) {
					user.cached = true;
					return callback(null, user);
				}
				hooker.orig(Model, 'findById').apply(Model, [id, fields, options, callback]);
			},
			function(doc, callback) {
				if (!doc || doc.cached) {
					delete doc.cached;
					callback(null, doc);
					return;
				}
				callback(null, doc);
				var key = prefix + id;
				redis.hmset(key, doc, function(err, ok) {
					if (err || ok !== 'OK') {
						return;
					}
					redis.expire(key, ttl, function(err, num){});
				});
			}
			], callback);
		return hooker.preempt();
	});
};

Hash.prototype.create = function(redis, Model, prefix, ttl) {
	hooker.hook(Model, 'create', function(obj, callback) {
		return hooker.filter(this, [obj, function(err, doc) {
			if (err || !doc) {
				return callback(err, doc);
			}
			var obj = doc.toJSON();
			delete obj.__v;
			callback(null, obj);
			var key = prefix + obj._id;
			redis.hmset(key, obj, function(err, ok) {
				if (err || ok !== 'OK') {
					return;
				}
				redis.expire(key, ttl, function(err, num) {});
			});
		}]);
	});
};

Hash.prototype.update = function(redis, Model, prefix, ttl) {
	hooker.hook(Model, 'update', function(conditions, fields, options, callback) {
		if ('function' === typeof options) {
			callback = options;
			options = null;
		}
		return hooker.filter(this, [conditions, fields, options, function(err, num, raw) {
			if (err || num < 1) {
				return callback(err, num);
			}
			async.waterfall([
				function(callback) {
					redis.exists(prefix + conditions._id, callback);
				},
				function(num, callback) {	
					if (num < 1) {
						return callback(null, 0);
					}
					var key = prefix + conditions._id;
					redis.hmset(key, fields, function(err, ok) {
						if (err || ok != 'OK') {
							num = 0;
						} else {
							redis.expire(key, ttl, function(err, num) {});
						}
						callback(null, num);
					});
				}
				], callback);
		}]);
	});
};

module.exports = Hash;
