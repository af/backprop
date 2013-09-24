var assert = require('assert');
var Backbone = require('backbone');

var Backprop = require('../backprop');

describe('Backprop monkeypatch', function() {
    it('creates Backbone.property()', function() {
        Backprop.monkeypatch(Backbone);
        assert.equal(typeof Backbone.property, 'function');
    });
});


describe('A created model property', function() {
    Backprop.monkeypatch(Backbone);
    var M = Backbone.Model.extend({
        name: Backbone.property({ default: 'asdf', trim: true }),
        status: Backbone.property(),
        isAvailable: Backbone.property({ coerce: Boolean, default: false }),

        doStuff: function() {}
    });

    it('is readable with working defaults', function() {
        var m = new M();
        assert.equal(m.name, 'asdf');
        assert.equal(m.attributes.name, 'asdf');
    });

    it('has a working default even if it is falsy', function() {
        var m = new M();
        assert.strictEqual(m.isAvailable, false);
        assert.strictEqual(m.attributes.isAvailable, false);
    });

    it('is writable', function() {
        var m = new M();
        m.name = 'foo';
        assert.equal(m.name, 'foo');
        assert.equal(m.attributes.name, 'foo');
    });

    it('works without an options hash', function() {
        var m = new M();
        assert.strictEqual(m.status, undefined);

        m.status = 'away';
        assert.strictEqual(m.status, 'away');
        assert.strictEqual(m.attributes.status, 'away');
    });

    it('throws if their name is already in use by Backbone', function() {
        assert.throws(function() {
            var M2 = Backbone.Model.extend({
                get: Backbone.property()
            });
        }, Error);
    });

    it('is passed along to subclasses', function() {
        var N = M.extend({ foo: 'asdf' });
        var n = new N();
        assert.strictEqual(n.status, undefined);

        n.status = 'away';
        assert.strictEqual(n.status, 'away');
        assert.strictEqual(n.attributes.status, 'away');

        // Ensure normal inheritance of methods still works as well:
        assert.strictEqual(typeof n.doStuff, 'function');
    });

    it('triggers change events when modified', function() {
        var m = new M();
        var x = 0;
        var y = 0;

        m.on('change', function() { x++; });
        m.on('change:name', function() { y++; });

        m.name = 'Ted';
        assert.strictEqual(x, 1);
        assert.strictEqual(y, 1);
    });

    it('works with the trim option', function() {
        var m = new M();
        m.name = '  John ';
        assert.strictEqual(m.name, 'John');
    });
});


describe('Property choice option', function() {
    Backprop.monkeypatch(Backbone);
    var M = Backbone.Model.extend({
        category: Backbone.property({ choices: ['books', 'electronics', 'music'] }),
        genre: Backbone.property({ choices: ['action', 'comedy'], default: 'action' }),
        price: Backbone.property({ coerce: Number, choices: [0.99, 1.50, '9.99'] }),
    });

    it('works with strings', function() {
        var m = new M;
        m.category = 'asdf';
        assert.strictEqual(m.category, undefined);

        m.category = 'electronics';
        assert.strictEqual(m.category, 'electronics');

        // If setting an invalid value is attempted, it keeps its current one:
        m.category = 'foo';
        assert.strictEqual(m.category, 'electronics');

        m.category = 'music';
        assert.strictEqual(m.category, 'music');
    });

    it('works with default values', function() {
        var m = new M;

        // Uses the default if one was set:
        m.genre = 'asdf';
        assert.strictEqual(m.genre, 'action');

        // If setting an invalid value is attempted, it still keeps its current one:
        m.genre = 'foo';
        assert.strictEqual(m.genre, 'action');

        m.genre = 'comedy';
        assert.strictEqual(m.genre, 'comedy');
    });
});

describe('setProperties() method', function() {
    Backprop.monkeypatch(Backbone);

    var categoryConfig = { choices: ['books', 'electronics', 'music'] };
    var genreConfig = { choices: ['action', 'comedy'], default: 'action' };
    var priceConfig = { coerce: Number, choices: [0.95, 1.50, '9.99'] };

    var M = Backbone.Model.extend({
        category: Backbone.property(categoryConfig),
        genre: Backbone.property(genreConfig),
        price: Backbone.property(priceConfig),
    });

    it('sets values on model instances', function() {
        var m = new M;
        m.setProperties({ category: 'books', genre: 'comedy' });
        assert.strictEqual(m.category, 'books');
        assert.strictEqual(m.attributes.category, 'books');

        assert.strictEqual(m.genre, 'comedy');
        assert.strictEqual(m.attributes.genre, 'comedy');
    });

    it('applies property transforms before setting', function() {
        var m = new M;
        m.setProperties({ price: 1.23 });
        assert.strictEqual(m.price, undefined);
        assert.strictEqual(m.attributes.price, undefined);
    });

    it('has access to a _schema property on the constructor', function() {
        assert.strictEqual(M._schema.category, categoryConfig);
        assert.strictEqual(M._schema.genre, genreConfig);
        assert.strictEqual(M._schema.price, priceConfig);
    });

    it('works with { validate: true }', function() {
        var m = new M;
        var count = 0;
        M.prototype.validate = function() { count++; };

        // validate() is called if { validate: true } is passed:
        m.setProperties({ category: 'electronics' }, { validate: true });
        assert.strictEqual(count, 1);
        assert.strictEqual(m.category, 'electronics');

        // validate() is not called if { validate: true } is NOT passed:
        m.setProperties({ category: 'electronics' }, {});
        assert.strictEqual(count, 1);
    });

    it('works with { silent: true }', function() {
        var m = new M;
        var count = 0;

        m.on('change', function() { count++; });
        m.setProperties({ category: 'electronics' });
        assert.strictEqual(count, 1);

        m.setProperties({ category: 'electronics' }, { silent: true });
        assert.strictEqual(count, 1);
    });

    it('works with { silent: true } for granular change listeners', function() {
        var m = new M;
        var count = 0;

        m.on('change:genre', function() { count++; });
        m.setProperties({ genre: 'comedy' });
        assert.strictEqual(count, 1);
        m.setProperties({ genre: 'action' }, { silent: true });
        assert.strictEqual(count, 1);
    });

    it('allows unspecified properties through as regular Backbone attrs', function() {
        var m = new M;
        m.setProperties({ foo: 'baz' });
        assert.strictEqual(m.get('foo'), 'baz');

        // Mixed example:
        m.setProperties({ price: 0.95, x: 23 });
        assert.strictEqual(m.price, 0.95);
        assert.strictEqual(m.get('x'), 23);
    })
});


describe('Max and min', function() {
    Backprop.monkeypatch(Backbone);
    var M = Backbone.Model.extend({
        myNum: Backbone.property({ coerce: Number, min: 100, max: 200 }),
        minOnly: Backbone.property({ coerce: Number, min: 100 }),
        maxOnly: Backbone.property({ coerce: Number, max: 200 }),
        strTest: Backbone.property({ coerce: String, min: 'c', max: 'f' }),
    });

    it('work when both are specified', function() {
        var m = new M;
        m.myNum = 20;
        assert.strictEqual(m.myNum, 100);

        m.myNum = 201;
        assert.strictEqual(m.myNum, 200);
    });

    it('work when only min is used', function() {
        var m = new M;
        m.minOnly = 20;
        assert.strictEqual(m.minOnly, 100);
    });

    it('work when only max is used', function() {
        var m = new M;
        m.maxOnly = 205;
        assert.strictEqual(m.maxOnly, 200);
    });

    it('work with strings', function() {
        var m = new M;
        m.strTest = 'abc';
        assert.strictEqual(m.strTest, 'c');

        m.strTest = 'zzz';
        assert.strictEqual(m.strTest, 'f');
    });
});


describe('Property type coercion', function() {
    Backprop.monkeypatch(Backbone);
    var M = Backbone.Model.extend({
        myString: Backbone.property({ coerce: String }),
        myNum: Backbone.property({ coerce: Number }),
        myBool: Backbone.property({ coerce: Boolean }),
        myInt: Backbone.property({ coerce: parseInt }),
    });

    it('works for numbers', function() {
        var m = new M();

        m.myNum = 42;
        assert.strictEqual(m.myNum, 42);
        assert.strictEqual(m.attributes.myNum, 42);

        m.myNum = '123';
        assert.strictEqual(m.myNum, 123);
        assert.strictEqual(m.attributes.myNum, 123);

        m.myNum = 'asdf';
        assert.ok(isNaN(m.myNum));
        assert.ok(isNaN(m.attributes.myNum));
    });

    it('works for strings', function() {
        var m = new M();

        m.myString = 'asdf';
        assert.strictEqual(m.myString, 'asdf');
        assert.strictEqual(m.attributes.myString, 'asdf');

        m.myString = 123;
        assert.strictEqual(m.myString, '123');
        assert.strictEqual(m.attributes.myString, '123');
    });

    it('works for booleans', function() {
        var m = new M();

        m.myBool = true;
        assert.strictEqual(m.myBool, true);
        assert.strictEqual(m.attributes.myBool, true);

        m.myBool = undefined;
        assert.strictEqual(m.myBool, false);
        assert.strictEqual(m.attributes.myBool, false);

        m.myBool = 123;
        assert.strictEqual(m.myBool, true);
        assert.strictEqual(m.attributes.myBool, true);
        m.myBool = 0;
        assert.strictEqual(m.myBool, false);
        assert.strictEqual(m.attributes.myBool, false);

        m.myBool = 'false';
        assert.strictEqual(m.myBool, true);     // As expected when calling Boolean('false');
        assert.strictEqual(m.attributes.myBool, true);
    });

    it('works for parseInt', function() {
        var m = new M();

        m.myInt = 23;
        assert.strictEqual(m.myInt, 23);
        assert.strictEqual(m.attributes.myInt, 23);

        m.myInt = '45 is the number';
        assert.strictEqual(m.myInt, 45);
        assert.strictEqual(m.attributes.myInt, 45);

        m.myInt = 'asdfasdf 14';
        assert.ok(isNaN(m.myInt));
        assert.ok(isNaN(m.attributes.myInt));
    });
});


describe('Shorthand properties', function() {
    Backprop.monkeypatch(Backbone);
    var M = Backbone.Model.extend({
        name: Backprop.String({ default: 'asdf', trim: true }),
        age: Backprop.Number({ coerce: function(x) { return x + 1; } }),
        isAdmin: Backprop.Boolean({ default: false }),
    });

    it('are readable with working defaults', function() {
        var m = new M();
        assert.strictEqual(m.name, 'asdf');
        assert.strictEqual(m.attributes.name, 'asdf');

        assert.strictEqual(m.isAdmin, false);
        assert.strictEqual(m.attributes.isAdmin, false);
    });

    it('are writable', function() {
        var m = new M();
        m.name = 'foo';
        assert.strictEqual(m.name, 'foo');
        assert.strictEqual(m.attributes.name, 'foo');

        m.isAdmin = true;
        assert.strictEqual(m.isAdmin, true);
        assert.strictEqual(m.attributes.isAdmin, true);
    });

    it('apply the the coerce function after type casting', function() {
        var m = new M();
        m.age = '27';
        // Coerce function adds one to the given number:
        assert.strictEqual(m.age, 28);
        assert.strictEqual(m.attributes.age, 28);
    });
});
