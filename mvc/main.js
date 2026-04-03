import { GameController } from "./controller/GameController.js";
import { InputController } from "./controller/InputController.js";
import { PhysicsController } from "./controller/PhysicsController.js";
import { CharacterModel } from "./model/CharacterModel.js";
import { PhysicsModel } from "./model/PhysicsModel.js";
import { StageModel } from "./model/StageModel.js";
import { GameView } from "./view/GameView.js";
import { PhysicsView } from "./view/PhysicsView.js";

/**
 * 게임의 초기 진입점(Entry Point) 함수입니다.
 * DOM 요소를 탐색하고, MVC 패턴에 필요한 Model, View, Controller 객체들을 생성하여 서로 연결합니다.
 */
function init() {
  // 게임 전체 화면을 담고 있는 메인 컨테이너 요소를 ID로 참조합니다.
  const container = document.getElementById("game-container");
  // 캐릭터의 외형을 담당하는 DOM 요소를 컨테이너 하위에서 탐색합니다.
  const characterElement = container?.querySelector(".character");
  const treasureElement = container?.querySelector(".treasure-pile");
  const lavaElement = container?.querySelector(".lava-fall");
  const waterElement = container?.querySelector(".ice-water");

  if (
    !container ||
    !characterElement ||
    !treasureElement ||
    !lavaElement ||
    !waterElement
  ) {
    throw new Error("게임 실행에 필요한 요소를 HTML에서 찾을 수 없습니다.");
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

  const physicsModel = new PhysicsModel({
    container,
    lavaElement,
    waterElement,
    treasureElement,
  });
  const physicsView = new PhysicsView({
    lavaElement,
    waterElement,
    treasureElement,
  });
  const physicsController = new PhysicsController({
    physicsModel,
    physicsView,
  });

  const gameController = new GameController({
    characterModel,
    stageModel,
    inputController,
    gameView,
    physicsController,
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
