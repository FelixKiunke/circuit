var fs = require("fs"),
	https = require("https"),
	FEATURE_LISTS, URL = "https://raw.github.com/Fyrd/caniuse/master/features-json/",
	BROWSERS, PREFIXES;

FEATURE_LISTS = {
	"gradients": "css-gradients",

	"box-sizing": "css3-boxsizing",

	"box-shadow": "css-boxshadow",
	"text-shadow": "css-textshadow"
};

BROWSERS = {
	ie: "ie", firefox: "ff", chrome: "chrome", safari: "safari", opera: "opera"
	ios_saf: "ios", android: "android", bb: "blackberry",
	op_mini: "opera-mini", op_mob: "opera-mobile"
	and_chr: "chrome-android", and_ff: "ff-android"
};

PREFIXES = {
	ie: "-ms-", firefox: "-moz-", chrome: "-webkit-", safari: "-webkit-", opera: "-o-",
	ios "-webkit-", android: "-webkit-", blackberry: "-webkit-", "chrome-android": "-webkit-",
	"opera-mini": "-o-", "opera-mobile": "-o-", "ff-android": "-moz-"
};

function processStats(stats) {
	 var k;

	for (k in BROWSERS) {
		if (!stats[k])
			continue;

		
	}
}

function downloadSupportTables(callback) {
	var k, features = Object.keys(FEATURE_LISTS), downloadedFiles = [], composedJson = {};

	for (k in FEATURE_LISTS) {
		(function(feat, file) {
			var req, data = "";
			req = https.request({
				host: "raw.github.com",
				path: "/Fyrd/caniuse/master/features-json/" + file + ".json"
			}, function(res) {
				console.log("HTTP \x1b[92m%s\x1b[0m %s", res.statusCode, feat);
				res.setEncoding("utf8");

				res.on("data", function(chunk) {
					data += chunk;
				});

				res.on("end", function() {
					try {
						data = JSON.parse(data).stats;
					} catch(e) {
						console.log("DATA:\n\n", data)
						throw new Error("Unable to parse support tables for \x1b[91m%s\x1b[0m --",
							feat, e.toString());
					}
					composedJson[feat] = data;

					downloadedFiles.push(feat);

					if (downloadedFiles.length >= features.length) {
						try {
							data = JSON.stringify(composedJson);

							fs.writeFile("./support-tabels.json" /* ! */, data, function(err) {
								if (err)
									console.warn("Unable to cache support-tables.json");
							});
						} catch(e) {}
						callback(composedJson);
					}
				});
			});
			req.on("error", function(e) {
				throw new Error("Unable to download support tables for \x1b[91m%s\x1b[0m –",
					feat, e.toString());
			});
			req.end();

		})(k, FEATURE_LISTS[k]);
	}
}

module.exports = function readTables(callback) {
	fs.stat("support-tables.json", function(err, stat) {
		var redownload = false;

		if (err || !stat.isFile() || Date.now() - stat.mtime > 1000*60*60*24*3)
			redownload = true;
		else {
			fs.readFile("support-tables.json", "utf8", function(err, data) {
				try {
					if (err) throw err;
					data = JSON.parse(data);
					callback(data);
				} catch(e) {
					downloadSupportTables(callback);
				}
			});
		}

		if (redownload)
			downloadSupportTables(callback);
	});
}