# bobsled

Like every other Rails dev teaching themselves node I decided my first project would
be to write my own app framework.  Since it took me a day longer to discover
[express](http://expressjs.com/) than it should have I actually got it working
and then unwisely built some other stuff on on top of it, so now I'm releasing it
a poor attempt to justify abusing NPM as my personal code repository/dependency manager.
You're welcome to use it for any purpose you see fit, but I really can't recommend that
you do, it's not stable, well-tested, well-thought-out, nor, well, well-anything.
About the only redeemable features of bobsled are that it has very few dependencies
and it uses the the awesomely fast [doT.js](http://olado.github.com/doT/) template library,
but even that it perverts with ASP style delimiters (<% %>) instead of mustache.

## Install

    npm install bobsled

or

    git clone http://github.com/femto113/node-bobsled.git
    cd node-bobsled
    npm link

## Example

    var Bobsled = require("./bobsled").Bobsled;

    var bobsled = new Bobsled();
    bobsled.routes.GET["/helloworld"] = {
      "*": function (pathinfo, request, response) {
            response.writeHead(200, {"content-type": "text/plain"});
            response.end("helloworld");
          }
    };
    bobsled.start();
