var fs = require("fs"),
	path = require("path"),
	//stylus = require("stylus/index.js"),
	stylus = require("C:\\Program Files\\nodejs\\node_modules\\stylus"),
	readTables = require("./support/tables.js"),
	settings, watching = null, functions = [];

global.stylus = stylus;

settings = {
	compress: false,
	linenos: false,
	firebug: false,
	input: "styl/",
	output: "css/",

}
exports.settings = settings;

readTables(function() {
	console.log("\x1b[92mDownloaded Files\x1b[0m");
});

functions = fs.readdirSync("functions").filter(function(fn) { return fn != "utils.js" });

functions = functions.map(function(file) {
	return require("./functions/" + file);
});

function writeFile(file, css) {
	var dest = path.join(settings.output, path.basename(file, ".styl") + ".css");

	fs.writeFile(dest, css, function(err) {
		if (err)
			console.error("\x1b[91mError: \x1b[97mUnable to write %s\x1b[0m", dest);
		else
			console.log("  \x1b[92mcompiled \x1b[97m%s\x1b[0m to \x1b[97m%s\x1b[0m",
				file, dest);
	});
}

function compileFile(file) {
	file = path.join(settings.input, file);
	fs.lstat(file, function(err, stat) {
		if (err) throw err;

		if (stat.isFile()) {
			fs.readFile(file, "utf8", function(err, str) {
				var style, options;

				if (err) throw err;

				options = {
					paths: [ path.dirname(file) ],
					filename: file,
					compress: settings.compress,
					_imports: []
				};

				style = stylus(str, options);

				useFunctions(style);
				//importFiles(style);

				style.render(function(err, css) {
					//watchImports(file, options._imports);
					if (err) {
						if (watching) {
							console.error(err.stack || err.message);
						} else {
							throw err;
						}
					} else {
						writeFile(file, css);
					}
				});
			});

		} else if (stat.isDirectory()) {
			fs.readdir(file, function(err, files) {
				if (err) throw err;

				files.filter(function(file) {
					return path.extname(file) == ".styl";
				}).map(function(filename) {
					return filename;
				}).forEach(compileFile);
			});
		}
	});
}

function watch(dir, fn) {
	if (watching != null) return;

	watching = {}

	if (typeof dir == fn) {
		dir = null || settings.input;
		fn = dir;
	}

	dir = path.resolve(dir);

	fs.readdir(dir, function(err, files) {
		var i, len;

		if (err) {
			console.error("\x1b[91mError: \x1b[97mUnable to read %s\x1b[0m", dir);
			throw err;
		}
		for (i = 0, len = files.length; i < len; i++) {
			if (path.extname(files[i]) != ".styl")
				continue;

			watching[ files[i] ] = 1;
			console.log("  \x1b[90mWatching \x1b[97m%s\x1b[0m", files[i]);

			(function(file) {
				fs.watch(path.join(dir, file), function(event) {
					if (event != "change") return;
					
					fs.stat(path.join(dir, file), function(err, stat) {
						if (stat.mtime.getTime() > watching[file]) {
							fn(file);
							watching[file] = stat.mtime.getTime();
						}
					});
				});
			})(files[i]);
		}
	});
}

function useFunctions(style) {
	functions.forEach(function(obj) {
		for (var key in obj)
			style.define(key, obj[key]);
	});
}

watch(settings.input, compileFile);
compileFile("");

/*
stylus(str)
	.set('filename', path)
	.set('compress', true)
	.use(nib())
	.import('nib')
*/