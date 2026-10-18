# 딸깍 출판 방법 및 예시

LLM(대형 언어 모델) 단독 생성으로 단행본 규격(약 12만 자, 200페이지 내외)의 롱폼 도서를 집필하고, mdpress를 통해 출판 규격의 PDF 및 EPUB 문서로 완성하는 워크플로와 구성 예시다.

---

## 1. 개요 및 파이프라인

기획 정의부터 최종 전자책/인쇄용 PDF 빌드까지 일체의 수작업 편집 없이 정형화된 규칙 기반으로 진행한다.

```
[아이디어 기획] idea.md
       ↓
[집필 명세서 작성] rules-GEMINI.md (구조, 네거티브 프롬프팅, 파일명 규칙)
       ↓
[LLM 분할 집필] 세부 절 단위 마크다운 생성 (총 29개 절, Flat 구조)
       ↓
[도비라/간지 생성] ch00.md ~ ch08.md (장 구분 페이지)
       ↓
[빌드 설정 및 스타일링] book.yaml, custom.css (중앙 정렬, A5/A4 판형)
       ↓
[출판물 렌더링] mdpress build --format pdf (또는 epub)
```

---

## 2. 단계별 작업 흐름

### 1) 기획 및 서사 공식 정의 (idea.md)
- 장르별 클리셰와 서사 구조를 챕터 비중과 글자 수(10만-15만 자) 단위로 구체화한다.
- 예: 현실 부정(15%) → 법칙 발견(20%) → 시스템 프레임워크(40%) → 성공 사례(15%) → 공포 기반 전환 퍼널(10%).

### 2) 집필 규칙 및 제약 수립 (rules-GEMINI.md)
LLM 특유의 기계적 문체를 차단하고 분량을 강제하기 위해 시스템 규칙을 정의한다.
- **분량 제약**: 장(Chapter) 단위가 아닌 세부 절(Section) 단위로 작성 (절당 4,000-5,000자).
- **네거티브 프롬프팅**:
  - 상투적 접속어('결론적으로', '더 나아가' 등) 및 AI 어미('~라고 할 수 있습니다') 금지.
  - 문단 첫 머리 지시사('이것은', '이러한' 등) 금지.
  - 강조 asterisk(`**`) 사용 배제.
  - 범위 표기 시 마크다운 취소선 충돌 방지를 위해 물결표(`~`) 대신 붙임표(`-`) 강제.
- **저장 구조**: 하위 디렉터리 없는 Flat 파일 구조 유지 (`ch01_sec01_slug.md`).

### 3) LLM 절 단위 집필
- `rules-GEMINI.md`의 명세를 바탕으로 각 절 파일을 독립적으로 순차 생성한다.
- 각 파일의 헤더는 `## {절제목}` 형식을 일관되게 적용한다.

### 4) 장 간지(도비라) 페이지 생성
- 단행본 출판 규격에 맞추어 장 전환 시 시각적 구분을 위한 간지 파일(`ch00.md`~`ch08.md`)을 생성한다.
- 내용 예시:
  ```markdown
  <div class="part-divider">

  # 제1장. 잔인한 진실: 성실함이 당신을 가난하게 만든다

  </div>
  ```

### 5) 스타일시트 적용 (custom.css)
- 간지 페이지의 텍스트가 페이지 정중앙(상하좌우)에 배치되도록 flexbox 스타일을 지정한다.
  ```css
  .part-divider {
    min-height: 85vh;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    text-align: center;
  }
  @media print {
    .part-divider {
      page-break-after: always !important;
      break-after: page !important;
    }
  }
  ```

### 6) mdpress 빌드 설정 (book.yaml)
- `chapters` 리스트에 `장 간지 파일`과 하위 `절 파일`들을 차례대로 등록한다.
- 목차에는 간지 파일의 장 제목과 각 절 고유의 제목이 분리되어 정갈하게 렌더링된다.

```yaml
book:
  title: "성공포르노 자기계발서"
  subtitle: "40대 찐따 직장인 순자산 50억 + 월 천 달성기"
  author: "잔문작가"
  language: "ko-KR"

chapters:
  - title: "제1장. 잔인한 진실: 성실함이 당신을 가난하게 만든다"
    file: "ch01.md"
  - title: "월급쟁이의 저주와 노동소득의 한계"
    file: "ch01_sec01_salary_trap.md"
  - title: "세금과 인플레이션이 가져가는 은밀한 수탈"
    file: "ch01_sec02_tax_and_inflation.md"

style:
  theme: "elegant"
  page_size: "A5"
  custom_css: "custom.css"

output:
  filename: "성공포르노_자기계발서.pdf"
  toc: true
  cover: true
```

---

## 3. 빌드 및 출력 실행

설치된 mdpress를 사용하여 최종 산출물을 생성한다.

```bash
# PDF 단행본 빌드 (A5 규격)
mdpress build --format pdf
# mdpress build --format pdf -o ../pdf/

# 전자책(EPUB) 빌드
mdpress build --format epub

# 로컬 실시간 미리보기 서버 구동
mdpress serve
```
