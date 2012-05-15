// Bobsled configuration recipes

// the classic bobsled formulation:
// - default port is 8085
// - mime-type specific static folders off root
// - templates enabled with doT and ASP/JSP delimiters if available
exports.bobsled = function () {
  var opts = {
    port: process.env.PORT || 8085, // reads like BOBS on an old calculator
    "static": { folders: {"css": "/css", "img": "/img", "js": "/js"} }
    // TODO: env?
  }
  try {
    opts.template_compiler = require("doT").template;
    opts.template_config = {
      evaluate:    /<%([\s\S]+?)%>/g, // some erb like delimiters
      interpolate: /<%=([\s\S]+?)%>/g,
      varname: ["Page", "Server"],
      strip: false,
      append: true
    };
  } catch (e) {
    console.log("recipes.bobsled: can't require doT so templates not enabled");
  }
  return opts;
};

// TODO: some others?
