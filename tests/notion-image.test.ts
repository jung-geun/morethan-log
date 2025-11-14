/**
 * @jest-environment node
 *
 * 이 테스트는 실제 Notion API(공식 클라이언트)를 호출하는 통합 테스트입니다.
 * DOM API에 의존하지 않으므로 Node 환경에서 실행해야 window 관련 mock이 필요 없습니다.
 */

import 'dotenv/config'
import type { PageObjectResponse } from '@notionhq/client/build/src/api-endpoints'
import { getOfficialNotionClient } from 'src/apis/notion-client/notionClient'
import { summarizeBlockTypes } from 'src/libs/utils/notion/analyzeBlocks'

const REQUIRED_ENV = ['NOTION_TOKEN', 'NOTION_DATASOURCE_ID'] as const
const missingEnv = REQUIRED_ENV.filter((key) => !process.env[key])

type TitleProperty = Extract<PageObjectResponse['properties'][string], { type: 'title' }>
const isTitleProperty = (property: PageObjectResponse['properties'][string]): property is TitleProperty =>
  property?.type === 'title'

jest.setTimeout(60000)

const describeMaybe = missingEnv.length ? describe.skip : describe

if (missingEnv.length) {
  // eslint-disable-next-line no-console
  console.warn(
    `ℹ️  Skipping Notion integration tests because env vars are missing: ${missingEnv.join(', ')}`
  )
}

describeMaybe('Notion integration - test post lookup', () => {
  it('finds "test post" in the database and fetches its content', async () => {
    const notion = getOfficialNotionClient()
    const dataSourceId = process.env.NOTION_DATASOURCE_ID
    if (!dataSourceId) {
      throw new Error('NOTION_DATASOURCE_ID env var is required for this test')
    }

    const pages: PageObjectResponse[] = []
    let cursor: string | null | undefined = undefined
    do {
      const resp = await notion.dataSources.query({
        data_source_id: dataSourceId,
        page_size: 100,
        start_cursor: cursor ?? undefined,
      })

      resp.results.forEach((entry) => {
        if ('properties' in entry) {
          pages.push(entry as PageObjectResponse)
        }
      })

      cursor = resp.has_more ? resp.next_cursor : null
    } while (cursor)

    const normalize = (value?: string | null) => value?.trim().toLowerCase()
    const targetPage = pages.find((entry) => {
      const titleProperty = Object.values(entry.properties).find(isTitleProperty)
      const titleText = titleProperty?.title?.map((block) => block.plain_text).join('')
      return normalize(titleText) === 'test post'
    })

    if (!targetPage) {
      const sampleTitles = pages
        .map((entry) => {
          const prop = Object.values(entry.properties).find(isTitleProperty)
          return prop?.title?.map((block) => block.plain_text).join('')
        })
        .filter(Boolean)
        .slice(0, 10)
      throw new Error(
        `Unable to locate a Notion page titled "test post". Sample titles: ${sampleTitles.join(', ')}`
      )
    }

    expect(targetPage.id).toBeTruthy()

    const page = await notion.pages.retrieve({ page_id: targetPage.id })

    if (!('properties' in page)) {
      throw new Error('Expected a full page object response from Notion API')
    }

    const fullPage = page as PageObjectResponse

    const titleProperty = Object.values(fullPage.properties).find(isTitleProperty)

    const fetchedTitle = titleProperty?.title
      ?.map((entry) => entry.plain_text)
      ?.join('')
    const normalizedTitle = fetchedTitle?.trim().toLowerCase()

    expect(normalizedTitle).toBe('test post')

    // 페이지 블록을 전부 순회하면서 어떤 타입의 요소가 포함돼 있는지 요약한다.
  const summary = await summarizeBlockTypes(notion, targetPage.id)

    expect(summary.totalBlocks).toBeGreaterThan(0)
    expect(Object.keys(summary.types).length).toBeGreaterThan(0)
    expect(summary.types).toHaveProperty('paragraph')
    expect(Array.isArray(summary.images)).toBe(true)
    if (summary.types.image && summary.types.image > 0) {
      expect(summary.images.length).toBeGreaterThan(0)
      summary.images.forEach((img) => {
        expect(img).toHaveProperty('blockId')
        expect(img).toHaveProperty('source')
      })
    }

    // 특정 블록 타입에서 인라인 수식 존재 여부 확인
    const INLINE_MATH_TARGETS = new Set([
      'paragraph',
      'heading_1',
      'heading_2',
      'heading_3',
      'bulleted_list_item',
      'numbered_list_item',
    ])

    const blockIdsWithInlineMath = summary.inlineMath.filter((entry) => INLINE_MATH_TARGETS.has(entry.type))

    // 인라인 수식이 없다면 테스트는 실패시키지 않되, 최소한 데이터 구조가 존재하는지 검증
    expect(Array.isArray(summary.inlineMath)).toBe(true)
    blockIdsWithInlineMath.forEach((info) => {
      expect(info).toHaveProperty('blockId')
      expect(info).toHaveProperty('type')
    })

    // 디버깅/레퍼런스용 로그
    // eslint-disable-next-line no-console
    console.log('[notion-test] Block summary', summary)
  })
})

