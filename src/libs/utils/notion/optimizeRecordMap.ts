import { ExtendedRecordMap } from "notion-types"

/**
 * Optimize record map by removing unnecessary data to reduce bundle size
 */
export const optimizeRecordMap = (recordMap: ExtendedRecordMap): ExtendedRecordMap => {
  const optimized = { ...recordMap }

  // Remove preview images to reduce size
  if (optimized.preview_images) {
    optimized.preview_images = {}
  }

  // Remove signed URLs from blocks to reduce size
  if (optimized.signed_urls) {
    optimized.signed_urls = {}
  }

  // Clean up unnecessary properties from blocks
  if (optimized.block) {
    Object.keys(optimized.block).forEach(blockId => {
      const block = optimized.block[blockId]
      if (block?.value) {
        // Remove large properties that are not essential for rendering
        const value = { ...block.value }
        
        // Remove file properties if they exist and are large
        if (value.properties && typeof value.properties === 'object') {
          Object.keys(value.properties).forEach(prop => {
            const property = value.properties[prop]
            // If property is an array with file references, limit it
            if (Array.isArray(property) && property.length > 0) {
              // Keep only essential data for files
              value.properties[prop] = property.map(item => {
                if (Array.isArray(item) && item.length > 1) {
                  // Keep only the first two elements (usually text and formatting)
                  return item.slice(0, 2)
                }
                return item
              })
            }
          })
        }

        optimized.block[blockId] = {
          ...block,
          value
        }
      }
    })
  }

  return optimized
}