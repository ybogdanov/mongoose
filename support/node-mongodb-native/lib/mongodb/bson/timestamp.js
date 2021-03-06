// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//     http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

// Copyright 2009 Google Inc. All Rights Reserved

/**
 * @fileoverview Defines a exports.Timestamp class for representing a 64-bit two's-complement
 * integer value, which faithfully simulates the behavior of a Java "Timestamp". This
 * implementation is derived from exports.TimestampLib in GWT.
 *
 */

/**
 * Constructs a 64-bit two's-complement integer, given its low and high 32-bit
 * values as *signed* integers.  See the from* functions below for more
 * convenient ways of constructing exports.Timestamps.
 *
 * The internal representation of a Timestamp is the two given signed, 32-bit values.
 * We use 32-bit pieces because these are the size of integers on which
 * Javascript performs bit-operations.  For operations like addition and
 * multiplication, we split each number into 16-bit pieces, which can easily be
 * multiplied within Javascript's floating-point representation without overflow
 * or change in sign.
 *
 * In the algorithms below, we frequently reduce the negative case to the
 * positive case by negating the input(s) and then post-processing the result.
 * Note that we must ALWAYS check specially whether those values are MIN_VALUE
 * (-2^63) because -MIN_VALUE == MIN_VALUE (since 2^63 cannot be represented as
 * a positive number, it overflows back into a negative).  Not handling this
 * case would often result in infinite recursion.
 *
 * @param {number} low  The low (signed) 32 bits of the Timestamp.
 * @param {number} high  The high (signed) 32 bits of the Timestamp.
 * @constructor
 */
exports.Timestamp = function(low, high) {
  /**
   * @type {number}
   * @private
   */
  this.low_ = low | 0;  // force into 32 signed bits.

  /**
   * @type {number}
   * @private
   */
  this.high_ = high | 0;  // force into 32 signed bits.
};


// NOTE: Common constant values ZERO, ONE, NEG_ONE, etc. are defined below the
// from* methods on which they depend.


/**
 * A cache of the exports.Timestamp representations of small integer values.
 * @type {Object}
 * @private
 */
exports.Timestamp.INT_CACHE_ = {};


/**
 * Returns a exports.Timestamp representing the given (32-bit) integer value.
 * @param {number} value The 32-bit integer in question.
 * @return {exports.Timestamp} The corresponding exports.Timestamp value.
 */
exports.Timestamp.fromInt = function(value) {
  if (-128 <= value && value < 128) {
    var cachedObj = exports.Timestamp.INT_CACHE_[value];
    if (cachedObj) {
      return cachedObj;
    }
  }

  var obj = new exports.Timestamp(value | 0, value < 0 ? -1 : 0);
  if (-128 <= value && value < 128) {
    exports.Timestamp.INT_CACHE_[value] = obj;
  }
  return obj;
};


/**
 * Returns a exports.Timestamp representing the given value, provided that it is a finite
 * number.  Otherwise, zero is returned.
 * @param {number} value The number in question.
 * @return {exports.Timestamp} The corresponding exports.Timestamp value.
 */
exports.Timestamp.fromNumber = function(value) {
  if (isNaN(value) || !isFinite(value)) {
    return exports.Timestamp.ZERO;
  } else if (value <= -exports.Timestamp.TWO_PWR_63_DBL_) {
    return exports.Timestamp.MIN_VALUE;
  } else if (value + 1 >= exports.Timestamp.TWO_PWR_63_DBL_) {
    return exports.Timestamp.MAX_VALUE;
  } else if (value < 0) {
    return exports.Timestamp.fromNumber(-value).negate();
  } else {
    return new exports.Timestamp(
               (value % exports.Timestamp.TWO_PWR_32_DBL_) | 0,
               (value / exports.Timestamp.TWO_PWR_32_DBL_) | 0);
  }
};


/**
 * Returns a exports.Timestamp representing the 64-bit integer that comes by concatenating
 * the given high and low bits.  Each is assumed to use 32 bits.
 * @param {number} lowBits The low 32-bits.
 * @param {number} highBits The high 32-bits.
 * @return {exports.Timestamp} The corresponding exports.Timestamp value.
 */
exports.Timestamp.fromBits = function(lowBits, highBits) {
  return new exports.Timestamp(lowBits, highBits);
};


/**
 * Returns a exports.Timestamp representation of the given string, written using the given
 * radix.
 * @param {string} str The textual representation of the exports.Timestamp.
 * @param {number} opt_radix The radix in which the text is written.
 * @return {exports.Timestamp} The corresponding exports.Timestamp value.
 */
exports.Timestamp.fromString = function(str, opt_radix) {
  if (str.length == 0) {
    throw Error('number format error: empty string');
  }

  var radix = opt_radix || 10;
  if (radix < 2 || 36 < radix) {
    throw Error('radix out of range: ' + radix);
  }

  if (str.charAt(0) == '-') {
    return exports.Timestamp.fromString(str.substring(1), radix).negate();
  } else if (str.indexOf('-') >= 0) {
    throw Error('number format error: interior "-" character: ' + str);
  }

  // Do several (8) digits each time through the loop, so as to
  // minimize the calls to the very expensive emulated div.
  var radixToPower = exports.Timestamp.fromNumber(Math.pow(radix, 8));

  var result = exports.Timestamp.ZERO;
  for (var i = 0; i < str.length; i += 8) {
    var size = Math.min(8, str.length - i);
    var value = parseInt(str.substring(i, i + size), radix);
    if (size < 8) {
      var power = exports.Timestamp.fromNumber(Math.pow(radix, size));
      result = result.multiply(power).add(exports.Timestamp.fromNumber(value));
    } else {
      result = result.multiply(radixToPower);
      result = result.add(exports.Timestamp.fromNumber(value));
    }
  }
  return result;
};


// NOTE: the compiler should inline these constant values below and then remove
// these variables, so there should be no runtime penalty for these.


/**
 * Number used repeated below in calculations.  This must appear before the
 * first call to any from* function below.
 * @type {number}
 * @private
 */
exports.Timestamp.TWO_PWR_16_DBL_ = 1 << 16;

/**
 * @type {number}
 * @private
 */
exports.Timestamp.TWO_PWR_24_DBL_ = 1 << 24;

/**
 * @type {number}
 * @private
 */
exports.Timestamp.TWO_PWR_32_DBL_ =
    exports.Timestamp.TWO_PWR_16_DBL_ * exports.Timestamp.TWO_PWR_16_DBL_;

/**
 * @type {number}
 * @private
 */
exports.Timestamp.TWO_PWR_31_DBL_ =
    exports.Timestamp.TWO_PWR_32_DBL_ / 2;

/**
 * @type {number}
 * @private
 */
exports.Timestamp.TWO_PWR_48_DBL_ =
    exports.Timestamp.TWO_PWR_32_DBL_ * exports.Timestamp.TWO_PWR_16_DBL_;

/**
 * @type {number}
 * @private
 */
exports.Timestamp.TWO_PWR_64_DBL_ =
    exports.Timestamp.TWO_PWR_32_DBL_ * exports.Timestamp.TWO_PWR_32_DBL_;

/**
 * @type {number}
 * @private
 */
exports.Timestamp.TWO_PWR_63_DBL_ =
    exports.Timestamp.TWO_PWR_64_DBL_ / 2;


/** @type {exports.Timestamp} */
exports.Timestamp.ZERO = exports.Timestamp.fromInt(0);

/** @type {exports.Timestamp} */
exports.Timestamp.ONE = exports.Timestamp.fromInt(1);

/** @type {exports.Timestamp} */
exports.Timestamp.NEG_ONE = exports.Timestamp.fromInt(-1);

/** @type {exports.Timestamp} */
exports.Timestamp.MAX_VALUE =
    exports.Timestamp.fromBits(0xFFFFFFFF | 0, 0x7FFFFFFF | 0);

/** @type {exports.Timestamp} */
exports.Timestamp.MIN_VALUE = exports.Timestamp.fromBits(0, 0x80000000 | 0);


/**
 * @type {exports.Timestamp}
 * @private
 */
exports.Timestamp.TWO_PWR_24_ = exports.Timestamp.fromInt(1 << 24);


/** @return {number} The value, assuming it is a 32-bit integer. */
exports.Timestamp.prototype.toInt = function() {
  return this.low_;
};


/** @return {number} The closest floating-point representation to this value. */
exports.Timestamp.prototype.toNumber = function() {
  return this.high_ * exports.Timestamp.TWO_PWR_32_DBL_ +
         this.getLowBitsUnsigned();
};

/** convert code to JSON **/
exports.Timestamp.prototype.toJSON = function() {
  return this.toString();
}

/**
 * @param {number} opt_radix The radix in which the text should be written.
 * @return {string} The textual representation of this value.
 */
exports.Timestamp.prototype.toString = function(opt_radix) {
  var radix = opt_radix || 10;
  if (radix < 2 || 36 < radix) {
    throw Error('radix out of range: ' + radix);
  }

  if (this.isZero()) {
    return '0';
  }

  if (this.isNegative()) {
    if (this.equals(exports.Timestamp.MIN_VALUE)) {
      // We need to change the exports.Timestamp value before it can be negated, so we remove
      // the bottom-most digit in this base and then recurse to do the rest.
      var radixTimestamp = exports.Timestamp.fromNumber(radix);
      var div = this.div(radixTimestamp);
      var rem = div.multiply(radixTimestamp).subtract(this);
      return div.toString(radix) + rem.toInt().toString(radix);
    } else {
      return '-' + this.negate().toString(radix);
    }
  }

  // Do several (6) digits each time through the loop, so as to
  // minimize the calls to the very expensive emulated div.
  var radixToPower = exports.Timestamp.fromNumber(Math.pow(radix, 6));

  var rem = this;
  var result = '';
  while (true) {
    var remDiv = rem.div(radixToPower);
    var intval = rem.subtract(remDiv.multiply(radixToPower)).toInt();
    var digits = intval.toString(radix);

    rem = remDiv;
    if (rem.isZero()) {
      return digits + result;
    } else {
      while (digits.length < 6) {
        digits = '0' + digits;
      }
      result = '' + digits + result;
    }
  }
};


/** @return {number} The high 32-bits as a signed value. */
exports.Timestamp.prototype.getHighBits = function() {
  return this.high_;
};


/** @return {number} The low 32-bits as a signed value. */
exports.Timestamp.prototype.getLowBits = function() {
  return this.low_;
};


/** @return {number} The low 32-bits as an unsigned value. */
exports.Timestamp.prototype.getLowBitsUnsigned = function() {
  return (this.low_ >= 0) ?
      this.low_ : exports.Timestamp.TWO_PWR_32_DBL_ + this.low_;
};


/**
 * @return {number} Returns the number of bits needed to represent the absolute
 *     value of this exports.Timestamp.
 */
exports.Timestamp.prototype.getNumBitsAbs = function() {
  if (this.isNegative()) {
    if (this.equals(exports.Timestamp.MIN_VALUE)) {
      return 64;
    } else {
      return this.negate().getNumBitsAbs();
    }
  } else {
    var val = this.high_ != 0 ? this.high_ : this.low_;
    for (var bit = 31; bit > 0; bit--) {
      if ((val & (1 << bit)) != 0) {
        break;
      }
    }
    return this.high_ != 0 ? bit + 33 : bit + 1;
  }
};


/** @return {boolean} Whether this value is zero. */
exports.Timestamp.prototype.isZero = function() {
  return this.high_ == 0 && this.low_ == 0;
};


/** @return {boolean} Whether this value is negative. */
exports.Timestamp.prototype.isNegative = function() {
  return this.high_ < 0;
};


/** @return {boolean} Whether this value is odd. */
exports.Timestamp.prototype.isOdd = function() {
  return (this.low_ & 1) == 1;
};


/**
 * @param {exports.Timestamp} other exports.Timestamp to compare against.
 * @return {boolean} Whether this exports.Timestamp equals the other.
 */
exports.Timestamp.prototype.equals = function(other) {
  return (this.high_ == other.high_) && (this.low_ == other.low_);
};


/**
 * @param {exports.Timestamp} other exports.Timestamp to compare against.
 * @return {boolean} Whether this exports.Timestamp does not equal the other.
 */
exports.Timestamp.prototype.notEquals = function(other) {
  return (this.high_ != other.high_) || (this.low_ != other.low_);
};


/**
 * @param {exports.Timestamp} other exports.Timestamp to compare against.
 * @return {boolean} Whether this exports.Timestamp is less than the other.
 */
exports.Timestamp.prototype.lessThan = function(other) {
  return this.compare(other) < 0;
};


/**
 * @param {exports.Timestamp} other exports.Timestamp to compare against.
 * @return {boolean} Whether this exports.Timestamp is less than or equal to the other.
 */
exports.Timestamp.prototype.lessThanOrEqual = function(other) {
  return this.compare(other) <= 0;
};


/**
 * @param {exports.Timestamp} other exports.Timestamp to compare against.
 * @return {boolean} Whether this exports.Timestamp is greater than the other.
 */
exports.Timestamp.prototype.greaterThan = function(other) {
  return this.compare(other) > 0;
};


/**
 * @param {exports.Timestamp} other exports.Timestamp to compare against.
 * @return {boolean} Whether this exports.Timestamp is greater than or equal to the other.
 */
exports.Timestamp.prototype.greaterThanOrEqual = function(other) {
  return this.compare(other) >= 0;
};


/**
 * Compares this exports.Timestamp with the given one.
 * @param {exports.Timestamp} other exports.Timestamp to compare against.
 * @return {number} 0 if they are the same, 1 if the this is greater, and -1
 *     if the given one is greater.
 */
exports.Timestamp.prototype.compare = function(other) {
  if (this.equals(other)) {
    return 0;
  }

  var thisNeg = this.isNegative();
  var otherNeg = other.isNegative();
  if (thisNeg && !otherNeg) {
    return -1;
  }
  if (!thisNeg && otherNeg) {
    return 1;
  }

  // at this point, the signs are the same, so subtraction will not overflow
  if (this.subtract(other).isNegative()) {
    return -1;
  } else {
    return 1;
  }
};


/** @return {exports.Timestamp} The negation of this value. */
exports.Timestamp.prototype.negate = function() {
  if (this.equals(exports.Timestamp.MIN_VALUE)) {
    return exports.Timestamp.MIN_VALUE;
  } else {
    return this.not().add(exports.Timestamp.ONE);
  }
};


/**
 * Returns the sum of this and the given exports.Timestamp.
 * @param {exports.Timestamp} other exports.Timestamp to add to this one.
 * @return {exports.Timestamp} The sum of this and the given exports.Timestamp.
 */
exports.Timestamp.prototype.add = function(other) {
  // Divide each number into 4 chunks of 16 bits, and then sum the chunks.

  var a48 = this.high_ >>> 16;
  var a32 = this.high_ & 0xFFFF;
  var a16 = this.low_ >>> 16;
  var a00 = this.low_ & 0xFFFF;

  var b48 = other.high_ >>> 16;
  var b32 = other.high_ & 0xFFFF;
  var b16 = other.low_ >>> 16;
  var b00 = other.low_ & 0xFFFF;

  var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
  c00 += a00 + b00;
  c16 += c00 >>> 16;
  c00 &= 0xFFFF;
  c16 += a16 + b16;
  c32 += c16 >>> 16;
  c16 &= 0xFFFF;
  c32 += a32 + b32;
  c48 += c32 >>> 16;
  c32 &= 0xFFFF;
  c48 += a48 + b48;
  c48 &= 0xFFFF;
  return exports.Timestamp.fromBits((c16 << 16) | c00, (c48 << 16) | c32);
};


/**
 * Returns the difference of this and the given exports.Timestamp.
 * @param {exports.Timestamp} other exports.Timestamp to subtract from this.
 * @return {exports.Timestamp} The difference of this and the given exports.Timestamp.
 */
exports.Timestamp.prototype.subtract = function(other) {
  return this.add(other.negate());
};


/**
 * Returns the product of this and the given Timestamp.
 * @param {exports.Timestamp} other exports.Timestamp to multiply with this.
 * @return {exports.Timestamp} The product of this and the other.
 */
exports.Timestamp.prototype.multiply = function(other) {
  if (this.isZero()) {
    return exports.Timestamp.ZERO;
  } else if (other.isZero()) {
    return exports.Timestamp.ZERO;
  }

  if (this.equals(exports.Timestamp.MIN_VALUE)) {
    return other.isOdd() ? exports.Timestamp.MIN_VALUE : exports.Timestamp.ZERO;
  } else if (other.equals(exports.Timestamp.MIN_VALUE)) {
    return this.isOdd() ? exports.Timestamp.MIN_VALUE : exports.Timestamp.ZERO;
  }

  if (this.isNegative()) {
    if (other.isNegative()) {
      return this.negate().multiply(other.negate());
    } else {
      return this.negate().multiply(other).negate();
    }
  } else if (other.isNegative()) {
    return this.multiply(other.negate()).negate();
  }

  // If both Timestamps are small, use float multiplication
  if (this.lessThan(exports.Timestamp.TWO_PWR_24_) &&
      other.lessThan(exports.Timestamp.TWO_PWR_24_)) {
    return exports.Timestamp.fromNumber(this.toNumber() * other.toNumber());
  }

  // Divide each Timestamp into 4 chunks of 16 bits, and then add up 4x4 products.
  // We can skip products that would overflow.

  var a48 = this.high_ >>> 16;
  var a32 = this.high_ & 0xFFFF;
  var a16 = this.low_ >>> 16;
  var a00 = this.low_ & 0xFFFF;

  var b48 = other.high_ >>> 16;
  var b32 = other.high_ & 0xFFFF;
  var b16 = other.low_ >>> 16;
  var b00 = other.low_ & 0xFFFF;

  var c48 = 0, c32 = 0, c16 = 0, c00 = 0;
  c00 += a00 * b00;
  c16 += c00 >>> 16;
  c00 &= 0xFFFF;
  c16 += a16 * b00;
  c32 += c16 >>> 16;
  c16 &= 0xFFFF;
  c16 += a00 * b16;
  c32 += c16 >>> 16;
  c16 &= 0xFFFF;
  c32 += a32 * b00;
  c48 += c32 >>> 16;
  c32 &= 0xFFFF;
  c32 += a16 * b16;
  c48 += c32 >>> 16;
  c32 &= 0xFFFF;
  c32 += a00 * b32;
  c48 += c32 >>> 16;
  c32 &= 0xFFFF;
  c48 += a48 * b00 + a32 * b16 + a16 * b32 + a00 * b48;
  c48 &= 0xFFFF;
  return exports.Timestamp.fromBits((c16 << 16) | c00, (c48 << 16) | c32);
};


/**
 * Returns this exports.Timestamp divided by the given one.
 * @param {exports.Timestamp} other exports.Timestamp by which to divide.
 * @return {exports.Timestamp} This exports.Timestamp divided by the given one.
 */
exports.Timestamp.prototype.div = function(other) {
  if (other.isZero()) {
    throw Error('division by zero');
  } else if (this.isZero()) {
    return exports.Timestamp.ZERO;
  }

  if (this.equals(exports.Timestamp.MIN_VALUE)) {
    if (other.equals(exports.Timestamp.ONE) ||
        other.equals(exports.Timestamp.NEG_ONE)) {
      return exports.Timestamp.MIN_VALUE;  // recall that -MIN_VALUE == MIN_VALUE
    } else if (other.equals(exports.Timestamp.MIN_VALUE)) {
      return exports.Timestamp.ONE;
    } else {
      // At this point, we have |other| >= 2, so |this/other| < |MIN_VALUE|.
      var halfThis = this.shiftRight(1);
      var approx = halfThis.div(other).shiftLeft(1);
      if (approx.equals(exports.Timestamp.ZERO)) {
        return other.isNegative() ? exports.Timestamp.ONE : exports.Timestamp.NEG_ONE;
      } else {
        var rem = this.subtract(other.multiply(approx));
        var result = approx.add(rem.div(other));
        return result;
      }
    }
  } else if (other.equals(exports.Timestamp.MIN_VALUE)) {
    return exports.Timestamp.ZERO;
  }

  if (this.isNegative()) {
    if (other.isNegative()) {
      return this.negate().div(other.negate());
    } else {
      return this.negate().div(other).negate();
    }
  } else if (other.isNegative()) {
    return this.div(other.negate()).negate();
  }

  // Repeat the following until the remainder is less than other:  find a
  // floating-point that approximates remainder / other *from below*, add this
  // into the result, and subtract it from the remainder.  It is critical that
  // the approximate value is less than or equal to the real value so that the
  // remainder never becomes negative.
  var res = exports.Timestamp.ZERO;
  var rem = this;
  while (rem.greaterThanOrEqual(other)) {
    // Approximate the result of division. This may be a little greater or
    // smaller than the actual value.
    var approx = Math.max(1, Math.floor(rem.toNumber() / other.toNumber()));

    // We will tweak the approximate result by changing it in the 48-th digit or
    // the smallest non-fractional digit, whichever is larger.
    var log2 = Math.ceil(Math.log(approx) / Math.LN2);
    var delta = (log2 <= 48) ? 1 : Math.pow(2, log2 - 48);

    // Decrease the approximation until it is smaller than the remainder.  Note
    // that if it is too large, the product overflows and is negative.
    var approxRes = exports.Timestamp.fromNumber(approx);
    var approxRem = approxRes.multiply(other);
    while (approxRem.isNegative() || approxRem.greaterThan(rem)) {
      approx -= delta;
      approxRes = exports.Timestamp.fromNumber(approx);
      approxRem = approxRes.multiply(other);
    }

    // We know the answer can't be zero... and actually, zero would cause
    // infinite recursion since we would make no progress.
    if (approxRes.isZero()) {
      approxRes = exports.Timestamp.ONE;
    }

    res = res.add(approxRes);
    rem = rem.subtract(approxRem);
  }
  return res;
};


/**
 * Returns this exports.Timestamp modulo the given one.
 * @param {exports.Timestamp} other exports.Timestamp by which to mod.
 * @return {exports.Timestamp} This exports.Timestamp modulo the given one.
 */
exports.Timestamp.prototype.modulo = function(other) {
  return this.subtract(this.div(other).multiply(other));
};


/** @return {exports.Timestamp} The bitwise-NOT of this value. */
exports.Timestamp.prototype.not = function() {
  return exports.Timestamp.fromBits(~this.low_, ~this.high_);
};


/**
 * Returns the bitwise-AND of this exports.Timestamp and the given one.
 * @param {exports.Timestamp} other The exports.Timestamp with which to AND.
 * @return {exports.Timestamp} The bitwise-AND of this and the other.
 */
exports.Timestamp.prototype.and = function(other) {
  return exports.Timestamp.fromBits(this.low_ & other.low_,
                                 this.high_ & other.high_);
};


/**
 * Returns the bitwise-OR of this exports.Timestamp and the given one.
 * @param {exports.Timestamp} other The exports.Timestamp with which to OR.
 * @return {exports.Timestamp} The bitwise-OR of this and the other.
 */
exports.Timestamp.prototype.or = function(other) {
  return exports.Timestamp.fromBits(this.low_ | other.low_,
                                 this.high_ | other.high_);
};


/**
 * Returns the bitwise-XOR of this exports.Timestamp and the given one.
 * @param {exports.Timestamp} other The exports.Timestamp with which to XOR.
 * @return {exports.Timestamp} The bitwise-XOR of this and the other.
 */
exports.Timestamp.prototype.xor = function(other) {
  return exports.Timestamp.fromBits(this.low_ ^ other.low_,
                                 this.high_ ^ other.high_);
};


/**
 * Returns this exports.Timestamp with bits shifted to the left by the given amount.
 * @param {number} numBits The number of bits by which to shift.
 * @return {exports.Timestamp} This shifted to the left by the given amount.
 */
exports.Timestamp.prototype.shiftLeft = function(numBits) {
  numBits &= 63;
  if (numBits == 0) {
    return this;
  } else {
    var low = this.low_;
    if (numBits < 32) {
      var high = this.high_;
      return exports.Timestamp.fromBits(
                 low << numBits,
                 (high << numBits) | (low >>> (32 - numBits)));
    } else {
      return exports.Timestamp.fromBits(0, low << (numBits - 32));
    }
  }
};


/**
 * Returns this exports.Timestamp with bits shifted to the right by the given amount.
 * @param {number} numBits The number of bits by which to shift.
 * @return {exports.Timestamp} This shifted to the right by the given amount.
 */
exports.Timestamp.prototype.shiftRight = function(numBits) {
  numBits &= 63;
  if (numBits == 0) {
    return this;
  } else {
    var high = this.high_;
    if (numBits < 32) {
      var low = this.low_;
      return exports.Timestamp.fromBits(
                 (low >>> numBits) | (high << (32 - numBits)),
                 high >> numBits);
    } else {
      return exports.Timestamp.fromBits(
                 high >> (numBits - 32),
                 high >= 0 ? 0 : -1);
    }
  }
};


/**
 * Returns this exports.Timestamp with bits shifted to the right by the given amount, with
 * the new top bits matching the current sign bit.
 * @param {number} numBits The number of bits by which to shift.
 * @return {exports.Timestamp} This shifted to the right by the given amount, with
 *     zeros placed into the new leading bits.
 */
exports.Timestamp.prototype.shiftRightUnsigned = function(numBits) {
  numBits &= 63;
  if (numBits == 0) {
    return this;
  } else {
    var high = this.high_;
    if (numBits < 32) {
      var low = this.low_;
      return exports.Timestamp.fromBits(
                 (low >>> numBits) | (high << (32 - numBits)),
                 high >>> numBits);
    } else if (numBits == 32) {
      return exports.Timestamp.fromBits(high, 0);
    } else {
      return exports.Timestamp.fromBits(high >>> (numBits - 32), 0);
    }
  }
};