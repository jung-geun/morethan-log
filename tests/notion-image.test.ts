import { getOfficialNotionClient } from 'src/apis/notion-client/notionClient'
import { getRecordMap } from 'src/apis/notion-client/getRecordMap'
import { getPosts } from 'src/apis/notion-client/getPosts'
import { customMapImageUrl } from 'src/libs/utils/notion/customMapImageUrl'
import { Block } from 'notion-types'

// Mock the Notion client to avoid actual API calls during testing
jest.mock('src/apis/notion-client/notionClient')

describe('Notion Image Handling Tests', () => {
  // Mock a basic Notion block with image
  const mockBlockWithImage: Block = {
    id: 'test-block-id',
    type: 'image',
    parent_id: 'test-parent-id',
    parent_table: 'block',
    created_time: 1234567890000,
    last_edited_time: 1234567890000,
    created_by_table: 'notion_user',
    created_by_id: 'test-user-id',
    last_edited_by_table: 'notion_user',
    last_edited_by_id: 'test-user-id',
    archived: false,
    has_translations: false,
    has_content: true,
    space_id: 'test-space-id',
    properties: {
      source: [['https://prod-files-secure.s3.us-west-2.amazonaws.com/test-image.jpg']]
    },
    format: {
      block_width: 378,
      block_height: 200,
      block_full_width: false,
      block_page_full_width: false,
      block_aspect_ratio: 1.89,
      display_source: 'https://prod-files-secure.s3.us-west-2.amazonaws.com/test-image.jpg',
      block_color: 'default'
    }
  } as any

  // Mock a recordMap with image blocks
  const mockRecordMapWithImages = {
    block: {
      'test-block-id': mockBlockWithImage
    },
    collection: {},
    collection_view: {},
    notion_user: {},
    space: {}
  }

  beforeEach(() => {
    jest.clearAllMocks()
  })

  describe('1. customMapImageUrl 기능 테스트', () => {
    test('1-1. AWS S3 서명된 URL을 프록시 URL로 변환', () => {
      const awsUrl = 'https://prod-files-secure.s3.us-west-2.amazonaws.com/test-image.jpg?X-Amz-Signature=abc123'
      const result = customMapImageUrl(awsUrl, mockBlockWithImage)
      
      expect(result).toContain('/api/image-proxy')
      expect(result).toContain(encodeURIComponent(awsUrl))
    })

    test('1-2. 다른 S3 서명된 URL도 프록시로 변환', () => {
      const s3Url = 'https://s3.amazonaws.com/bucket/test.jpg?X-Amz-Signature=xyz789'
      const result = customMapImageUrl(s3Url, mockBlockWithImage)
      
      expect(result).toContain('/api/image-proxy')
      expect(result).toContain(encodeURIComponent(s3Url))
    })

    test('1-3. Unsplash URL은 변환하지 않음', () => {
      const unsplashUrl = 'https://images.unsplash.com/photo-1234567890'
      const result = customMapImageUrl(unsplashUrl, mockBlockWithImage)
      
      expect(result).toBe(unsplashUrl)
    })

    test('1-4. data URL은 변환하지 않음', () => {
      const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII='
      const result = customMapImageUrl(dataUrl, mockBlockWithImage)
      
      expect(result).toBe(dataUrl)
    })

    test('1-5. 이미 프록시된 URL은 중복 처리하지 않음', () => {
      const proxiedUrl = 'https://localhost:3000/api/image-proxy?url=' + encodeURIComponent('https://example.com/image.jpg')
      const result = customMapImageUrl(proxiedUrl, mockBlockWithImage)
      
      expect(result).toBe(proxiedUrl)
    })

    test('1-6. 일반 Notion 이미지 URL을 프록시로 변환', () => {
      const notionUrl = '/images/page-cover/https%3A%2F%2Fexample.com%2Fimage.jpg'
      const result = customMapImageUrl(notionUrl, mockBlockWithImage)
      
      expect(result).toContain('/api/image-proxy')
      expect(result).toContain('notion.so')
    })

    test('1-7. 빈 URL은 에러를 발생', () => {
      expect(() => {
        customMapImageUrl('', mockBlockWithImage)
      }).toThrow("URL can't be empty")
    })
  })

  describe('2. 이미지 블록 식별 테스트', () => {
    test('2-1. 이미지 블록 타입을 올바르게 식별', () => {
      const imageBlock = {
        ...mockBlockWithImage,
        type: 'image'
      }
      
      expect(imageBlock.type).toBe('image')
    })

    test('2-2. 이미지 블록의 소스 URL을 추출', () => {
      const source = mockBlockWithImage.properties?.source?.[0]?.[0]
      
      expect(source).toContain('prod-files-secure.s3.us-west-2.amazonaws.com')
    })
  })

  describe('3. 프록시 API 동작 테스트', () => {
    test('3-1. 이미지 프록시 URL 형식 확인', () => {
      const testUrl = 'https://example.com/test.jpg'
      const result = customMapImageUrl(testUrl, mockBlockWithImage)
      
      // URL 형식 확인 (상대 또는 절대 URL)
      expect(result).toMatch(/^(https?:\/\/.*)?\/api\/image-proxy\?url=/)
      // Notion 이미지 URL이 생성되었는지 확인
      expect(result).toContain('notion.so')
      expect(result).toContain('table%3Dblock')
      expect(result).toContain('id%3Dtest-block-id')
    })

    test('3-2. NEXT_PUBLIC_SITE_URL이 없을 때도 동작', () => {
      const originalSiteUrl = process.env.NEXT_PUBLIC_SITE_URL
      delete process.env.NEXT_PUBLIC_SITE_URL
      
      const testUrl = 'https://prod-files-secure.s3.us-west-2.amazonaws.com/test.jpg'
      const result = customMapImageUrl(testUrl, mockBlockWithImage)
      
      expect(result).toContain('/api/image-proxy')
      
      // 환경 변수 복원
      if (originalSiteUrl) {
        process.env.NEXT_PUBLIC_SITE_URL = originalSiteUrl
      }
    })
  })

  describe('4. 에러 핸들링 테스트', () => {
    test('4-1. 잘못된 URL 형식 처리', () => {
      const invalidUrl = 'not-a-valid-url'
      
      // 함수가 잘못된 URL을 처리할 때 예외를 던지지 않는지 확인
      expect(() => {
        customMapImageUrl(invalidUrl, mockBlockWithImage)
      }).not.toThrow()
    })

    test('4-2. 블록 파라미터가 없어도 동작', () => {
      const testUrl = 'https://example.com/test.jpg'
      
      expect(() => {
        customMapImageUrl(testUrl)
      }).not.toThrow()
    })
  })
})
