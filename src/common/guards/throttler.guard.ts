import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

// CustomThrottlerGuard limits requests based on client IP.
@Injectable()
export class CustomThrottlerGuard extends ThrottlerGuard {
  protected async getTracker(req: Record<string, any>): Promise<string> {
    const ip = req.ip || req.connection?.remoteAddress || 'unknown';
    return ip;
  }
}
