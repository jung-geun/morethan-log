import dynamic from "next/dynamic"
import Image from "next/image"
import Link from "next/link"
import { ExtendedRecordMap } from "notion-types"
import useScheme from "src/hooks/useScheme"
import { customMapImageUrl } from "src/libs/utils/notion"
import DatabasePlaceholder from "src/components/DatabasePlaceholder"
import { useDatabasePlaceholderEffect } from "./useDatabasePlaceholderEffect"
import { useEffect } from "react"

// core styles shared by all of react-notion-x (required)
import "react-notion-x/src/styles.css"

// used for code syntax highlighting (optional)
import "prismjs/themes/prism-tomorrow.css"

// used for rendering equations (optional)

import "katex/dist/katex.min.css"
import { FC } from "react"
import styled from "@emotion/styled"

// Type declarations for KaTeX global functions
declare global {
  interface Window {
    katex: any
    renderMathInElement: any
    renderMathManually?: (targetElement?: Element) => void
  }
}

const _NotionRenderer = dynamic(
  () => import("react-notion-x").then((m) => m.NotionRenderer),
  { ssr: false }
)

const Code = dynamic(() =>
  import("react-notion-x/build/third-party/code").then(async (m) => m.Code)
)

const Collection = dynamic(() =>
  import("react-notion-x/build/third-party/collection").then(
    (m) => m.Collection
  )
)
const Equation = dynamic(() =>
  import("react-notion-x/build/third-party/equation").then((m) => m.Equation)
)
const Pdf = dynamic(
  () => import("react-notion-x/build/third-party/pdf").then((m) => m.Pdf),
  {
    ssr: false,
  }
)
const Modal = dynamic(
  () => import("react-notion-x/build/third-party/modal").then((m) => m.Modal),
  {
    ssr: false,
  }
)

const mapPageUrl = (id: string) => {
  return "https://www.notion.so/" + id.replace(/-/g, "")
}

type Props = {
  recordMap: ExtendedRecordMap | null
}

  const NotionRenderer: FC<Props> = ({ recordMap }) => {
  const [scheme] = useScheme()
  // Call hook unconditionally (must not be called conditionally after an early return)
  useDatabasePlaceholderEffect()

  // KaTeX math rendering effect - moved to top level to follow React Hooks rules
  useEffect(() => {
    // Only run on client side and when recordMap is available
    if (!recordMap || typeof window === 'undefined') return
    
    // Check if KaTeX is available
    const checkAndRenderMath = () => {
      if (!window.katex) {
        console.log('KaTeX: Not available, skipping math rendering')
        return
      }
      
      // Look for inline math expressions that weren't rendered by Equation component
      const notionPage = document.querySelector('.notion-page')
      if (!notionPage) return
      
      // Find all text content that might contain math delimiters
      const allTextElements = notionPage.querySelectorAll('p, span, div')
      let foundMath = false
      
      allTextElements.forEach(element => {
        const text = element.textContent || ''
        // Check for unrendered math expressions
        if ((text.includes('$') || text.includes('\\(') || text.includes('\\[')) && 
            !element.querySelector('.katex') && 
            !element.classList.contains('katex')) {
          
          // Try to render math in this element
          try {
            window.renderMathInElement(element, {
              delimiters: [
                {left: '$$', right: '$$', display: true},
                {left: '$', right: '$', display: false},
                {left: '\\[', right: '\\]', display: true},
                {left: '\\(', right: '\\)', display: false}
              ],
              throwOnError: false
            })
            foundMath = true
          } catch (error) {
            console.warn('KaTeX: Failed to render math in element:', error)
          }
        }
      })
      
      console.log(`KaTeX: ${foundMath ? 'Found and rendered math' : 'No unrendered math found'}`)
    }
    
    // Wait a bit for the page to fully render
    setTimeout(checkAndRenderMath, 1000)
    
    // Also check after navigation changes
    const observer = new MutationObserver(() => {
      setTimeout(checkAndRenderMath, 500)
    })
    
    observer.observe(document.body, {
      childList: true,
      subtree: true
    })
    
    // Manual re-render function for debugging
    window.renderMathManually = checkAndRenderMath
    
    return () => {
      observer.disconnect()
      delete window.renderMathManually
    }
  }, [recordMap]) // Re-run when recordMap changes

  // Handle case where recordMap is not available
  if (!recordMap) {
    return (
      <StyledWrapper>
        <div style={{ 
          padding: '2rem', 
          textAlign: 'center', 
          color: 'var(--theme-colors-gray11)' 
        }}>
          <p>콘텐츠를 불러오는 중 문제가 발생했습니다.</p>
          <p>잠시 후 다시 시도해주세요.</p>
        </div>
      </StyledWrapper>
    )
  }

  // Find all database blocks
  const databaseBlocks: Array<{blockId: string; databaseId: string; title: string}> = []
  
  Object.entries(recordMap.block).forEach(([blockId, blockData]) => {
    if (blockData.value.type === 'collection_view_page') {
      const databaseId = (blockData.value.format as any)?.database_id || blockId
      const title = blockData.value.properties?.title?.[0]?.[0] || '데이터베이스'
      databaseBlocks.push({ blockId, databaseId, title })
    }
  })

  // Use effect to inject placeholders after render (hook is called above unconditionally)

  return (
    <StyledWrapper>
      <_NotionRenderer
        darkMode={scheme === "dark"}
        recordMap={recordMap}
        components={{
          Code,
          Collection,
          Equation,
          Modal,
          Pdf,
          nextImage: Image,
          nextLink: Link,
        }}
        mapPageUrl={mapPageUrl}
        mapImageUrl={customMapImageUrl}
      />
      
      {/* Render database placeholders inline - they will be positioned by CSS */}
      {databaseBlocks.map(({ blockId, databaseId, title }) => (
        <div
          key={`placeholder-${blockId}`}
          data-database-id={blockId}
          className="database-placeholder-wrapper"
        >
          <DatabasePlaceholder databaseId={databaseId} title={title} />
        </div>
      ))}
    </StyledWrapper>
  )
}

export default NotionRenderer

const StyledWrapper = styled.div`
  /* // TODO: why render? */
  .notion-collection-page-properties {
    display: none !important;
  }
  .notion-page {
    padding: 0;
  }
  .notion-list {
    width: 100%;
  }
  
  /* Hide default collection_view_page rendering - we use custom DatabasePlaceholder */
  .notion-collection_view_page,
  .notion-collection-view,
  .notion-collection_view {
    display: none !important;
  }
  
  /* Database placeholder wrappers */
  .database-placeholder-wrapper {
    margin: 1rem 0;
  }
  
  /* Always show code block copy button */
  .notion-code-copy {
    opacity: 1 !important;
    visibility: visible !important;
  }
  
  .notion-code-copy-button {
    opacity: 1 !important;
    visibility: visible !important;
    cursor: pointer;
    transition: opacity 0.2s ease;
    
    &:hover {
      opacity: 0.7 !important;
    }
  }
  
  /* KaTeX math styling for dark mode */
  .katex {
    font-size: 1em !important;
  }
  
  .katex-display {
    margin: 1em 0 !important;
  }
  
  /* Dark mode KaTeX styling */
  [data-theme="dark"] .katex,
  .dark .katex {
    color: #e6e6e6 !important;
  }
  
  [data-theme="dark"] .katex .katex-mathml,
  .dark .katex .katex-mathml {
    color: #e6e6e6 !important;
  }
  
  /* Math delimiters styling */
  [data-theme="dark"] .katex .delimsizing,
  .dark .katex .delimsizing {
    color: #e6e6e6 !important;
  }
  
  [data-theme="dark"] .katex .delimsizing.size1,
  .dark .katex .delimsizing.size1 {
    color: #e6e6e6 !important;
  }
  
  /* Ensure math equations are visible in dark mode */
  .notion-equation {
    background: transparent !important;
  }
  
  [data-theme="dark"] .notion-equation,
  .dark .notion-equation {
    background: transparent !important;
  }
`
