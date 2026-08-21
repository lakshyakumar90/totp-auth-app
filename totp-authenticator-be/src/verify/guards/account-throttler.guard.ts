import { Injectable } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { Request } from 'express';

/**
 * Rate-limits verify endpoints per-account (rather than per-IP) so a
 * brute-forcer hammering one account can't bypass limits from many IPs.
 * Keys the throttler tracker on the accountId from the request body.
 */
@Injectable()
export class AccountThrottlerGuard extends ThrottlerGuard {
  // eslint-disable-next-line @typescript-eslint/require-await
  protected async getTracker(req: Request): Promise<string> {
    const body = (req.body ?? {}) as {
      accountId?: string;
      account?: string;
      id?: string;
    };
    const accountId = body.accountId ?? body.account ?? body.id;
    if (accountId) return `verify:account:${accountId}`;
    return `verify:ip:${req.ip ?? req.socket?.remoteAddress ?? 'unknown'}`;
  }
}