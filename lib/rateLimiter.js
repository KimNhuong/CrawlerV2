export class TokenBucket {
  constructor({ capacity = 10, refillRate = 1 } = {}) {
    // capacity: max tokens, refillRate: tokens per second
    this.capacity = capacity;
    this.tokens = capacity;
    this.refillRate = refillRate;
    this.last = Date.now();
  }

  _refill() {
    const now = Date.now();
    const delta = (now - this.last) / 1000;
    this.tokens = Math.min(this.capacity, this.tokens + delta * this.refillRate);
    this.last = now;
  }

  removeTokens(count = 1) {
    this._refill();
    if (this.tokens >= count) {
      this.tokens -= count;
      return true;
    }
    return false;
  }

  async waitForToken() {
    while (true) {
      if (this.removeTokens(1)) return;
      await new Promise(r => setTimeout(r, 200)); // jitter can be added
    }
  }
}
