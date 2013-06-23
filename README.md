Backprop
========

A small Backbone plugin that lets you use [ECMAScript 5 properties][ES5props] on your Backbone models.
Instead of doing:

```js
mymodel.set('name', 'Bob');
console.log(mymodel.get('name'));   // prints 'Bob'
```

with Backprop you can write this instead:

```js
mymodel.name = 'Fred';
console.log(mymodel.name);              // prints 'Fred'
console.log(mymodel.attributes.name);   // prints 'Fred'
```

You can install it from npm with `npm install backprop`.

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

Backbone.property takes an optional hash as its only argument, and the following
keys are supported to make dealing with properties a bit more pleasant:

##### `default`
Lets you specify a default value for the property. This will override anything that
was set in the `defaults` hash for this attribute name. Basically just a convenient
shorthand so you can keep your default value close to the property definition.


##### `coerce`
Specify a function that coerces the property's value any time it is set. For example:

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
