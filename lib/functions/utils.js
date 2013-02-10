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

exports.addProperty = function addProperty(name, expr) {
	var prop, block, len, head, tail;
	
	if (!expr.nodeName)
		expr = exports.coerce(expr);

	prop = new stylus.nodes.Property([name], expr);
	block = this.closestBlock;

	len = block.nodes.length;
	head = block.nodes.slice(0, block.index);
	tail = block.nodes.slice(block.index++, len);

	head.push(prop);
	block.nodes = head.concat(tail);
	
	return prop;
}

// Replaces current property
exports.replaceProperty = function replaceProperty(name, expr) {
	var prop, block, len, head, tail;
	
	if (!expr.nodeName)
		expr = exports.coerce(expr);

	prop = new stylus.nodes.Property([name], expr);
	block = this.closestBlock;

	len = block.nodes.length;
	head = block.nodes.slice(0, block.index++);
	tail = block.nodes.slice(block.index, len);
	
	head.push(prop);
	block.nodes = head.concat(tail);
	
	return prop;
}

// Adds the same property with prefixed values, e.g. for linear-gradient()
exports.addPrefixedValues =
function addPrefixedValues(prefixes, functionValue, prop, isLegacy) {
	var nodes, i, len, functionCall, self = this,
		functionName = this.calling[this.calling.length - 1];

	if (this.property) {
		nodes = this.property.expr.nodes.slice(0);
		prop = prop || this.property.name;

		for (i = 0, len = nodes.length; i < len; i++) {
			if (nodes[i].nodeName == "call" && nodes[i].name == functionName) {
				functionCall = i;
				break;
			}
		}
	} else {
		if (!prop)
			throw new Error(this.calling[0] + " must not be used as a mixin");
		nodes = [];
		functionCall = 0;
	}

	if (!prefixes || prefixes.length == 0)
		return;

	if (functionCall == null)
		throw new Error("Something unexpected occured. Sorry.");

	prefixes.sort(function(a, b) {
		return a.length > b.length ? -1 : b.length != a.length ? 1 : 0;
	}).forEach(function(prefix) {
		self._gradientPrefix = prefix + (isLegacy ? "legacy" : "");
		self._valuePrefix = prefix;
		for (i = functionCall + 1, len = nodes.length; i < len; i++) {
			nodes[i] = self.visit(self.property.expr.nodes[i]);
		}
		self._valuePrefix = self._gradientPrefix = null;
		nodes[functionCall] = new stylus.nodes.Literal(prefix + functionValue);
		exports.addProperty.call(self, prop, nodes);
	});
//	for (i = functionCall + 1, len = nodes.length; i < len; i++) {
//		nodes[i] = self.visit(self.property.expr.nodes[i]);
//	}
}