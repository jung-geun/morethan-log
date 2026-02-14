# MoreThanLog (개선된 포크 버전)

> 이 프로젝트는 원본 [morethan-log](https://github.com/morethanmin/morethan-log) 프로젝트를 기반으로 개선된 포크 버전입니다. 원본 개발자의 훌륭한 작업에 깊이 감사드리며, 그 기반 위에 추가 기능들을 구현했습니다.

**원본 프로젝트**: [morethan-log](https://github.com/morethanmin/morethan-log) by [morethanmin](https://github.com/morethanmin)

[데모 블로그](https://morethan-log.vercel.app) | [데모 이력서](https://morethan-log.vercel.app/resume)

<img width="1715" alt="image" src="https://user-images.githubusercontent.com/72514247/209824600-ca9c8acc-6d2d-4041-9931-43e34b8a9a5f.png">

Notion을 콘텐츠 관리 시스템(CMS)으로 사용하는 Next.js 기반 정적 블로그입니다. 이 개선 버전은 향상된 Notion 통합, 자동 업데이트, 추가 기능을 제공합니다.

## 🚀 주요 기능

### 🔧 향상된 Notion 통합
- **다양한 Notion 블록 지원**: 데이터베이스, 토글, 콜아웃 등 Notion의 고급 블록 완벽 지원
- **개선된 미디어 처리**: 향상된 이미지 프록시 및 미디어 콘텐츠 처리
- **커스텀 컴포넌트**: Notion 특화 기능에 대한 확장 렌더링

### ⚡ 자동 업데이트 및 성능
- **자동 ISR 갱신**: GitHub Actions 워크플로우를 통한 주기적 콘텐츠 업데이트
- **최적화된 캐싱**: 더 나은 성능을 위한 향상된 캐싱 전략
- **안정적인 에러 처리**: 강력한 에러 처리 및 폴백 메커니즘

### 🛠️ 개발 및 테스트
- **종합적인 테스트**: 커버리지 리포트와 함께하는 Jest 테스트 스위트
- **CI/CD 파이프라인**: 자동화된 테스트 및 배포 워크플로우
- **코드 품질**: ESLint, Prettier, TypeScript strict mode 적용

### 🎨 향상된 UI/UX
- **개선된 테마 시스템**: 더 나은 다크/라이트 모드 전환
- **모바일 최적화**: 향상된 반응형 디자인
- **접근성**: 개선된 ARIA 라벨 및 키보드 내비게이션

### 📒 Notion을 활용한 글쓰기
- 블로그 포스팅을 위해 Github에 커밋할 필요 없음
- Notion에서 작성한 글이 자동으로 사이트에 업데이트됨

### 📄 이력서 페이지로 활용
- Notion을 사용해 전체 페이지 사이트 생성 가능
- 이력서, 포트폴리오 등으로 활용 가능

### 👀 SEO 친화적
- 게시글용 OG 이미지(썸네일) 동적 생성 ([og-image-korean](https://github.com/morethanmin/og-image-korean))
- 게시글용 사이트맵 동적 생성

### 🤖 설정을 통한 다양한 플러그인 지원
- `site.config.js`를 통해 프로필 정보 업데이트 가능
- Google Analytics, Search Console, Utterances(GitHub Issues 댓글), Cusdis 등 플러그인 지원

## 🐳 Docker 이미지 태그 설명

이 프로젝트는 GitHub Container Registry를 통해 Docker 이미지를 제공합니다. `docker-build.yml` 워크플로우에 따라 다음 태그들이 자동 생성됩니다:

| 태그 | 설명 | 생성 시점 |
|------|------|-----------|
| `latest` | 정식 릴리스 버전 | `v*` 태그 푸시 시 (예: v1.0.0) |
| `dev` | 개발 브랜치 버전 | `dev` 브랜치 푸시 시 |
| `nightly` | 최신 개발 버전 | `main`/`master` 브랜치 푸시 시 |

### 추가 태그

Semver 태그 푸시 시 (예: `v1.2.3`):
- `1.2.3` - 전체 버전
- `1.2` - 마이너 버전
- `1` - 메이저 버전

Pull Request 생성 시:
- `pr-{번호}` - PR 번호에 해당하는 태그 (예: `pr-42`)

## 📖 시작하기

1. 이 저장소에 ⭐ Star를 눌러주세요.
2. 내 프로필로 [Fork](https://github.com/jung-geun/morethan-log/fork) 합니다.
3. [Notion 템플릿](https://pieroot.notion.site/307067c015d080d987eadd99c8369f92?v=307067c015d0817a87a8000c109eb446&source=copy_link)을 복제하고, "웹에 공유"를 활성화합니다.
4. 웹 링크를 복사하고 Notion Page ID를 기록해 둡니다. 링크 형식: `[username.notion.site/NOTION_PAGE_ID?v=VERSION_ID]`
5. Fork한 저장소를 클론하고 `site.config.js`를 원하는 대로 커스터마이즈합니다.
6. 아래 배포 방법 중 하나를 선택하여 배포합니다.

### Vercel 배포에 필요한 환경 변수

| 변수명 | 필수 여부 | 설명 |
|--------|----------|------|
| `NOTION_PAGE_ID` | 필수 | "웹에 공유" URL에서 추출한 Notion 페이지 ID |
| `NEXT_PUBLIC_GOOGLE_MEASUREMENT_ID` | 선택 | Google Analytics 플러그인용 |
| `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION` | 선택 | Google Search Console 플러그인용 |
| `NEXT_PUBLIC_NAVER_SITE_VERIFICATION` | 선택 | Naver Search Advisor 플러그인용 |
| `NEXT_PUBLIC_UTTERANCES_REPO` | 선택 | Utterances 플러그인용 |

## ☁️ Vercel 배포 방법

### 빠른 배포 (10단계 가이드)

<details>
   <summary>단계별 가이드 보기</summary>

   0. Notion, Vercel 계정을 준비합니다.

   1. ⭐ 이 저장소에 `Star`하고 `Fork` 합니다.

   2. [Notion 템플릿](https://quasar-season-ed5.notion.site/12c38b5f459d4eb9a759f92fba6cea36?v=2e7962408e3842b2a1a801bf3546edda)을 클릭하면 브라우저에 Notion 페이지가 열립니다. 오른쪽 상단의 `Duplicate` 버튼을 클릭합니다.

   3. Notion 앱에서 내 계정의 Notion 페이지를 확인할 수 있습니다.

   4. 오른쪽 상단의 `Share`와 `Publish`를 클릭하고 웹 링크를 확인합니다. (웹 링크 복사)

   5. Fork한 저장소의 **site.config.js** 파일을 `수정`합니다.

   6. Vercel에 로그인합니다.

   7. **Add New...**를 사용해 새 프로젝트를 `생성`합니다.

   8. Fork한 morethan-log 저장소를 `Import` 합니다.

   9. Vercel 프로젝트에 환경 변수를 `추가`합니다.

   10. 배포가 완료될 때까지 `기다립니다`. 배포가 성공하면 아래와 같은 화면이 보입니다.

   🥳 축하합니다. 이제 블로그를 확인해 보세요!

</details>

## 🐳 Docker 로컬 실행 방법

Docker를 사용하여 로컬 환경에서 실행할 수 있습니다.

### 환경 변수 파일 생성

먼저 `.env` 파일을 생성합니다:

```bash
NOTION_PAGE_ID=your_notion_page_id
NEXT_PUBLIC_GOOGLE_MEASUREMENT_ID=your_measurement_id  # 선택
NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION=your_verification  # 선택
```

### docker-compose 사용

```bash
# 백그라운드에서 실행
docker-compose up -d

# 로그 확인
docker-compose logs -f

# 중지
docker-compose down
```

### 직접 Docker 실행

```bash
# 최신 버전 실행
docker run -d -p 3000:3000 --env-file .env ghcr.io/jung-geun/morethan-log:latest

# 개발 버전 실행
docker run -d -p 3000:3000 --env-file .env ghcr.io/jung-geun/morethan-log:dev

# nightly 버전 실행
docker run -d -p 3000:3000 --env-file .env ghcr.io/jung-geun/morethan-log:nightly
```

실행 후 http://localhost:3000 에서 블로그를 확인할 수 있습니다.

## ❓ FAQ

<details>
   <summary>FAQ 보기</summary>

   **Q1: avatar.svg를 만든 후 favicon.ico와 apple-touch-icon.png는 어떻게 만드나요?**

   A1: https://www.favicon-generator.org/ 를 참고하세요.

   **Q2: 사이트맵 파일을 직접 설정해야 하나요?**

   A2: 시스템이 자동으로 sitemap.xml을 생성하므로 직접 설정할 필요가 없습니다.

   **Q3: 왜 Notion 게시글이 자동으로 업데이트되지 않나요?**

   A3: site.config.js의 revalidateTime을 설정하고 업데이트에 얼마나 걸리는지 관찰해 보세요.

   **Q4: site.config.js의 NEXT_PUBLIC_GOOGLE_MEASUREMENT_ID와 NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION에는 무엇을 입력해야 하나요?**

   A4: https://github.com/morethanmin/morethan-log/issues/203 를 참고하세요. 설정 후 업데이트가 반영되는 데 시간이 걸릴 수 있습니다.

   **Q5: Docker 컨테이너가 실행되지 않아요.**

   A5: `.env` 파일에 `NOTION_PAGE_ID`가 올바르게 설정되어 있는지 확인하세요. 또한 Docker 로그를 확인하여 구체적인 에러 메시지를 파악할 수 있습니다: `docker logs <container_id>`

   다른 문제가 발생하면 GitHub Issues에 자유롭게 등록해 주세요. 다른 사용자들에게도 도움이 됩니다!

</details>

## 🤝 기여하기

[기여 가이드](.github/CONTRIBUTING.md)를 확인해 주세요.

## 📄 라이선스

[MIT License](LICENSE)를 따릅니다.