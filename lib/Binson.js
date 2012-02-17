var BitWorker = require('./BitWorker');

/*

Types 
000  0 value
001  1 Number
010  2 string
011  3 Array
100  4 Buffer
101  5 special
110  6 plain object
111  7 end

Numbers
00 0 integer
01 1 double
10 2 NaN
11 3 Infinity + sign bit


Special types
00 0 Date
01 1 RegExp
10 2 Error
11 3 Custom

Values 
00 0 false
01 1 true
10 2 null
11 3 undefined


errors:
000 0 Error
001 1 EvalError
010 2 RangeError
011 3 ReferenceError
100 4 SyntaxError
101 5 TypeError
110 6 URIError
*/

var undefined;

const LENGTH_TYPE      = 3;

const TYPE_VALUE       = 0;
const TYPE_NUMBER      = 1;
const TYPE_STRING      = 2;
const TYPE_ARRAY       = 3;
const TYPE_BUFFER      = 4;
const TYPE_SPECIAL     = 5;
const TYPE_PLAIN       = 6;
const TYPE_END         = 7;


const LENGTH_VALUE     = 2;

const VALUE_FALSE      = 0;
const VALUE_TRUE       = 1;
const VALUE_NULL       = 2;
const VALUE_UNDEFINED  = 3;


const LENGTH_NUMBER    = 2;

const NUMBER_INTEGER   = 0;
const NUMBER_DOUBLE    = 1;
const NUMBER_NAN       = 2;
const NUMBER_INFINITY  = 3;


const LENGTH_INTEGER   = 3;

const INTEGER_1   = 0;
const INTEGER_4   = 1;
const INTEGER_8   = 2;
const INTEGER_12  = 3;
const INTEGER_16  = 4;
const INTEGER_20  = 5;
const INTEGER_24  = 6;
const INTEGER_31  = 7; // last bit is sign

const LENGTH_DOUBLE = 64;

const LENGTH_SIGN = 1;
const SIGN_POS = 0;
const SIGN_NEG = 1;

const LENGTH_SPECIAL   = 2;

const SPECIAL_DATE     = 0;
const SPECIAL_REGEXP   = 1;
const SPECIAL_ERROR    = 2;
const SPECIAL_CUSTOM   = 3;


const LENGTH_ERROR     = 3;

const ERROR_ERROR      = 0;
const ERROR_EVAL       = 1;
const ERROR_RANGE      = 2;
const ERROR_REFERENCE  = 3;
const ERROR_SYNTAX     = 4;
const ERROR_TYPE       = 5;
const ERROR_URI        = 6;

const LENGTH_BLOBHEADER = 5;


function Binson() {
  this.customTypes = [];
}

Binson.prototype.register = function(index, info) {
  this.customTypes[index] = info;
};

Binson.prototype.calculate = function(obj) {
  var size = this.calculateElement(obj, 0);
  return Math.ceil(size / 8);
};

Binson.prototype.encode = function (object, buffer, offset) {
  if (!buffer) {
    buffer = new Buffer(this.calculate(object));
  }

  var bw = new BitWorker(buffer, offset);
  bw.writeStart();
  this.encodeElement(bw, object);
  bw.writeEnd();

  return buffer;
};

Binson.prototype.decode = function(buffer, offset) {
  var br = new BitWorker(buffer, offset)
  br.readStart();
  return this.decodeElement(br, br.read(LENGTH_TYPE));
};


/**
 * calculate
 */


function calcIntegerBits(num) {
  return num ? Math.floor(Math.log(num) / Math.LN2) + 1 : 1;
}


function calcBlobSize(size, length) {
  size += LENGTH_BLOBHEADER;
  if (length < 28) {
    // just blob length
  } else if (length <= 0xff) {
    size += 8;
  } else if (length <= 0xffff) {
    size += 16;
  } else {
    size += 32;
  }

  var left = size % 8;
  if (left) {
    size += 8 - left;
  }

  size += length * 8;

  return size;
}


Binson.prototype.calculateElement = function (object, size) {
  size = size || 0;

  size += LENGTH_TYPE;

  switch(typeof object) {
  case 'undefined':
    size += LENGTH_VALUE;
    break;

  case 'boolean':
    size += LENGTH_VALUE;
    break;

  case 'number':
    size += LENGTH_NUMBER;

    if (isNaN(object)) {
      // just number type

    } else if (object == Infinity || object == -Infinity) {
      size += LENGTH_SIGN; // sign

    } else if (object === (object | 0)) { // interger
      size += LENGTH_INTEGER;

      if (object < 0) {
        object = -object;
      }

      if (object < 2) {
        size += 1;
      } else if (object < 16) {
        size += 4;
      } else if (object < 256) {
        size += 8;
      } else if (object < 4096) {
        size += 12;
      } else if (object < 65536) {
        size += 16;
      } else if (object < 1048576) {
        size += 20;
      } else if (object < 16777216) {
        size += 24;
      } else {
        size += 31;
      }

      size += LENGTH_SIGN; // sign

    } else { // double
      size += LENGTH_DOUBLE;

    }
    break;

  case 'string':
    size = calcBlobSize(size, Buffer.byteLength(object, 'utf8'));
    break;

  case 'function':
    throw new Error('cant encode functions');

  case 'object':

    // Null
    if (object === null) {
      size += LENGTH_VALUE;


    // Array
    } else if (Array.isArray(object)) {
      object.forEach(function(item) {
        size = this.calculateElement(item, size);
      }, this);

      size += LENGTH_TYPE; // end


    // Buffer
    } else if (object instanceof Buffer) {
      size = calcBlobSize(size, object.length);


    // Date
    } else if (object instanceof Date) {
      size += LENGTH_SPECIAL;

      // add double
      size += LENGTH_DOUBLE;


    // RegExp
    } else if (object instanceof RegExp) {
      size += LENGTH_SPECIAL;
      size += 3; // flags
      size = calcBlobSize(size, Buffer.byteLength(object.source, 'utf8'));


    // Error
    } else if (object instanceof Error) {
      size += LENGTH_SPECIAL;
      size += LENGTH_ERROR;

      // add string
      size = calcBlobSize(size, Buffer.byteLength(object.message, 'utf8'));


    } else {

      // is custom ?
      var custom;
      this.customTypes.forEach(function(info) {
        if (object instanceof info.constructor) {
          custom = info;
        }
      });

      // Custom
      if (custom) {
        size += LENGTH_SPECIAL;
        size += calcIntegerBits(this.customTypes.length - 1);
        size = this.calculateElement(custom.encode(object), size);


      // plain object
      } else {

        Object.keys(object).forEach(function(key) {
          size = this.calculateElement(object[key], size); // value
          size = calcBlobSize(size, Buffer.byteLength(key, 'utf8')); // key, string
        }, this);

        size += LENGTH_TYPE; // end

      }
    }
    break;

  }

  return size;
};





/**
 * encode 
 */

function writeBlobHeader(bw, length) {
  if (length < 28) {
    bw.write(length, LENGTH_BLOBHEADER);
  } else if (length <= 0xff) {
    bw.write(29, LENGTH_BLOBHEADER);
    bw.writeUInt8(length);
  } else if (length <= 0xffff) {
    bw.write(30, LENGTH_BLOBHEADER);
    bw.writeUInt16BE(length);
  } else {
    bw.write(31, LENGTH_BLOBHEADER);
    bw.writeUInt32BE(length);
  }
}

Binson.prototype.encodeElement = function(bw, object) {


  switch(typeof object) {
  case 'undefined':
    bw.write(TYPE_VALUE, LENGTH_TYPE);
    bw.write(VALUE_UNDEFINED, LENGTH_VALUE);
    break;


  case 'boolean':
    bw.write(TYPE_VALUE, LENGTH_TYPE);
    bw.write(object ? VALUE_TRUE : VALUE_FALSE, LENGTH_VALUE);
    break;


  case 'number':
    bw.write(TYPE_NUMBER, LENGTH_TYPE);


    if (isNaN(object)) {
      bw.write(NUMBER_NAN, LENGTH_NUMBER);


    } else if (object == Infinity) {
      bw.write(NUMBER_INFINITY, LENGTH_NUMBER);
      bw.write(SIGN_POS, LENGTH_SIGN);


    } else if (object == -Infinity) {
      bw.write(NUMBER_INFINITY, LENGTH_NUMBER);
      bw.write(SIGN_NEG, LENGTH_SIGN);


    } else if (object === (object | 0)) { // interger
      bw.write(NUMBER_INTEGER, LENGTH_NUMBER);

      var sign = SIGN_POS;
      if (object < 0) {
        sign = SIGN_NEG;
        object = -object;
      }

      // 2 size 0-3: 0 = < 16 1 = < 256 2 = < 65536 3 >
      if (object < 2) {
        bw.write(INTEGER_1, LENGTH_INTEGER);
        bw.write(object, 1);

      } else if (object < 16) {
        bw.write(INTEGER_4, LENGTH_INTEGER);
        bw.write(object, 4);

      } else if (object < 256) {
        bw.write(INTEGER_8, LENGTH_INTEGER);
        bw.write(object, 8);

      } else if (object < 4096) {
        bw.write(INTEGER_12, LENGTH_INTEGER);
        bw.write(object >> 8 & 0xff, 4);
        bw.write(object & 0xff, 8);

      } else if (object < 65536) {
        bw.write(INTEGER_16, LENGTH_INTEGER);
        bw.write(object >> 8 & 0xff, 8);
        bw.write(object & 0xff, 8);

      } else if (object < 1048576) {
        bw.write(INTEGER_20, LENGTH_INTEGER);
        bw.write(object >> 16 & 0xff, 4);
        bw.write(object >> 8 & 0xff, 8);
        bw.write(object & 0xff, 8);

      } else if (object < 16777216) {
        bw.write(INTEGER_24, LENGTH_INTEGER);
        bw.write(object >> 16 & 0xff, 8);
        bw.write(object >> 8 & 0xff, 8);
        bw.write(object & 0xff, 8);

      } else {
        bw.write(INTEGER_31, LENGTH_INTEGER);
        bw.write(object >> 24 & 0xff, 7);
        bw.write(object >> 16 & 0xff, 8);
        bw.write(object >> 8 & 0xff, 8);
        bw.write(object & 0xff, 8);

      }

      bw.write(sign, LENGTH_SIGN);


    } else { // double
      bw.write(NUMBER_DOUBLE, LENGTH_NUMBER);
      bw.writeDoubleBE(object)

    }
    break;


  case 'string':
    bw.write(TYPE_STRING, LENGTH_TYPE);
    writeBlobHeader(bw, Buffer.byteLength(object, 'utf8'));
    bw.writeUtf8(object);
    break;


  case 'function':
    throw new Error('cant encode functions');


  case 'object':
    // Null
    if (object === null) {
      bw.write(TYPE_VALUE, LENGTH_TYPE);
      bw.write(VALUE_NULL, LENGTH_VALUE);


    // Array
    } else if (Array.isArray(object)) {
      bw.write(TYPE_ARRAY, LENGTH_TYPE);

      object.forEach(function(item) {
        this.encodeElement(bw, item);
      }, this);

      bw.write(TYPE_END, LENGTH_TYPE);

    // Buffer
    } else if (object instanceof Buffer) {
      bw.write(TYPE_BUFFER, LENGTH_TYPE);
      writeBlobHeader(bw, object.length);
      bw.writeBuffer(object);


    // Date
    } else if (object instanceof Date) {
      bw.write(TYPE_SPECIAL, LENGTH_TYPE);
      bw.write(SPECIAL_DATE, LENGTH_SPECIAL);
      bw.writeDoubleBE(object.getTime());


    // RegExp
    } else if (object instanceof RegExp) {
      bw.write(TYPE_SPECIAL, LENGTH_TYPE);
      bw.write(SPECIAL_REGEXP, LENGTH_SPECIAL);

      // flags
      bw.write(object.global ? 1 : 0, 1);
      bw.write(object.ignoreCase ? 1 : 0, 1);
      bw.write(object.multiline ? 1 : 0, 1);
      
      writeBlobHeader(bw, Buffer.byteLength(object.source, 'utf8'));
      bw.writeUtf8(object.source);


    // Error
    } else if (object instanceof Error) {
      bw.write(TYPE_SPECIAL, LENGTH_TYPE);
      bw.write(SPECIAL_ERROR, LENGTH_SPECIAL);

      if (object instanceof EvalError) {
        bw.write(ERROR_EVAL, LENGTH_ERROR);

      } else if (object instanceof RangeError) {
        bw.write(ERROR_RANGE, LENGTH_ERROR);

      } else if (object instanceof ReferenceError) {
        bw.write(ERROR_REFERENCE, LENGTH_ERROR);

      } else if (object instanceof SyntaxError) {
        bw.write(ERROR_SYNTAX, LENGTH_ERROR);

      } else if (object instanceof TypeError) {
        bw.write(ERROR_TYPE, LENGTH_ERROR);

      } else if (object instanceof URIError) {
        bw.write(ERROR_URI, LENGTH_ERROR);

      } else {
        bw.write(ERROR_ERROR, LENGTH_ERROR);

      }

      writeBlobHeader(bw, Buffer.byteLength(object.message, 'utf8'));
      bw.writeUtf8(object.message);


    } else {

      // is custom ?
      var custom, index;
      this.customTypes.forEach(function(info, i) {
        if (object instanceof info.constructor) {
          custom = info;
          index = i;
        }
      });

      // Custom
      if (custom) {
        bw.write(TYPE_SPECIAL, LENGTH_TYPE);
        bw.write(SPECIAL_CUSTOM, LENGTH_SPECIAL);

        bw.write(index, calcIntegerBits(this.customTypes.length - 1));

        this.encodeElement(bw, custom.encode(object));


      // plain object
      } else {

        bw.write(TYPE_PLAIN, LENGTH_TYPE);

        Object.keys(object).forEach(function(key) {
          // value
          this.encodeElement(bw, object[key]);

          // key
          writeBlobHeader(bw, Buffer.byteLength(key, 'utf8'));
          bw.writeUtf8(key);
        }, this);

        bw.write(TYPE_END, LENGTH_TYPE);

      }
    }

    break;

  }
};



/*
 * Decode
 */
 


function readBlobLength(br) {
  var length = br.read(LENGTH_BLOBHEADER);
  if (length < 28) {
    return length;
  } else if (length == 29) {
    return br.readUInt8();
  } else if (length == 30) {
    return br.readUInt16BE();
  } else {
    return br.readUInt32BE();
  }
}

Binson.prototype.decodeElement = function(br, type) {

  switch(type) {
  case TYPE_VALUE:
    switch(br.read(LENGTH_VALUE)) {
    case VALUE_FALSE:
      return false;
    case VALUE_TRUE:
      return true;
    case VALUE_NULL:
      return null;
    case VALUE_UNDEFINED:
      return undefined;
    }

  case TYPE_NUMBER:

    switch(br.read(LENGTH_NUMBER)) {
    case NUMBER_NAN:
      return NaN;

    case NUMBER_INFINITY:
      return br.read(LENGTH_SIGN) === SIGN_NEG ? -Infinity : Infinity;

    case NUMBER_DOUBLE:
      return br.readDoubleBE();

    case NUMBER_INTEGER:
      var value;

      switch(br.read(LENGTH_INTEGER)) {
      case INTEGER_1:
        value = br.read(1);
        break;

      case INTEGER_4:
        value = br.read(4);
        break;

      case INTEGER_8:
        value = br.read(8);
        break;

      case INTEGER_12:
        value = (br.read(4) << 8)
            + br.read(8);

        break;

      case INTEGER_16:
        value = (br.read(8) << 8)
            + br.read(8);

        break;

      case INTEGER_20:
        value = (br.read(4) << 16)
            + (br.read(8) << 8)
            + br.read(8);

        break;

      case INTEGER_24:
        value = (br.read(8) << 16)
            + (br.read(8) << 8)
            + br.read(8);

        break;

      case INTEGER_31:
        value = (br.read(7) << 24)
            + (br.read(8) << 16)
            + (br.read(8) << 8)
            + br.read(8);

        break;
      }

      if (br.read(LENGTH_SIGN)) {
        value = -value;
      }

      return value;
    }

  case TYPE_STRING: // string
    return br.readUtf8(readBlobLength(br));
  
  case TYPE_BUFFER: // Buffer
    return br.readBuffer(readBlobLength(br));

  case TYPE_SPECIAL:
    switch(br.read(LENGTH_SPECIAL)) {
    case SPECIAL_DATE:
      return new Date(br.readDoubleBE());

    case SPECIAL_REGEXP:
      var source = '', flags = '';
      if (br.read(1)) {
        flags += 'g';
      }
      if (br.read(1)) {
        flags += 'i';
      }
      if (br.read(1)) {
        flags += 'm';
      }

      source = br.readUtf8(readBlobLength(br));

      return new RegExp(source, flags);

    case SPECIAL_ERROR:
      var err_type = br.read(LENGTH_ERROR);
      var err_message = br.readUtf8(readBlobLength(br));

      switch(err_type) {
      case ERROR_ERROR:
        return new Error(err_message);

      case ERROR_EVAL:
        return new EvalError(err_message);

      case ERROR_RANGE:
        return new RangeError(err_message);

      case ERROR_REFERENCE:
        return new ReferenceError(err_message);

      case ERROR_SYNTAX:
        return new SyntaxError(err_message);

      case ERROR_TYPE:
        return new TypeError(err_message);

      case ERROR_URI:
        return new URIError(err_message);

      }

    case SPECIAL_CUSTOM:
      var custom;

      custom = br.read(calcIntegerBits(this.customTypes.length - 1));
      custom = this.customTypes[custom];
      if (!custom) {
        throw new Error('Failed to decode; Invalid custom type');
      }

      var value = this.decodeElement(br, br.read(LENGTH_TYPE));

      return custom.decode(value);
    }

  case TYPE_ARRAY:
    var value = [];
    while((type = br.read(LENGTH_TYPE)) !== TYPE_END) {
      value.push(this.decodeElement(br, type))
    }
    return value;

  case TYPE_PLAIN:
    var key, val, obj;
    obj = {};
    while((type = br.read(LENGTH_TYPE)) !== TYPE_END) {
      val = this.decodeElement(br, type);
      key = br.readUtf8(readBlobLength(br));

      obj[key] = val;
    }
    return obj;

  case TYPE_END: // end
    throw new Error('Binson error');
  }

}

module.exports = Binson;
