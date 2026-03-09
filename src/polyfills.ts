import { Buffer } from 'buffer';

// Node 25 no longer exposes SlowBuffer, but older jwt deps still read it.
const bufferAny = Buffer as any;
if (!bufferAny.SlowBuffer) {
  bufferAny.SlowBuffer = Buffer;
}

// Older jwt deps also read SlowBuffer.prototype.equal at module load time.
if (!(Buffer.prototype as any).equal) {
  (Buffer.prototype as any).equal = function equal(other: Buffer): boolean {
    return Buffer.compare(this, other) === 0;
  };
}
