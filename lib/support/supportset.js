function SupportSet(data) {
	var prefixes = null, specialProperties;
	this.push.apply(this, data);
	
	Object.defineProperty(this, "prefixes", {
		configurable: true,
		get: function() {
			var i, len;
			if (prefixes)
				return prefixes;

			prefixes = [];
			for (i = 0, len = this.length; i < len; i++) {
				if (this[i].prefix && prefixes.indexOf(this[i].prefix) < 0)
					prefixes.push(this[i].prefix);
			}

			return prefixes;
		}
	})
}

SupportSet.prototype = Object.create(Array.prototype);
SupportSet.constructor = SupportSet;

SupportSet.prototype.toArray = function() {
	return Array.apply(Object.create(Array.prototype), this);
}

module.exports = SupportSet;