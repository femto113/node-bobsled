# bobsled [![Build Status](https://secure.travis-ci.org/femto113/node-bobsled.png)](http://travis-ci.org/femto113/node-bobsled)

![i can haz framework](http://blog.nodejitsu.com/ibm-doesnt-care-about-nodejs-people/framework.png)

Like every other Rails dev teaching themselves node I decided my first project would
be to write my own app framework.  Since it took me a day longer to discover
[express](http://expressjs.com/) than it should have I actually got it working
and then unwisely built some other stuff on on top of it, so now I'm releasing it
a poor attempt to justify abusing NPM as my personal code repository/dependency manager.
You're welcome to use it for any purpose you see fit, but I really can't recommend that
you do, it's not stable, well-tested, well-thought-out, nor, well, well-anything.

## Install

    npm install bobsled

or

    git clone http://github.com/femto113/node-bobsled.git
    cd node-bobsled
    npm link

## Example

    var Bobsled = require("bobsled").Bobsled;

    var bobsled = new Bobsled();
    bobsled.routes.GET["/helloworld"] = {
      "*": function (pathinfo, request, response) {
            response.writeHead(200, {"content-type": "text/plain"});
            response.end("hello world");
          }
    };
    bobsled.start();

The basic use of bobsled is to construct a server and then assign a controller function to
a route.  Routes are structured as a nested hash of _METHOD_, _PATH_, and _BASENAME_.
"*" serves as a wildcard for any basename that doesn't have an explicit route (but
don't assume that means there's real globbing going on...).  This means
that in the above example the given route will match "/helloworld/foo.html",
but not "/helloworld.html", that could be matched instead by {{GET["/"]["helloworld"]}}.
The first argument to controllers ({{pathinfo}} in the example above) is an object containing
deconstructed elements of the URL, including the parsed querystring or posted body if any.

## Advanced Usage/Recipes

The default Bobsled server isn't very capable (essentially just router for http requests)
but it also has no dependencies.  More advanced functionality, including view templates
can be enabled by passing a "recipe" to the constructor.  The default recipe is available
as 

  var recipe = require("bobsled").recipes.bobsled();

About the only redeemable features of the default recipe 
is that it uses the the awesomely fast [doT.js](http://olado.github.com/doT/) template library
(if it's been installed), but even that it perverts with ASP style delimiters (<% %>) instead of
mustache.

## Changes

- 0.2.0 added setuid/setgid functionality (allows downgrade of privilege after starting on restricted port)

## TODO

- more recipes, document recipe creation
- more/better tests
