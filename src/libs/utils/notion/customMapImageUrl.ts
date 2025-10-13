import { Block } from 'notion-types'

export const customMapImageUrl = (url: string, block: Block): string => {
  if (!url) {
    throw new Error("URL can't be empty")
  }

  if (url.startsWith('data:')) {
    return url
  }

  // more recent versions of notion don't proxy unsplash images
  if (url.startsWith('https://images.unsplash.com')) {
    return url
  }

  // Convert Official Notion API S3 URLs to Notion proxy URLs
  // Note: AWS signatures should already be removed in getRecordMap.ts
  if (url.startsWith('https://prod-files-secure.s3.us-west-2.amazonaws.com')) {
    try {
      console.log('🔍 [customMapImageUrl] Input URL (should be clean):', url)
      
      let table = block.parent_table === 'space' ? 'block' : block.parent_table
      if (table === 'collection' || table === 'team') {
        table = 'block'
      }
      
      // URL should already be clean (no AWS signatures), just encode it
      const proxyUrl = `https://www.notion.so/image/${encodeURIComponent(url)}`
      const finalUrl = new URL(proxyUrl)
      finalUrl.searchParams.set('table', table)
      finalUrl.searchParams.set('id', block.id)
      finalUrl.searchParams.set('cache', 'v2')
      
      const result = finalUrl.toString()
      console.log('🔍 [customMapImageUrl] Final URL:', result)
      console.log('---')
      
      return result
    } catch (error) {
      console.error('Failed to convert S3 URL to proxy URL:', error)
    }
  }

  try {
    const u = new URL(url)

    if (
      u.pathname.startsWith('/secure.notion-static.com') &&
      u.hostname.endsWith('.amazonaws.com')
    ) {
      if (
        u.searchParams.has('X-Amz-Credential') &&
        u.searchParams.has('X-Amz-Signature') &&
        u.searchParams.has('X-Amz-Algorithm')
      ) {
        // if the URL is already signed, then use it as-is
        return url
      }
    }
    
    // If URL is already a signed S3 URL with AWS signature, use it directly
    if (
      u.hostname.endsWith('.amazonaws.com') &&
      u.searchParams.has('X-Amz-Signature')
    ) {
      return url
    }
  } catch {
    // ignore invalid urls
  }

  if (url.startsWith('/images')) {
    url = `https://www.notion.so${url}`
  }

  url = `https://www.notion.so${
    url.startsWith('/image') ? url : `/image/${encodeURIComponent(url)}`
  }`

  const notionImageUrlV2 = new URL(url)
  let table = block.parent_table === 'space' ? 'block' : block.parent_table
  if (table === 'collection' || table === 'team') {
    table = 'block'
  }
  notionImageUrlV2.searchParams.set('table', table)
  notionImageUrlV2.searchParams.set('id', block.id)
  notionImageUrlV2.searchParams.set('cache', 'v2')

  url = notionImageUrlV2.toString()

  return url
}
