var mongoose = require('../mongo');
var redis = require('../redis');

var schema = mongoose.Schema({
	_id: {type: String, lowercase: true, trim: true, unique: true},
    	nick: {type: String}
});

var User = module.exports = mongoose.model('User', schema);
