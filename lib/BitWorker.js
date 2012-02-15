
var powTable = new Array(16);
for(var i = 0; i < 16; i++) {
  powTable[i] = Math.pow(10, i);
}

var maskTable = new Array(8);
for(var i = 0; i < 9; i++) {
  maskTable[i] = ~((powTable[i] = Math.pow(2, i) - 1) ^ 0xff);
}


function BitWorker(buffer, start, end) {
  this.buffer = buffer;
  this.index = start || 0;
  this.max = end || buffer.length;
  this.left = 8;
}

BitWorker.prototype.readStart = function() {
  this.value = this.buffer[this.index];
};
BitWorker.prototype.writeStart = function() {
  this.value = 0;
};

BitWorker.prototype.writeEnd = function() {
  this.writePadd();
};


BitWorker.prototype.write = function(val, bits) {

  var overflow = bits - this.left
    , use = this.left < bits ? this.left : bits
    , shift = this.left - use
    ;

  if (overflow > 0) {
    this.value += val >> overflow << shift;

  } else {
    this.value += val << shift;
  }

  this.left -= use;

  if (this.left === 0) {

    this.buffer[this.index++] = this.value;
    this.left = 8;
    this.value = 0;

    if (overflow > 0) {
      this.write(val & powTable[overflow], overflow);
    }

  }

};

BitWorker.prototype.read = function (count) {

  if (this.index >= this.max) {
    return null;
  }

  var overflow = count - this.left,
    use = this.left < count ? this.left : count,
    shift = this.left - use;

  var val = (this.value & maskTable[this.left]) >> shift;
  this.left -= use;

  if (this.left === 0) {

    this.value = this.buffer[++this.index];
    this.left = 8;

    if (overflow > 0) {
      val = val << overflow | this.read(overflow);
    }

  }

  return val;
};

BitWorker.prototype.writePadd = function () {
  if (this.left !== 8) {
    this.buffer[this.index++] = this.value;
    this.value = 0;
    this.left = 8;
  }
};

BitWorker.prototype.readPadd = function () {
  var value = this.value;
  if (this.left !== 8) {
    this.index++;
    this.value = 0;
    this.left = 8;
  }
  return value;
};


BitWorker.prototype.writeBuffer = function(source) {
  this.writePadd();
  source.copy(this.buffer, this.index);
  this.index += source.length;
};

BitWorker.prototype.readBuffer = function (count) {
  this.readPadd();

  var data = this.buffer.slice(this.index, this.index + count);

  this.index += count;
  this.value = this.buffer[this.index];

  return data;
};

BitWorker.prototype.writeUtf8 = function(str) {
  var length = Buffer.byteLength(str, 'utf8');
  this.writePadd();
  this.buffer.write(str, this.index, length, 'utf8');
  this.index += length;
};

BitWorker.prototype.readUtf8 = function(length) {
  this.readPadd();
  var str = this.buffer.toString('utf8', this.index, this.index + length);
  this.index += length;
  this.value = this.buffer[this.index];
  return str;
};

BitWorker.copyFromBuffer = {
  UInt8: 1,
  UInt16LE: 2,
  UInt16BE: 2,
  UInt32LE: 4,
  UInt32BE: 4,
  Int8: 1,
  Int16LE: 2,
  Int16BE: 2,
  Int32LE: 4,
  Int32BE: 4,
  FloatLE: 4,
  FloatBE: 4,
  DoubleLE: 8,
  DoubleBE: 8
};

Object.keys(BitWorker.copyFromBuffer).forEach(function(type) {
  var size = BitWorker.copyFromBuffer[type];
  BitWorker.prototype['write' + type] = function(value, noAssert) {
    var arr = new Array(size);
    Buffer.prototype['write' + type].call(arr, value, 0, noAssert);
    for(var i = 0; i < size; i++) {
      this.write(arr[i], 8);
    }
  };
});






Object.keys(BitWorker.copyFromBuffer).forEach(function(type) {
  var size = BitWorker.copyFromBuffer[type];
  BitWorker.prototype['read' + type] = function(noAssert) {
    var arr = new Array(size);
    for(var i = 0; i < size; i++) {
      arr[i] = this.read(8);
    }
    return Buffer.prototype['read' + type].call(arr, 0, noAssert);
  };
});


module.exports = BitWorker;
