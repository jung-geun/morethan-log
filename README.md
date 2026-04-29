# MoreThanLog

> 이 프로젝트는 원본 [morethan-log](https://github.com/morethanmin/morethan-log) 를 기반으로 개선된 포크 버전입니다.

**원본 프로젝트**: [morethan-log](https://github.com/morethanmin/morethan-log) by [morethanmin](https://github.com/morethanmin)

[데모 블로그](https://blog.pieroot.xyz)

<img width="1715" alt="image" src="https://user-images.githubusercontent.com/72514247/209824600-ca9c8acc-6d2d-4041-9931-43e34b8a9a5f.png">

Notion 을 CMS 로 사용하는 Next.js 13 기반 블로그입니다.  
Notion v5 **Data Source API** 를 사용하며, 이중 캐시 계층과 Notion 데이터베이스 인라인 렌더링을 지원합니다.

## 🚀 주요 기능

### 📡 Notion v5 Data Source API
- `@notionhq/client v5` 공식 클라이언트로 Notion 데이터 조회 (`dataSources.query`)
- `NOTION_DATASOURCE_ID` 환경 변수 기반 설정

### ⚡ 이중 캐시 계층 (Memory + Filesystem)
- **L1**: 프로세스 내 인메모리 캐시 (TTL 기반, LRU)
- **L2**: `.notion-cache/` 파일시스템 캐시 — Docker 볼륨에서 cold start 후에도 유지
- Vercel 서버리스 환경에서는 자동으로 메모리 전용 모드로 전환
- `posts`, `recordMap`, `database` 세 종류를 각각 TTL 로 관리
- `last_edited_time` 기반 캐시 키 → Notion 에서 수정 시 자동 무효화

### 🗄️ Notion 데이터베이스 인라인 렌더링
- 페이지 본문 안의 `child_database` 블록을 **Table / Gallery / List** 뷰로 직접 렌더
- `view.type` 에 따라 자동 분기: `table` (기본) / `gallery` / `list`
- 지원 컬럼 타입: `title`, `rich_text`, `select`, `multi_select`, `date`, `url`, `checkbox`, `files`, `number`
- 데이터베이스 fetch 실패 시 "Notion 에서 보기" 링크 카드로 fallback

### 📄 다양한 콘텐츠 타입
- **Post** — 일반 블로그 포스트
- **Page** — About, Resume 등 정적 페이지
- **Paper** — 학술 논문 형식

### 🔁 자동 ISR 갱신
- `REVALIDATE_HOURS` 로 재생성 주기 설정 (기본 6시간)
- GitHub Actions 워크플로우로 주기적 캐시 무효화 (`/api/revalidate`)

### 👀 SEO 친화적
- OG 이미지 동적 생성, 사이트맵 자동 생성
- Google Analytics, Search Console, Utterances, Cusdis 플러그인 지원

### 🛠️ 개발 환경
- TypeScript strict, ESLint, Prettier
- Jest 단위 테스트 (캐시 계층, getDatabase, 렌더 컴포넌트)
- GitHub Actions CI/CD

---

## 📖 시작하기

1. 이 저장소를 [Fork](https://github.com/jung-geun/morethan-log/fork) 합니다.
2. [Notion Integration](https://www.notion.so/my-integrations) 을 생성하고 **Internal Integration Token** 을 복사합니다.
3. Notion 에서 블로그로 사용할 데이터베이스 페이지를 열고 우측 상단 `...` → `Add connections` 에서 위 Integration 을 연결합니다.
4. 데이터베이스 URL 의 ID 부분(`32자리 hex`)을 `NOTION_DATASOURCE_ID` 로 사용합니다.
5. 아래 환경 변수를 설정하고 배포합니다.

---

## 🔑 환경 변수

| 변수명 | 필수 | 설명 |
|--------|------|------|
| `NOTION_TOKEN` | ✅ | Notion Internal Integration Token |
| `NOTION_DATASOURCE_ID` | ✅ | Notion 데이터베이스 ID (32자리 hex) |
| `TOKEN_FOR_REVALIDATE` | 선택 | `/api/revalidate` 엔드포인트 보호 토큰 |
| `REVALIDATE_HOURS` | 선택 | ISR 재생성 주기 (시간, 기본값 6) |
| `NEXT_PUBLIC_GOOGLE_MEASUREMENT_ID` | 선택 | Google Analytics |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | 선택 | Google Search Console |
| `NEXT_PUBLIC_NAVER_SITE_VERIFICATION` | 선택 | Naver Search Advisor |
| `NEXT_PUBLIC_UTTERANCES_REPO` | 선택 | Utterances 댓글 레포 (예: `user/repo`) |

---

## 💾 캐시 동작

블로그 페이지 데이터(포스트 목록, 페이지 블록, 데이터베이스 행)는 **이중 캐시**로 보관됩니다.

| 계층 | 저장소 | 환경 |
|------|--------|------|
| L1 | 프로세스 메모리 | 항상 활성 |
| L2 | `.notion-cache/*.json` | Docker / 로컬 (Vercel 에서는 비활성) |

**Docker 에서 L2 캐시 영속화** (docker-compose 예시):
```yaml
services:
  blog:
    volumes:
      - notion-cache:/app/.notion-cache
volumes:
  notion-cache:
```

**캐시 TTL 기본값**
- 포스트 목록: `REVALIDATE_HOURS / 2` (기본 3시간)
- 페이지 블록(recordMap): `REVALIDATE_HOURS` (기본 6시간)
- 인라인 데이터베이스: 30분

**수동 캐시 무효화**:
```bash
curl "https://your-site.com/api/revalidate?secret=TOKEN_FOR_REVALIDATE"
```

---

## 🗄️ Notion 데이터베이스 임베드

Notion 페이지 본문에 데이터베이스를 `inline` 또는 `full-page` 로 삽입하면, 사이트에서 자동으로 렌더됩니다.

- **Table 뷰** (기본): 행/열 표 형태
- **Gallery 뷰**: Notion 에서 view type = `gallery` 로 설정 시 카드 그리드 렌더
- **List 뷰**: 데이터가 없을 경우 fallback

지원 컬럼 타입: `title`, `rich_text`, `select`, `multi_select`, `date`, `url`, `checkbox`, `files`, `number`

---

## ☁️ Vercel 배포

<details>
<summary>단계별 가이드 보기</summary>

1. 이 저장소에 ⭐ Star 하고 Fork 합니다.
2. Notion Integration 을 생성하고 데이터베이스에 연결합니다.
3. Vercel 에 로그인 → **Add New...** → Fork 한 저장소 Import.
4. 환경 변수(NOTION_TOKEN, NOTION_DATASOURCE_ID 등)를 추가합니다.
5. 배포가 완료되면 블로그를 확인합니다.

</details>

## 🐳 Docker 로컬 실행

```bash
# .env 파일 생성
NOTION_TOKEN=secret_xxxxx
NOTION_DATASOURCE_ID=xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# 실행
docker compose up -d

# 로그 확인
docker compose logs -f
```

실행 후 http://localhost:3000 에서 확인합니다.

### Docker 이미지 태그

| 태그 | 설명 |
|------|------|
| `latest` | 정식 릴리스 (`v*` 태그 푸시) |
| `dev` | `dev` 브랜치 |
| `nightly` | `main` 브랜치 |

```bash
docker run -d -p 3000:3000 --env-file .env ghcr.io/jung-geun/morethan-log:latest
```

---

## 🧪 개발

```bash
npm install
npm run dev          # 개발 서버
npm run build        # 프로덕션 빌드
npm run type-check   # TypeScript 검사
npm run lint         # ESLint
npm run test         # Jest 전체 테스트
npm run test:coverage
```

---

## ❓ FAQ

<details>
<summary>FAQ 보기</summary>

**Q1: NOTION_TOKEN 과 NOTION_DATASOURCE_ID 는 어떻게 얻나요?**

A1: [Notion Integrations](https://www.notion.so/my-integrations) 에서 Integration 을 만들면 토큰을 얻습니다. 데이터베이스 URL 에서 32자리 ID 를 추출하세요.

**Q2: 글이 업데이트되지 않아요.**

A2: `REVALIDATE_HOURS` 를 낮추거나 `/api/revalidate` 를 수동 호출하세요. Docker 환경에서는 `.notion-cache/` 볼륨을 삭제하면 즉시 갱신됩니다.

**Q3: 데이터베이스가 페이지 안에서 보이지 않아요.**

A3: Notion Integration 이 해당 데이터베이스에도 연결(Add connections)되어 있어야 합니다.

**Q4: Docker 컨테이너가 시작되지 않아요.**

A4: `docker logs <container_id>` 로 오류를 확인하세요. `NOTION_TOKEN`, `NOTION_DATASOURCE_ID` 설정 여부를 먼저 체크합니다.

</details>

## 🤝 기여하기

[기여 가이드](.github/CONTRIBUTING.md) 를 확인해 주세요.

## 📄 라이선스

[MIT License](LICENSE)
