import { TPost } from "src/types"
import { getPosts } from "./getPosts"

/**
 * Get a single post by slug from Notion
 * This function searches through all posts to find one with matching slug
 */
export const getPostBySlug = async (slug: string): Promise<TPost | null> => {
  console.log(`🔍 Searching for post with slug: ${slug}`)
  
  // Get all posts and find the one with matching slug
  const posts = await getPosts()
  
  // Search for post with matching slug
  const post = posts.find(p => p.slug === slug)
  
  if (post) {
    console.log(`✅ Found post with slug: ${slug}`)
    return post
  }

  console.log(`❌ No post found with slug: ${slug}`)
  return null
}