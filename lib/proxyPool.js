let idx = 0;

class ProxyPool {
  constructor(proxies = []) {
    this.proxies = proxies;
  }

  next() {
    if (!this.proxies.length) return null;
    idx = (idx + 1) % this.proxies.length;
    return this.proxies[idx];
  }

  // optional: mark bad proxy and remove or delay re-use
  markBad(proxy) {
    // implement backoff for bad proxies if want
    console.warn("Mark bad proxy", proxy);
  }
}

export default ProxyPool;
