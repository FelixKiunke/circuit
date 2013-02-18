var utils = require("./utils.js"),
	supportTables = require("../support");

module.exports["support-for"] = module.exports.supportfor = function(feature) {
	var supportSet;

	utils.assertString(feature);
	feature = feature.string;

	supportSet = new stylus.nodes.Expression();
	supportTables.supportFor(feature).forEach(function(val) {
		supportSet.push(utils.coerce(val));
	});
	supportSet.push(utils.coerce("official"));

	return supportSet || [];
}

module.exports["prefixes"] = function(feature) {
	var prefixes;

	utils.assertString(feature);
	feature = feature.string;

	prefixes = supportTables.supportFor(feature).prefixes;

	if (prefixes)
		prefixes = prefixes.sort(function(a, b) {
			return a.length > b.length ? -1 : b.length > a.length ? 1 : 0
		});

	return prefixes || [];
}