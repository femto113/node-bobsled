var Bobsled = require("./bobsled").Bobsled;

var port = process.env.PORT || Math.floor(Math.random() * (65536 - 1025)) + 1025;

var bobsled = new Bobsled({ port: port });
bobsled.addTemplate("test.html");
bobsled.addTemplate("partial.html");
bobsled.routes.GET["/somepath"] = {
  "*": function (pathinfo, request, response) {
    bobsled.templateResponder("test", {hello: "earth"}, response);
  }
};
bobsled.start();

var http = require("http"), assert = require("assert");

var options = { host: 'localhost', port: port, path: '/somepath/test.html' };

process.nextTick(function () {
  http.get(options, function(res) {
    assert.equal(res.statusCode, 200, "expected 200 OK response from server");
    var body = "";
    res.on("data", function (chunk) { body += chunk; });
    res.on("end", function () {
      ["hello earth", "partial", "/partial"].forEach(function (slug) {
        assert.ok(body.match(slug), 'slug "' + slug + '" not found in body');
      });
      process.exit();
    });
  }).on('error', function(e) {
    console.log("Got error: " + e.message);
  });
});
