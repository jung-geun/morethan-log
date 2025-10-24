# 작업 TODO 목록

이 파일은 현재 리포지토리에서 남아있는 주요 작업들을 우선순위와 상태, 다음 단계까지 정리한 것입니다.

## 개요
- 목적: image-proxy 신뢰성 확보, Notion recordMap 페이징 완전성 유지, SSG 페이지 데이터 크기 완화, 운영용 로그/모니터링 정비.
- 현재 상태: 빌드/렌더 오류(React hooks) 수정 완료. image-proxy 중첩 URL 처리 및 매핑 구현 완료. Notion 블록 페이징 구현 완료. 일부 presigned S3 URL에서 origin 400 응답 관찰됨(원인 분석 필요). 페이지 데이터가 큰 일부 슬러그에서 page-data > 128KB 경고 발생.

---

## 우선순위: 높은 (해결 필요)

1. S3 presigned URL origin 400 원인 조사 및 수정
   - 상태: 조사 중 (이미 unwrap 성공, 하지만 origin에서 400 응답)
   - 다음 단계:
     - `logs/image-proxy-errors.jsonl`의 rawRequestUrl/resolvedUrl 항목을 분석하여 쿼리 파라미터 누락/인코딩 차이 확인
     - `scripts/test-unpack-cases.js`로 문제 케이스 재현 및 다양한 디코딩/인코딩 변형 시도
     - 필요 시 Notion 원본(ingestion) 쪽에서 URL 변형을 방지하도록 조치
   - 검증:
     - 문제 케이스에 대해 curl/HEAD 요청으로 200 응답 확인
     - image-proxy에서 정상 서빙 및 캐시 헤더 확인

2. SSG page-data 크기(큰 페이지) 완화
   - 상태: 관찰됨 (`the-forward-forward-algorithm-summary` 등에서 ~207KB)
   - 옵션/다음 단계:
     - `optimizeRecordMap` 파라미터/로직을 더 공격적으로 설정해 불필요한 필드 제거
     - 무거운 블록(예: 대용량 코드블록, 임베드)를 클라이언트 측 lazy-load로 전환
     - 필요 시 server-side에서 필요한 블록만 포함하고 나머지는 API로 클라이언트에서 요청
   - 검증: `yarn build` 후 `.next/server/pages/<slug>.html` 또는 page-data 크기 확인

---

## 우선순위: 중간

3. 운영 로그(현재 JSONL) → Sentry/로그 DB 마이그레이션
   - 상태: JSONL로 기록 중 (`logs/image-proxy-errors.jsonl`, `logs/notion-image-diagnostics.jsonl`)
   - 다음 단계:
     - 민감 정보(쿼리 시그니처) 마스킹 정책 확정
     - Sentry 또는 중앙 로그 DB(Elasticsearch/LogDNA 등) 연동 계획
   - 검증: 로그가 중앙 시스템에 집계되는지 확인

4. CI 통합: unwrap 테스트 자동화
   - 상태: 로컬 스크립트 존재 (`scripts/test-unpack-cases.js`)
   - 다음 단계:
     - GitHub Actions에 Node 테스트 job 추가
     - PR에서 unwrap 회귀 테스트가 실패하면 차단
   - 검증: 액션에서 테스트 통과 확인

---

## 우선순위: 낮음

5. 이미지 프록시 모니터링/알림 개선
   - 상태: 선택적 Slack 노티파이 코드(있음)
   - 다음 단계:
     - 실패 임계치 설정 후 알림 트리거
     - 중요 케이스(다수 400 발생)만 알림

6. 문서화 및 운영 가이드
   - 상태: 일부 문서(CHECKLIST.md 등) 존재
   - 다음 단계:
     - image-proxy 동작 설명(unwrap 예시 포함) 문서 추가
     - 재현 가이드 및 디버깅 체크리스트 추가

---

## 즉시(오늘) 할 수 있는 작업
- `todo.md` 생성 (완료)
- image-proxy 실패 케이스별 재현 시도
  - 로컬에서: `node scripts/test-unpack-cases.js` 실행
- 빌드/페이지 크기 확인
  - `yarn build` 실행 후 경고/문제 페이지 식별

---

## 참고 명령어
- 로컬 unwrap 테스트
  - `node scripts/test-unpack-cases.js`
- 빌드 확인
  - `yarn build`
  - 빌드 후 특정 페이지 page-data 확인: `.next/server/pages/<slug>.html` 또는 빌드 로그의 `page-data` 경고 확인

---

## 담당 및 예상 시간
- presigned S3 400 원인 규명: 0.5–2일 (증상에 따라 다름)
- page-data 최적화: 1–3일(간단한 trim) 또는 1주 이상(아키텍처 변경 시)
- 로그 마이그레이션: 1–2일(설정) + 운영 검증

---

필요하시면 이 목록을 기반으로 PR을 만들어 드리거나, S3 400 케이스를 재현/디버깅하는 작업을 바로 시작하겠습니다. 어떤 항목을 우선적으로 처리할까요?