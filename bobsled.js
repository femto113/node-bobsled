var fs = require("fs"), url =  require("url"), path = require("path");

// TODO: rename pathinfo arg to controllers, clean up interface to templates
// TODO: move template_config/compiler stuff into a recipes folder (and env?)

function Bobsled(opts)
{
  require('http').Server.call(this);

  if (typeof(opts) == "undefined") opts = {};

  this.port = ("port" in opts) ? opts.port : 8085; // reads like BOBS on an old calculator

  if ("env" in opts) this.env = opts.env;

  this.template_compiler = ("template_compiler" in opts) ? opts.template_compiler : function () { throw new Error("no template compiler configured"); };

  // TODO: support other template engines besides doT?
  //
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
        this.templateResponder(template_name, pathinfo, response);
      } else {
        this.emit("notFound", pathinfo, request, response);
      }
    }.bind(this),
    "static": function(pathinfo, request, response) {
      var filename = "." + pathinfo.dirname + "/" + pathinfo.basename + pathinfo.extname;
      if (!fs.statSync(filename).isFile()) {
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
    notFound: function (pathinfo, request, response) {
      if ("404" in this.templates) {
        this.templateResponder("404", { statusCode: 404, pathinfo: pathinfo, request: request }, response);
      } else {
        response.writeHead(404, {"content-type": "text/plain"});
        response.end(request.url + " not found");
      }
    }.bind(this)
  };

  this.routes = {
    GET: {
      "/": {
        "whereami": this.controllers.whereami, // TODO: config/recipe
        "favicon": this.controllers.favicon,
        "*": this.controllers.template
      },
    },
    POST: { }
  };

  // setup static routes
  if (true) { // TODO: opts.static? (could pass in path?)
    var static_folders = {"css": "/css", "img": "/img", "js": "/js"}; // TODO: pass in opts?
    for (folder in static_folders) {
      if (path.existsSync(folder) && fs.statSync(folder).isDirectory()) {
        this.routes.GET[static_folders[folder]] = { "*": this.controllers.static };
      }
    }
  }

  if (opts.env) {
    // TODO: make path part of config?
    this.routes.GET["/"]["env"] = function(pathinfo, request, response) {
      response.writeHead(200, {"content-type": "application/json"}); // TODO switch to HTML on extname
      var data = { env: process.env, uid: process.getuid(), os: {} };
      var os = require("os");
      ["hostname", "type", "platform", "arch", "release", "networkInterfaces", "cpus"].forEach(function (a) {
        data.os[a] = os[a]();
      });
      if (process.env.HOME) data.home = fs.readdirSync(process.env.HOME);
      // data.passwd = require("getpw").getpwuid(data.uid); (TODO: pass to constructor to eliminate hard dep)
      response.end(JSON.stringify(data, null, "  "));
    }
  }

  this.redirect = function(new_url, response) {
      response.writeHead(302, { 'Location': new_url });
      response.end();
  };

  this.on("notFound", this.controllers.notFound);

  this.route = function(request, response, body) {
    var parsed_url = url.parse(request.url, true);
    var method = request.method,
        dirname = path.dirname(parsed_url.pathname).replace(/\/*$/, ''), // strip any trailing slash
        extname = path.extname(parsed_url.pathname), // TODO: should have a default for extname?
        basename = path.basename(parsed_url.pathname, extname) || "index"; // TODO: configurable default basename?

    console.log("%s %s/%s%s", method, dirname, basename, extname); // TODO: add an on/off switch for this logging

    // TODO: add a switch for case (in)sensitivity
    // dirname = dirname.toLowerCase();
    // basename = basename.toLowerCase();

    var controller = (
        this.routes[method]
        && this.routes[method][dirname]
        && this.routes[method][dirname][(this.routes[method][dirname][basename] ? basename : "*")]
      ) || this.controllers.notFound;
    return controller({ dirname: dirname, basename: basename, extname: extname, query: parsed_url.query }, request, response, body);
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
  if (typeof(opts) == "string") opts = { filename: opts, compiler: this.template_compiler };
  if (!("config" in opts)) opts.config = this.template_config;
  var extname = path.extname(opts.filename),
      basename = path.basename(opts.filename, extname);
  // TODO: keep popping extensions and processing them until we get to one that resolves to the engine?

  // TODO: support paths (or / in template name?)
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
  this.compiler = opts.compiler; // takes two args, template as string a config object
  this.config = opts.config; // will be passed as second arg to compiler

  if (!opts.filename) {
    throw new Error("filename required");
  }

  if (!path.existsSync(opts.filename) || !fs.statSync(opts.filename).isFile()) {
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
  this.render = this.compiler(fs.readFileSync(this.filename, "utf8"), this.config);
  this.emit("compiled", this);
}

Template.prototype.render = function(data, context) {
  this.compile();
  return this.render(data, context);
};

if (exports) {
  exports.Bobsled = Bobsled;
  exports.Template = Template;
  exports.recipes = require("./recipes");
}
