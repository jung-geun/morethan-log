import { CONFIG } from "site.config"
import { TPosts, TPost } from "src/types"
import { getOfficialNotionClient } from "./notionClient"
import { customMapImageUrl } from "src/libs/utils/notion/customMapImageUrl"
const { notionCache } = require("src/libs/notionCache")

/**
 * Fetch all posts from Notion database using official @notionhq/client
 */
export const getPosts = async (options?: { bypassCache?: boolean }): Promise<TPosts> => {
  const dataSourceId = process.env.NOTION_DATASOURCE_ID
  
  if (!dataSourceId) {
    console.error('❌ NOTION_DATASOURCE_ID is required')
    return []
  }
  
  // Check cache first
  const cacheKey = `posts_${dataSourceId}`
  const bypass = options?.bypassCache === true
  const cachedData = bypass ? null : notionCache.get(cacheKey)
  if (cachedData) {
    if (process.env.NODE_ENV !== 'production') {
      console.log('✅ Cache hit for:', cacheKey)
    }
    return cachedData as TPosts
  }
  
  const notion = getOfficialNotionClient()

  let retryCount = 0
  const maxRetries = 3

  while (retryCount < maxRetries) {
    try {
      console.log(`📡 Fetching posts from Notion DataSource: ${dataSourceId}`)
      
      // Query all pages from the database
      const response = await notion.dataSources.query({
        data_source_id: dataSourceId,
        page_size: 100, // Maximum allowed
      })

      console.log(`✅ Found ${response.results.length} posts`)

      // Transform Notion API response to our post format
      const posts: TPosts = response.results.map((page: any) => {
        const post: any = {
          id: page.id,
        }

        // Extract properties from the page
        if (page.properties) {
          for (const [key, value] of Object.entries(page.properties)) {
            const prop = value as any
            switch (prop.type) {
              case 'title':
                if (prop.title && prop.title.length > 0) {
                  post.title = prop.title[0].plain_text
                }
                break
              case 'rich_text':
                if (prop.rich_text && prop.rich_text.length > 0) {
                  post[key.toLowerCase()] = prop.rich_text[0].plain_text
                }
                break
              case 'select':
                if (prop.select) {
                  if (key === 'Status' || key === 'status') {
                    post.status = [prop.select.name]
                  } else if (key === 'Type' || key === 'type') {
                    // Normalize type to start with uppercase (Post, Paper, Page)
                    const typeValue = prop.select.name
                    const normalizedType = typeValue.charAt(0).toUpperCase() + typeValue.slice(1).toLowerCase()
                    console.log(`🔄 [getPosts] Type normalization: "${typeValue}" -> "${normalizedType}" (slug: ${post.slug})`)
                    post.type = [normalizedType]
                  } else if (key === 'Category' || key === 'category') {
                    post.category = [prop.select.name]  // Array format for consistency
                  }
                }
                break
              case 'multi_select':
                if (prop.multi_select && prop.multi_select.length > 0) {
                  if (key === 'Tags' || key === 'tags') {
                    post.tags = prop.multi_select.map((tag: any) => tag.name)
                  }
                }
                break
              case 'date':
                if (prop.date) {
                  if (key === 'Date' || key === 'date') {
                    post.date = {
                      start_date: prop.date.start,
                    }
                    // Only add end_date if it exists
                    if (prop.date.end) {
                      post.date.end_date = prop.date.end
                    }
                  }
                }
                break
              case 'url':
                if (prop.url) {
                  if (key === 'Slug' || key === 'slug') {
                    post.slug = prop.url
                  } else if (key === 'Thumbnail' || key === 'thumbnail') {
                    try {
                      // Diagnostic: if the Notion-provided URL is an S3 URL but
                      // appears to be missing signature params, record it for
                      // investigation before attempting to proxy.
                      try {
                        if (String(prop.url).includes('amazonaws.com') && !String(prop.url).includes('X-Amz-Signature')) {
                          try {
                            const diagDir = require('path').resolve(process.cwd(), 'logs')
                            if (!require('fs').existsSync(diagDir)) require('fs').mkdirSync(diagDir, { recursive: true })
                            const diagFile = require('path').join(diagDir, 'notion-image-diagnostics.jsonl')
                            const rec = {
                              timestamp: new Date().toISOString(),
                              pageId: page.id,
                              propertyKey: key,
                              rawUrl: String(prop.url).slice(0, 2000)
                            }
                            require('fs').appendFileSync(diagFile, JSON.stringify(rec) + '\n')
                          } catch (e) {
                            console.log('[getPosts] failed to write diagnostic', (e as any).message)
                          }
                        }
                      } catch (e) {
                        // ignore diagnostic failures
                      }

                      post.thumbnail = customMapImageUrl(prop.url)
                    } catch (e) {
                      post.thumbnail = prop.url
                    }
                  }
                }
                break
              case 'files':
                  if (prop.files && prop.files.length > 0) {
                  if (key === 'Thumbnail' || key === 'thumbnail') {
                    const src = prop.files[0].file?.url || prop.files[0].external?.url
                    try {
                      post.thumbnail = src ? customMapImageUrl(src) : src
                    } catch (e) {
                      post.thumbnail = src
                    }
                  }
                }
                break
              case 'checkbox':
                if (key === 'Summary' || key === 'summary') {
                  post.summary = prop.checkbox
                }
                break
            }
          }
        }

        // Add metadata
        post.createdTime = page.created_time
        post.fullWidth = false // Default value

        return post as TPost
      })

      // Filter out posts without 'Public' or 'PublicOnDetail' status
      const publicPosts = posts.filter(post => {
        const status = post.status?.[0]
        const isPublic = status === 'Public' || status === 'PublicOnDetail'
        if (!isPublic && post.slug) {
          console.log(`🔒 [getPosts] Filtered out (not public): slug="${post.slug}", status="${status}"`)
        }
        return isPublic
      })

      // Sort by date (newest first)
      publicPosts.sort((a, b) => {
        const dateA = new Date(a.date?.start_date || a.createdTime || 0)
        const dateB = new Date(b.date?.start_date || b.createdTime || 0)
        return dateB.getTime() - dateA.getTime()
      })

      console.log(`✅ Filtered to ${publicPosts.length} public posts`)

      // Cache the successful result (unless bypass requested)
      if (!bypass) {
        notionCache.set(cacheKey, publicPosts)
      }

      return publicPosts

    } catch (error: any) {
      retryCount++
      console.error(`❌ Notion API attempt ${retryCount}/${maxRetries} failed:`, error.message)

      if (error.code === 'object_not_found') {
        console.error('❌ DataSource not found. Make sure:')
        console.error('   1. NOTION_DATASOURCE_ID is correct')
        console.error('   2. Integration is connected to the database page')
        console.error('   3. Database is shared with the Integration')
        
        // Don't retry for object_not_found errors
        return []
      }

      if (retryCount === maxRetries) {
        console.error('❌ Failed to fetch posts after all retries')
        return []
      }

      // Exponential backoff
      const waitTime = Math.pow(2, retryCount) * 2000
      console.log(`⏳ Waiting ${waitTime / 1000} seconds before retry...`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
  }

  return []
}
