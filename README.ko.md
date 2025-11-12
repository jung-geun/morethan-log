# MoreThanLog (향상된 포크)

> **참고**: 이 프로젝트는 원본 [morethan-log](https://github.com/morethanmin/morethan-log)의 향상된 포크입니다. 원본 창조자의 훌륭한 기반을 존중하며 그 위에서 빌드하고 있습니다.

<img width="1715" alt="image" src="https://user-images.githubusercontent.com/72514247/209824600-ca9c8acc-6d2d-4041-9931-43e34b8a9a5f.png">

Notion을 콘텐츠 관리 시스템(CMS)으로 사용하는 Next.js 정적 블로그입니다. 이 향상된 버전은 원본 프로젝트의 기능을 완전히 호환하면서도 고급 Notion 통합, 자동화된 업데이트 및 추가 기능으로 확장합니다.

**원본 프로젝트**: [morethan-log](https://github.com/morethanmin/morethan-log) by [morethanmin](https://github.com/morethanmin)

[데모 블로그](https://morethan-log.vercel.app) | [데모 이력서](https://morethan-log.vercel.app/resume)

## 🚀 향상된 기능

### 🔧 고급 Notion 통합
- **풍부한 Notion 블록**: 데이터베이스, 토글, 콜아웃 등 Notion의 고급 블록 완전 지원
- **향상된 미디어 처리**: 개선된 이미지 프록시 및 미디어 콘텐츠 처리
- **커스텀 컴포넌트**: Notion 특정 기능을 위한 확장된 렌더링

### ⚡ 자동화된 업데이트 및 성능
- **자동화된 ISR 리밸리데이션**: 주기적인 콘텐츠 업데이트를 위한 GitHub Actions 워크플로우
- **최적화된 캐싱**: 더 나은 성능을 위한 향상된 캐싱 전략
- **오류 처리**: 강력한 오류 처리 및 폴백 메커니즘

### 🛠️ 개발 및 테스팅
- **포괄적인 테스팅**: 커버리지 리포팅이 포함된 Jest 테스트 스위트
- **CI/CD 파이프라인**: 자동화된 테스팅 및 배포 워크플로우
- **코드 품질**: ESLint, Prettier, TypeScript 엄격 모드

### 🎨 향상된 UI/UX
- **개선된 테마 시스템**: 더 나은 다크/라이트 모드 전환
- **모바일 최적화**: 향상된 반응형 디자인
- **접근성**: 개선된 ARIA 레이블 및 키보드 네비게이션

## 원본 기능

**📒 Notion으로 게시물 작성**

- 웹사이트에 무언가를 게시하기 위해 Github에 커밋할 필요가 없습니다.
- Notion에서 만든 게시물은 사이트에 자동으로 업데이트됩니다.

**📄 이력서로 페이지 사용**

- Notion을 사용하여 전체 페이지 사이트를 생성하는 데 유용합니다.
- 이력서, 포트폴리오 등에 사용할 수 있습니다.

**👀 SEO 친화적**

- 게시물에 대한 OG IMAGE(썸네일!)를 동적으로 생성합니다. ([og-image-korean](https://github.com/morethanmin/og-image-korean)).
- 게시물에 대한 사이트맵을 동적으로 생성합니다.

**🤖 CONFIG를 통한 다양한 플러그인 지원 및 사용자 정의**

- 프로필 정보는 Config를 통해 업데이트할 수 있습니다. (`site.config.js`)
- 플러그인 지원에는 Google Analytics, Search Console, Github Issues(Utterances) 또는 Cusdis를 통한 댓글 기능이 포함됩니다.

## 시작하기

1. 이 저장소에 Star를 누르세요.
2. 저장소를 프로필로 [Fork](https://github.com/morethanmin/morethan-log/fork) 하세요.
3. [이 Notion 템플릿](https://morethanmin.notion.site/12c38b5f459d4eb9a759f92fba6cea36?v=2e7962408e3842b2a1a801bf3546edda)을 복제하고 웹으로 공유하세요.
4. 웹 링크를 복사하고 링크에서 Notion 페이지 ID를 기록해두세요. 형식은 다음과 같습니다: [username.notion.site/`NOTION_PAGE_ID`?v=`VERSION_ID`].
5. 포크된 저장소를 클론하고 선호도에 따라 `site.config.js`를 사용자 정의하세요.
6. Vercel에 다음 환경 변수로 배포하세요.

   - `NOTION_PAGE_ID` (필수): 웹 공유 URL에서 얻은 Notion 페이지 ID입니다. 전체 URL이 아니라 위에 표시된 NOTION_PAGE_ID 부분만 입력합니다.
   - `NEXT_PUBLIC_GOOGLE_MEASUREMENT_ID`: Google analytics 플러그인용입니다.
   - `NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION`: Google search console 플러그인용입니다.
   - `NEXT_PUBLIC_NAVER_SITE_VERIFICATION`: Naver search advisor 플러그인용입니다.
   - `NEXT_PUBLIC_UTTERANCES_REPO`: Utterances 플러그인용입니다.

## 자신만의 morethan-log를 만드는 10단계 (23.06.23 기준)

<details>
   <summary> 가이드 보기 </summary>
   
   0. Notion, Vercel 계정을 준비하세요.

   1. ⭐ 이 저장소를 `Star`하고 `Fork`하세요.
   <img src='https://github.com/jhk0530/morethan-log/assets/6457691/b0421776-2bfe-42bc-ae31-d90206fd5789' width = '500'>
   <img src='https://github.com/jhk0530/morethan-log/assets/6457691/185a8e4c-4ae2-4a38-b6f4-dc2a06a45c28' width = '500'>

   2. [Notion 템플릿](https://quasar-season-ed5.notion.site/12c38b5f459d4eb9a759f92fba6cea36?v=2e7962408e3842b2a1a801bf3546edda)을 `클릭`하면 브라우저에서 이 notion 페이지를 보게 됩니다. 오른쪽 상단의 `Duplicate` 버튼(이미지에서 복제)을 클릭하세요.
   <img src='https://github.com/jhk0530/morethan-log/assets/6457691/a5375429-28f0-4bba-a355-0d391cad58db' width = '500'>

   3. 그러면 계정에서 `notion app의 notion 페이지`를 보게 될 것입니다.
   <img src='https://github.com/jhk0530/morethan-log/assets/6457691/09af5533-43d9-48e5-95eb-dcac84c97c1f' width = '500'>

   4. 오른쪽 상단에서 `Share`와 `Publish`를 클릭하고 웹 링크를 확인하세요. (웹 링크 복사)
   <img src='https://github.com/jhk0530/morethan-log/assets/6457691/886fe4a2-79ca-4dbc-b1e1-93984e7e3f44' width = '500'>
   
   5. **자신의** 포크된 저장소에서 **site.config.js** 파일을 `수정`하세요.
   > 💡 참고. 저는 **2개의 빨간색 부분**을 변경했습니다
   <img src='https://github.com/jhk0530/morethan-log/assets/6457691/3d9c0da5-92bc-4372-8752-7bfc810b4986' width = '500'>

   6. vercel로 이동하여 `로그인`하세요.
   <img src='https://github.com/jhk0530/morethan-log/assets/6457691/07742ad0-4766-43b0-9ebd-5311f9711bc2' width = '500'>

   7. **Add New...**를 사용하여 새 프로젝트를 `빌드`하세요
   <img src='https://github.com/jhk0530/morethan-log/assets/6457691/517d46be-9bf-4181-aaa5-e9bd2fcdc822' width = '500'>

   8. **자신의 포크된 morethan-log 저장소**를 `가져오기`하세요
   <img src='https://github.com/jhk0530/morethan-log/assets/6457691/07742ad0-4766-43b0-9ebd-5311f9711bc2' width = '500'>

   9. vercel 프로젝트에 **환경 변수**를 `추가`하세요
   <img src='https://github.com/jhk0530/morethan-log/assets/6457691/703b50a3-3a90-4915-ab73-1baca4c285f8' width = '500'>

   10. 배포가 완료될 때까지 `기다리세요`. 배포가 성공하면 아래와 같은 이미지가 보여야 합니다.
   <img src='https://github.com/jhk0530/morethan-log/assets/6457691/a7d72caa-4354-4f81-9577-c773faeed7c6' width = '500'>

   🥳 축하합니다. 이제 블로그를 확인해보세요
   
   <img src='https://github.com/jhk0530/morethan-log/assets/6457691/3876a273-a270-47ef-a2ad-663519d9e537' width = '500'>

</details>

## FAQ

<details>
   <summary> FAQ 보기 </summary>
   Q1: avatar.svg를 만들었으면 favicon.ico와 apple-touch-icon.png는 어떻게 만들나요?
   
   A1: https://www.favicon-generator.org/를 확인해보세요.
   
   Q2: 사이트맵 파일을 설정해야 하나요?   
   A2: 시스템이 sitemap.xml을 동적으로 생성하므로 수동 설정이 필요 없습니다.

   Q3: Notion 게시물이 자동으로 업데이트되지 않는 이유는 무엇인가요?   
   A3: site.config.js에서 revalidateTime을 설정하고 업데이트되는 데 얼마나 걸리는지 관찰해보세요.
   
   Q4: site.config.js에서 NEXT_PUBLIC_GOOGLE_MEASUREMENT_ID와 NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION에 무엇을 입력해야 하나요?
   A4: https://github.com/morethanmin/morethan-log/issues/203을 확인할 수 있습니다. 설정 후 효과가 나타나기까지는 시간이 걸릴 수 있다는 점을 참고하세요.

다른 문제가 발생하면 자유롭게 GitHub README에 추가하여 미래 사용자를 도울 수 있습니다. 여러분의 기여를 기대합니다!

</details>

## 기여하기

[기여 가이드](.github/CONTRIBUTING.md)를 확인하세요.

### 기여자

<!--
기여자 템플릿:
<a href="https://github.com/{username}"><img src="{src}" width="50px" alt="{username}" /></a>&nbsp;&nbsp;
-->

<a href="https://github.com/morethanmin/morethan-log/graphs/contributors">
<img src="https://contrib.rocks/image?repo=morethanmin/morethan-log" />
</a>

## 지원

morethan-log는 MIT 라이선스 오픈 소스 프로젝트입니다. 훌륭한 후원자들의 지원 덕분에 성장할 수 있습니다.

### 후원자

<!--
후원자 템플릿:
<a href="https://github.com/{uesrname}"><img src="{src}" width="50px" alt="{username}" /></a>&nbsp;&nbsp;
-->

<p>
<a href="https://github.com/siyeons"><img src="https://avatars.githubusercontent.com/u/35549653?v=4" width="50px" alt="siyeons" /></a>&nbsp;&nbsp;
</p>

## 라이선스

[MIT 라이선스](LICENSE).
