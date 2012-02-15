
describe('Basic', function() {

  function test(data) {
    it( data + ' should equals self', function() {
      assert.deepEqual(data, binson.decode(binson.encode(data)));
    });
  }


  describe('Simple', function() {
    test(null);
    test(false);
    test(true);
    test(Infinity);
    test(-Infinity);
    test(undefined);
    test({});
    test([]);
    test('');
    it('NaN should equals self', function() {
      assert(isNaN(binson.decode(binson.encode(NaN))));
    });
  });

  describe('Integer', function() {
    
    // INTEGER_1
    test(0x0);
    test(0x1);
    // INTEGER_4
    test(-0x1);
    test(0x2);
    test(-0x2);
    test(0xf);
    test(-0xf);
    // INTEGER_8
    test(0x10);
    test(0xff);
    test(-0x10);
    test(-0xff);
    // INTEGER_12
    test(0x100);
    test(0xfff);
    test(-0x100);
    test(-0xfff);
    // INTEGER_16
    test(0x1000);
    test(0xffff);
    test(-0x1000);
    test(-0xffff);
    // INTEGER_20
    test(0x10000);
    test(0xfffff);
    test(-0x10000);
    test(-0xfffff);
    // INTEGER_24
    test(0x100000);
    test(0xffffff);
    test(-0x100000);
    test(-0xffffff);
    // INTEGER_31
    test(0x1000000);
    test(0xfffffff);
    test(-0x1000000);
    test(-0xfffffff);
  });

  describe('Float', function() {
    test(2.2);
    test(.232323);
    test(1.7976931348623157E+308);
    test(-1.7976931348623157E+308);
    

    describe('small', function() {

         test(0.0);
         test(1.15);
         test(1.16);
         test(32.045);
         test(64.171);
         test(117.123912);

         test(-0);
         test(-1.15);
         test(-1.16);
         test(-1.123);
         test(-32.045);
         test(-64.171);
         test(-117.123912);

     });

     describe('medium', function() {

         test(116.2137);
         test(256.214);
         test(1024.001);
         test(65535.01);

         test(-128.2137);
         test(-256.214);
         test(-1024.001);
         test(-65535.01);

     });

     describe('big', function() {

         test(65536);
         test(5040213);
         test(1010123024);
         test(2147483647);

         test(-65536);
         test(-5040213);
         test(-1010123024);
         test(-2147483647);

     });
  });

  describe('String', function() {
    function string(len) {
        return new Array(len +1).join('-');
    }
    describe('small', function() {
      test(string(0));
      test(string(1));
      test(string(28));
      test(string(29));
    });
    describe('medium', function() {
      test(string(30));
      test(string(128));
      test(string(255));
    });
    describe('ascii', function() {
      var str = '';
      for(var i = 0, l = 256; i < l; i++) {
        str += String.fromCharCode(i);
      }
      test(str);
    });
    describe('unicode', function() {
      var str = '';
      for(var i = 0, l = 65536; i < l; i++) {
        str += String.fromCharCode(i);
      }
      test(str);
    });
  });
  
  describe('Array', function() {
    test([1,2,3]);
    test(['foo', 'baz']);
    test([4, 5, [[[['test'], 1]], 2]]);
  });

  describe('Error', function() {
    test(new Error('message'));
    test(new EvalError('message'));
    test(new RangeError('message'));
    test(new ReferenceError('message'));
    test(new SyntaxError('message'));
    test(new TypeError('message'));
    test(new URIError('message'));
  });

  describe('Date', function() {
    test(new Date());
    test(new Date(2200, 2, 3, 12,13,14,567));
  });

  describe('RegExp', function() {
    test(new RegExp('[a-z]', 'gmi'));
  });

  describe('Buffer', function() {
    test(new Buffer(0));
    test(new Buffer(30).fill(0xff));
    var buffer = new Buffer(4);
    buffer[0] = 0x0;
    buffer[1] = 0x1;
    buffer[2] = 0x2;
    buffer[3] = 0x3;
    test(buffer);
    test(new Buffer(0xffffff).fill(0xaa));
  });

  describe('Object', function() {
    test({
      a: 1,
      b: 2,
      c: 3,
      d: 4
    });
    test({
      a: 1.12,
      b: 2.12,
      c: 3.12,
      d: 4.12
    });

    test({
      hello: 123,
      foooo: 213,
      'test world': 1245
    });

    test({
      '1123': 'blub',
      '_$cucu': '....',
      '   ': 'hello'
    });

    test({
      'one': {
        hello: 123,
        foooo: 213,
        'test world': 1245
      },

      'two': {
        '1123': 'blub',
        '_$cucu': '....',
        '   ': 'hello'
      },

      'ooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooooo': {
        longKey: true
      },

      three: {
      }

    });
  });
});
