var hooker = require('hooker');
var async = require('async');
var _ = require('underscore');

var Hash = function(Model, redis, prefix, ttl, methods) {
	if (!methods || methods.length < 1) {
		methods = Hash.methods;
	}
	for (var i in methods) {
		Hash[methods[i]](redis, Model, prefix, ttl);
	}
};

Hash.methods = ['create', 'update', 'remove', 'findById'];

Hash.remove = function(redis, Model, prefix, ttl) {
	hooker.hook(Model, 'remove', function(conditions, callback) {
		if (typeof conditions._id === 'undefined') {
			var err = new Error('key is required for mondis to remove');
			err.conditions = conditions;
			return hooker.preempt(callback(err));
		}
		return hooker.filter(this, [conditions, function(err, num, raw) {
			if (err || num < 1) {
				return callback(err, num);
			}
			redis.del(prefix + conditions._id, callback);
		}]);
	});
};

Hash.findById = function(redis, Model, prefix, ttl) {
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
				if (!options) {
					options = {};
				}
				options = _.defaults(options, {lean: true});
				hooker.orig(Model, 'findById').apply(Model, [id, null, options, callback]);
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
			], function(err, doc) {
				if (!err && doc && fields) {
					doc = _.pick(doc, fields);	
				}
				callback(err, doc);
			});
		return hooker.preempt();
	});
};

Hash.create = function(redis, Model, prefix, ttl) {
	hooker.hook(Model, 'create', function(obj, callback) {
		if (typeof obj._id === 'undefined') {
			var err = new Error('key required for mondis to create');
			err.obj = obj;
			return hooker.preempt(callback(err));	
		}
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

Hash.update = function(redis, Model, prefix, ttl) {
	hooker.hook(Model, 'update', function(conditions, fields, options, callback) {
		if ('function' === typeof options) {
			callback = options;
			options = null;
		}
		if (typeof conditions._id === 'undefined') {
			var err = new Error('key required for mondis to update');
			err.conditions = conditions;
			return hooker.preempt(callback(err));
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
