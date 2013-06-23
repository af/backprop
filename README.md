Backprop
========

A small Backbone plugin that lets you use ECMAScript 5 properties on your Backbone models.
Instead of doing:

```js
console.log(mymodel.get('name'));
mymodel.set('name', 'Bob');
```

with Backprop you can write this instead:

```js
console.log(mymodel.name);
mymodel.name = 'Bob';
```

You can install it from npm with `npm install backprop`.

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
    name: Backbone.property({ default: 'Jonas' }),
    numFollowers: Backbone.property({ default: 0, coerce: Number });
});
```

Also, Backprop is CommonJS-friendly, so you can use it in Node or with client-side
module systems like Browserify:

```js
var Backprop = require('backprop');
```

Credits
-------

Partial inspiration came from this gist:
https://gist.github.com/dandean/1292057
