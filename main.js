var pp = require("./pp"),
    oj = require("ojc"),
    path = require("path"),
    fs = require("fs"),
    util = require("util"),
    url = require("url"),
    qs = require("querystring");
module.exports = function ConnectOJ(options) {
    var defaultOption = {
        oj: {},
        alwaysSaveOutput: true,
        usePreprocessor: true,
        dir: "./"
    };

    options = util._extend(defaultOption, options);

    return function(req, res, next) {
        function oj_cb(err, result) {
            res.setHeader("Content-type", "text/javascript");
            res.end(result);
        }

        var _u = url.parse(req.url);
        var _q = qs.parse(_u.query);
        if(typeof _q.runtime != "undefined") {
            // The runtime was requested, get it.
            var ojm = require.resolve("ojc");
            var ojr = path.join(path.dirname(ojm), "runtime.js");
            console.log("-- Serving runtime:", ojr);
            res.setHeader("Content-type", "text/javascript");
            res.end(fs.readFileSync(ojr).toString());
            return; // End it here.
        }

        console.log("-- Connect-OJ:", req.url);
        // We have to
        var file = path.basename( req.url );
        var dir = path.join(options.dir, path.dirname( req.url ));

        // Allow both methods. .oj during development and .js during production.
        if(path.extname(file)==".js" || path.extname(file)==".oj") {
            var bname = path.basename(file, path.extname(file));
            var OJname = path.join(dir, bname+".oj");
            var JSname = path.join(dir, bname+".js");
            var Dname = path.join(dir, bname+".d");

            console.log("-- Looking for:", [OJname, JSname, Dname]);

            if(fs.existsSync(OJname)) {
                var output;
                var ojStats = fs.statSync(OJname);
                if(fs.existsSync(JSname)) {
                    var jsStats = fs.statSync(JSname);
                } else {
                    var jsStats = null;
                }
                /*if(jsStats.mtime < ojStats.mtime) {
                    fs.writeFileSync(JSname, output);
                }*/

                if(
                    jsStats == null
                    || (jsStats != null && jsStats.mtime < ojStats.mtime)
                ) {
                    if(options.usePreprocessor) {
                        // We gonna preprocess it
                        console.log("-- Preprocessing...");
                        output = pp(OJname);
                    } else {
                        console.log("-- Just reading...");
                        output = fs.readFileSync(OJname);
                    }
                    // Process it with OJ now...
                    /*ojc(options.oj, function(error, result){

                    });*/
                    if(options.alwaysSaveOutput) {
                        fs.writeFileSync(JSname, output);
                    }
                } else {
                    console.log("-- Reading existing...");
                    output = fs.readFileSync(JSname);
                }
                oj_cb(0, output);
            } else if(fs.existsSync(Dname)) {
                var deps = JSON.parse( fs.readFileSync(Dname).toString() );
                // combine all deps.files[], preprocess and parse them into a nice JS file.
            }
        } else return next();
    }
}
