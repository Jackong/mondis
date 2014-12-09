var mongoose = require('mongoose');
var db = mongoose.connection;
var config = {
    username: '',
    password: '',
    host: 'user-mongo',
    name: 'user',
    port: 27017,
    poolSize: 5
};
var options = {
    db: { native_parser: true },
    server: { poolSize: config.poolSize },
    user: config.username,
    pass: config.password
};

db.on('close', function () {
    db.open(config.host, config.name, config.port, options);
});

db.on('error', function (err) {
    db.close();
});

db.open(config.host, config.name, config.port, options);

module.exports = mongoose;
