
function Custom(id) {
  this.id = Number(id);
}

binson.register({
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
  describe('encode', function(){
    it('should equals hard coded buffer', function() {
      var buffer = binson.encode(new Custom(2));
      var ok = new Buffer(6);
      buffer[0].should.equal(0xc4);
      buffer[1].should.equal(0x24);
      buffer[2].should.equal(0x10);
      buffer[3].should.equal(0x69);
      buffer[4].should.equal(0x64);
      buffer[5].should.equal(0xe0);
    });
  });
  describe('decode', function(){
    it('should equals custom type 2', function() {
      var custom = new Custom(2);
      var buffer = new Buffer(6);

      buffer[0] = 0xc4;
      buffer[1] = 0x24;
      buffer[2] = 0x10;
      buffer[3] = 0x69;
      buffer[4] = 0x64;
      buffer[5] = 0xe0;

      binson.decode(buffer).id.should.equal(custom.id);
    });
  });
  describe('encode-decode', function(){
    it('should equials orginale object', function(){
      var custom = new Custom(2);
      var buffer = binson.encode(custom);
      custom.id.should.equal(binson.decode(buffer).id);
    });
  });
});
