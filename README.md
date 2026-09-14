# 📚 PDF 3D Bookcase & Flipbook

PDF 문서를 브라우저 자원(GPU/CPU)을 활용해 직접 렌더링하고, **3D 책장(Virtual Bookshelf)** 및 **가상화(Virtualization) 기반 플립북(Flipbook)** 효과를 제공하는 정적 웹 애플리케이션이다.

서버 사이드 이미지 변환 파이프라인(Poppler/pdf2image)을 걷어내고 **Mozilla PDF.js**와 **st-page-flip**을 연동하여, 빌드 시간 0초와 가벼운 저장소 구조를 유지한다.

ref: [onlinebooks.co.kr](https://onlinebooks.co.kr/)

---

## 🛠 아키텍처 및 동작 원리

```
[PDF 업로드 (pdf/)] ──push──▶ [GitHub Actions (초고속 메타데이터 추출)]
                                        │
                              [pdf-data.json 자동 갱신]
                                        │
                               [GitHub Pages 배포]
                                        │
                         [방문자 브라우저 (PDF.js 온디맨드 렌더링)]
```

- **클라이언트 렌더링**: 원본 PDF 파일을 브라우저가 직접 비동기 스트리밍 로드.
- **페이지 가상화(Virtualization)**: 현재 화면에 보이는 페이지 및 앞뒤 버퍼(±2페이지)만 선별 렌더링하고, 범위 밖 캔버스는 메모리에서 해제하여 저사양/모바일 기기 메모리 고갈 방지.
- **선명도 최적화**: `window.devicePixelRatio`와 스케일을 연동해 고해상도 모니터에서도 텍스트가 깨지지 않음.

---

## 📁 디렉토리 구조 (Zero-Depth)

```
lab-pdf-bookcase/
├── .github/workflows/
│   └── pdf-data-process.yml  # [CI] pdf-data.json 자동 갱신 워크플로우
├── pdf/                      # [Input] 원본 PDF 파일 및 표지 이미지(*-cover.png) 보관
├── style.css                 # 3D Bookshelf 및 플립북 스타일 (Neo-Brutalism)
├── script.js                 # 책장 렌더링, PDF.js 가상화 및 PageFlip 제어
├── index.html                # 3D Virtual Bookshelf (메인 화면)
├── viewer.html               # Page-flip 기반 플립북 뷰어
├── pdf-data.json             # 서가 도서 메타데이터 (자동 갱신)
├── pdf-process.py            # 경량 메타데이터 추출 스크립트 (외부 의존성 없음)
└── README.md
```

---

## 🚀 빠른 시작 가이드

### 1. 책 추가 방법
1. `pdf/` 디렉토리에 원하는 PDF 파일(예: `sample.pdf`)을 추가한다.
2. (선택) 동일한 이름으로 표지 이미지(예: `sample-cover.png`)를 넣으면 서가 표지로 사용된다.
3. 메타데이터 생성 스크립트를 실행한다.
   ```bash
   python3 pdf-process.py
   ```
   `pdf-data.json` 파일이 자동 갱신된다.

### 2. 로컬 실행
별도 패키지 설치 없이 Python 기본 내장 웹 서버로 즉시 구동 가능하다.
```bash
python3 -m http.server 3030
```
브라우저에서 `http://localhost:3030` 접속.

---

## 🌐 GitHub 자동 배포 설정

### A. Actions 쓰기 권한 설정 (필수)
새 PDF가 업로드될 때 로봇이 `pdf-data.json`을 자동 갱신하여 커밋할 수 있도록 권한을 부여한다.
1. 저장소의 **Settings** > **Actions** > **General** 이동.
2. **Workflow permissions** 섹션에서 **Read and write permissions** 선택 후 저장.

### B. GitHub Pages 활성화
1. 저장소의 **Settings** > **Pages** 이동.
2. **Build and deployment**의 Source를 `Deploy from a branch`로 선택.
3. Branch를 `main` / `/(root)`로 지정 후 저장.

### C. 자동화 동작 흐름
- `pdf/`에 PDF를 푸시하면 GitHub Actions가 `pdf-process.py`를 실행하여 `pdf-data.json`을 갱신하고 `[skip ci]` 커밋을 생성한다.
- 커밋 직후 GitHub Pages를 통해 배포 사이트에 자동 반영된다.

---

## 🗂 pdf-data.json 스키마

```json
[
  {
    "id": "sample-book",
    "title": "sample book",
    "cover": "pdf/sample-book-cover.png",
    "pdfUrl": "pdf/sample-book.pdf",
    "pages": 12
  }
]
```
