(function(window) {
    "use strict";

    var Backprop = {};

    function transformValue(propSpec, inputVal, fallbackValue) {
        var value = inputVal;
        if (typeof propSpec.coerce === 'function') value = propSpec.coerce(value);

        var choices = propSpec.choices;
        if (choices && choices.constructor && choices.constructor.name === 'Array') {
            if (choices.indexOf(value) === -1) {
                if (fallbackValue !== undefined) value = fallbackValue;
                else return undefined;
            }
        }

        if (propSpec.trim && (typeof value.trim === 'function')) value = value.trim();
        if (propSpec.max && (value > propSpec.max)) value = propSpec.max;
        if (propSpec.min && (value < propSpec.min)) value = propSpec.min;
        return value;
    }

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
                //propSpec.default = objProto.defaults[name];   // breaks things ...?
                var fallbackValue = this.get(name); // || objProto.defaults[name];
                value = transformValue(propSpec, value, fallbackValue);
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
            protoAttrs = protoAttrs || {};

            // Add a setProperties() method on Backbone.Model's prototype.
            // This sets a hash of values to the model, just like Backbone.Model.set().
            // The difference is that this will apply transforms for all of the
            // properties before setting.
            protoAttrs.setProperties = function(attrs, options) {
                var schema = this._schema || {};
                for (var name in attrs) {
                    var propSpec = schema[name] || {};
                    attrs[name] = transformValue(propSpec, attrs[name], this.get(name));
                }
                this.set(attrs, options);
            };

            // Apply Backbone.Model's original extend() function:
            var objConstructor = originalExtend.apply(this, [].slice.call(arguments));

            // Go through the prototype attributes and create ES5 properties for every
            // attribute that used Backbone.property():
            objConstructor.prototype._schema = {};
            for (var name in protoAttrs) {
                var val = protoAttrs[name];
                if (val instanceof PropPlaceholder) {
                    val.createProperty(objConstructor.prototype, name);
                    objConstructor.prototype._schema[name] = val.spec;
                }
            }
            return objConstructor;
        };
    };

    // Export for Node/Browserify, or fallback to a window assignment:
    if (typeof module !== 'undefined' && module.exports) module.exports = Backprop;
    else window.Backprop = Backprop;
}(this));
