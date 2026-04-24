# Repository Guidelines / 레포지토리 가이드라인

** version 1.0.0 **

## Project Structure & Module Organization / 프로젝트 구조 및 모듈 구성
This repository is a small static prototype for a single game stage. The main implementation lives in `index.html`, which contains the HTML structure, CSS, and UI composition in one file. Visual references and exported mockups live under `image/`, with stage and interaction samples in `image/basic-design/`. Planning notes and gameplay intent are tracked in `plan.md`.

이 레포지토리는 단일 게임 스테이지를 위한 작은 정적 프로토타입입니다. 주요 구현은 `index.html`에서 이루어지며, HTML 구조, CSS, UI 구성이 하나의 파일에 포함되어 있습니다. 시각적 참조 및 내보낸 목업은 `image/` 아래에 있으며, 스테이지 및 상호작용 샘플은 `image/basic-design/`에 있습니다. 기획 노트와 게임플레이 의도는 `plan.md`에서 관리됩니다.

## Build, Test, and Development Commands / 빌드, 테스트 및 개발 명령어
There is no build step or package manifest in the current repo.
현재 레포지토리에는 빌드 단계나 패키지 매니페스트가 없습니다.

`python -m http.server 8000`
Serves the project locally for browser testing at `http://localhost:8000`.
`http://localhost:8000`에서 브라우저 테스트를 위해 프로젝트를 로컬로 실행합니다.

`npx serve .`
Alternative static server if Node.js is already installed.
Node.js가 이미 설치된 경우 사용할 수 있는 대체 정적 서버입니다.

`git status`
Checks whether `index.html`, assets, or planning files changed before committing.
커밋하기 전에 `index.html`, 에셋 또는 기획 파일이 수정되었는지 확인합니다.

## Coding Style & Naming Conventions / 코딩 스타일 및 이름 규칙
Use 4-space indentation in HTML and CSS to match the existing file. Keep utility-heavy Tailwind classes inline, and use descriptive kebab-case class names for custom styles such as `.lava-fall`, `.stone-bridge`, and `.goal-area`. Prefer grouping related CSS blocks by feature and keep large visual sections marked with short comments. When adding assets, use lowercase, hyphenated names like `interaction-portal.png`.

기존 파일과 맞추기 위해 HTML 및 CSS에서 4칸 들여쓰기를 사용하세요. 유틸리티 중심의 Tailwind 클래스는 인라인으로 유지하고, `.lava-fall`, `.stone-bridge`, `.goal-area`와 같이 커스텀 스타일에는 서술적인 kebab-case 클래스 이름을 사용하세요. 기능별로 관련 CSS 블록을 그룹화하고, 큰 시각적 섹션에는 짧은 주석을 남기는 것을 권장합니다. 에셋을 추가할 때는 `interaction-portal.png`와 같이 소문자와 하이픈으로 연결된 이름을 사용하세요.

## Testing Guidelines / 테스트 가이드라인
There is no automated test suite yet. Validate changes by serving the page locally and checking layout, overflow, and readability at common desktop and mobile viewport sizes in the browser. For UI edits, confirm external dependencies still load: Tailwind CDN and Google Fonts are required for the current presentation.

아직 자동화된 테스트 스위트가 없습니다. 페이지를 로컬에서 실행하고 브라우저에서 일반적인 데스크톱 및 모바일 뷰포트 크기에 맞춰 레이아웃, 오버플로우, 가독성을 확인하여 변경 사항을 검증하세요. UI 수정 시 Tailwind CDN 및 Google Fonts 등 외부 종속성이 여전히 잘 로드되는지 확인해야 합니다.

## Commit & Pull Request Guidelines / 커밋 및 풀 리퀘스트 가이드라인
Recent history uses short, imperative commits with conventional prefixes such as `feat:` and `chore:` plus stage-specific context. Follow that pattern, for example: `feat: refine stage 09 goal UI`. Keep commits scoped to one concern.

최근 히스토리는 `feat:`, `chore:`와 같은 관례적인 접두사와 스테이지별 컨텍스트가 포함된 짧고 명령조인 커밋 메시지를 사용하고 있습니다. 이 패턴을 따라 예를 들어 `feat: refine stage 09 goal UI`와 같이 작성하세요. 커밋은 하나의 관심사에 집중되게 유지하세요.

Pull requests should include a short summary, note any changed assets under `image/`, and attach updated screenshots for visual changes. Link the relevant issue or planning note when the change implements a stage concept from `plan.md`.

풀 리퀘스트에는 짧은 요약을 포함하고, `image/` 아래에서 변경된 에셋을 기록하며, 시각적 변경 사항에 대해서는 업데이트된 스크린샷을 첨부하세요. `plan.md`의 스테이지 컨셉을 구현하는 변경사항인 경우 관련 이슈나 기획 노트를 링크하세요.

## Contributor Notes / 기여자 유의사항
Because the prototype is single-file, avoid unrelated refactors in the same change. If the page grows further, split CSS and assets first, then introduce JavaScript modules in a separate PR.

프로토타입이 단일 파일이므로, 동일한 변경 사항 내에서 관련 없는 리팩토링은 피하세요. 페이지가 더 커지면 먼저 CSS와 에셋을 분리한 다음, 별도의 PR을 통해 JavaScript 모듈을 도입하세요.
