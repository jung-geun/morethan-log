import { CONFIG } from "site.config"
import { NotionAPI } from "notion-client"
import { idToUuid } from "notion-utils"

import getAllPageIds from "src/libs/utils/notion/getAllPageIds"
import getPageProperties from "src/libs/utils/notion/getPageProperties"
import { TPost } from "src/types"

/**
 * Get a single post by slug from Notion
 * This function searches through all posts to find one with matching slug
 */
export const getPostBySlug = async (slug: string): Promise<TPost | null> => {
  let id = CONFIG.notionConfig.pageId as string
  const api = new NotionAPI()

  // Enhanced retry logic for API calls
  let response
  let retryCount = 0
  const maxRetries = 5

  while (retryCount < maxRetries) {
    try {
      response = await api.getPage(id)
      break
    } catch (error: any) {
      retryCount++
      console.warn(`getPostBySlug attempt ${retryCount} failed:`, error.message)
      
      // Special handling for 406 errors
      if (error.response?.status === 406) {
        console.warn(`Notion API returned 406 (Not Acceptable) - attempt ${retryCount}`)
        if (retryCount === maxRetries) {
          console.error('getPostBySlug 406 error persists after all retries')
          return null
        }
        // Longer wait for 406 errors
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 2000))
      } else if (error.response?.status === 502) {
        console.warn(`Notion API returned 502 (Bad Gateway) - attempt ${retryCount}`)
        if (retryCount === maxRetries) {
          console.error('getPostBySlug 502 error persists after all retries')
          return null
        }
        // Wait for 502 errors
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1500))
      } else {
        if (retryCount === maxRetries) {
          console.error('getPostBySlug failed after all retries')
          return null
        }
        // Standard exponential backoff for other errors
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000))
      }
    }
  }

  if (!response) {
    console.error('Failed to get response from Notion API for getPostBySlug')
    return null
  }

  id = idToUuid(id)
  const collection = Object.values(response.collection)[0]?.value
  const block = response.block
  const schema = collection?.schema

  const rawMetadata = block[id].value

  // Check Type
  if (
    rawMetadata?.type !== "collection_view_page" &&
    rawMetadata?.type !== "collection_view"
  ) {
    return null
  }

  // Construct Data and search for matching slug
  const pageIds = getAllPageIds(response)
  
  for (let i = 0; i < pageIds.length; i++) {
    const pageId = pageIds[i]
    try {
      const properties = (await getPageProperties(pageId, block, schema)) || null
      
      if (properties) {
        // Add fullwidth, createdtime to properties
        properties.createdTime = new Date(
          block[pageId].value?.created_time
        ).toString()
        properties.fullWidth =
          (block[pageId].value?.format as any)?.page_full_width ?? false

        // Check if this post matches the slug
        if (properties.slug === slug) {
          console.log(`Found post with slug: ${slug}`)
          return properties as TPost
        }
      }
    } catch (error) {
      console.warn(`Failed to get properties for page ${pageId}:`, error)
      continue
    }
  }

  console.log(`No post found with slug: ${slug}`)
  return null
}