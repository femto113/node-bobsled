var Bobsled = require("./bobsled").Bobsled;

var bobsled = new Bobsled();
bobsled.addTemplate("test.html");
bobsled.addTemplate("partial.html");
bobsled.routes.GET["/test"] = {
  "*": function (pathinfo, request, response) {
    bobsled.templateResponder("test", {hello: "earth"}, response);
  }
};
bobsled.start();
