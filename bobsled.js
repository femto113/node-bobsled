var doT =  require("dot")
    , fs =   require("fs")
    , url =  require("url")
    , path = require("path")
    , getpw = require("getpw")
    ;

function Bobsled(opts)
{
  require('http').Server.call(this);

  if (typeof(opts) == "undefined") opts = {};

  this.port = ("port" in opts) ? opts.port : 8085 // reads like BOBS on an old calculator

  this.template_config = {
    evaluate:    /<%([\s\S]+?)%>/g, // some erb like delimiters
    interpolate: /<%=([\s\S]+?)%>/g,
    varname: ["Page", "Server"],
    strip: false,
    append: true
  };

  this.templates = {};

  // compile all templates, useful for checking correctness on startup
  this.compileTemplates = function() {
    for (var template_name in this.templates) this.templates[template_name].compile();
  };


  this.controllers = {
    template: function(pathinfo, request, response) {
      var template_name = pathinfo.basename || "index"
      if (template_name in this.templates) {
        this.templateResponder(template_name, {request: request}, response);
      } else {
        this.emit("notFound", pathinfo, request, response);
      }
    }.bind(this),
    "static": function(pathinfo, request, response) {
      var filename = "." + pathinfo.dirname + "/" + pathinfo.basename + pathinfo.extname;
console.log("static", filename);
      if (!fs.statSync(filename).isFile()) {
console.log("static", filename, "notFound");
        this.emit("notFound", pathinfo, request, response);
      } else {
        response.writeHead(200, {"content-type": "text/css"}); // HACK TODO mimetype
        fs.readFile(filename, function (err, data) { response.end(data); });
      }
    }.bind(this),
    favicon: function(pathinfo, request, response) {
      response.writeHead(200, {"content-type": "image/x-icon"}); // TODO: set expires
      fs.readFile("favicon.ico", function (err, data) { response.end(data); });
    },
    whereami: function(pathinfo, request, response) {
      response.writeHead(200, {"content-type": "application/json"});
      var data = { provider: require("./whereami").provider() };
      response.end(JSON.stringify(data, null, "  "));
    },
    env: function(pathinfo, request, response) {
      // TODO switch to HTML on extname
      response.writeHead(200, {"content-type": "application/json"});
      var data = { env: process.env, uid: process.getuid(), os: {} };
      var os = require("os");
      ["hostname", "type", "platform", "arch", "release", "networkInterfaces", "cpus"].forEach(function (a) {
        data.os[a] = os[a]();
      });
      if (process.env.HOME) {
        data.home = fs.readdirSync(process.env.HOME);
      }
      data.passwd = getpw.getpwuid(data.uid);
      response.end(JSON.stringify(data, null, "  "));
    },
    notFound: function (pathinfo, request, response) {
      if ("404" in this.templates) {
        this.templateResponder("404", { statusCode: 404, pathinfo: pathinfo, request: request }, response);
      } else {
        response.writeHead(404, {"content-type": "text/plain"});
        response.end(request.url + " not found");
      }
    }.bind(this)
  };

  this.on("notFound", this.controllers.notFound);

  this.redirect = function(new_url, response) {
      response.writeHead(302, { 'Location': new_url });
      response.end();
  };

  this.routes = {
    GET: {
      "/": {
        "env": this.controllers.env,
        "whereami": this.controllers.whereami,
        "favicon": this.controllers.favicon,
        "*": this.controllers.template
      },
      "/bootstrap/css": {
        "*": this.controllers.static
      }
    },
    POST: { }
  };

  this.route = function(request, response, body) {
    var parsed_url = url.parse(request.url);
    var dirname = path.dirname(parsed_url.path),
        extname = path.extname(parsed_url.path),
        basename = path.basename(parsed_url.path, extname) || "index", // TODO: configurable default
        method = request.method;

    var controller = (this.routes && this.routes[method] && this.routes[method][dirname]) ?
            this.routes[method][dirname][(this.routes[method][dirname][basename] ? basename : "*")] : this.controllers.notFound;
console.log(method, dirname, basename, this.routes);
    return controller({ dirname: dirname, basename: basename, extname: extname }, request, response, body);
  };
}

// TODO: use util.inherits
Bobsled.prototype = Object.create(require('http').Server.prototype);
Bobsled.prototype.constructor = Bobsled;

// provide access to builtin modules that may needed by templates
Bobsled.prototype.util = require("util");
Bobsled.prototype.querystring = require("querystring");

// quick and dirty html encoder accessible to templates as Server.html_encode() or Server.h()
Bobsled.prototype.html_encode = Bobsled.prototype.h = function (s) {
  return s.replace(/&/g, '\&amp;').replace(/</g, '\&lt;').replace(/>/g, '\&gt;');
}
// for consistent naming, here's URI encoding accessible as Server.url_encode or Server.u()
Bobsled.prototype.url_encode = Bobsled.prototype.u = function (s) { return encodeURIComponent(s); }

Bobsled.prototype.addTemplate = function(opts) {
  if (typeof(opts) == "string") opts = { filename: opts };
  if (!("config" in opts)) opts.config = this.template_config;
  var extname = path.extname(opts.filename),
      basename = path.basename(opts.filename, extname);

  this.templates[basename] = new Template(opts);
};

// render the contents of named template as string
Bobsled.prototype.partial = function (template_name, data) {
  return this.templates[template_name].render(data, this);
};

// TODO: cook the request a bit before passing to templates (perhaps just give them query string?)
Bobsled.prototype.templateResponder = function(template_name, data, response) {
  var body = this.partial(template_name, data);
  var statusCode = data && data.statusCode || 200;
  response.writeHead(statusCode, {"content-type": "text/html", "content-length": body.length});
  response.end(body);
};

Bobsled.prototype.start = function() {
  this.on("request", function(request, response) {
    var body = "";
    if (request.method == "POST") request.on("data", function (chunk) { body += chunk; });
    request.on("end", function () { this.route(request, response, request.method == "POST" && body); }.bind(this));
  });
  this.listen(this.port);
  console.log("Bobsled server now listening at port " + this.port);
};

function Template(opts)
{
  this.config = opts.config;

  if (!("filename" in opts) || !fs.statSync(opts.filename).isFile()) {
    throw new Error("template file not found: " + opts.filename);
  }

  this.filename = opts.filename;

  // on first compile add watcher for changes to file TODO: option to suppress/or do only if in dev env
  this.once("compiled", function (template) {
    fs.watchFile(template.filename, function (curr, prev) {
        if (curr.mtime - prev.mtime) this.emit("modified");
    }.bind(template));
  });

  // recompile if modified
  this.on("modified", function() { this.compile(); });
}

Template.prototype = Object.create(require('events').EventEmitter.prototype);
Template.prototype.constructor = Template;

Template.prototype.compile = function() {
  // TODO: support other template engines?
  this.render = doT.template(fs.readFileSync(this.filename, "utf8"), this.config);
  this.emit("compiled", this);
}

Template.prototype.render = function(data, context) {
  this.compile();
  return this.render(data, context);
};

if (exports) {
  exports.Bobsled = Bobsled;
  exports.Template = Template;
}
