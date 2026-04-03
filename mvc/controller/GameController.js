/**
 * [GameController]
 * 게임의 메인 루프(Game Loop)를 관리하고 Model과 View를 연결하는 컨트롤러 클래스입니다.
 * 고정 시간 스탭(Fixed Time-step) 방식을 사용하여 저사양/고사양 기기에서 동일한 물리 연산 결과를 보장합니다.
 */
export class GameController {
  constructor({ characterModel, stageModel, inputController, gameView }) {
    this.characterModel = characterModel; // 캐릭터의 물리/상태 데이터
    this.stageModel = stageModel; // 스테이지의 지형/충돌 데이터
    this.inputController = inputController; // 사용자 입력 제어
    this.gameView = gameView; // 화면 렌더링 제어

    this.fixedDeltaTime = 1 / 60;
    this.accumulator = 0;
    this.lastTimestamp = 0;
    this.frameHandle = null;
    this.activeTrigger = null;
    this.tick = this.tick.bind(this);
  }

  /**
   * 게임을 시작합니다.
   * 스테이지와 캐릭터의 초기 상태를 맞추고 애니메이션 루프를 실행합니다.
   */
  start() {
    // 스테이지 데이터를 최신화하고 초기 크기를 측정합니다.
    const stageState = this.stageModel.refresh();
    const characterSize = this.gameView.measureCharacter();

    // 캐릭터 모델의 크기 및 물리 배율을 화면과 동기화합니다.
    this.characterModel.syncSize(characterSize);
    this.characterModel.syncPhysics(stageState.width);
    this.characterModel.updateSpawn(
      this.stageModel.getSpawnPoint(characterSize),
    );
    this.characterModel.resetToSpawn();

    this.updateActiveTrigger();
    this.gameView.render(this.characterModel, {
      activeTriggerElement: this.activeTrigger?.element ?? null,
    });

    if (stageState && !stageState.changed) {
      this.lastTimestamp = 0;
    }

    // 브라우저의 다음 프레임에 tick 함수 실행 예약
    this.frameHandle = window.requestAnimationFrame(this.tick);
  }

  /**
   * 매 프레임 실행되는 루프 함수입니다.
   * @param {number} timestamp 현재 시간(ms)
   */
  tick(timestamp) {
    // 1. 스테이지 요소(DOM)가 변경되었는지 확인하고 리사이즈 처리
    const stageState = this.stageModel.refresh();
    if (stageState) {
      this.handleStageResize(stageState);
    }

    // 2. 프레임 간 시간 간격 계산 (최대 0.1초로 제한하여 예외 방지)
    if (this.lastTimestamp === 0) {
      this.lastTimestamp = timestamp;
    }
    const frameTime = Math.min((timestamp - this.lastTimestamp) / 1000, 0.1);
    this.lastTimestamp = timestamp;
    this.accumulator += frameTime;

    // 3. 누적된 시간만큼 고정된 간격(1/60초)으로 물리 시뮬레이션 수행
    while (this.accumulator >= this.fixedDeltaTime) {
      // 현재 시점의 입력 상태 스냅샷을 가져옵니다.
      const input = this.inputController.getSnapshot();
      // 캐릭터 모델 업데이트 (이동, 물리, 충돌 등)
      this.characterModel.update(this.fixedDeltaTime, this.stageModel, input);
      this.handleTriggerInteraction(input);
      this.accumulator -= this.fixedDeltaTime;
    }

    this.updateActiveTrigger();
    this.gameView.render(this.characterModel, {
      activeTriggerElement: this.activeTrigger?.element ?? null,
    });

    this.frameHandle = window.requestAnimationFrame(this.tick);
  }

  handleStageResize(stageState) {
    if (!stageState.changed) {
      return;
    }

    const characterSize = this.gameView.measureCharacter();
    this.characterModel.syncPhysics(stageState.width);
    this.characterModel.resizeWorld(
      stageState.scaleX,
      stageState.scaleY,
      characterSize,
    );
    this.characterModel.updateSpawn(
      this.stageModel.getSpawnPoint(characterSize),
    );
    this.updateActiveTrigger();
  }

  updateActiveTrigger() {
    const interactionPadding = Math.max(
      18,
      this.stageModel.bounds.width * 0.02,
    );
    this.activeTrigger = this.stageModel.getInteractableTrigger(
      this.characterModel.getBounds(),
      interactionPadding,
    );
  }

  handleTriggerInteraction(input) {
    this.updateActiveTrigger();

    if (!input.interact || !this.activeTrigger) {
      return;
    }

    const collapseState = this.stageModel.activateTrigger(
      this.activeTrigger.id,
    );

    if (!collapseState) {
      return;
    }

    this.gameView.animateBlockCollapse(collapseState);
    this.activeTrigger = null;
  }
}
