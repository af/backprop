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
    });

    it('is readable with working defaults', function() {
        var m = new M();
        assert.equal(m.name, 'asdf');
        assert.equal(m.attributes.name, 'asdf');
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
});
