import { FC, useMemo } from "react"

type AudioBlockProps = {
  block: any
  className?: string
}

type AudioSource = {
  url: string
  type: "external"
}

export const Audio: FC<AudioBlockProps> = ({ block, className = "" }) => {
  const audioData = useMemo(() => {
    const format = block?.value?.format || {}
    const properties = block?.value?.properties || {}
    const audio = block?.value?.audio

    let source: AudioSource | null = null

    // 1. properties.source 확인 (우선 순위)
    if (properties.source && Array.isArray(properties.source) && properties.source.length > 0) {
      const url = properties.source[0][0]
      if (url && typeof url === 'string') {
        source = { url, type: 'external' }
      }
    }

    // 2. audio.external.url 확인 (Notion API 표준)
    if (!source && audio?.external?.url) {
      source = { url: audio.external.url, type: 'external' }
    }

    // 3. audio.file.url 확인 (Notion 호스팅 파일)
    if (!source && audio?.file?.url) {
      source = { url: audio.file.url, type: 'external' }
    }

    // 4. format.display_source 확인
    if (!source && format.display_source) {
      source = { url: format.display_source, type: 'external' }
    }

    // 5. format.block_source 확인
    if (!source && format.block_source) {
      for (const sourceItem of format.block_source) {
        if (sourceItem.url) {
          source = { url: sourceItem.url, type: 'external' }
          break
        }
      }
    }

    return source
  }, [block])

  if (!audioData) {
    return null
  }

  return (
    <div className={`notion-audio ${className}`}>
      <div className="notion-audio-wrapper">
        <audio controls preload="metadata">
          <source src={audioData.url} />
          브라우저가 오디오 태그를 지원하지 않습니다.
        </audio>
      </div>
    </div>
  )
}

export default Audio
