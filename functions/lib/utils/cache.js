"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.servicesCache = exports.zonesCache = exports.MemoryCache = void 0;
class MemoryCache {
    constructor(defaultTtlSeconds = 60) {
        this.cache = new Map();
        this.defaultTtlMs = defaultTtlSeconds * 1000;
    }
    get(key) {
        const item = this.cache.get(key);
        if (!item)
            return null;
        if (Date.now() > item.expiresAt) {
            this.cache.delete(key);
            return null; // Expired
        }
        return item.data;
    }
    set(key, data, ttlSeconds) {
        const ttl = ttlSeconds ? ttlSeconds * 1000 : this.defaultTtlMs;
        this.cache.set(key, {
            data,
            expiresAt: Date.now() + ttl,
        });
    }
    delete(key) {
        this.cache.delete(key);
    }
    clear() {
        this.cache.clear();
    }
}
exports.MemoryCache = MemoryCache;
// Global instances for reuse across function invocations
exports.zonesCache = new MemoryCache(60); // 60 seconds
exports.servicesCache = new MemoryCache(60); // 60 seconds
//# sourceMappingURL=cache.js.map