var bobsled = require("../");

if (!("SUDO_USER" in process.env)) {
  console.log("You're about to see an error, try rerunning this test with sudo.");
}

var opts = {
  port: 80, // start up our test server on port 80 (which will require superuser permission)
  uid: process.env.SUDO_USER // but then downgrade ourselves
};

var server = new bobsled.Bobsled(opts);
console.log("Attempting to start server on port " + server.port + " as " + process.env.USER + "...");
server.start();

process.nextTick(function () { process.exit(); });
