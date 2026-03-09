const bufferModule = require('buffer');

if (!bufferModule.SlowBuffer) {
  bufferModule.SlowBuffer = bufferModule.Buffer;
}

if (!bufferModule.Buffer.prototype.equal) {
  bufferModule.Buffer.prototype.equal = function equal(other) {
    return bufferModule.Buffer.compare(this, other) === 0;
  };
}
