Backprop
========
[![Build Status](https://secure.travis-ci.org/af/backprop.png)](http://travis-ci.org/af/backprop)
[![NPM version](https://badge.fury.io/js/backprop.png)](http://badge.fury.io/js/backprop)

A small Backbone plugin that lets you use [ECMAScript 5 properties][ES5props] on your Backbone models.
Instead of writing:

```js
mymodel.set('name', 'Bob');
console.log(mymodel.get('name'));   // prints 'Bob'
```

with Backprop you can write this instead (and it will have the same effect):

```js
mymodel.name = 'Fred';
console.log(mymodel.name);              // prints 'Fred'
```

Backbone's `get()` and `set()` will still work if you need them. For example, you could use `set()` for it's `{validate: true}` option, although Backprop also provides a `setProperties()` method that accepts the same options as `set()` (see below).

You can install Backprop from npm with `npm install backprop`.

[ES5props]: https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/defineProperty


Usage
-----

Initialize the plugin with:

```js
Backprop.monkeypatch(Backbone);
```

This will replace Backbone.Model.extend with a version that creates the properties,
and creates `Backbone.property`, a function that you can use to define properties
on your models.

Then in your models write something like:

```js
var User = Backbone.Model.extend({
    name: Backbone.property({ coerce: String }),
    numFollowers: Backbone.property({ default: 0, coerce: Number });
});
```

Also, Backprop is CommonJS-friendly, so you can use it in Node or with client-side
module systems like Browserify:

```js
var Backprop = require('backprop');
```

Backbone.property() arguments
-----------------------------

Backbone.property takes an optional hash as its only argument. The following
keys are supported to pre-filter data and make dealing with properties a bit more pleasant:

##### `default`
Lets you specify a default value for the property. This will override anything that
was set in the model's `defaults` hash for this attribute name. It's basically just a convenient
shorthand so you can keep your default value close to the property definition.

##### `coerce`
Specify a function that transforms the property's value before it is set. Some useful
Javascript functions to pass in here include `String`, `Number`, `Boolean`, `parseInt`,
(although you might want to wrap it to make sure its second argument is 10), `parseFloat`,
and `encodeURIComponent`. Of course, you can also provide your own.

For example:

```
var Cat = Backbone.Model.extend({
    name: Backbone.property({ coerce: String }),
    lives: Backbone.property({ coerce: Number })
});
var c = new Cat;

c.name = 42;
console.log(c.name === '42')    // prints true

c.lives = '9';
console.log(c.lives === 9)      // prints true
```

##### `trim`
If true, calls a trim method on the value before setting the attribute. This is
handy for removing leading/trailing whitespace from strings.


##### `max` and `min`
Specify values that the value must be less than/greater than (these can be used separately
or together). Most useful for numbers, but will work with any values that work with `<` and `>`.

```js
var Beer = Backbone.Model.extend({
    milliliters = Backbone.property({ coerce: Number, min: 330, max: 1000 })
});
var b = new Beer;

b.milliliters = 100;
console.log(b.milliliters);     // prints 330

b.milliliters = 2000;
console.log(b.milliliters);     // prints 1000
```


##### `choices`
Specify an array with an enumeration of acceptable values for the property. If a value
not in the array is assigned to the property, the value set to the model will be:

    a) the property's current value, if one was set previously (ie. the assignment will fail)
    b) the property's `default` value (if one was speficied)
    c) `undefined`

```js
var Beer = Backbone.Model.extend({
    style: Backbone.property({ choices: ['IPA', 'stout', 'ESB'], default: 'IPA' });
    type: Backbone.property({ choices: ['on_tap', 'bottle'] });
});

var b = new Beer;

b.style = 'asdf';
console.log(b.style);           // prints 'IPA'

b.type = 'foooo';
console.log(b.type);           // prints undefined

b.type = 'on_tap';
console.log(b.type);           // prints 'on_tap'

b.type = 'foooo';
console.log(b.type);           // prints 'on_tap'
```

The setProperties method
------------------------

As of version 0.2.0, backprop also adds a `setProperties()` method to model instances. This
method accepts two positional arguments: the first is a hash of properties to set, and the
second is an options object that is passed to Backbone's `set()` method behind the scenes.
The second argument can be used to pass `{ validate: true }` or `{ silent: true }` for your
properties, while still having the data passed through Backprop's pre-filters (eg. `choices`,
`max`, `min`, etc).

```
var b = new Beer;
b.setProperties({ style: 'ESB', type: 'on_tap' }, { silent: true });
```

Note that if you pass any keys in `setProperties()`'s first hash that are not defined as
properties, they will be set on the model as regular Backbone attributes.


Compatibility
---------------

Any browser with decent ES5 support should work fine, but IE8 and below do not fit in that category.
For more complete support info see [this table](http://kangax.github.io/es5-compat-table/#Object.defineProperty).

The plugin has been tested with Backbone v1.0.0, not sure if previous releases will work correctly.


Running tests
-------------

```
git clone git://github.com/af/backprop.git
cd backprop
npm test
```

Credits
-------

Partial inspiration came from this gist:
https://gist.github.com/dandean/1292057
