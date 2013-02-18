module.exports = function(stats) {
	var browser, ver, verSupport;

	for (browser in stats) {
		for (ver in stats[browser]) {
			if (isNaN(+ver))
				continue;

			verSupport = stats[browser][ver];

			if (verSupport.full)
				continue;
			// else…

			if (verSupport.prefix == "-webkit-")
				verSupport.webkitLegacy = true;
			else if (verSupport.prefix == "-o-")
				verSupport.linearOnly = true;
		}
	}

	return stats;
}