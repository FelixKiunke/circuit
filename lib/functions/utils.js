var exports = module.exports;

// Pass through stylus utils
(function() {
	for (var k in stylus.utils)
		if (typeof stylus.utils[k] == "function")
			exports[k] = stylus.utils[k];
})();

exports.warn = function warn(msg) {
	stylus.functions.warn(new stylus.nodes.String(msg));
}

exports.addProperty = function addProperty(name, expr, isList) {
	var list, prop, block, len, head, tail;
	
	if (!isList && !expr.nodeName)
		expr = exports.coerce(expr);
	else if (isList) {
		list = new stylus.nodes.Expression(true);
		expr.forEach(function(expr) {
			list.push(exports.coerce(expr));
		});
		expr = list;
	}

	prop = new stylus.nodes.Property([name], expr);
	block = this.closestBlock;

	len = block.nodes.length;
	head = block.nodes.slice(0, block.index);
	tail = block.nodes.slice(block.index++, len);

	head.push(prop);
	block.nodes = head.concat(tail);
	
	return prop;
}

// Adds the same property with prefixed values, e.g. for linear-gradient()
// TODO: Refine comma-seperated… Maybe… Later…
exports.addPrefixedValues =
function addPrefixedValues(prefixes, functionValue, prop, isLegacy) {
	var nodes, isMixin, isList, i, len, j, len2, functionCall, self = this;

	if (this.property) {
		isMixin = false;
		isList = self.property.expr.isList;
		prop = prop || this.property.name;

		functionCall = exports.findFunctionCall(this);
	} else {
		if (!prop)
			throw new Error(this.calling[0] + " must not be used as a mixin");
		isMixin = true;
		functionCall = 0;
	}

	if (!prefixes || prefixes.length == 0)
		return;

	if (functionCall == null || (isList && functionCall.length < 2))
		throw new Error("Something unexpected occured. Sorry.");

	prefixes.sort(function(a, b) {
		return a.length > b.length ? -1 : b.length != a.length ? 1 : 0;
	}).forEach(function(prefix) {
		// Clone!
		nodes = !isMixin ? self.property.expr.clone().nodes : [];

		self._gradientPrefix = prefix + (isLegacy ? "legacy" : "");
		self._valuePrefix = prefix;

		if (isList) {
			for (i = functionCall[0], len = nodes.length; i < len; i++) {
				if (i == functionCall[0])
					j = functionCall[1] + 1;
				else
					j = 0;

				for (len2 = nodes[i].nodes.length; j < len2; j++)
					nodes[i].nodes[j] = self.visit(self.property.expr.nodes[i].nodes[j]);
			}
		} else {
			for (i = functionCall + 1, len = nodes.length; i < len; i++) {
				nodes[i] = self.visit(self.property.expr.nodes[i]);
			}
		}

		self._valuePrefix = self._gradientPrefix = null;

		if (isList) {
			nodes[functionCall[0]].nodes[functionCall[1]] =
				new stylus.nodes.Literal(prefix + functionValue);
		} else
			nodes[functionCall] = new stylus.nodes.Literal(prefix + functionValue);

		exports.addProperty.call(self, prop, nodes, isList);
	});
}

exports.findFunctionCall = function(thisArg, visitFollowing) {
	var self = thisArg || this,
		functionCall = false, functionName = self.calling[self.calling.length - 1],
		nodes = self.property.expr.nodes, i, len, j, len2;

	if (self.property.expr.isList) {
			for (i = 0, len = nodes.length; i < len; i++) {
				for (j = 0, len2 = nodes[i].nodes.length; j < len2; j++) {
					if (functionCall !== false && visitFollowing)
						nodes[i].nodes[j] =
							new stylus.nodes.Literal(self.visit(nodes[i].nodes[j]).toString());

					if (functionCall === false &&
					nodes[i].nodes[j].nodeName == "call" &&
					nodes[i].nodes[j].name == functionName) {
						functionCall = [i, j];
						if (!visitFollowing)
							break;
					}
				}

				if (functionCall.length && !visitFollowing)
					break;
			}
		} else {
			for (i = 0, len = nodes.length; i < len; i++) {
				if (functionCall !== false && visitFollowing)
					nodes[i] = new stylus.nodes.Literal(self.visit(nodes[i]).toString());

				if (functionCall === false &&
				nodes[i].nodeName == "call" && nodes[i].name == functionName) {
					functionCall = i;
					if (!visitFollowing)
						break;
				}
			}
	}
	return functionCall;
}