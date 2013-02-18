var tables = require("./tables.js"),
	SupportSet = require("./supportset.js"),
	EventEmitter = require("events").EventEmitter,
	supportChecker, supportData = null, cachedSupport = {};

module.exports = supportChecker = Object.create(EventEmitter.prototype);

module.exports.registerHook = tables.registerHook;

// Browsers that need to be supported. Can be set in the stylus variable `browsers`
supportChecker.browsers = { ie: 9, ff: "latest", chrome: "latest", safari: "latest" };

supportChecker.downloadTables = function() {
	var self = this;

	function finished(data) {
		supportData = data;
		cachedSupport = {};
		self.emit("invalidated");
	}
	finished.emit = this.emit.bind(this);

	tables(finished);
}

// Checks support for `feature` and outputs something like:
// [ {full: false, prefix: "-ms-"}, {…}, {…} ]
supportChecker.supportFor = function(feature) {
	var browser, // Currently iterated browser
		ver, // Currently iterated browser version
		result = [],
		featureData, // Support data for the current feature
		requiredVersion, // The minimum must-support version of the currently iterated browser
		minVersion, // The version before the `requiredVersion` which introduced `feature`
		browserSupport, // Feature support of the current browser
		duplicateArray = [], // Array of support data to avoid duplicates
		stringified; // Temp. stringified object for performance

	if (supportData == null || !supportData[feature])
		return [];

	featureData = supportData[feature];

	if (cachedSupport[feature])
		return cachedSupport[feature];

	for (browser in featureData) {
		minVersion = -1;
		requiredVersion = this.browsers[browser];
		browserSupport = [];
		if (requiredVersion == null || requiredVersion === false)
			continue;

		if (requiredVersion === "latest")
			requiredVersion = Infinity;

		for (ver in featureData[browser]) {
			if ( isNaN(+ver) )
				continue;

			if (+ver <= requiredVersion) {
				if (ver > minVersion)
					minVersion = ver;
			} else if (duplicateArray.indexOf( stringified =
			JSON.stringify(featureData[browser][ver]) ) < 0 &&
			(!featureData[browser][ver].full || featureData[browser][ver].prefix) ) {
				featureData[browser][ver].browser = browser;
				browserSupport.push(featureData[browser][ver]);
				duplicateArray.push(stringified);
			}
		}
		if (minVersion >= 0 &&
		duplicateArray.indexOf( stringified =
		JSON.stringify(featureData[browser][minVersion]) ) < 0 &&
		(!featureData[browser][minVersion].full || featureData[browser][minVersion].prefix) ) {
			featureData[browser][minVersion].browser = browser;
			browserSupport.push(featureData[browser][minVersion]);
			duplicateArray.push(stringified);
		}

		browserSupport.forEach(function(data) {
			result.push(data);
		});
	}
	result = new SupportSet(result);

	cachedSupport[feature] = result;

	return result;
}

try {
	(function() {
		var files = require("fs").readdirSync("./support/hooks");
		
		files.forEach(function(file) {
			module.exports.registerHook(file.split(".").slice(0, -1).join(""), file);
		});
	})();
} catch(err) {
	console.warn("Warning: Unable to read support/hooks — some stats may be incorrect");
}