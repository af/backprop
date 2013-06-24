// TODO: enumerable/configurable as options
// TODO: choice option
(function(window) {
    "use strict";

    var Backprop = {};

    // Small class whose instances are used placeholders for the ES5 properties
    // that appear on models.
    function PropPlaceholder(spec) {
        this.spec = spec;
    }

    // Create the actual property on the "class" prototype
    PropPlaceholder.prototype.createProperty = function(objProto, name) {
        // Allow defaults to be specified right in the property (rather than
        // seperately in Backbone's usual defaults hash). This will override
        // whatever's in objProto.defaults for this property.
        var propSpec = this.spec || {};

        // Don't allow property names to shadow ones that are already defined
        // (eg. by Backbone.Model.prototype):
        if (name in objProto.constructor.__super__) {
            throw new Error('The name ' + name + ' is already used by this model');
        }

        if (propSpec.default) {
            objProto.defaults = objProto.defaults || {};
            objProto.defaults[name] = propSpec.default;
        }
        Object.defineProperty(objProto, name, {
            get: function() { return this.get(name); },
            set: function(value) {
                if (typeof propSpec.coerce === 'function') value = propSpec.coerce(value);
                if (propSpec.trim && (typeof value.trim === 'function')) value = value.trim();
                if (propSpec.max && (value > propSpec.max)) value = propSpec.max;
                if (propSpec.min && (value < propSpec.min)) value = propSpec.min;

                this.set(name, value);
            },
            configurable: true,
            enumerable: true
        });
    };

    // Monkeypatch Backbone to do two things:
    //  * Add a new Backbone.property function, used to set up properties on models
    //  * Replace Backbone.Model.extend with a version that parses property definitions
    Backprop.monkeypatch = function(Backbone) {
        Backbone.property = function(specObj) {
            return new PropPlaceholder(specObj);
        };

        // Override Backbone.Model.extend with our custom version:
        var originalExtend = Backbone.Model.extend;
        Backbone.Model.extend = function(protoAttrs, classAttrs) {
            var objConstructor = originalExtend.apply(Backbone.Model, [].slice.call(arguments));

            // Go through the prototype attributes and create ES5 properties for every
            // attribute that used Backbone.property():
            for (var name in protoAttrs) {
                var val = protoAttrs[name];
                if (val instanceof PropPlaceholder) val.createProperty(objConstructor.prototype, name);
            }
            return objConstructor;
        };
    };

    // Export for Node/Browserify, or fallback to a window assignment:
    if (typeof module !== 'undefined' && module.exports) module.exports = Backprop;
    else window.Backprop = Backprop;
}(this));
