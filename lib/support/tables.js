var fs = require("fs"),
	https = require("https"),
	FEATURE_LISTS, URL = "https://raw.github.com/Fyrd/caniuse/master/features-json/",
	BROWSERS, PREFIXES,
	hooks = {}; // Hooks are intended for features which are not fully clear from caniuse’s data,
	            // such as gradients

FEATURE_LISTS = {
	"gradients": "css-gradients",

	"box-sizing": "css3-boxsizing",
	"flexbox": "flexbox",

	"box-shadow": "css-boxshadow",
	"text-shadow": "css-textshadow",

	"animation": "css-animation",
	"transition": "css-transitions",

	"border-image": "border-image"
};

BROWSERS = {
	ie: "ie", firefox: "ff", chrome: "chrome", safari: "safari", opera: "opera",
	ios_saf: "ios", android: "android", bb: "blackberry",
	op_mini: "opera-mini", op_mob: "opera-mobile",
	and_chr: "chrome-android", and_ff: "ff-android"
};

PREFIXES = {
	ie: "-ms-", ff: "-moz-", chrome: "-webkit-", safari: "-webkit-", opera: "-o-",
	ios: "-webkit-", android: "-webkit-", bb: "-webkit-", "chrome-android": "-webkit-",
	"opera-mini": "-o-", "opera-mobile": "-o-", "ff-android": "-moz-"
};

function processStats(stats, feature) {
	var k, l,
		minSupport = {}, // Actual support list for the feature
		browserName, // Name of the currently iterated browser
		ver, verSupport, // Currently iterated version and its support for the feature
		versionList, // List of all key versions which are the min version for the support
		bStat, // Statistics for the currently iterated browser
		type, // Type of support: TRUE (full support) | "partial" | FALSE (no support)
		prefixed, // Whether the feature is prefixed in the currently iterated version
		tmpSupport; // Temporary object for swapping keys and values in the current support list

	for (k in BROWSERS) {
		browserName = BROWSERS[k];

		if (!browserName) {
			console.warn("Encountered unknown browser “%s” in caniuse’s stats for %s",
				k, feature);
			continue;
		}

		minSupport[browserName] = false;
		versionList = [];

		if (!( bStat = stats[k] ))
			continue;

		for (l in bStat) {
			// Accounts for versions like 5.1-5.2 & 5.1.4 (truncated to 5.1)
			ver = parseFloat(l, 10);
			verSupport = bStat[l];

			prefixed = verSupport.indexOf("x") >= 0;
			type = ~verSupport.indexOf("y") ? true : (~verSupport.indexOf("a") ? "partial" : false);

			// The official version will be output either way in the functions
			if (type === true)
				type = !prefixed ? "full" : "prefixed";
			else if (type === "partial")
				type = !prefixed ? "partial" : "partial-prefixed";

			if (type !== false) {
				if (minSupport[browserName] === false)
					minSupport[browserName] = {};

				if (!minSupport[browserName][type] || ver < minSupport[browserName][type])
					minSupport[browserName][type] = ver;
			}
		}

		if (minSupport[browserName] === false)
			continue;

		tmpSupport = {};
		Object.keys(minSupport[browserName]).forEach(function(k) {
			var support, prefixed = ~k.indexOf("prefixed");

			versionList.push(minSupport[browserName][k]);

			support = {
				full: k == "full" || k == "prefixed",
				prefix: prefixed ? PREFIXES[browserName] : false
			}

			tmpSupport[ minSupport[browserName][k] ] = support;
		});
		tmpSupport.versions = versionList;

		minSupport[browserName] = tmpSupport;
	}

	fireHook(minSupport, feature);

	return minSupport;
}

function downloadSupportTables(callback) {
	var k, features = Object.keys(FEATURE_LISTS), downloadedFiles = [], composedJson = {};

	for (k in FEATURE_LISTS) {
		(function(feat, file) {
			var req, data = "", startTime = Date.now();
			req = https.request({
				host: "raw.github.com",
				path: "/Fyrd/caniuse/master/features-json/" + file + ".json"
			}, function(res) {
				console.log("HTTP \x1b[32m%s\x1b[0m %s after \x1b[31m%sms\x1b[0m",
					res.statusCode, feat, Date.now() - startTime);
				res.setEncoding("utf8");

				res.on("data", function(chunk) {
					data += chunk;
				});

				res.on("end", function() {
					try {
						data = JSON.parse(data).stats;
					} catch(e) {
						console.log("DATA:\n\n",
							data.slice(0, 500) + (data.length >= 500 ? "\n\n…" : ""));
						throw new Error("Unable to parse support tables for \x1b[91m" + feat +
							"\x1b[0m -- " + e.toString());
					}

					data = processStats(data, feat);

					composedJson[feat] = data;

					downloadedFiles.push(feat);

					if (downloadedFiles.length >= features.length) {
						try {
							data = JSON.stringify(composedJson);

							fs.writeFile("./support/support-tabes.json", data, function(err) {
								if (err)
									console.warn("Unable to cache support-tables.json");
							});
						} catch(e) {}
						callback(composedJson);
					}
				});
			});
			req.on("error", function(e) {
				throw new Error("Unable to download support tables for \x1b[91m" + feat +
					"\x1b[0m —" + e.toString());
			});
			req.end();

		})(k, FEATURE_LISTS[k]);
	}
}

module.exports = function readTables(callback) {
	fs.stat("./support/support-tables.json", function(err, stat) {
		var redownload = false;

		if (err || !stat.isFile() || Date.now() - stat.mtime > 1000*60*60*24*3)
			redownload = true;
		else {
			fs.readFile("./support/support-tables.json", "utf8", function(err, data) {
				try {
					if (err) throw err;
					data = JSON.parse(data);
					callback(data);
				} catch(e) {
					if (callback.emit)
						callback.emit("downloadrequired");
					downloadSupportTables(callback);
				}
			});
		}

		if (redownload) {
			if (callback.emit)
				callback.emit("downloadrequired");
			downloadSupportTables(callback);
		}
	});
}

module.exports.registerHook = function(feature, fn) {
	if (!hooks[feature])
		hooks[feature] = [];

	fn = fn || feature;

	if (typeof fn == "string")
		fn = require("./hooks/" + fn);

	if (!fn)
		return console.warn("Warning: The hook function for %s is %s\n", feature, fn);

	if (~hooks[feature].indexOf(fn))
		return console.warn("  Warning: The hook %s() has already been registered for feature %s",
			fn.name, feature);

	hooks[feature].push(fn);
}

function fireHook(stats, feature) {
	var newStats = stats;

	if (!hooks[feature]) return;

	hooks[feature].every(function(fn) {
		var result = fn.call(newStats, newStats, feature);

		if (typeof result == "object")
			newStats = result;
		else if (result === false) {
			newStats = [];
			return false;
		}
	});

	return newStats;
}

module.exports.BROWSERS = BROWSERS;
module.exports.PREFIXES = PREFIXES;