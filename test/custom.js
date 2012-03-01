
function Custom(id) {
  this.id = Number(id);
}

binson.register(0, {
  constructor: Custom,
  encode: function(custom) {
    return custom.id;
  },
  decode: function(id) {
    var c = new Custom(id);
    return c;
  }
});

describe('Custom', function(){
  describe('encode-decode', function(){
    it('should equials orginale object', function(){
      var custom = new Custom(2);
      var buffer = binson.encode(custom);
      custom.id.should.equal(binson.decode(buffer).id);
    });
  });
});
