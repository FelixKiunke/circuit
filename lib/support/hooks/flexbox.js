module.exports = function(stats) {
	var browser, ver, verSupport;

	for (browser in stats) {
		for (ver in stats[browser]) {
			if (isNaN(+ver))
				continue;

			verSupport = stats[browser][ver];

			if (verSupport.full)
				continue;

			if (verSupport.prefix == "-webkit-" || verSupport.prefix == "-moz-")
				verSupport["flex-version"] = 2009;
			else if (verSupport.prefix == "-ms-")
				verSupport["flex-version"] = 2011;
		}
	}

	return stats;
}