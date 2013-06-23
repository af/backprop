var assert = require('assert');
var Backbone = require('backbone');

var Backprop = require('../backprop');

describe('Backprop monkeypatch', function() {
    it('creates Backbone.property()', function() {
        Backprop.monkeypatch(Backbone);
        assert.equal(typeof Backbone.property, 'function');
    });
});

describe('Created models', function() {
    Backprop.monkeypatch(Backbone);
    var M = Backbone.Model.extend({
        name: Backbone.property({ default: 'asdf' })
    });

    it('have readable properties with working defaults', function() {
        var m = new M();
        assert.equal(m.name, 'asdf');
    });

    it('have writable properties', function() {
        var m = new M();
        m.name = 'foo';
        assert.equal(m.name, 'foo');
    });
});
