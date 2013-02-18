var utils = require("./utils.js"),
	COLORS = {
		"black":   0,
		"red":     1,
		"green":   2,
		 "lime":   2,
		"yellow":  3,
		 "brown":  3,
		"blue":    4,
		"magenta": 5,
		 "purple": 5,
		 "pink":   5,
		"cyan":    6,
		"white":   7
	}

module.exports["-c-log"] = function() {
	args = [].slice.call(arguments);

	args = args.map(function(arg) {
		utils.assertString(arg);
		return arg.string;
	});

	console.log.apply(console, args);
}

module.exports["-c-color"] = function(string, color) {
	var fg, bg;

	function processColor(str, foreground) {
		var words = str.split(" "), isLight = true;

		if (isLight = words[0] == "light")
			words.shift();

		if (COLORS[ words[0] ] == null)
			throw new Error("Unrecognized color " + words[0]);

		return (isLight ? 90 : 30) + (foreground ? 0 : 10) + COLORS[ words[0] ];
	}

	utils.assertString(string);
	utils.assertString(color);
	color = color.string.trim().replace(/\s+/g, " ").toLowerCase().split(" on ");

	if (color[0] == "default")
		fg = null;
	else
		fg = processColor(color[0], true);

	if (!color[1] || color[1] == "default")
		bg = null;
	else
		bg = processColor(color[1]);

	if (bg == null && fg == null)
		return string;

	return "\x1b[" + (fg && bg ? fg + ";" + bg : (fg && !bg ? fg : bg) ) + "m" +
		string.string + "\x1b[0m";
};

(module.exports["-c-find-nearest"] = function(str, set, threshold) {
	utils.assertString(str.nodes[0]);
	str = str.nodes[0].string;
	set = set.nodes[0].nodes.map(function(node) {
		utils.assertString(node);
		return node.string;
	});

	if (threshold) {
		utils.assertType(threshold.nodes[0], "unit");
		threshold = threshold.nodes[0].val;
		if (threshold < 0 || threshold > 1)
			throw new Error("Invalid threshold (" + threshold + ")");
	}
	
	return findClosestItem(str, set, threshold || 0.4, true)
}).raw = true;


function sift3distance(s1, s2) {
	// sift3 distance (slightly modified here to return values between 0 and 1 etc):
	// siderite.blogspot.com/2007/04/super-fast-and-accurate-string-distance.html
	var i, c = 0, offset1 = 0, offset2 = 0, lcs = 0,
		maxOffset = Math.ceil((s1.length + s2.length) / 4);

	if (!s1)
		return !s2 ? 1 : 0;

	if (!s2)
		return 0;

	while ((c + offset1 < s1.length) && (c + offset2 < s2.length)) {
		if (s1.charAt(c + offset1) == s2.charAt(c + offset2)) {
			lcs++;
		} else {
			offset1 = 0;
			offset2 = 0;
			for (i = 0; i <= maxOffset; i++) {
				if ((c + i < s1.length) && (s1.charAt(c + i) == s2.charAt(c))) {
					offset1 = i;
					break;
				}
				if ((c + i < s2.length) && (s1.charAt(c) == s2.charAt(c + i))) {
					offset2 = i;
					break;
				}
			}
		}
		c++;
	}

	return Math.abs(1 - lcs / ((s1.length + s2.length) / 2));
}

function findClosestItem(str, list, threshold, swapLetters) {
	var i, len, i2, len2, str2, dist, closestItem,
		threshold = threshold || 0.5, minDist = 1;

	for (i = 0, len = list.length; i < len; i++) {
		if (str == list[i])
			return str;

		dist = sift3distance(str, list[i]);

		if (dist < minDist) {
			minDist = dist;
			closestItem = list[i];
		}

		if (swapLetters) {
			for (i2 = 0, len2 = str.length - 1; i2 < len2; i2++) {
				str2 = str.slice(0, i2) + str[i2 + 1] + str[i2] + str.slice(i2 + 2);

				dist = Math.max(sift3distance(str2, list[i]) + (2 / str.length));

				if (str2 == list[i])
					return str2;

				if (dist < minDist) {
					minDist = dist;
					closestItem = list[i];
				}
			}
		}
	}

	if (minDist <= threshold && closestItem != null)
		return closestItem;
	else
		return false;
}