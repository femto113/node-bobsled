var bobsled = require("../");

// TODO test recipes
var opts = bobsled.recipes.bobsled();

// start up our test server (on a random port if not given in environment)
opts.port = process.env.PORT || Math.floor(Math.random() * (65536 - 1025)) + 1025;
var path = "/" + Math.floor(Math.random() * 1024 * 1024).toString(32);
var slugs = ["hello earth", "The Éx†èñdéd Chàrácte® Test™"];

var server = new bobsled.Bobsled(opts);
server.routes.GET[path] = {
  "*": function (pathinfo, request, response) {
    server.jsonResponder(slugs, response);
  }
};
if ("template_config" in opts) {
  server.addTemplate(__dirname + "/" + "index.html");
  server.addTemplate(__dirname + "/" + "partial.html");
  server.routes.GET["/template_test"] = {
    "*": function (pathinfo, request, response) {
console.log("template_test controller: %s %j", request.url, pathinfo);
      server.templateResponder("index", pathinfo.query, response);
    }
  };
}
server.start();

process.nextTick(function () {
  // now fire off some client requests and validate the responses
  var http = require("http"), assert = require("assert"), url = require("url");
  var tests = [ { hostname: "localhost", port: opts.port, path: path + "/whatever.anything" } ];
  // TODO test static routing
  if ("template_config" in opts) {
    // test templates
    tests.push({ hostname: 'localhost', port: opts.port, path: "/template_test/index.html?hello=earth" });
  }

  function nextTest() {
    if (tests.length > 0)
      process.emit("test", tests.shift());
    else
      process.exit();
  }

  process.on("test", function (u) {
    console.log('testing GET "%j"', u);
    http.get(u, function (res) {
      assert.equal(res.statusCode, 200, "expected 200 OK response from server, got " + res.statusCode);
      var body = "";
      res.on("error", function(e) { assert.ifError(e); });
      res.on("data", function (chunk) { body += chunk; });
      res.on("end", function () {
        slugs.forEach(function (slug) {
          assert.ok(body.match(slug), 'slug "' + slug + '" not found in body\n' + body);
        });
        nextTest();
      });
    });
  });

  nextTest();
});
