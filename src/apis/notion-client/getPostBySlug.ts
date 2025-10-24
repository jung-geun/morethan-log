import { TPost } from "src/types"
import { getPosts } from "./getPosts"

/**
 * Get a single post by slug from Notion
 * This function searches through all posts to find one with matching slug
 */
export const getPostBySlug = async (slug: string): Promise<TPost | null> => {
  if (process.env.NODE_ENV !== 'production') {
    console.log(`🔍 Searching for post with slug: ${slug}`)
  }
  
  // Get all posts and find the one with matching slug
  // Force a fresh fetch to avoid returning stale cached posts when searching by slug
  const posts = await getPosts({ bypassCache: true })
  
  // Search for post with matching slug
  const post = posts.find(p => p.slug === slug)
  
  if (post) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`✅ Found post with slug: ${slug}`)
    }
    return post
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log(`❌ No post found with slug: ${slug}`)
  }
  return null
}