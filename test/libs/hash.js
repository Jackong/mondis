var should = require('should');
var async = require('async');
var User = require('./models/user');
var redis = require('./redis');
var prefix = 'users:';
var Hash = require('../../libs/hash');
var hash = new Hash(User, redis, prefix, 86400);

describe('user', function() {

	var uid = 'uid';

	describe('create', function() {
	
		describe('with simple user', function() {

			beforeEach(function(done) {
				User.create({_id: uid}, function(err, doc) {
					should.not.exist(err);
					should.exist(doc);
					setTimeout(done, 200);
				});
			});

			afterEach(function(done) {
				User.remove({_id: uid}, done);
			});

			it('should sync to redis', function(done) {
				redis.exists(prefix + uid, function(err, exist) {
					should.not.exist(err);
					exist.should.be.equal(1);	
					done();
				});
			});
		});
	});//create

	describe('update', function() {
		beforeEach(function(done) {
			User.create({_id: uid}, function(err, doc) {
				should.not.exist(err);
				should.exist(doc);
				setTimeout(done, 200);
			});
		});
	
		afterEach(function(done) {
			User.remove({_id: uid}, done);
		});
	
		describe('with user existed in redis', function() {

			it('should be updated to redis', function(done) {
				async.waterfall([
					function(callback) {
						User.update({_id: uid}, {nick: 'jackong'}, callback);
					},
					function(num, callback) {
						num.should.be.equal(1);
						redis.hgetall(prefix + uid, function(err, user) {
							should.not.exist(err);
							user.should.have.property('nick', 'jackong');
							callback();
						});
					}
					], done);
			});
		});

		describe('with user not existed in redis', function() {
		
			it('should not be updated to redis', function(done) {
				async.waterfall([
					function(callback) {
						redis.del(prefix + uid, callback);
					},
					function(num, callback) {
						num.should.be.equal(1);
						User.update({_id: uid}, {nick: 'jackong'}, callback);
					},
					function(num, callback) {
						num.should.be.equal(0);
						redis.exists(prefix + uid, function(err, exists) {
							should.not.exist(err);
							exists.should.be.equal(0);
							callback();
						});
					}
					], done);			
			});
		});
	});//update

	describe('findById', function() {

		beforeEach(function(done) {
			User.create({_id: uid}, function(err, doc) {
				should.not.exist(err);
				should.exist(doc);
				setTimeout(done, 200);
			});
		});
	
		afterEach(function(done) {
			User.remove({_id: uid}, done);
		});

		describe('with user existed in redis', function() {
			
			it('should be got from cache but DB', function(done) {	
				async.waterfall([
					function(callback) {
						redis.hmset(prefix + uid, {isRedis: true}, callback);
					},
					function(ok, callback) {
						ok.should.be.equal('OK');
						User.findById(uid, null, {lean: true}, callback);
					},
					function(doc, callback) {
						doc.should.have.property('isRedis', 'true');
						callback();
					}
					], done);
			});
		});

		describe('with user not existed in redis', function() {
			
			it('should be got from DB and sync to cache', function(done) {
				this.timeout(3000);
				async.waterfall([
					function(callback) {
						redis.del(prefix + uid, callback);
					},
					function(num, callback) {
						num.should.be.equal(1);
						User.findById(uid, null, {lean: true}, callback);
					},
					function(doc, callback) {
						doc.should.have.property('_id', uid);
						setTimeout(function() {
							redis.exists(prefix + uid, callback);
						}, 200);
					},
					function(num, callback) {
						num.should.be.equal(1);
						callback();
					}
					], done);
			});		
		});
	});//findById
});
