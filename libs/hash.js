var hooker = require('hooker');
var async = require('async');

var Hash = function(Model, redis, prefix, methods) {
	if (!methods || methods.length < 1) {
		methods = Hash.methods;
	}
	for (var i in methods) {
		this[methods[i]](redis, Model, prefix);
	}
};

Hash.methods = ['create', 'update', 'remove', 'findById'];

Hash.prototype.remove = function(redis, Model, prefix) {
	hooker.hook(Model, 'remove', function(conditions, callback) {
		return hooker.filter(this, [conditions, function(err, num, raw) {
			if (err || num < 1) {
				return callback(err, num);
			}
			redis.del(prefix + conditions._id, callback);
		}]);
	});
};

Hash.prototype.findById = function(redis, Model, prefix) {
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
				redis.hmset(prefix + id, doc, function(err, ok) {
					if (err || ok !== 'OK') {
						log.error('failed to sync user to redis for findById', {id: id, err: err, ok: ok});
					}
				});
			}
			], callback);
		return hooker.preempt();
	});
};

Hash.prototype.create = function(redis, Model, prefix) {
	hooker.hook(Model, 'create', function(obj, callback) {
		return hooker.filter(this, [obj, function(err, doc) {
			if (err || !doc) {
				return callback(err, doc);
			}
			var obj = doc.toJSON();
			delete obj.__v;
			redis.hmset(prefix + obj._id, obj, function(err, ok) {
				if (err || ok != 'OK') {
					log.error('failed to set object to redis', {obj: obj, err: err, ok: ok});
				}
				callback(null, doc);
			});
		}]);
	});
};

Hash.prototype.update = function(redis, Model, prefix) {
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
					redis.hmset(prefix + conditions._id, fields, function(err, ok) {
						if (err || ok != 'OK') {
							log.error('failed to set user to redis', {conditions: conditions, fields: fields, err: err, ok: ok});
							num = 0;
						}
						callback(null, num);
					});
				}
				], callback);
		}]);
	});
};

module.exports = Hash;
