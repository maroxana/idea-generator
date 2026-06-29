function windowKey(value, bucketMs, now) {
  const bucket = Math.floor(now / bucketMs);
  return `${value}:${bucket}`;
}

export class RateLimiter {
  constructor(config) {
    this.config = config;
    this.bucketCounts = new Map();
    this.emailLastSeen = new Map();
    this.blocks = new Map();
  }

  prune(now) {
    for (const [key, data] of this.bucketCounts) {
      if (data.expiresAt <= now) this.bucketCounts.delete(key);
    }
    for (const [key, expiresAt] of this.blocks) {
      if (expiresAt <= now) this.blocks.delete(key);
    }
  }

  hitWindow(prefix, value, limit, windowMs, now) {
    const key = `${prefix}:${windowKey(value, windowMs, now)}`;
    const existing = this.bucketCounts.get(key) || { count: 0, expiresAt: now + windowMs };
    existing.count += 1;
    this.bucketCounts.set(key, existing);

    const remaining = Math.max(limit - existing.count, 0);
    return {
      allowed: existing.count <= limit,
      retryAfterMs: Math.max(existing.expiresAt - now, 0),
      remaining
    };
  }

  check({ ip, email, fingerprint, now }) {
    this.prune(now);

    const blockKey = `ip:${ip}`;
    const blockedUntil = this.blocks.get(blockKey);
    if (blockedUntil && blockedUntil > now) {
      return { allowed: false, reason: "temporarily_blocked", retryAfterMs: blockedUntil - now };
    }

    const ipBurst = this.hitWindow("ip10m", ip, this.config.perIpLimit, this.config.perIpWindowMs, now);
    if (!ipBurst.allowed) {
      return { allowed: false, reason: "ip_burst_limit", retryAfterMs: ipBurst.retryAfterMs };
    }

    const ipHour = this.hitWindow("ip1h", ip, this.config.perIpHourLimit, this.config.perIpHourWindowMs, now);
    if (!ipHour.allowed) {
      return { allowed: false, reason: "ip_hour_limit", retryAfterMs: ipHour.retryAfterMs };
    }

    const fpLimit = this.hitWindow("fp", fingerprint, this.config.perFingerprintLimit, this.config.perFingerprintWindowMs, now);
    if (!fpLimit.allowed) {
      return { allowed: false, reason: "fingerprint_limit", retryAfterMs: fpLimit.retryAfterMs };
    }

    const lastEmailAt = this.emailLastSeen.get(email);
    if (lastEmailAt && now - lastEmailAt < this.config.perEmailCooldownMs) {
      return {
        allowed: false,
        reason: "email_cooldown",
        retryAfterMs: this.config.perEmailCooldownMs - (now - lastEmailAt)
      };
    }

    return { allowed: true, reason: "ok", retryAfterMs: 0 };
  }

  markSuccessfulEmail(email, now) {
    this.emailLastSeen.set(email, now);
  }

  markSuspiciousIp(ip, now) {
    const strike = this.hitWindow("ip-suspicious", ip, 1000, this.config.perIpHourWindowMs, now);
    if (strike.remaining <= this.config.perIpHourLimit - 20) {
      this.blocks.set(`ip:${ip}`, now + this.config.perIpHourWindowMs);
    }
  }
}
