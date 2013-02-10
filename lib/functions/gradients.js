var exports = module.exports,
	utils = require("./utils");

function normalizeColorStops(stops) {
	var i, len;

	if (stops.length < 2)
		throw new Error("A gradient must have at least 2 color stops")

	return stops.map(function(stop) {
		var tmp;
		if (stop.nodes.length == 1) {
			utils.assertColor(stop.nodes[0], "stop-color");
			return [stop.nodes[0].toString()];
		}
		if (stop.nodes[0].nodeName == "unit") {
			tmp = stop.nodes[1];
			stop.nodes[1] = stop.nodes[0];
			stop.nodes[0] = tmp;
		}
		utils.assertColor(stop.nodes[0], "stop-color");
		utils.assertType(stop.nodes[1], "unit", "stop-position");
		if (stop.nodes.length > 2)
			throw new Error("Expected ',', found: " + stop.nodes[2].toString());

		return [stop.nodes[0].toString(), stop.nodes[1].toString(),
			stop.nodes[1].val, stop.nodes[1].type];
	});
}

function legacyColorStops(stops) {
	var result = "", comma = ", ", lastStop, previousStop = 0;
	if (this.options && this.options.compress)
		comma = ",";

	if (stops[0][1] == null || parseFloat(stops[0][1]) == 0)
		result += "from(" + stops[0][0] + ")";
	else {
		result += "color-stop(" + stops[0][1] + comma + stops[0][0] + ")";
		previousStop = stops[0][2];
	}

	result += comma;

	result += stops.slice(1, -1).map(function(stop, i) {
		var pos, nextPos = 100, divideBy = 0, j, len;

		if (!stop[1]) {
			for (j = i + 1, len = stops.length; j < len; j++) {
				divideBy++;
				if (stops[j][1]) {
					nextPos = stops[j][2];
					break;
				}
			}
			pos = previousStop + (nextPos - previousStop) / divideBy;
		} else {
			pos = stop[2];
		}
		pos = Math.round(pos * 1000) / 1000;
		previousStop = pos;
		return "color-stop(" + pos + "%" + comma + stop[0] + ")" + comma;
	}).join("");

	if ((lastStop = stops[stops.length - 1])[1] == null || parseFloat(lastStop[1]) == 0)
		result += "to(" + lastStop[0] + ")";
	else
		result += "color-stop(" + lastStop[1] + comma + lastStop[0] + ")";

	return result;
}

exports["linear-gradient"] = function() {
	var isMixin = !this.property, args = Array.prototype.slice.call(arguments),
		direction, unit, legacyDirection, i, len, prefixes, isRepeating = false,
		stops, stopsString, gradient, legacyGradient, webkitGradient,
		comma = this.options.compress ? "," : ", ",
		webkitDirectionMap = {
			"to right":  ["left top", "right top"],
			"90deg":     ["left top", "right top"],
			"to left":   ["right top", "left top"],
			"270deg":    ["right top", "left top"],
			"to top":    ["left bottom", "left top"],
			"0deg":      ["left bottom", "left top"],
			"to bottom": ["left top", "left bottom"],
			"180deg":    ["left bottom", "left top"],
		}, webkitDirection, webkitInvalid, previousStop;

	if (args[0] === true) {
		isRepeating = true;
		args.shift();
	}
	// Has direction
	if (args[0].nodes[0].nodeName == "ident") {
		if (args[0].nodes[0].string == "to") {
			if (args[0].nodes.length < 2)
				throw new Error("Direction must be 'to' followed by one or two " +
					"direction keywords (top, left, bottom, right)");
			else
				direction = args[0].nodes.map(function(node) {
					return node.string;
				}).join(" ");

			if (!/^to (top|bottom)( (left|right))?$|^to (right|left)( (bottom|top))?$/
				.test(direction))
				throw new Error("'" + direction + "' is not a valid direction");
			direction = direction.replace(/^to (top|bottom) (left|right)$/, "to $2 $1");
		} else {
			throw new Error("Expected 'to' followed by a direction, got: " +
				args[0].nodes[0].string);
		}
		args.shift();

		// $ sign for avoiding replacement in the next step
		legacyDirection = direction.slice(3)
			.replace("top", "b$ottom").replace("bottom", "top")
			.replace("left", "r$ight").replace("right", "left").replace(/\$/g, "");
	} else if (args[0].nodes[0].nodeName == "unit" &&
	["deg", "grad", "rad", "turn"].indexOf(args[0].nodes[0].type) >= 0) {
		direction = args[0].nodes[0].val;

		switch (args[0].nodes[0].type) {
			case "grad":
				direction = (direction % 400) * 360 / 400; break;
			case "rad":
				direction = (direction % (2 * Math.PI)) * 180 / Math.PI; break;
			case "turn":
				direction = (direction % 1) * 360; break;
		}
		direction = (360 + (direction % 360)) % 360;
		// Legacy syntax was counter-clockwise and 0deg = to the right
		legacyDirection = ((90 - direction + 360) % 360) + "deg";
		direction = direction + "deg";

		if (args[0].nodes.length > 1)
			throw new Error("Expected ',', got: " + args[0].nodes[1].toString());

		args.shift();
	} else {
		direction = "to bottom";
		legacyDirection = "top";
	}

	if (this.options.compress) {
		switch (direction) {
			case "to top":
				direction = "0deg"; legacyDirection = "90deg"; break;
			case "to right":
				direction = "90deg"; legacyDirection = "0deg"; break;
			case "to bottom":
				direction = "180deg"; legacyDirection = "270deg"; break;
			case "to left":
				direction = "270deg"; legacyDirection = "180deg"; break;
		}
	}

	stops = normalizeColorStops(args);
	stopsString = stops.map(function(stop) { return stop.slice(0, 2).join(" "); }).join(comma);

	prefixes = ["-moz-", "-webkit-", "-o-", "-ms-"];

	gradient = (isRepeating ? "repeating-" : "") +
		"linear-gradient(" + direction + comma + stopsString + ")";

	legacyGradient = (isRepeating ? "repeating-" : "") +
		"linear-gradient(" + legacyDirection + comma + stopsString + ")";

	stops.forEach(function(stop) {
		if (stop[1] != null && stop[3] != "%") {
			webkitInvalid = true;
			utils.warn("-webkit-gradient only supports stops with percents, got: " + stop[1]);
			return false;
		}
	});

	if (!webkitInvalid && (webkitDirectionMap[direction] || direction.slice(0, 3) == "to ")) {
		webkitDirection = webkitDirectionMap[direction];

		if (!webkitDirection)
			webkitDirection = [legacyDirection, direction.slice(3)];

		webkitGradient = "gradient(linear" + comma + webkitDirection[0] + comma +
			webkitDirection[1] + comma + legacyColorStops.call(this, stops) + ")";
	} else if (!webkitInvalid) {
		// If support for webkit legacy is needed
		warn("-webkit-gradient does not support arbitrary angles");
	}

	if (this._valuePrefix == null && this._gradientPrefix == null) {
		if (webkitGradient)
			utils.addPrefixedValues.call(this, ["-webkit-"], webkitGradient,
				isMixin ? "background" : null, true);

		if (prefixes.length > 0)
			utils.addPrefixedValues.call(this, prefixes, legacyGradient,
				isMixin ? "background" : null);

		if (!isMixin) {
			// Replace following nodes with literals
			(function(nodes) {
				var functionCall, functionName = this.calling[this.calling.length - 1];

				this._valuePrefix = this._gradientPrefix = "";

				for (i = 0, len = nodes.length; i < len; i++) {
					if (functionCall == null &&
					nodes[i].nodeName == "call" && nodes[i].name == functionName) {
						functionCall = i;
					}
					if (i > functionCall) {
						nodes[i] = new stylus.nodes.Literal(this.visit(nodes[i]).toString());
					}
				}

				this._valuePrefix = this._gradientPrefix = null;
			}).call(this, this.property.expr.nodes);

			return new stylus.nodes.Literal(gradient);
		} else
			return new stylus.nodes.Property(["background"], new stylus.nodes.Literal(gradient));
	} else {
		if (!this._gradientPrefix)
			this._gradientPrefix = this._valuePrefix;
		if (this._gradientPrefix == "-webkit-legacy") {
			if (webkitGradient)
				return new stylus.nodes.Literal("-webkit-" + webkitGradient);
			else {
				console.warn("\x1b[91m%s\x1b[0m: \x1b[97m%s\x1b[0m", "WARNING",
					"The '" + this.property + "' declaration on line " +
					this.property.lineno + " will be missing at least one gradient");
			}
		} else if (this._gradientPrefix != "" && this._gradientPrefix != "official") {
			return new stylus.nodes.Literal(this._gradientPrefix + legacyGradient);
		} else {
			return new stylus.nodes.Literal(gradient);
		}
	}


}
exports["linear-gradient"].raw = true;
exports["linear"] = exports["l-g"] = exports["lg"] = exports["linear-gradient"];

exports["r-l-g"] = exports["rlg"] = exports["repeating-linear-gradient"] = function() {
	var args = Array.prototype.slice.call(arguments);
	Array.prototype.unshift.call(args, true);
	return exports["linear-gradient"].apply(this, args);
}
exports["repeating-linear-gradient"].raw = true;

// TODO: Radial gradients, repeating radial gradients, image() notation
exports["radial-gradient"] = function() {}