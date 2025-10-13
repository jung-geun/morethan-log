import { CONFIG } from "site.config"
import { TPosts, TPost } from "src/types"
import { getOfficialNotionClient } from "./notionClient"
const { notionCache } = require("src/libs/notionCache")

/**
 * Fetch all posts from Notion database using official @notionhq/client
 */
export const getPosts = async (): Promise<TPosts> => {
  const dataSourceId = process.env.NOTION_DATASOURCE_ID
  
  if (!dataSourceId) {
    console.error('❌ NOTION_DATASOURCE_ID is required')
    return []
  }
  
  // Check cache first
  const cacheKey = `posts_${dataSourceId}`
  const cachedData = notionCache.get(cacheKey)
  if (cachedData) {
    console.log('✅ Using cached posts data')
    return cachedData
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
                    post.type = [prop.select.name]
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
                    post.thumbnail = prop.url
                  }
                }
                break
              case 'files':
                if (prop.files && prop.files.length > 0) {
                  if (key === 'Thumbnail' || key === 'thumbnail') {
                    post.thumbnail = prop.files[0].file?.url || prop.files[0].external?.url
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

      // Filter out posts without 'Public' status
      const publicPosts = posts.filter(post => 
        post.status && post.status.includes('Public')
      )

      // Sort by date (newest first)
      publicPosts.sort((a, b) => {
        const dateA = new Date(a.date?.start_date || a.createdTime || 0)
        const dateB = new Date(b.date?.start_date || b.createdTime || 0)
        return dateB.getTime() - dateA.getTime()
      })

      console.log(`✅ Filtered to ${publicPosts.length} public posts`)

      // Cache the successful result
      notionCache.set(cacheKey, publicPosts)

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
