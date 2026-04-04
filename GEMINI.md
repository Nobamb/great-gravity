# Project Overview / 프로젝트 개요
"Great Gravity" (working title) is a 2D physics-based action puzzle game combining platformer mechanics with pin-pulling mechanics. The core gameplay revolves around chemical interactions between elements (lava, water, fire, ice), physics-based throwing to trigger distant mechanisms, and time-attack clearing.

"Great Gravity" (가제)는 플랫폼 게임 메커니즘과 핀 뽑기 메커니즘이 결합된 2D 물리 기반 액션 퍼즐 게임입니다. 핵심 게임플레이는 원소 간의 화학적 상호작용(용암, 물, 불, 얼음), 원거리 장치를 작동시키기 위한 물리 기반 던지기, 그리고 타임 어택 클리어로 구성됩니다.

This repository contains two main implementations:
1. **Static Prototype (Root):** A small static prototype for a single game stage, contained entirely within `index.html`, `style.css`, and some basic planning documents (`plan.md`, `AGENTS.md`).
2. **React Stage (`react-stage/`):** A more advanced implementation using React, Vite, and `matter-js` for physics simulation. This version adopts an MVC (Model-View-Controller) architecture for the game logic.

이 레포지토리는 두 가지 주요 구현을 포함하고 있습니다:
1. **정적 프로토타입 (루트):** 단일 게임 스테이지를 위한 작은 정적 프로토타입으로, `index.html`, `style.css` 및 기본적인 기획 문서(`plan.md`, `AGENTS.md`)만으로 구성되어 있습니다.
2. **React 스테이지 (`react-stage/`):** React, Vite 및 `matter-js`를 사용하여 물리 시뮬레이션을 구현한 더 발전된 버전입니다. 이 버전은 게임 로직에 MVC (Model-View-Controller) 아키텍처를 채택했습니다.

## Key Technologies / 주요 기술
*   **Static Version:** HTML5, CSS3 (Vanilla + Tailwind-like utility classes), JavaScript (Vanilla).
*   **React Version:** React 18, Vite, `matter-js` (2D physics engine).

*   **정적 버전:** HTML5, CSS3 (Vanilla + Tailwind 스타일 유틸리티 클래스), JavaScript (Vanilla).
*   **React 버전:** React 18, Vite, `matter-js` (2D 물리 엔진).

# Building and Running / 빌드 및 실행

## Static Prototype / 정적 프로토타입
To run the static prototype locally:
```bash
# Using Python
python -m http.server 8000

# Or using npx
npx serve .
```
Access the project at `http://localhost:8000` or the port provided by `npx serve`.

정적 프로토타입을 로컬에서 실행하려면:
(위의 명령어를 사용하세요.)
`http://localhost:8000` 또는 `npx serve`에서 제공하는 포트로 접속하세요.

## React Stage / React 스테이지
To run the React version:
```bash
cd react-stage
npm install
npm run start # or npm run dev
```
To build the React version for production:
```bash
cd react-stage
npm run build
```

React 버전을 실행하려면:
(위의 명령어를 사용하세요.)
프로덕션 빌드를 생성하려면 `npm run build`를 실행하세요.

# Development Conventions / 개발 규칙

## Coding Style & Naming Conventions / 코딩 스타일 및 명명 규칙
*   **HTML/CSS:** Use 4-space indentation. Keep utility-heavy classes inline, and use descriptive kebab-case class names for custom styles (e.g., `.lava-fall`, `.stone-bridge`).
*   **CSS Organization:** Group related CSS blocks by feature and use short comments to mark large visual sections.
*   **Assets:** Use lowercase, hyphenated names for assets (e.g., `interaction-portal.png`). Place assets under the `image/` directory.
*   **Architecture (React):** Follow the established MVC pattern (`game/model`, `game/view`, `game/controller`) for game logic separation.

*   **HTML/CSS:** 4칸 들여쓰기를 사용하세요. 유틸리티 중심 클래스는 인라인으로 유지하고, 커스텀 스타일에는 서술적인 kebab-case 클래스 이름(`.lava-fall`, `.stone-bridge` 등)을 사용하세요.
*   **CSS 구조화:** 관련 CSS 블록을 기능별로 그룹화하고 짧은 주석을 사용하여 주요 시각적 섹션을 표시하세요.
*   **에셋:** 에셋 이름에는 소문자와 하이픈을 사용하세요(예: `interaction-portal.png`). 에셋은 `image/` 디렉토리 아래에 배치하세요.
*   **아키텍처 (React):** 게임 로직 분리를 위해 기존의 MVC 패턴(`game/model`, `game/view`, `game/controller`)을 따르세요.

## Testing Guidelines / 테스트 가이드라인
*   There is no automated test suite yet.
*   Validate changes by serving the page locally and manually checking layout, overflow, and readability across common desktop and mobile viewport sizes.
*   For UI edits in the static prototype, ensure external dependencies (like Google Fonts) still load correctly.

*   아직 자동화된 테스트 세트가 없습니다.
*   로컬에서 페이지를 실행하고 일반적인 데스크톱 및 모바일 뷰포트 크기에서 레이아웃, 오버플로우, 가독성을 수동으로 확인하여 변경 사항을 검증하세요.
*   정적 프로토타입의 UI 수정 시, 외부 종속성(Google Fonts 등)이 여전히 올바르게 로드되는지 확인하세요.

## Commit & Pull Request Guidelines / 커밋 및 풀 리퀘스트 가이드라인
*   Use short, imperative commit messages with conventional prefixes (e.g., `feat:`, `chore:`) and include stage-specific context. Example: `feat: refine stage 09 goal UI`.
*   Keep commits scoped to a single concern.
*   Pull requests should include a short summary, list changed assets, and attach screenshots for visual changes.
*   Link relevant issues or planning notes from `plan.md` when implementing new concepts.
*   For the static prototype, avoid unrelated refactors in the same change. If the file grows too large, consider splitting CSS/assets before introducing module systems.

*   관례적인 접두사(`feat:`, `chore:` 등)를 사용한 짧고 명령조인 커밋 메시지를 작성하고 스테이지별 컨텍스트를 포함하세요. 예: `feat: refine stage 09 goal UI`.
*   커밋은 하나의 관심사에만 집중되도록 유지하세요.
*   풀 리퀘스트에는 짧은 요약을 포함하고, 변경된 에셋 목록을 작성하며, 시각적 변경 사항에 대한 스크린샷을 첨부하세요.
*   새로운 개념을 구현할 때는 `plan.md`에서 관련 이슈나 기획 노트를 링크하세요.
*   정적 프로토타입의 경우, 동일한 변경 사항 내에서 관련 없는 리팩토링은 피하세요. 파일이 너무 커지면 모듈 시스템을 도입하기 전에 CSS/에셋 분리를 고려하세요.