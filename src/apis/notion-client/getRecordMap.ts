import { NotionAPI } from "notion-client"
import { ExtendedRecordMap } from "notion-types"

export const getRecordMap = async (pageId: string): Promise<ExtendedRecordMap | null> => {
  const api = new NotionAPI()
  
  let retryCount = 0
  const maxRetries = 5

  while (retryCount < maxRetries) {
    try {
      const recordMap = await api.getPage(pageId)
      return recordMap
    } catch (error: any) {
      retryCount++
      console.warn(`getRecordMap attempt ${retryCount} failed for ${pageId}:`, error.message)
      
      // Special handling for 406 and 502 errors
      if (error.response?.status === 406) {
        console.warn(`Notion API returned 406 for ${pageId} - attempt ${retryCount}`)
        if (retryCount === maxRetries) {
          console.error(`getRecordMap 406 error persists for ${pageId}`)
          return null
        }
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 2000))
      } else if (error.response?.status === 502) {
        console.warn(`Notion API returned 502 for ${pageId} - attempt ${retryCount}`)
        if (retryCount === maxRetries) {
          console.error(`getRecordMap 502 error persists for ${pageId}`)
          return null
        }
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1500))
      } else {
        if (retryCount === maxRetries) {
          console.error(`getRecordMap failed for ${pageId} after all retries`)
          return null
        }
        await new Promise(resolve => setTimeout(resolve, Math.pow(2, retryCount) * 1000))
      }
    }
  }
  
  return null
}
