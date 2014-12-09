var redis = require('redis');
var config = {
	host: 'user-redis',
	port: 6379,
	name: 'user',
	username: null,
	password: null,
	options: {}
};

var client = module.exports = redis.createClient(config.port, config.host, config.options);

client.on("error", function (err) {
    client = redis.createClient(config.port, config.host, config.options);
});

if (config.username && config.password && config.name) {
    client.auth(config.username + '-' + config.password + '-' + config.name);
}
