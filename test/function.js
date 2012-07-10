var extend = require('util')._extend

function foo() { }
function bar() { }

bar.baz = 'hello'

var obj = {}

;[foo, bar].forEach(function(fn) {
  obj[fn.name] = fn
})

binson.register(0, {
  constructor: Function,
  deep: true,
  encode: function(fn) {
    return fn.name
  },
  decode: function(name, properties) {
    var fn = obj[name]
    if (properties) extend(fn, properties)
    return fn
  }
});

describe('Function', function(){
  describe('encode-decode', function(){
    it('should equials orginale object', function(){
      var buffer = binson.encode(obj)
      bar.baz = 'world'
      assert.deepEqual(obj, binson.decode(buffer))
      assert.equal(bar.baz, 'hello')
    })
  })
})
