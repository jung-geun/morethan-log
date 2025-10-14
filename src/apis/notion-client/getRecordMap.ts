import { ExtendedRecordMap } from "notion-types"
import { getOfficialNotionClient } from "./notionClient"

/**
 * Recursively fetch child blocks
 */
async function fetchChildBlocks(blockId: string, notion: any, recordMap: ExtendedRecordMap): Promise<string[]> {
  try {
    const children = await notion.blocks.children.list({
      block_id: blockId,
      page_size: 100,
    })
    
    const childIds: string[] = []
    
    for (const block of children.results) {
      childIds.push(block.id)
      await processBlock(block, blockId, notion, recordMap)
    }
    
    return childIds
  } catch (error) {
    console.error(`Failed to fetch children for block ${blockId}:`, error)
    return []
  }
}

/**
 * Convert rich text array to notion-types format with decorations
 */
function convertRichText(richTextArray: any[]): any[][] {
  if (!richTextArray || richTextArray.length === 0) return []
  
  return richTextArray.map((rt: any) => {
    const text = rt.plain_text || ''
    const decorations: any[][] = []
    
    if (rt.annotations) {
      if (rt.annotations.bold) decorations.push(['b'])
      if (rt.annotations.italic) decorations.push(['i'])
      if (rt.annotations.strikethrough) decorations.push(['s'])
      if (rt.annotations.underline) decorations.push(['_'])
      if (rt.annotations.code) decorations.push(['c'])
      if (rt.annotations.color && rt.annotations.color !== 'default') {
        decorations.push(['h', rt.annotations.color])
      }
    }
    
    if (rt.href) {
      decorations.push(['a', rt.href])
    }
    
    // Return format: [text, [decorations]] or [text] if no decorations
    if (decorations.length > 0) {
      return [text, decorations]
    }
    return [text]
  })
}

/**
 * Process a single block and add it to recordMap
 */
async function processBlock(block: any, parentId: string, notion: any, recordMap: ExtendedRecordMap): Promise<void> {
  const properties: any = {}
  const format: any = {}
  
  if (block.type && block[block.type]) {
    const blockData = block[block.type]
    
    // Handle blocks with rich_text (paragraph, headings, lists, quotes, callouts, toggles, etc.)
    if (blockData.rich_text && Array.isArray(blockData.rich_text)) {
      properties.title = convertRichText(blockData.rich_text)
    }
    
    // Handle specific block types
    switch (block.type) {
      case 'code':
        if (blockData.rich_text) {
          properties.title = convertRichText(blockData.rich_text)
          properties.language = [[blockData.language || 'plain text']]
        }
        if (blockData.caption && blockData.caption.length > 0) {
          properties.caption = convertRichText(blockData.caption)
        }
        break
        
      case 'image':
        const imageUrl = blockData.file?.url || blockData.external?.url
        if (imageUrl) {
          console.log('🖼️ Image URL from Notion API:', imageUrl)
          
          properties.source = [[imageUrl]]
          
          // Add format for image display  
          format.display_source = imageUrl
        }
        if (blockData.caption && blockData.caption.length > 0) {
          properties.caption = convertRichText(blockData.caption)
        }
        break
        
      case 'video':
      case 'file':
      case 'pdf':
        const fileUrl = blockData.file?.url || blockData.external?.url
        if (fileUrl) {
          properties.source = [[fileUrl]]
          if (blockData.caption && blockData.caption.length > 0) {
            properties.title = convertRichText(blockData.caption)
          }
        }
        break
        
      case 'bookmark':
      case 'link_preview':
        if (blockData.url) {
          properties.link = [[blockData.url]]
          properties.title = blockData.caption && blockData.caption.length > 0
            ? convertRichText(blockData.caption)
            : [[blockData.url]]
        }
        break
        
      case 'equation':
        if (blockData.expression) {
          properties.title = [[blockData.expression]]
        }
        break
        
      case 'divider':
        // Divider has no properties
        break
        
      case 'table_of_contents':
        // ToC has no properties
        break
        
      case 'breadcrumb':
        // Breadcrumb has no properties
        break
        
      case 'callout':
        if (blockData.icon) {
          format.page_icon = blockData.icon.emoji || blockData.icon.external?.url || blockData.icon.file?.url
        }
        break
        
      case 'to_do':
        if (typeof blockData.checked !== 'undefined') {
          properties.checked = [[blockData.checked ? 'Yes' : 'No']]
        }
        break
        
      case 'column_list':
      case 'column':
        // These are container blocks, handled by content
        break
        
      case 'table':
        if (blockData.table_width) {
          format.table_width = blockData.table_width
        }
        break
        
      case 'table_row':
        if (blockData.cells && Array.isArray(blockData.cells)) {
          // Convert table cells
          blockData.cells.forEach((cell: any[], index: number) => {
            if (cell && cell.length > 0) {
              properties[`cell_${index}`] = convertRichText(cell)
            }
          })
        }
        break
    }
    
    // Handle color for all block types
    if (blockData.color && blockData.color !== 'default') {
      format.block_color = blockData.color
    }
  }
  
  // Map Official API block types to notion-types format
  const typeMapping: Record<string, string> = {
    'paragraph': 'text',
    'heading_1': 'header',
    'heading_2': 'sub_header',
    'heading_3': 'sub_sub_header',
    'bulleted_list_item': 'bulleted_list',
    'numbered_list_item': 'numbered_list',
    'to_do': 'to_do',
    'toggle': 'toggle',
    'code': 'code',
    'quote': 'quote',
    'callout': 'callout',
    'divider': 'divider',
    'image': 'image',
    'video': 'video',
    'file': 'file',
    'pdf': 'pdf',
    'bookmark': 'bookmark',
    'equation': 'equation',
    'column_list': 'column_list',
    'column': 'column',
    'table': 'table',
    'table_row': 'table_row',
    'embed': 'embed',
    'link_preview': 'bookmark',
  }
  
  const mappedType = typeMapping[block.type] || block.type
  
  const blockValue: any = {
    id: block.id,
    version: 1,
    type: mappedType,
    properties,
    created_time: block.created_time,
    last_edited_time: block.last_edited_time,
    parent_id: parentId,
    parent_table: 'block',
    alive: true,
  }
  
  // Add format if not empty
  if (Object.keys(format).length > 0) {
    blockValue.format = format
  }
  
  // Fetch children if has_children is true
  if (block.has_children) {
    const childIds = await fetchChildBlocks(block.id, notion, recordMap)
    if (childIds.length > 0) {
      blockValue.content = childIds
    }
  }
  
  recordMap.block[block.id] = {
    role: 'reader',
    value: blockValue,
  }
}

/**
 * Get page record map for rendering with react-notion-x
 * Uses official @notionhq/client API
 * 
 * Note: This returns a compatible structure for react-notion-x
 */
export const getRecordMap = async (pageId: string): Promise<ExtendedRecordMap | null> => {
  const notion = getOfficialNotionClient()
  
  let retryCount = 0
  const maxRetries = 3

  while (retryCount < maxRetries) {
    try {
      console.log(`📡 Fetching page content for ${pageId}`)
      
      // Get page metadata
      const page = await notion.pages.retrieve({ page_id: pageId })
      
      // Get page blocks (content)
      const blocks = await notion.blocks.children.list({
        block_id: pageId,
        page_size: 100,
      })
      
      console.log(`✅ Retrieved page ${pageId} with ${blocks.results.length} blocks`)
      
      // Transform to ExtendedRecordMap format for react-notion-x compatibility
      const recordMap: ExtendedRecordMap = {
        block: {},
        collection: {},
        collection_view: {},
        notion_user: {},
        collection_query: {},
        signed_urls: {},
      }
      
      // Add page block
      recordMap.block[pageId] = {
        role: 'reader',
        value: {
          id: pageId,
          version: 1,
          type: 'page',
          properties: (page as any).properties || {},
          created_time: (page as any).created_time,
          last_edited_time: (page as any).last_edited_time,
          parent_id: '',
          parent_table: 'space',
          alive: true,
          content: blocks.results.map((block: any) => block.id),
        } as any,
      }
      
      // Process all child blocks (including nested children)
      for (const block of blocks.results) {
        await processBlock(block, pageId, notion, recordMap)
      }
      
      return recordMap
      
    } catch (error: any) {
      retryCount++
      console.error(`❌ getRecordMap attempt ${retryCount}/${maxRetries} failed for ${pageId}:`, error.message)
      
      if (error.code === 'object_not_found') {
        console.error(`❌ Page ${pageId} not found or not accessible`)
        return null
      }
      
      if (retryCount === maxRetries) {
        console.error(`❌ getRecordMap failed for ${pageId} after all retries`)
        return null
      }

      // Exponential backoff
      const waitTime = Math.pow(2, retryCount) * 1500
      console.log(`⏳ Waiting ${waitTime / 1000} seconds before retry...`)
      await new Promise(resolve => setTimeout(resolve, waitTime))
    }
  }
  
  return null
}
