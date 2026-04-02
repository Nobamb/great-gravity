import { GameController } from "./controller/GameController.js";
import { InputController } from "./controller/InputController.js";
import { CharacterModel } from "./model/CharacterModel.js";
import { StageModel } from "./model/StageModel.js";
import { GameView } from "./view/GameView.js";

/**
 * 게임의 초기 진입점(Entry Point) 함수입니다.
 * DOM 요소를 탐색하고, MVC 패턴에 필요한 Model, View, Controller 객체들을 생성하여 서로 연결합니다.
 */
function init() {
    // 게임 전체 화면을 담고 있는 메인 컨테이너 요소를 ID로 참조합니다.
    const container = document.getElementById("game-container");
    // 캐릭터의 외형을 담당하는 DOM 요소를 컨테이너 하위에서 탐색합니다.
    const characterElement = container?.querySelector(".character");

    // 게임 실행에 반드시 필요한 HTML 요소가 없는 경우 실행을 중단하고 에러를 출력합니다.
    if (!container || !characterElement) {
        throw new Error("게임 컨테이너 또는 캐릭터 요소를 HTML에서 찾을 수 없습니다.");
    }

    // [StageModel] 스테이지의 지형 정보(바닥, 장애물 등)와 충돌 영역 데이터를 관리합니다.
    const stageModel = new StageModel(container);

    // [GameView] 캐릭터의 위치를 화면에 반영(Rendering)하고, 크기를 측정하는 등 시각적인 처리를 담당합니다.
    const gameView = new GameView(characterElement);

    // [InputController] 키보드 입력 상황을 실시간으로 감지하여 현재 어떤 키가 눌려 있는지 관리합니다.
    const inputController = new InputController(window);

    // [CharacterModel] 캐릭터의 물리적 상태(좌표, 속도, 가속도 등)를 관리합니다.
    // gameView.measureCharacter()를 통해 실제 화면에 렌더링된 캐릭터의 초기 크기와 위치를 가져와 설정합니다.
    const characterModel = new CharacterModel(gameView.measureCharacter());

    /*
     * [GameController] 게임의 심장부로, 데이터(Model)와 화면(View), 입력(Input)을 모두 통합 관리합니다.
     * 매 프레임마다 물리 연산을 수행하도록 명령하고 그 결과를 화면에 그리도록 조율합니다.
     */
    const gameController = new GameController({
        characterModel,
        stageModel,
        inputController,
        gameView,
    });

    // 모든 준비가 완료되면 게임 루프(update & draw)를 시작합니다.
    gameController.start();
}

/**
 * 브라우저의 HTML 문서 로드가 완료되었는지 확인한 후 init 함수를 실행합니다.
 */
if (document.readyState === "loading") {
    // 문서가 아직 로딩 중이라면 로딩 완료 이벤트(DOMContentLoaded)가 발생할 때 실행합니다.
    // { once: true }를 사용하여 이벤트가 중복 실행되지 않도록 보장합니다.
    document.addEventListener("DOMContentLoaded", init, { once: true });
} else {
    // 이미 문서 로드가 완료된 상태(예: 지연 스크립트 실행 시)라면 즉시 초기화를 진행합니다.
    init();
}
