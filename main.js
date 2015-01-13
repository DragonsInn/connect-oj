var pp = require("./pp"),
    oj = require("ojc"),
    path = require("path"),
    fs = require("fs"),
    util = require("util"),
    url = require("url"),
    qs = require("querystring");
module.exports = function ConnectOJ(options) {
    var defaultOption = {
        oj: {
            "inline-const": true,
            "inline-enum": true
        },
        alwaysSaveOutput: true,
        usePreprocessor: true,
        dir: "./"
    };

    options = util._extend(defaultOption, options);

    return function(req, res, next) {
        var _u = url.parse(req.url);
        var _q = qs.parse(_u.query);
        if(typeof _q.runtime != "undefined") {
            // The runtime was requested, get it.
            var ojm = require.resolve("ojc");
            var ojr = path.join(path.dirname(ojm), "runtime.js");
            console.log("-- Serving runtime:", ojr);
            res.setHeader("Content-type","text/javascript");
            fs.readFile(ojr, function(err, content){
                if(err) {
                    res.write("/* ERROR\n");
                    res.write(err);
                    res.write("*/");
                    res.end();
                    console.log(err);
                } else {
                    res.end(content);
                }
            });
            return; // End it here.
        }

        console.log("-- Connect-OJ:", req.url);
        // We have to
        var file = path.basename( req.url );
        var dir = path.join(options.dir, path.dirname( req.url ));

        // Allow both methods. .oj during development and .js during production.
        if(path.extname(file)==".js" || path.extname(file)==".oj" || path.extname(file)==".d") {
            var bname = path.basename(file, path.extname(file));
            var OJname = path.join(dir, bname+".oj");
            var JSname = path.join(dir, bname+".js");
            var Dname = path.join(dir, bname+".d");

            if(fs.existsSync(OJname)) {
                var ojStats = fs.statSync(OJname);
            } else {
                var ojStats = null;
            }
            if(fs.existsSync(JSname)) {
                var jsStats = fs.statSync(JSname);
            } else {
                var jsStats = null;
            }
            if(fs.existsSync(Dname)) {
                var dStats = fs.statSync(Dname);
            } else {
                var dStats = null;
            }

            // Callbacks
            function saveOutput(output) {
                function doWrite() {
                    fs.writeFile(JSname, output, function(err, result) {
                        if(err) console.error(err);
                    });
                }
                if(!options.alwaysSaveOutput) return;
                if(!fs.existsSync(JSname)) return doWrite();
                if((ojStats!=null && jsStats!=null) && jsStats.mtime < ojStats.mtime) return doWrite();
                if((dStats!=null && jsStats!=null) && jsStats.mtime < dStats.mtime) return doWrite();
            }
            function oj_cb(err, result) {
                res.setHeader("Content-type","text/javascript");
                res.end(result.code);
                saveOutput(result.code);
            }

            console.log("-- Looking for:", [OJname, JSname, Dname]);

            fs.exists(OJname, function(exists){
                console.log("-- ...",OJname);
                if(exists) {
                    var output;
                    if(
                        jsStats == null
                        || (jsStats != null && jsStats.mtime < ojStats.mtime)
                        || options.alwaysSaveOutput == false
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
                        options.oj.files = [{path:OJname, contents:output}];
                        oj.compile(options.oj, oj_cb);
                    } else {
                        console.log("-- Reading existing...");
                        fs.readFile(JSname, function(err, data){
                            if(err) {
                                console.error(err);
                            } else {
                                oj_cb(0, {code:data});
                            }
                        });
                    }
                } else {
                    fs.exists(Dname, function(exists){
                        console.log("-- ...",Dname);
                        if(exists) {
                            var deps = JSON.parse( fs.readFileSync(Dname).toString() );
                            // combine all deps.files[], preprocess and parse them into a nice JS file.
                            options.oj.files = [];
                            for(var fk in deps.files) {
                                options.oj.files.push({
                                    path: path.join(dir, deps.files[fk]),
                                    contents: pp( path.join(dir, deps.files[fk]) )
                                });
                            }
                            oj.compile(options.oj, oj_cb);
                        } else {
                            res.setHeader("Content-type","text/plain");
                            res.end("// Not found!");
                        }
                    });
                }
            });
        } else return next();
    }
}
