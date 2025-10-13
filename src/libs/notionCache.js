// Simple in-memory cache for Notion API responses
class NotionCache {
  constructor(ttl = 5 * 60 * 1000) { // 5 minutes default TTL
    this.cache = new Map()
    this.ttl = ttl
  }

  get(key) {
    const item = this.cache.get(key)
    if (!item) return null
    
    if (Date.now() > item.expiry) {
      this.cache.delete(key)
      return null
    }
    
    console.log(`✅ Cache hit for: ${key}`)
    return item.data
  }

  set(key, data) {
    console.log(`💾 Caching data for: ${key}`)
    this.cache.set(key, {
      data,
      expiry: Date.now() + this.ttl
    })
  }

  clear() {
    this.cache.clear()
  }
}

// Export singleton instance
const notionCache = new NotionCache(10 * 60 * 1000) // 10 minutes cache

module.exports = { notionCache }
