(function(window) {
    "use strict";

    var Backprop = {};

    // Transform a given input value, using a property spec object.
    // propSpec: an object that defines a Backprop property. Supported keys
    //           (see the README for explanations) include:
    //           'coerce', 'choices', 'trim', 'max', 'min'
    // inputVal: the value that the caller has assigned to the property
    // fallbackValue (optional): a default value to use if the input is invalid
    function transformValue(propSpec, inputVal, fallbackValue) {
        var value = inputVal;
        if (typeof propSpec.coerce === 'function') value = propSpec.coerce(value);

        // If an array of choices was passed in, validate that the input is one of
        // the valid choices:
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

    // Small class whose instances are used as placeholders for the ES5 properties
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

        if (typeof propSpec.default !== 'undefined') {
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


    // Backprop configuration method. Pass in the base model class that you want
    // to extend. Before your model definitions, you will want to invoke it as
    // follows:
    //
    // Backprop.extendModel(Backbone.Model);
    Backprop.extendModel = function(BaseModel) {

        // Add a setProperties() method on Backprop.Model's prototype.
        // This sets a hash of values to the model, just like Backbone.Model.set().
        // The difference is that this will apply transforms for all of the
        // properties before setting.
        Backprop.Model = BaseModel.extend({
            setProperties: function(attrs, options) {
                var schema = this.constructor._schema || {};
                for (var name in attrs) {
                    var propSpec = schema[name] || {};
                    attrs[name] = transformValue(propSpec, attrs[name], this.get(name));
                }
                this.set(attrs, options);
            }
        });

        // Use a modified version of Backbone.Model's extend(), so
        // it can parse Backprop properties in model definitions
        Backprop.Model.extend = function(protoAttrs, staticAttrs) {
            protoAttrs = protoAttrs || {};

            // Apply Backbone.Model's original extend() function:
            var objConstructor = BaseModel.extend.apply(this, [].slice.call(arguments));

            // Go through the prototype attributes and create ES5 properties for every
            // attribute that used Backbone.property():
            objConstructor._schema = {};
            for (var name in protoAttrs) {
                var val = protoAttrs[name];
                if (val instanceof PropPlaceholder) {
                    val.createProperty(objConstructor.prototype, name);
                    objConstructor._schema[name] = val.spec;
                }
            }
            return objConstructor;
        };

        return Backprop.Model;
    };

    // Allow use of shorthand properties like "myprop: Backprop.Boolean()". This avoids
    // having to pass in an explicit coerce function when you are just casting to a JS type.
    // If you do pass in a coerce function, it will still work, but the type cast will
    // be applied first.
    var makeShorthandProp = function(typeCoerce) {
        return function(specObj) {
            specObj = specObj || {};
            var innerCoerce = specObj.coerce;

            if (typeof innerCoerce === 'function') {
                specObj.coerce = function(x) { return innerCoerce(typeCoerce(x)); };
            } else {
                specObj.coerce = typeCoerce;
            }
            return new PropPlaceholder(specObj);
        };
    };

    // The built-in shorthand properties (aka fields) follow:
    Backprop.fields = {
        Generic: makeShorthandProp(function(x) { return x; }),
        Boolean: makeShorthandProp(Boolean),
        String: makeShorthandProp(String),
        Number: makeShorthandProp(Number),
        Integer: makeShorthandProp(function(x) { return parseInt(x, 10); }),
        Date: makeShorthandProp(function(x) { return new Date(x); }),
    };

    // Alias all fields directly on Backprop's top level object for convenience:
    for (var k in Backprop.fields) Backprop[k] = Backprop.fields[k];

    // Export for Node/Browserify, or fallback to a window assignment:
    if (typeof module !== 'undefined' && module.exports) module.exports = Backprop;
    else window.Backprop = Backprop;
}(this));
