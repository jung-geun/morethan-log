import dynamic from "next/dynamic"
import Image from "next/image"
import Link from "next/link"
import { ExtendedRecordMap } from "notion-types"
import useScheme from "src/hooks/useScheme"
import { customMapImageUrl } from "src/libs/utils/notion"
import DatabasePlaceholder from "src/components/DatabasePlaceholder"
import { useDatabasePlaceholderEffect } from "./useDatabasePlaceholderEffect"
import { useListItemColorEffect } from "./useListItemColorEffect"
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

const Video = dynamic(
  () => import("./Video").then((m) => m.Video),
  {
    ssr: false,
  }
)

const Audio = dynamic(
  () => import("./Audio").then((m) => m.Audio),
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
  // Apply colors to list items (bullets, backgrounds) that might be missed by react-notion-x
  useListItemColorEffect(recordMap)

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
                { left: '$$', right: '$$', display: true },
                { left: '$', right: '$', display: false },
                { left: '\\[', right: '\\]', display: true },
                { left: '\\(', right: '\\)', display: false }
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

  // YouTube 라이트 로딩을 iframe으로 교체 및 오디오 블록 렌더링
  useEffect(() => {
    if (!recordMap || typeof window === 'undefined') return

    const replaceYouTubeLite = () => {
      const ytLiteElements = document.querySelectorAll('.notion-yt-lite')

      ytLiteElements.forEach((element) => {
        // 이미 처리된 요소는 건너뜀
        if (element.hasAttribute('data-yt-processed')) return

        // 썸네일에서 YouTube ID 추출
        const img = element.querySelector('img.notion-yt-thumbnail')
        if (!img) return

        const src = img.getAttribute('src')
        if (!src) return

        const match = src.match(/vi\/([^\/]+)\//)
        if (!match) return

        const videoId = match[1]

        // iframe 생성
        const iframe = document.createElement('iframe')
        iframe.src = `https://www.youtube.com/embed/${videoId}`
        iframe.style.cssText = 'width: 100%; height: 100%; border: none; position: absolute; top: 0; left: 0;'
        iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
        iframe.allowFullscreen = true
        iframe.title = 'YouTube video'

        // 부모 요소 스타일 수정
        const parent = element.parentElement
        if (parent) {
          parent.style.position = 'relative'
          parent.style.paddingBottom = '56.25%'
          parent.style.height = '0'
          parent.style.width = 'auto'
          parent.style.maxWidth = '100%'
          parent.style.overflow = 'hidden'
          parent.style.borderRadius = '4px'
          parent.style.background = '#f1f1f1'
        }

        // 교체
        element.replaceWith(iframe)
        element.setAttribute('data-yt-processed', 'true')

        // figure 요소 찾아서 제거하고 iframe만 남기기
        setTimeout(() => {
          const figure = iframe.closest('figure.notion-asset-wrapper-video')
          if (figure) {
            const figureParent = figure.parentElement
            if (figureParent) {
              // 새로운 wrapper 생성
              const wrapper = document.createElement('div')
              wrapper.style.cssText = 'position: relative; width: 100%; max-width: 100%; padding-bottom: 56.25%; height: 0; overflow: hidden; border-radius: 4px; background: #f1f1f1; margin: 1rem 0;'

              // iframe 스타일 수정 (wrapper 내에서 absolute)
              iframe.style.cssText = 'width: 100%; height: 100%; border: none; position: absolute; top: 0; left: 0;'

              // wrapper에 iframe 추가
              wrapper.appendChild(iframe)

              // wrapper를 figure 밖으로 이동
              figureParent.insertBefore(wrapper, figure)

              // figure 제거
              figure.remove()
            }
          }
        }, 100)
      })
    }

    // 오디오 블록 렌더링 (react-notion-x가 오디오를 지원하지 않으므로 직접 처리)
    const renderAudioBlocks = () => {
      // recordMap에서 audio 타입 블록 찾기
      Object.entries(recordMap.block).forEach(([blockId, blockData]) => {
        if (blockData.value.type === 'audio') {
          const element = document.querySelector(`[data-block-id="${blockId}"]`)
          if (!element || element.hasAttribute('data-audio-processed')) return

          const blockValue = blockData.value
          const format = (blockValue.format || {}) as any
          const properties = blockValue.properties || {}

          let audioUrl = null

          // URL 파싱 - 여러 소스 확인
          if (properties.source && Array.isArray(properties.source) && properties.source.length > 0) {
            audioUrl = properties.source[0][0]
          }
          if (!audioUrl && format.display_source) {
            audioUrl = format.display_source
          }
          if (!audioUrl && format.block_source) {
            for (const sourceItem of format.block_source) {
              if (sourceItem.url) {
                audioUrl = sourceItem.url
                break
              }
            }
          }

          if (audioUrl) {
            const wrapper = document.createElement('div')
            wrapper.className = 'notion-audio-wrapper'
            wrapper.style.cssText = 'margin: 1rem 0;'

            const audioEl = document.createElement('audio')
            audioEl.controls = true
            audioEl.preload = 'metadata'
            audioEl.style.cssText = 'width: 100%; max-width: 100%;'

            const sourceEl = document.createElement('source')
            sourceEl.src = audioUrl

            audioEl.appendChild(sourceEl)
            wrapper.appendChild(audioEl)

            element.innerHTML = ''
            element.appendChild(wrapper)
            element.setAttribute('data-audio-processed', 'true')

            console.log('🎵 [Audio] Rendered audio block from recordMap:', blockId, audioUrl)
          }
        }
      })
    }

    // 페이지 렌더링 후 실행
    setTimeout(replaceYouTubeLite, 500)
    setTimeout(renderAudioBlocks, 500)

    // DOM 변경 감지
    const observer = new MutationObserver(() => {
      setTimeout(replaceYouTubeLite, 100)
      setTimeout(renderAudioBlocks, 100)
    })

    observer.observe(document.body, {
      childList: true,
      subtree: true
    })

    return () => {
      observer.disconnect()
    }
  }, [recordMap])

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
  const databaseBlocks: Array<{ blockId: string; databaseId: string; title: string }> = []

  Object.entries(recordMap.block).forEach(([blockId, blockData]) => {
    if (blockData.value.type === 'collection_view_page') {
      const databaseId = (blockData.value.format as any)?.database_id || blockId
      const title = blockData.value.properties?.title?.[0]?.[0] || '데이터베이스'
      databaseBlocks.push({ blockId, databaseId, title })
    }
  })

  // Use effect to inject placeholders after render (hook is called above unconditionally)

  return (
    <StyledWrapper className={scheme === 'dark' ? 'dark' : 'light'}>
      <_NotionRenderer
        darkMode={scheme === "dark"}
        recordMap={recordMap}
        components={{
          Code,
          Collection,
          Equation,
          Modal,
          Pdf,
          Video,
          video: Video,
          Audio,
          audio: Audio,
          nextImage: Image,
          nextLink: Link,
        } as any}
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
  
  /* Handle synced_block: hide the container but show children */
  .notion-synced-block {
    display: none !important;
  }
  
  /* Make sure synced_block children are visible */
  .notion-synced-block > .notion-block {
    display: block !important;
  }
  
  /* Hide unsupported block type containers */
  .notion-breadcrumb,
  .notion-table_of_contents,
  .notion-transclusion_container {
    display: none !important;
  }
  
  /* Audio block styling */
  .notion-audio {
    margin: 1rem 0;
  }
  
  .notion-audio-wrapper {
    width: 100%;
    max-width: 100%;
  }
  
  .notion-audio audio {
    width: 100%;
    max-width: 100%;
  }
  
  /* Dark mode audio styling */
  &.dark .notion-audio audio {
    background: #2a2a2a;
    border-radius: 4px;
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
  
  /* Notion color classes - Light mode */
  .notion-default {
    color: var(--theme-colors-gray12);
  }
  .notion-gray {
    color: var(--theme-colors-gray9);
  }
  .notion-brown {
    color: #9f6b53;
  }
  .notion-orange {
    color: #d9730d;
  }
  .notion-yellow {
    color: #dfab01;
  }
  .notion-green {
    color: #0f7b6c;
  }
  .notion-blue {
    color: #0b6e99;
  }
  .notion-purple {
    color: #6940a5;
  }
  .notion-pink {
    color: #ad3a6a;
  }
  .notion-red {
    color: #d92a2a;
  }
  
  /* Notion background color classes - Light mode */
  .notion-default_background {
    background-color: transparent;
  }
  .notion-gray_background {
    background-color: var(--theme-colors-gray4);
  }
  .notion-brown_background {
    background-color: #f3e9e7;
  }
  .notion-orange_background {
    background-color: #faebdd;
  }
  .notion-yellow_background {
    background-color: #fbf3db;
  }
  .notion-green_background {
    background-color: #ddedea;
  }
  .notion-blue_background {
    background-color: #d6eaf3;
  }
  .notion-purple_background {
    background-color: #eae4f2;
  }
  .notion-pink_background {
    background-color: #f4e5ed;
  }
  .notion-red_background {
    background-color: #fbe4e4;
  }
  
  /* Dark mode color adjustments */
  &.dark .notion-default { color: #FFFFFF; }
  &.dark .notion-gray { color: #9B9B9B; }
  &.dark .notion-brown { color: #937264; }
  &.dark .notion-orange { color: #FFA344; }
  &.dark .notion-yellow { color: #FFDC49; }
  &.dark .notion-green { color: #4DAB9A; }
  &.dark .notion-blue { color: #529CCA; }
  &.dark .notion-purple { color: #9A6DD7; }
  &.dark .notion-pink { color: #E255A1; }
  &.dark .notion-red { color: #FF7369; }
  
  /* Dark mode background color adjustments */
  &.dark .notion-gray_background { background-color: #454B4E; }
  &.dark .notion-brown_background { background-color: #434040; }
  &.dark .notion-orange_background { background-color: #594A3A; }
  &.dark .notion-yellow_background { background-color: #59563B; }
  &.dark .notion-green_background { background-color: #354C4B; }
  &.dark .notion-blue_background { background-color: #364954; }
  &.dark .notion-purple_background { background-color: #443F57; }
  &.dark .notion-pink_background { background-color: #533B4C; }
  &.dark .notion-red_background { background-color: #594141; }

  /* Notion database item colors (tags, etc) */
  .notion-item-default { background-color: rgba(206, 205, 202, 0.5); color: var(--fg-color); }
  .notion-item-gray { background-color: rgba(155, 154, 151, 0.4); color: var(--fg-color); }
  .notion-item-brown { background-color: rgba(140, 46, 0, 0.2); color: var(--fg-color); }
  .notion-item-orange { background-color: rgba(245, 93, 0, 0.2); color: var(--fg-color); }
  .notion-item-yellow { background-color: rgba(233, 168, 0, 0.2); color: var(--fg-color); }
  .notion-item-green { background-color: rgba(0, 135, 107, 0.2); color: var(--fg-color); }
  .notion-item-blue { background-color: rgba(0, 120, 223, 0.2); color: var(--fg-color); }
  .notion-item-purple { background-color: rgba(103, 36, 222, 0.2); color: var(--fg-color); }
  .notion-item-pink { background-color: rgba(221, 0, 129, 0.2); color: var(--fg-color); }
  .notion-item-red { background-color: rgba(255, 0, 26, 0.2); color: var(--fg-color); }

  &.dark .notion-item-default { background-color: rgba(206, 205, 202, 0.5); }
  &.dark .notion-item-gray { background-color: rgba(151, 154, 155, 0.5); }
  &.dark .notion-item-brown { background-color: rgba(147, 114, 100, 0.5); }
  &.dark .notion-item-orange { background-color: rgba(255, 163, 68, 0.5); }
  &.dark .notion-item-yellow { background-color: rgba(255, 220, 73, 0.5); }
  &.dark .notion-item-green { background-color: rgba(77, 171, 154, 0.5); }
  &.dark .notion-item-blue { background-color: rgba(82, 156, 202, 0.5); }
  &.dark .notion-item-purple { background-color: rgba(154, 109, 215, 0.5); }
  &.dark .notion-item-pink { background-color: rgba(226, 85, 161, 0.5); }
  &.dark .notion-item-red { background-color: rgba(255, 115, 105, 0.5); }

  /* Equation block styling */
  .notion-equation-block {
    text-align: center;
    overflow: auto;
  }
  
  .notion-equation-block .katex-display {
    margin: 1em 0;
  }
  
  .notion-equation-block .katex {
    font-size: 1.3em;
  }
  
  /* Inline equation styling to ensure visibility */
  .notion-inline-equation .katex {
    font-size: 1em;
  }
  
  /* Video block styling */
  .notion-video {
    margin: 1rem 0;
  }
  
  .notion-video-wrapper {
    position: relative;
  }
  
  /* Dark mode video background */
  &.dark .notion-video-wrapper {
    background: #2a2a2a;
  }
  
  /* 비디오 asset wrapper 스타일 수정 */
  .notion-asset-wrapper {
    width: auto !important;
    max-width: 100% !important;
  }
  
  .notion-asset-wrapper-video {
    width: auto !important;
    max-width: 100% !important;
  }
  
  .notion-asset-wrapper-video > div {
    width: auto !important;
    max-width: 100% !important;
  }
  
  .notion-asset-wrapper-video video {
    max-width: 100% !important;
    height: auto !important;
  }
  
  /* 메인 컨테이너 내에서만 비디오 표시 */
  .notion-page .notion-asset-wrapper-video {
    max-width: 100%;
    overflow: hidden;
  }
  
  /* YouTube 라이트 로딩 숨기기 */
  .notion-yt-lite {
    display: none !important;
  }
`
