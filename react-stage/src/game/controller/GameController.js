function intersects(a, b) {
  return (
    a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top
  );
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function lerp(start, end, progress) {
  return start + (end - start) * progress;
}

function expandTreasureInteractionBounds(bounds) {
  const horizontalPadding = bounds.width * 0.08;
  const topExpansion = bounds.height * 0.7;

  return {
    left: bounds.left - horizontalPadding,
    right: bounds.right + horizontalPadding,
    top: bounds.top - topExpansion,
    bottom: bounds.bottom,
    width: bounds.width + horizontalPadding * 2,
    height: bounds.height + topExpansion,
  };
}

const TIMED_BLOCK_DURATION_MS = 1000;
const CUSTOM_MISSION_ALARM_DURATION_MS = 1600;
const BOSS_STAGE_ID = "bossStage";
const BOSS_PATTERN_INTERVAL_MS = 5000;
const BOSS_INTRO_DURATION_MS = 3000;
const BOSS_PATTERN1_DURATION_MS = 2300;
const BOSS_PATTERN2_DURATION_MS = 5000;
const BOSS_PATTERN3_WARNING_MS = 1000;
const BOSS_PATTERN3_RUSH_MS = 500;
const BOSS_GROGGY_DURATION_MS = 1000;
const BOSS_DAMAGE_COOLDOWN_MS = 1000;
const BOSS_DEFEAT_FALL_MS = 3000;
const BOSS_ENDING_WAIT_MS = 1000;
const BOSS_ENDING_BANNER_MS = 1000;
const BOSS_ENDING_DROP_MS = 1000;
const BOSS_FINAL_STONES_MS = 2200;
const BOSS_STRUCTURE_REFILL_INTERVAL_MS = 30000;
const BOSS_STRUCTURE_RISE_MS = 500;
const BOSS_STRUCTURE_FALL_MS = 500;
const BOSS_DAMAGE_PER_HIT = 10;
const BOSS_STRUCTURE_TARGET_IDS = [
  "boss-stage-mid-beam",
  "boss-stage-low-beam",
];
const BOSS_STRUCTURE_TRIGGER_IDS = [
  "boss-stage-mid-beam-trigger-left",
  "boss-stage-mid-beam-trigger-right",
  "boss-stage-low-beam-trigger-left",
  "boss-stage-low-beam-trigger-right",
];
const STAGE7_LOCKED_TREASURE_MESSAGE =
  "지금은 보물에 접근할 수 없습니다!\n몬스터 2마리를 처치하고 오세요!";
const STAGE4_LOCKED_TREASURE_MESSAGE =
  "지금은 보물에 접근할 수 없습니다!\n몬스터를 처치하고 오세요!";

const STAGE_MISSION_CONFIGS = {
  stage4: {
    requiredMonsterKills: 1,
    missionCountId: "stage4-guardian",
    lockedTreasureMessage: STAGE4_LOCKED_TREASURE_MESSAGE,
  },
  stage7: {
    requiredMonsterKills: 2,
    missionCountId: "stage7-guardian",
    lockedTreasureMessage: STAGE7_LOCKED_TREASURE_MESSAGE,
  },
};

function createNeutralInput(input) {
  return {
    ...input,
    horizontal: 0,
    vertical: 0,
    jump: false,
    interact: false,
  };
}

export class GameController {
  constructor({
    stage,
    nextStagePath = null,
    navigate = null,
    characterModel,
    stageModel,
    inputController,
    gameView,
    physicsController = null,
    requestBossStructureRebuild = null,
  }) {
    this.stage = stage;
    this.nextStagePath = nextStagePath;
    this.navigate = navigate;
    this.characterModel = characterModel;
    this.stageModel = stageModel;
    this.inputController = inputController;
    this.gameView = gameView;
    this.physicsController = physicsController;
    this.requestBossStructureRebuild = requestBossStructureRebuild;

    this.fixedDeltaTime = 1 / 60;
    this.accumulator = 0;
    this.lastTimestamp = 0;
    this.frameHandle = null;
    this.activeTrigger = null;
    this.elapsedTimeMs = 0;
    this.isStageCleared = false;
    this.isDraggingStone = false;
    this.isPreparingStoneThrow = false;
    this.stoneAim = null;
    this.activeCannon = null;
    this.isAimingCannon = false;
    this.timedBlockStates = new Map();
    this.monsterStates = new Map();
    this.bossState = null;
    this.customMissionAlarm = null;
    this.customMissionAlarmToken = 0;
    this.portalCooldownMs = 0;
    this.tick = this.tick.bind(this);
  }

  start() {
    this.stop();

    const stageState = this.stageModel.refresh();
    const characterSize = this.gameView.measureCharacter();

    this.characterModel.syncSize(characterSize);
    this.characterModel.syncPhysics(stageState.width);
    this.characterModel.updateSpawn(
      this.stageModel.getSpawnPoint(characterSize),
    );
    this.characterModel.resetToSpawn();
    this.gameView.refreshStageAnchors?.();
    this.initializeStageActors();
    this.elapsedTimeMs = 0;
    this.isStageCleared = false;
    this.isDraggingStone = false;
    this.isPreparingStoneThrow = false;
    this.stoneAim = null;
    this.activeCannon = null;
    this.isAimingCannon = false;
    this.customMissionAlarm = null;
    this.portalCooldownMs = 0;
    this.gameView.bindControls({
      onRetry: () => {
        this.restartStage();
      },
      onNextStage: this.nextStagePath
        ? () => {
            this.navigate?.(this.nextStagePath);
          }
        : null,
    });
    this.gameView.hideClearOverlay();
    this.gameView.setNextStageVisibility(false);
    this.gameView.updateTimer(this.formatTime(this.elapsedTimeMs));

    this.updateActiveTrigger();
    this.physicsController?.start(this.stageModel);
    this.syncPhysicsRuntimeState();
    this.physicsController?.render();
    this.gameView.render(this.characterModel, this.getRenderState());

    if (stageState && !stageState.changed) {
      this.lastTimestamp = 0;
    }

    this.frameHandle = window.requestAnimationFrame(this.tick);
  }

  stop() {
    if (this.frameHandle !== null) {
      window.cancelAnimationFrame(this.frameHandle);
      this.frameHandle = null;
    }
  }

  initializeStageActors() {
    this.timedBlockStates = new Map(
      this.stageModel.timedBlocks.map((timedBlock) => [
        timedBlock.id,
        {
          id: timedBlock.id,
          startTimeMs: null,
          isActive: false,
          isExpired: timedBlock.isCollapsed,
        },
      ]),
    );

    this.monsterStates = new Map(
      this.stageModel.monsters.map((monster) => [
        monster.id,
        {
          id: monster.id,
          spawnX: monster.rect.left,
          spawnY: monster.rect.top,
          x: monster.rect.left,
          y: monster.rect.top,
          width: monster.rect.width,
          height: monster.rect.height,
          vy: 0,
          speedMultiplier: monster.speedMultiplier,
          direction: monster.direction,
          defaultDirection: monster.direction,
          isAlert: false,
          isDead: false,
        },
      ]),
    );

    this.bossState = this.isBossStage() ? this.createBossState() : null;
  }

  isBossStage() {
    return this.stage?.id === BOSS_STAGE_ID;
  }

  createBossState() {
    return {
      hp: 100,
      phase: "intro",
      phaseStartMs: 0,
      lastPatternStartMs: 0,
      patternCursor: 0,
      rushDirection: -1,
      rushLaneIndex: 0,
      damageCooldownUntilMs: 0,
      damageFlashUntilMs: 0,
      patternDamageCount: 0,
      patternDamageLimit: 1,
      pendingGroggyAfterPattern: false,
      pattern2StoneWave: [],
      pattern2StoneRects: [],
      pattern2StoneDebugBatchId: 0,
      pattern2StoneLastDebugStep: -1,
      pattern2StoneLastDebugSignature: "",
      finalStoneWave: [],
      finalStoneBatchStartedAtMs: null,
      clearReady: false,
      structurePhase: "idle",
      structurePhaseStartMs: 0,
      structureLastCycleStartedAtMs: 0,
      structureRebuildPending: false,
    };
  }

  isBossStructureAnimating() {
    if (!this.bossState) {
      return false;
    }

    return (
      this.bossState.structurePhase === "rising" ||
      this.bossState.structurePhase === "falling"
    );
  }

  shouldForceBossStructureSync() {
    if (!this.bossState) {
      return false;
    }

    return this.isBossStructureAnimating();
  }

  tick(timestamp) {
    const shouldForceBossStructureSync = this.shouldForceBossStructureSync();

    if (shouldForceBossStructureSync) {
      this.stageModel.markDirty?.();
    }

    const stageState = this.stageModel.refresh();
    if (stageState) {
      const shouldResetBossStructureDynamics =
        this.shouldForceBossStructureSync();

      this.handleStageResize(stageState);
      this.physicsController?.handleStageMutation(this.stageModel, {
        resetDynamics:
          stageState.changed || shouldResetBossStructureDynamics,
      });
    }

    if (this.lastTimestamp === 0) {
      this.lastTimestamp = timestamp;
    }
    const frameTime = Math.min((timestamp - this.lastTimestamp) / 1000, 0.1);
    this.lastTimestamp = timestamp;
    this.accumulator += frameTime;

    if (this.isStageCleared) {
      this.physicsController?.render();
      this.gameView.render(this.characterModel, {
        ...this.getRenderState(),
        activeTriggerElement: null,
        canThrowStone: false,
        heldStone: null,
        stoneAim: null,
      });
      this.frameHandle = window.requestAnimationFrame(this.tick);
      return;
    }

    while (this.accumulator >= this.fixedDeltaTime) {
      const input = this.inputController.getSnapshot();
      this.beginCannonAimIfNeeded(input);

      let didDie = false;
      this.portalCooldownMs = Math.max(
        0,
        this.portalCooldownMs - this.fixedDeltaTime * 1000,
      );

      if (this.isAimingCannon) {
        this.holdCharacterAtActiveCannon();
      } else {
        const movementInput = this.activeCannon
          ? createNeutralInput(input)
          : input;
        didDie = this.characterModel.update(
          this.fixedDeltaTime,
          this.stageModel,
          movementInput,
        );
      }

      this.elapsedTimeMs += this.fixedDeltaTime * 1000;

      if (this.handleTreasureInteraction()) {
        this.handleStageClear();
        this.accumulator = 0;
        break;
      }

      if (didDie) {
        this.handlePlayerDeath();
        this.accumulator = 0;
        break;
      }

      this.handleTimedBlocks();
      this.handleStoneAutoPickup();
      this.handleTriggerInteraction(input);

      if (this.isAimingCannon) {
        this.handleCannonInteraction(input);
      } else {
        this.handleStoneInteraction(input);
      }

      this.physicsController?.step(this.fixedDeltaTime);
      this.handleProjectileTriggerHits();
      this.syncPhysicsRuntimeState();
      this.handleContactTriggerHits();
      this.updateMonsters(this.fixedDeltaTime);
      const bossOutcome = this.updateBossStage(this.fixedDeltaTime);

      if (bossOutcome.didDie) {
        this.handlePlayerDeath();
        this.accumulator = 0;
        break;
      }

      if (bossOutcome.didClear) {
        this.handleStageClear();
        this.accumulator = 0;
        break;
      }
      this.handlePortalTraversal();

      if (this.isCharacterTouchingMonster()) {
        this.handlePlayerDeath();
        this.accumulator = 0;
        break;
      }

      if (this.handleTreasureInteraction()) {
        this.handleStageClear();
        this.accumulator = 0;
        break;
      }

      this.accumulator -= this.fixedDeltaTime;
    }

    this.gameView.updateTimer(this.formatTime(this.elapsedTimeMs));

    if (this.isStageCleared) {
      this.physicsController?.render();
      this.gameView.render(this.characterModel, {
        ...this.getRenderState(),
        activeTriggerElement: null,
        heldStone: null,
        stoneAim: null,
      });
      this.frameHandle = window.requestAnimationFrame(this.tick);
      return;
    }

    this.updateActiveTrigger();
    this.physicsController?.render();
    this.gameView.render(this.characterModel, this.getRenderState());

    this.frameHandle = window.requestAnimationFrame(this.tick);
  }

  getRenderState() {
    return {
      activeTriggerElement: this.isAimingCannon
        ? null
        : (this.activeTrigger?.element ?? null),
      canThrowStone: !this.isAimingCannon && this.canThrowStone(),
      isDraggingStone: this.isDraggingStone || this.isAimingCannon,
      stoneState: this.getStoneState(),
      heldStone: this.getHeldStoneInteraction(),
      stoneAim: this.stoneAim,
      timedBlocks: this.getTimedBlockRenderState(),
      monsters: this.getMonsterRenderState(),
      cannonState: this.getCannonRenderState(),
      stageMission: this.getStageMissionRenderState(),
      missionAlarm: this.getMissionAlarmRenderState(),
      bossState: this.getBossRenderState(),
    };
  }

  getStageMissionConfig() {
    return STAGE_MISSION_CONFIGS[this.stage?.id] ?? null;
  }

  getDefeatedMonsterCount() {
    return [...this.monsterStates.values()].filter((monster) => monster.isDead)
      .length;
  }

  getRemainingMonsterCount() {
    return [...this.monsterStates.values()].filter((monster) => !monster.isDead)
      .length;
  }

  getRemainingRequiredMonsterCount() {
    const missionConfig = this.getStageMissionConfig();

    if (!missionConfig) {
      return 0;
    }

    return Math.max(
      0,
      missionConfig.requiredMonsterKills - this.getDefeatedMonsterCount(),
    );
  }

  isTreasureBarrierActive() {
    return Boolean(
      this.getStageMissionConfig() &&
      this.getRemainingRequiredMonsterCount() > 0,
    );
  }

  getStageMissionRenderState() {
    const missionConfig = this.getStageMissionConfig();

    if (!missionConfig) {
      return null;
    }

    return {
      missionCountId: missionConfig.missionCountId,
      remainingMonsterCount: this.getRemainingRequiredMonsterCount(),
      isTreasureBarrierActive: this.isTreasureBarrierActive(),
    };
  }

  getMissionAlarmRenderState() {
    if (!this.isMissionAlarmActive()) {
      return null;
    }

    return {
      token: this.customMissionAlarm.token,
      message: this.customMissionAlarm.message,
    };
  }

  isMissionAlarmActive() {
    return Boolean(
      this.customMissionAlarm &&
      this.elapsedTimeMs < this.customMissionAlarm.expiresAtMs,
    );
  }

  showMissionAlarm(message) {
    this.customMissionAlarmToken += 1;
    this.customMissionAlarm = {
      token: this.customMissionAlarmToken,
      message,
      expiresAtMs: this.elapsedTimeMs + CUSTOM_MISSION_ALARM_DURATION_MS,
    };
  }

  getTimedBlockRenderState() {
    return [...this.timedBlockStates.values()].map((timedBlock) => {
      let progress = timedBlock.isExpired ? 1 : 0;

      if (timedBlock.isActive && timedBlock.startTimeMs !== null) {
        progress = clamp(
          (this.elapsedTimeMs - timedBlock.startTimeMs) /
            TIMED_BLOCK_DURATION_MS,
          0,
          1,
        );
      }

      return {
        id: timedBlock.id,
        progress,
        isActive: timedBlock.isActive && !timedBlock.isExpired,
      };
    });
  }

  getMonsterRenderState() {
    return [...this.monsterStates.values()].map((monster) => ({
      id: monster.id,
      x: monster.x,
      y: monster.y,
      direction: monster.direction,
      isAlert: monster.isAlert,
      isDead: monster.isDead,
    }));
  }

  getCannonRenderState() {
    if (!this.activeCannon) {
      return null;
    }

    return {
      id: this.activeCannon.id,
      isAiming: this.isAimingCannon,
    };
  }

  getBossLayoutMetrics() {
    if (!this.isBossStage()) {
      return null;
    }

    const { width: stageWidth, height: stageHeight } = this.stageModel.bounds;
    const width = stageWidth * 0.34;
    const height = stageHeight * 0.56;
    const floorTop = stageHeight * 0.92;
    const targetY = floorTop - height * 0.98;

    return {
      stageWidth,
      width,
      height,
      floorTop,
      targetX: stageWidth - width * 0.8,
      targetY,
      introY: stageHeight + height * 0.35,
      defeatY: stageHeight + height * 0.2,
      rushHeight: stageHeight * 0.22,
      warningLeft: stageWidth * 0.04,
      warningWidth: stageWidth * 0.92,
      endCardWidth: stageWidth * 0.3,
      endCardHeight: stageHeight * 0.24,
      structureTravelY: stageHeight * 0.34,
    };
  }

  getBossPatternSequence() {
    if (!this.bossState) {
      return [];
    }

    return this.bossState.hp > 50 ? [1, 2] : [1, 2, 3];
  }

  transitionBossToIdle(now, resetPatternClock = false) {
    if (!this.bossState) {
      return;
    }

    this.bossState.phase = "idle";
    this.bossState.phaseStartMs = now;
    this.bossState.pattern2StoneWave = [];
    this.bossState.pattern2StoneRects = [];
    this.resetPattern2StoneDebugState();
    this.bossState.finalStoneWave = [];
    this.bossState.patternDamageCount = 0;
    this.bossState.patternDamageLimit = 1;

    if (resetPatternClock) {
      this.bossState.lastPatternStartMs =
        now - (BOSS_PATTERN_INTERVAL_MS - 1600);
    }
  }

  getBossPatternDamageLimit(phase = this.bossState?.phase ?? "idle") {
    return 1;
  }

  resetBossPatternDamageWindow(phase = this.bossState?.phase ?? "idle") {
    if (!this.bossState) {
      return;
    }

    this.bossState.patternDamageCount = 0;
    this.bossState.patternDamageLimit = this.getBossPatternDamageLimit(phase);
    this.bossState.damageCooldownUntilMs = 0;
    this.bossState.damageFlashUntilMs = 0;
  }

  getBossRushLaneTop(layout) {
    const laneRatios = [0.26, 0.48, 0.68];
    const laneRatio =
      laneRatios[this.bossState?.rushLaneIndex % laneRatios.length] ??
      laneRatios[0];

    return layout.stageHeight * laneRatio - layout.rushHeight / 2;
  }

  createBossStoneWave(now, finalWave = false) {
    const { width: stageWidth, height: stageHeight } = this.stageModel.bounds;
    const count = finalWave ? 5 : 3 + Math.floor(Math.random() * 3);
    const slotCount = finalWave ? count : 5;
    const slotOrder = Array.from({ length: slotCount }, (_, index) => index);

    for (let index = slotOrder.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      const currentSlot = slotOrder[index];

      slotOrder[index] = slotOrder[swapIndex];
      slotOrder[swapIndex] = currentSlot;
    }

    return Array.from({ length: count }, (_, index) => {
      const size = finalWave
        ? stageWidth * 0.036
        : clamp(stageWidth * (0.07 + Math.random() * 0.018), 72, 132);
      const startX = (() => {
        if (finalWave) {
          return lerp(
            stageWidth * 0.14,
            stageWidth * 0.82,
            count === 1 ? 0.5 : index / (count - 1),
          );
        }

        const horizontalPadding = stageWidth * 0.1;
        const usableRight = stageWidth * 0.7;
        const usableWidth = Math.max(1, usableRight - horizontalPadding);
        const slotWidth = usableWidth / slotCount;
        const slotIndex = slotOrder[index] ?? index;
        const slotCenterX =
          horizontalPadding + slotWidth * slotIndex + slotWidth / 2;
        const jitter = (Math.random() - 0.5) * 24;

        return clamp(slotCenterX + jitter, size / 2, usableRight - size / 2);
      })();
      const startY = -size - (finalWave ? index * size * 0.18 : 0);
      const delayMs = finalWave ? index * 130 : 0;
      const laneIndex = slotOrder[index] ?? index;

      return {
        id: `${finalWave ? "boss-final" : "boss-pattern"}-stone-${now}-${index}`,
        startX,
        size,
        startY,
        endY: finalWave ? stageHeight + size * 1.4 : stageHeight + size,
        spawnMs: now,
        delayMs,
        durationMs: finalWave ? 1700 : 3000,
        finalWave,
        laneIndex,
      };
    });
  }

  debugBossStone(eventName, payload = {}) {
    if (!this.isBossStage()) {
      return;
    }

    console.info(`[boss-stone] ${eventName}`, payload);
  }

  resetPattern2StoneDebugState() {
    if (!this.bossState) {
      return;
    }

    this.bossState.pattern2StoneLastDebugStep = -1;
    this.bossState.pattern2StoneLastDebugSignature = "";
  }

  createPattern2StoneBatch(now) {
    if (!this.bossState) {
      return [];
    }

    const batch = this.createBossStoneWave(now, false);

    this.bossState.pattern2StoneWave = batch;
    this.bossState.pattern2StoneRects = [];
    this.bossState.pattern2StoneDebugBatchId += 1;
    this.resetPattern2StoneDebugState();
    this.debugBossStone("pattern2 batch created", {
      batchId: this.bossState.pattern2StoneDebugBatchId,
      count: batch.length,
      stones: batch.map((stone) => ({
        id: stone.id,
        laneIndex: stone.laneIndex,
        startX: Math.round(stone.startX),
        size: Math.round(stone.size),
        startY: Math.round(stone.startY),
        endY: Math.round(stone.endY),
        durationMs: stone.durationMs,
      })),
    });

    return batch;
  }

  syncPattern2StoneRects(now) {
    if (!this.bossState) {
      return [];
    }

    const rects = this.getBossStoneRectsFromWave(
      this.bossState.pattern2StoneWave,
      now,
    );

    this.bossState.pattern2StoneRects = rects;
    const debugStep = Math.floor(
      Math.max(0, now - this.bossState.phaseStartMs) / 400,
    );
    const signature = rects
      .map(
        (stone) =>
          `${stone.id}:${Math.round(stone.left)}:${Math.round(stone.top)}`,
      )
      .join("|");

    if (
      this.bossState.phase === "pattern2" &&
      (debugStep !== this.bossState.pattern2StoneLastDebugStep ||
        signature !== this.bossState.pattern2StoneLastDebugSignature)
    ) {
      this.bossState.pattern2StoneLastDebugStep = debugStep;
      this.bossState.pattern2StoneLastDebugSignature = signature;
      this.debugBossStone("pattern2 active rects", {
        batchId: this.bossState.pattern2StoneDebugBatchId,
        count: rects.length,
        rects: rects.map((stone) => ({
          id: stone.id,
          left: Math.round(stone.left),
          top: Math.round(stone.top),
          width: Math.round(stone.width),
          height: Math.round(stone.height),
          progress: Number(stone.progress.toFixed(2)),
        })),
      });
    }

    return rects;
  }

  getBossStoneRectsFromWave(stoneWave, now) {
    return stoneWave
      .map((stone) => {
        const elapsed = now - stone.spawnMs - stone.delayMs;

        if (elapsed < 0) {
          return null;
        }

        const progress = clamp(elapsed / stone.durationMs, 0, 1);

        if (progress >= 1) {
          return null;
        }

        return {
          id: stone.id,
          left: stone.startX - stone.size / 2,
          top: lerp(stone.startY, stone.endY, progress),
          width: stone.size,
          height: stone.size,
          startY: stone.startY,
          endY: stone.endY,
          durationMs: stone.durationMs,
          delayMs: stone.delayMs,
          progress,
          finalWave: stone.finalWave,
        };
      })
      .filter(Boolean);
  }

  getPattern2StoneRects(now) {
    if (!this.bossState) {
      return [];
    }

    if (typeof now === "number") {
      return this.syncPattern2StoneRects(now);
    }

    return this.bossState.pattern2StoneRects;
  }

  getFinalStoneRects(now) {
    if (!this.bossState) {
      return [];
    }

    return this.getBossStoneRectsFromWave(this.bossState.finalStoneWave, now);
  }

  getBossCurrentStoneRects(now) {
    if (!this.bossState) {
      return [];
    }

    if (this.bossState.phase === "pattern2") {
      return this.getPattern2StoneRects(now);
    }

    if (this.bossState.phase === "final-stones") {
      return this.getFinalStoneRects(now);
    }

    return [];
  }

  getBossAttackHandState(now, layout) {
    if (this.bossState?.phase !== "pattern1") {
      return null;
    }

    const elapsed = now - this.bossState.phaseStartMs;
    const anchorX = layout.targetX + layout.width * 0.9;
    const height = layout.height * 0.24; // Ensure enough height for the fist
    const y = layout.floorTop - height * 0.98; // Better visual alignment with floor
    const startEndX = anchorX - layout.width * 0.16;
    const centerEndX = layout.stageWidth * 0.48;
    const farEndX = layout.stageWidth * 0.02;
    let endX = anchorX;

    // Faster punch for Pattern 1
    if (elapsed < 1000) {
      endX = lerp(startEndX, centerEndX, elapsed / 1000);
    } else if (elapsed < 1500) {
      endX = centerEndX;
    } else if (elapsed < 1800) {
      endX = lerp(centerEndX, farEndX, (elapsed - 1500) / 300);
    } else if (elapsed < BOSS_PATTERN1_DURATION_MS) {
      endX = lerp(farEndX, anchorX, (elapsed - 1800) / 500);
    }

    const width = Math.max(0, anchorX - endX);

    if (width <= layout.width * 0.04) {
      return null;
    }

    return {
      x: endX,
      y,
      width,
      height,
    };
  }

  getBossHandVisualBounds(now, layout) {
    const hand = this.getBossAttackHandState(now, layout);

    if (!hand) {
      return null;
    }

    return {
      left: hand.x,
      top: hand.y,
      right: hand.x + hand.width,
      bottom: hand.y + hand.height,
    };
  }

  getBossHandKillBounds(now, layout) {
    const handBounds = this.getBossHandVisualBounds(now, layout);

    if (!handBounds) {
      return null;
    }

    const handHeight = handBounds.bottom - handBounds.top;
    const handWidth = handBounds.right - handBounds.left;
    const horizontalInset = handWidth * 0.07;
    const topInset = handHeight * 0.24;
    const bottomInset = handHeight * 0.04;

    return {
      left: handBounds.left + horizontalInset,
      top: handBounds.top + topInset,
      right: handBounds.right - horizontalInset,
      bottom: handBounds.bottom - bottomInset,
    };
  }

  getBossHandLavaBounds(now, layout) {
    const handBounds = this.getBossHandVisualBounds(now, layout);

    if (!handBounds) {
      return null;
    }

    const handHeight = handBounds.bottom - handBounds.top;
    const handWidth = handBounds.right - handBounds.left;
    const horizontalInset = handWidth * 0.15; // Tighter on sides
    const topInset = handHeight * 0.85; // Much tighter on top, requires deep lava touch
    const bottomInset = handHeight * 0.01;

    return {
      left: handBounds.left + horizontalInset,
      top: handBounds.top + topInset,
      right: handBounds.right - horizontalInset,
      bottom: handBounds.bottom - bottomInset,
    };
  }

  getBossRushRect(now, layout) {
    if (this.bossState?.phase !== "pattern3-rush") {
      return null;
    }

    const progress = clamp(
      (now - this.bossState.phaseStartMs) / BOSS_PATTERN3_RUSH_MS,
      0,
      1,
    );
    const direction = this.bossState.rushDirection;
    const startX =
      direction < 0
        ? layout.stageWidth + layout.width * 0.12
        : -layout.width * 0.82;
    const endX =
      direction < 0
        ? -layout.width * 0.82
        : layout.stageWidth + layout.width * 0.12;

    return {
      left: lerp(startX, endX, progress),
      top: this.getBossRushLaneTop(layout) - layout.height * 0.08,
      width: layout.width,
      height: layout.height * 0.84,
      direction,
    };
  }

  getBossVisualState(now, layout) {
    if (!this.bossState || !layout) {
      return null;
    }

    const phase = this.bossState.phase;

    if (phase === "intro") {
      const progress = clamp(
        (now - this.bossState.phaseStartMs) / BOSS_INTRO_DURATION_MS,
        0,
        1,
      );

      return {
        visible: true,
        x: layout.targetX,
        y: lerp(layout.introY, layout.targetY, progress),
        width: layout.width,
        height: layout.height,
        pose: "base",
        facing: 1,
      };
    }

    if (phase === "pattern3-rush") {
      const rushRect = this.getBossRushRect(now, layout);

      return rushRect
        ? {
            visible: true,
            x: rushRect.left,
            y: rushRect.top,
            width: rushRect.width,
            height: rushRect.height,
            pose: "rush",
            facing: rushRect.direction,
          }
        : null;
    }

    if (phase === "defeated-fall") {
      const progress = clamp(
        (now - this.bossState.phaseStartMs) / BOSS_DEFEAT_FALL_MS,
        0,
        1,
      );

      return {
        visible: true,
        x: layout.targetX,
        y: lerp(layout.targetY, layout.defeatY, progress),
        width: layout.width,
        height: layout.height,
        pose: "base",
        facing: 1,
      };
    }

    if (
      ["ending-wait", "ending-banner", "ending-drop", "final-stones"].includes(
        phase,
      )
    ) {
      return {
        visible: false,
        x: layout.targetX,
        y: layout.targetY,
        width: layout.width,
        height: layout.height,
        pose: "base",
        facing: 1,
      };
    }

    return {
      visible: true,
      x: layout.targetX,
      y: layout.targetY,
      width: layout.width,
      height: layout.height,
      pose:
        phase === "pattern1"
          ? "attack"
          : phase === "pattern2"
            ? "upset"
            : phase === "pattern3-warning" || phase === "pattern3-rush"
              ? "rush"
              : "base",
      facing: 1,
    };
  }

  getBossBodyBounds(now, layout) {
    const visual = this.getBossVisualState(now, layout);

    if (!visual?.visible) {
      return null;
    }

    return {
      left: visual.x + visual.width * 0.15, // Tighter body bounding box to prevent instant death
      top: visual.y + visual.height * 0.15,
      right: visual.x + visual.width * 0.65,
      bottom: visual.y + visual.height * 0.92,
    };
  }

  getBossShakeOffset(now) {
    if (!this.bossState) {
      return { x: 0, y: 0 };
    }

    if (this.bossState.phase === "pattern2") {
      const elapsed = now - this.bossState.phaseStartMs;
      let intervalMs = 0;
      let intensityRatio = 0;

      if (elapsed < 1000) {
        intervalMs = 50;
        intensityRatio = 0.025;
      } else if (elapsed < 3000) {
        intervalMs = 100;
        intensityRatio = 0.015;
      } else if (elapsed < 5000) {
        intervalMs = 100;
        intensityRatio = 0.005;
      } else {
        return { x: 0, y: 0 };
      }

      const step = Math.floor(elapsed / intervalMs);
      const randomX = Math.sin(step * 12.9898 + 78.233) * 43758.5453;
      const randomY = Math.sin(step * 39.3468 + 11.135) * 12741.1731;
      const normalizedX = (randomX - Math.floor(randomX)) * 2 - 1;
      const normalizedY = (randomY - Math.floor(randomY)) * 2 - 1;

      return {
        x: normalizedX * this.stageModel.bounds.width * intensityRatio,
        y: normalizedY * this.stageModel.bounds.height * intensityRatio,
      };
    }

    if (this.bossState.phase === "groggy") {
      const intensity = this.stageModel.bounds.width * 0.03;

      return {
        x: Math.sin((now - this.bossState.phaseStartMs) / 18) * intensity,
        y: 0,
      };
    }

    return { x: 0, y: 0 };
  }

  getBossEndingState(now, layout) {
    if (!this.bossState || !layout) {
      return {
        visible: false,
        x: 0,
        y: 0,
        width: 0,
        height: 0,
        scale: 1,
        opacity: 0,
      };
    }

    if (this.bossState.phase === "ending-banner") {
      const progress = clamp(
        (now - this.bossState.phaseStartMs) / BOSS_ENDING_BANNER_MS,
        0,
        1,
      );

      return {
        visible: true,
        x: (layout.stageWidth - layout.endCardWidth) / 2,
        y: layout.stageHeight * 0.34,
        width: layout.endCardWidth,
        height: layout.endCardHeight,
        scale: lerp(0.42, 1, progress),
        opacity: 1,
      };
    }

    if (this.bossState.phase === "ending-drop") {
      const progress = clamp(
        (now - this.bossState.phaseStartMs) / BOSS_ENDING_DROP_MS,
        0,
        1,
      );

      return {
        visible: true,
        x: (layout.stageWidth - layout.endCardWidth) / 2,
        y: lerp(layout.stageHeight * 0.34, layout.stageHeight * 0.92, progress),
        width: layout.endCardWidth,
        height: layout.endCardHeight,
        scale: 1,
        opacity: 1 - progress * 0.75,
      };
    }

    return {
      visible: false,
      x: 0,
      y: 0,
      width: 0,
      height: 0,
      scale: 1,
      opacity: 0,
    };
  }

  getBossStructureState(now, layout) {
    if (!this.bossState || !layout) {
      return {
        phase: "idle",
        offsetY: 0,
      };
    }

    const phase = this.bossState.structurePhase ?? "idle";
    const elapsed = now - (this.bossState.structurePhaseStartMs ?? 0);

    if (phase === "rising") {
      return {
        phase,
        offsetY: -lerp(
          0,
          layout.structureTravelY,
          clamp(elapsed / BOSS_STRUCTURE_RISE_MS, 0, 1),
        ),
      };
    }

    if (phase === "falling") {
      return {
        phase,
        offsetY: -lerp(
          layout.structureTravelY,
          0,
          clamp(elapsed / BOSS_STRUCTURE_FALL_MS, 0, 1),
        ),
      };
    }

    return {
      phase: "idle",
      offsetY: 0,
    };
  }

  requestBossStageStructureRebuild() {
    if (!this.bossState || this.bossState.structureRebuildPending) {
      return;
    }

    this.bossState.structureRebuildPending = true;
    this.activeTrigger = null;
    this.gameView.restoreBossStructureState?.(
      BOSS_STRUCTURE_TARGET_IDS,
      BOSS_STRUCTURE_TRIGGER_IDS,
    );
    this.requestBossStructureRebuild?.();
  }

  handleBossStructureRebuilt() {
    if (!this.bossState?.structureRebuildPending) {
      return;
    }

    this.gameView.refreshBossStageElements?.();
    this.stageModel.reseedTriggerTargets?.(
      BOSS_STRUCTURE_TARGET_IDS,
      BOSS_STRUCTURE_TRIGGER_IDS,
    );
    this.stageModel.markDirty?.();
    const stageState = this.stageModel.refresh();

    if (stageState) {
      this.handleStageResize(stageState);
      this.physicsController?.handleStageMutation(this.stageModel, {
        resetDynamics: true,
      });
      this.syncPhysicsRuntimeState();
    }

    this.activeTrigger = null;
    this.updateActiveTrigger();
    this.physicsController?.render();
    this.gameView.render(this.characterModel, this.getRenderState());
    this.bossState.structureRebuildPending = false;
  }

  updateBossStructureCycle(now, layout) {
    if (!this.bossState || !layout) {
      return;
    }

    const isBattleActive = ![
      "defeated-fall",
      "ending-wait",
      "ending-banner",
      "ending-drop",
      "final-stones",
    ].includes(this.bossState.phase);

    if (this.bossState.structurePhase !== "idle") {
      this.stageModel.markDirty?.();
    }

    if (
      isBattleActive &&
      this.bossState.structurePhase === "idle" &&
      now - this.bossState.structureLastCycleStartedAtMs >=
        BOSS_STRUCTURE_REFILL_INTERVAL_MS
    ) {
      this.bossState.structurePhase = "rising";
      this.bossState.structurePhaseStartMs = now;
      this.bossState.structureLastCycleStartedAtMs = now;
      return;
    }

    if (this.bossState.structurePhase === "rising") {
      if (
        now - this.bossState.structurePhaseStartMs >=
        BOSS_STRUCTURE_RISE_MS
      ) {
        this.requestBossStageStructureRebuild();
        this.bossState.structurePhase = "falling";
        this.bossState.structurePhaseStartMs = now;
      }
      return;
    }

    if (this.bossState.structurePhase === "falling") {
      if (
        now - this.bossState.structurePhaseStartMs >=
        BOSS_STRUCTURE_FALL_MS
      ) {
        this.bossState.structurePhase = "idle";
        this.bossState.structurePhaseStartMs = now;
      }
    }
  }

  startBossGroggy(now) {
    if (!this.bossState) {
      return;
    }

    this.bossState.phase = "groggy";
    this.bossState.phaseStartMs = now;
    this.bossState.pendingGroggyAfterPattern = false;
    this.bossState.pattern2StoneWave = [];
    this.bossState.pattern2StoneRects = [];
    this.resetPattern2StoneDebugState();
    this.bossState.finalStoneWave = [];
  }

  startBossDefeat(now) {
    if (!this.bossState) {
      return;
    }

    this.bossState.hp = 0;
    this.bossState.phase = "defeated-fall";
    this.bossState.phaseStartMs = now;
    this.bossState.patternDamageCount = 0;
    this.bossState.patternDamageLimit = 1;
    this.bossState.pendingGroggyAfterPattern = false;
    this.bossState.damageCooldownUntilMs = 0;
    this.bossState.damageFlashUntilMs = 0;
    this.bossState.pattern2StoneWave = [];
    this.bossState.pattern2StoneRects = [];
    this.resetPattern2StoneDebugState();
    this.bossState.finalStoneWave = [];
    this.bossState.clearReady = false;
    this.bossState.finalStoneBatchStartedAtMs = null;
    this.bossState.structurePhase = "idle";
    this.bossState.structurePhaseStartMs = now;
    this.bossState.structureRebuildPending = false;
  }

  maybeApplyBossLavaDamage(now, layout) {
    if (!this.bossState || !layout) {
      return;
    }

    if (
      this.bossState.phase === "final-stones" ||
      this.bossState.phase === "ending-wait" ||
      this.bossState.phase === "ending-banner" ||
      this.bossState.phase === "ending-drop" ||
      this.bossState.phase === "defeated-fall"
    ) {
      return;
    }

    if (now < this.bossState.damageCooldownUntilMs) {
      return;
    }

    if (
      this.bossState.patternDamageCount >=
      this.bossState.patternDamageLimit
    ) {
      return;
    }

    const handLavaBounds = this.getBossHandLavaBounds(now, layout);
    const bodyBounds = this.getBossBodyBounds(now, layout);

    if (!handLavaBounds && !bodyBounds) {
      return;
    }

    const isHandTouchingLava = Boolean(handLavaBounds) &&
      this.stageModel.hazards.some(
      (hazard) =>
        (hazard.type === "lava" || hazard.type === "super-lava") &&
        intersects(hazard, handLavaBounds),
    );
    const isBodyTouchingLava = Boolean(bodyBounds) &&
      this.stageModel.hazards.some(
        (hazard) =>
          (hazard.type === "lava" || hazard.type === "super-lava") &&
          intersects(hazard, bodyBounds),
    );

    if (!isHandTouchingLava && !isBodyTouchingLava) {
      return;
    }

    this.bossState.hp = Math.max(0, this.bossState.hp - BOSS_DAMAGE_PER_HIT);
    this.bossState.patternDamageCount += 1;
    this.bossState.damageCooldownUntilMs = now + BOSS_DAMAGE_COOLDOWN_MS;
    this.bossState.damageFlashUntilMs = now + BOSS_DAMAGE_COOLDOWN_MS;

    if (this.bossState.hp <= 0) {
      this.startBossDefeat(now);
      return;
    }

    if (
      this.bossState.hp > 50 &&
      isHandTouchingLava &&
      this.bossState.phase === "pattern1"
    ) {
      this.startBossGroggy(now);
    }
  }

  startNextBossPattern(now) {
    if (!this.bossState) {
      return;
    }

    const sequence = this.getBossPatternSequence();
    const nextPattern =
      sequence[this.bossState.patternCursor % sequence.length] ?? 1;

    this.bossState.patternCursor += 1;
    this.bossState.lastPatternStartMs = now;
    this.bossState.phaseStartMs = now;
    this.bossState.pendingGroggyAfterPattern = false;
    this.bossState.pattern2StoneWave = [];
    this.bossState.pattern2StoneRects = [];
    this.resetPattern2StoneDebugState();
    this.bossState.finalStoneWave = [];

    if (nextPattern === 1) {
      this.bossState.phase = "pattern1";
      this.resetBossPatternDamageWindow("pattern1");
      return;
    }

    if (nextPattern === 2) {
      this.bossState.phase = "pattern2";
      this.resetBossPatternDamageWindow("pattern2");
      this.createPattern2StoneBatch(now);
      this.syncPattern2StoneRects(now);
      return;
    }

    this.bossState.phase = "pattern3-warning";
    this.resetBossPatternDamageWindow("pattern3-warning");
    this.bossState.rushLaneIndex += 1;
  }

  isCharacterTouchingBossHazard(now, layout) {
    if (!this.bossState || !layout) {
      return false;
    }

    const characterBounds = this.characterModel.getBounds();
    const bossBounds = this.getBossBodyBounds(now, layout);

    if (bossBounds && intersects(characterBounds, bossBounds)) {
      return true;
    }

    const handBounds = this.getBossHandKillBounds(now, layout);

    if (handBounds && intersects(characterBounds, handBounds)) {
      return true;
    }

    const rushRect = this.getBossRushRect(now, layout);

    if (rushRect && intersects(characterBounds, rushRect)) {
      return true;
    }

    const computedStoneRects = this.getBossCurrentStoneRects(now).map(
      (stone) => ({
        left: stone.left,
        top: stone.top,
        right: stone.left + stone.width,
        bottom: stone.top + stone.height,
        width: stone.width,
        height: stone.height,
      }),
    );
    const renderedStoneRects =
      this.gameView?.getRenderedBossStoneBounds?.() ?? [];
    const stoneRects =
      renderedStoneRects.length >= computedStoneRects.length
        ? renderedStoneRects
        : computedStoneRects;

    return stoneRects.some((stoneRect) => {
      const killPadding = clamp(
        Math.min(stoneRect.width, stoneRect.height) * 0.3,
        16,
        30,
      );

      return intersects(characterBounds, {
        left: stoneRect.left - killPadding,
        top: stoneRect.top - killPadding,
        right: stoneRect.right + killPadding,
        bottom: stoneRect.bottom + killPadding,
      });
    });
  }

  updateBossStage() {
    if (!this.bossState || !this.isBossStage()) {
      return {
        didDie: false,
        didClear: false,
      };
    }

    const now = this.elapsedTimeMs;
    const layout = this.getBossLayoutMetrics();

    this.updateBossStructureCycle(now, layout);
    this.maybeApplyBossLavaDamage(now, layout);

    switch (this.bossState.phase) {
      case "intro":
        if (now - this.bossState.phaseStartMs >= BOSS_INTRO_DURATION_MS) {
          this.bossState.phase = "idle";
          this.bossState.phaseStartMs = now;
          this.bossState.lastPatternStartMs =
            now - (BOSS_PATTERN_INTERVAL_MS - 1600);
        }
        break;
      case "idle":
        this.bossState.pattern2StoneRects = [];
        this.resetPattern2StoneDebugState();
        if (
          now - this.bossState.lastPatternStartMs >=
          BOSS_PATTERN_INTERVAL_MS
        ) {
          this.startNextBossPattern(now);
        }
        break;
      case "pattern1":
        this.bossState.pattern2StoneRects = [];
        this.resetPattern2StoneDebugState();
        if (now - this.bossState.phaseStartMs >= BOSS_PATTERN1_DURATION_MS) {
          this.transitionBossToIdle(now);
        }
        break;
      case "pattern2":
        if (this.bossState.pattern2StoneWave.length === 0) {
          this.createPattern2StoneBatch(now);
          this.syncPattern2StoneRects(now);
        }
        this.syncPattern2StoneRects(now);
        if (now - this.bossState.phaseStartMs >= BOSS_PATTERN2_DURATION_MS) {
          this.transitionBossToIdle(now);
        }
        break;
      case "pattern3-warning":
        this.bossState.pattern2StoneRects = [];
        this.resetPattern2StoneDebugState();
        if (now - this.bossState.phaseStartMs >= BOSS_PATTERN3_WARNING_MS) {
          this.bossState.phase = "pattern3-rush";
          this.bossState.phaseStartMs = now;
        }
        break;
      case "pattern3-rush":
        this.bossState.pattern2StoneRects = [];
        this.resetPattern2StoneDebugState();
        if (now - this.bossState.phaseStartMs >= BOSS_PATTERN3_RUSH_MS) {
          this.bossState.rushDirection *= -1;
          this.transitionBossToIdle(now);
        }
        break;
      case "groggy":
        this.bossState.pattern2StoneRects = [];
        this.resetPattern2StoneDebugState();
        if (now - this.bossState.phaseStartMs >= BOSS_GROGGY_DURATION_MS) {
          this.transitionBossToIdle(now, true);
        }
        break;
      case "defeated-fall":
        this.bossState.pattern2StoneRects = [];
        this.resetPattern2StoneDebugState();
        if (now - this.bossState.phaseStartMs >= BOSS_DEFEAT_FALL_MS) {
          this.bossState.phase = "ending-wait";
          this.bossState.phaseStartMs = now;
        }
        break;
      case "ending-wait":
        this.bossState.pattern2StoneRects = [];
        this.resetPattern2StoneDebugState();
        if (now - this.bossState.phaseStartMs >= BOSS_ENDING_WAIT_MS) {
          this.bossState.phase = "ending-banner";
          this.bossState.phaseStartMs = now;
        }
        break;
      case "ending-banner":
        this.bossState.pattern2StoneRects = [];
        this.resetPattern2StoneDebugState();
        if (now - this.bossState.phaseStartMs >= BOSS_ENDING_BANNER_MS) {
          this.bossState.phase = "ending-drop";
          this.bossState.phaseStartMs = now;
        }
        break;
      case "ending-drop":
        this.bossState.pattern2StoneRects = [];
        this.resetPattern2StoneDebugState();
        if (now - this.bossState.phaseStartMs >= BOSS_ENDING_DROP_MS) {
          this.bossState.phase = "final-stones";
          this.bossState.phaseStartMs = now;
          this.bossState.finalStoneBatchStartedAtMs = now;
          this.bossState.finalStoneWave = this.createBossStoneWave(now, true);
        }
        break;
      case "final-stones":
        this.bossState.pattern2StoneRects = [];
        this.resetPattern2StoneDebugState();
        if (
          !this.bossState.clearReady &&
          now - this.bossState.phaseStartMs >= BOSS_FINAL_STONES_MS &&
          this.getFinalStoneRects(now).length === 0
        ) {
          this.bossState.clearReady = true;
        }
        break;
      default:
        break;
    }

    return {
      didDie: this.isCharacterTouchingBossHazard(now, layout),
      didClear: this.bossState.clearReady,
    };
  }

  getBossRenderState() {
    if (!this.bossState || !this.isBossStage()) {
      return null;
    }

    const now = this.elapsedTimeMs;
    const layout = this.getBossLayoutMetrics();
    const visual = this.getBossVisualState(now, layout);
    const hand = this.getBossAttackHandState(now, layout);
    const rushWarning =
      this.bossState.phase === "pattern3-warning"
        ? {
            visible: true,
            left: layout.warningLeft,
            top: this.getBossRushLaneTop(layout),
            width: layout.warningWidth,
            height: layout.rushHeight,
          }
        : null;
    const ending = this.getBossEndingState(now, layout);
    const stones = this.getBossCurrentStoneRects(now);
    const shake = this.getBossShakeOffset(now);
    const structure = this.getBossStructureState(now, layout);

    return {
      isVisible: Boolean(visual?.visible),
      x: visual?.x ?? 0,
      y: visual?.y ?? 0,
      width: visual?.width ?? 0,
      height: visual?.height ?? 0,
      pose: visual?.pose ?? "base",
      facing: visual?.facing ?? -1,
      hpPercent: this.bossState.hp,
      isGroggy: this.bossState.phase === "groggy",
      isDamaged: now < this.bossState.damageFlashUntilMs,
      isDefeated: this.bossState.phase === "defeated-fall",
      hand: hand
        ? {
            visible: true,
            x: hand.x,
            y: hand.y,
            width: hand.width,
            height: hand.height,
          }
        : { visible: false, x: 0, y: 0, width: 0, height: 0 },
      rushWarning: rushWarning
        ? {
            visible: true,
            left: rushWarning.left,
            top: rushWarning.top,
            width: rushWarning.width,
            height: rushWarning.height,
          }
        : {
            visible: false,
            left: 0,
            top: 0,
            width: 0,
            height: 0,
          },
      stones,
      ending,
      shake,
      structure,
    };
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
    this.gameView.refreshStageAnchors?.();
    this.resetMonsterStatesToStageLayout();
    if (this.bossState) {
      this.bossState.pattern2StoneWave = this.bossState.pattern2StoneWave.map(
        (stone) => ({
          ...stone,
          startX: stone.startX * stageState.scaleX,
          size: stone.size * stageState.scaleX,
          startY: stone.startY * stageState.scaleY,
          endY: stone.endY * stageState.scaleY,
        }),
      );
      this.bossState.pattern2StoneRects = this.getBossStoneRectsFromWave(
        this.bossState.pattern2StoneWave,
        this.elapsedTimeMs,
      );
      this.bossState.finalStoneWave = this.bossState.finalStoneWave.map(
        (stone) => ({
          ...stone,
          startX: stone.startX * stageState.scaleX,
          size: stone.size * stageState.scaleX,
          startY: stone.startY * stageState.scaleY,
          endY: stone.endY * stageState.scaleY,
        }),
      );
    }
    this.updateActiveTrigger();
  }

  resetMonsterStatesToStageLayout() {
    const stageMonstersById = new Map(
      this.stageModel.monsters.map((monster) => [monster.id, monster]),
    );

    this.monsterStates.forEach((monsterState, monsterId) => {
      const stageMonster = stageMonstersById.get(monsterId);

      if (!stageMonster) {
        return;
      }

      monsterState.spawnX = stageMonster.rect.left;
      monsterState.spawnY = stageMonster.rect.top;
      monsterState.x = stageMonster.rect.left;
      monsterState.y = stageMonster.rect.top;
      monsterState.width = stageMonster.rect.width;
      monsterState.height = stageMonster.rect.height;
      monsterState.vy = 0;
      monsterState.speedMultiplier = stageMonster.speedMultiplier;
      monsterState.direction = stageMonster.direction;
      monsterState.defaultDirection = stageMonster.direction;
      monsterState.isAlert = false;
    });
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
    if (this.isAimingCannon) {
      this.activeTrigger = null;
      return;
    }

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

    this.gameView.animateTriggerResult(collapseState);
    this.activeTrigger = null;
  }

  handleTimedBlocks() {
    const timedBlock = this.stageModel.getStandingTimedBlock(
      this.characterModel.getBounds(),
      Math.max(8, this.stageModel.bounds.width * 0.007),
    );

    if (timedBlock) {
      const timedState = this.timedBlockStates.get(timedBlock.id);

      if (
        timedState &&
        !timedState.isExpired &&
        timedState.startTimeMs === null
      ) {
        timedState.startTimeMs = this.elapsedTimeMs;
        timedState.isActive = true;
      }
    }

    this.timedBlockStates.forEach((timedState) => {
      if (
        timedState.isExpired ||
        timedState.startTimeMs === null ||
        !timedState.isActive
      ) {
        return;
      }

      if (
        this.elapsedTimeMs - timedState.startTimeMs <
        TIMED_BLOCK_DURATION_MS
      ) {
        return;
      }

      timedState.isActive = false;
      timedState.isExpired = true;
      const collapseState = this.stageModel.expireTimedBlock(timedState.id);

      if (collapseState) {
        this.gameView.animateTriggerResult(collapseState);
      }
    });
  }

  beginCannonAimIfNeeded(input) {
    if (
      this.isAimingCannon ||
      !input.pointer?.justPressed ||
      this.getStoneState() === "held"
    ) {
      return;
    }

    const interactionPadding = Math.max(
      26,
      this.stageModel.bounds.width * 0.025,
    );
    const cannon = this.stageModel.getNearbyCannon(
      this.characterModel.getBounds(),
      interactionPadding,
    );

    if (!cannon) {
      return;
    }

    this.activeCannon = cannon;
    this.isAimingCannon = true;
    this.isDraggingStone = false;
    this.isPreparingStoneThrow = false;
    this.stoneAim = {
      start: cannon.muzzlePoint,
      end: input.pointer.position ?? cannon.muzzlePoint,
    };
    this.holdCharacterAtActiveCannon();
  }

  holdCharacterAtActiveCannon() {
    if (!this.activeCannon) {
      return;
    }

    const seat = this.activeCannon.seatPoint;
    this.characterModel.launch({
      x: seat.x - this.characterModel.width / 2,
      y: seat.y - this.characterModel.height / 2,
      vx: 0,
      vy: 0,
    });
  }

  handleCannonInteraction(input) {
    if (!this.activeCannon) {
      this.isAimingCannon = false;
      return;
    }

    const pointer = input.pointer;
    const aimThreshold = Math.max(42, this.stageModel.bounds.width * 0.035);
    const pointerPosition = pointer?.position ?? this.activeCannon.muzzlePoint;

    this.holdCharacterAtActiveCannon();
    this.stoneAim = {
      start: this.activeCannon.muzzlePoint,
      end: pointerPosition,
    };

    if (!pointer?.justReleased) {
      return;
    }

    const dragDistance = this.getPointerDistance(
      pointer.dragStart ?? pointerPosition,
      pointerPosition,
    );
    const muzzlePoint = this.activeCannon.muzzlePoint;

    this.isAimingCannon = false;
    this.stoneAim = null;

    if (dragDistance < aimThreshold) {
      this.activeCannon = null;
      return;
    }

    const usedCannon = this.activeCannon;
    const velocity = this.getCannonLaunchVelocity(muzzlePoint, pointerPosition);
    const speed = Math.hypot(velocity.x, velocity.y);
    const direction =
      speed > 0
        ? { x: velocity.x / speed, y: velocity.y / speed }
        : { x: 0, y: -1 };
    const launchOffset = Math.max(
      this.characterModel.width * 0.6,
      this.characterModel.height * 0.45,
      18 * this.characterModel.physicsScale,
    );

    this.characterModel.launch({
      x:
        muzzlePoint.x +
        direction.x * launchOffset -
        this.characterModel.width / 2,
      y:
        muzzlePoint.y +
        direction.y * launchOffset -
        this.characterModel.height / 2,
      vx: velocity.x,
      vy: velocity.y,
    });

    if (usedCannon.singleUse) {
      this.stageModel.disableCannon?.(usedCannon.id);
    }

    this.activeCannon = null;
  }

  getCannonLaunchVelocity(muzzlePoint, pointerPoint) {
    const dx = pointerPoint.x - muzzlePoint.x;
    const dy = pointerPoint.y - muzzlePoint.y;
    const dragDistance = Math.sqrt(dx * dx + dy * dy);
    const safeDistance = Math.max(dragDistance, 1);
    const normalizedStrength = clamp((dragDistance - 30) / 390, 0, 1);
    const launchMultiplier = Math.max(
      1,
      Number(this.activeCannon?.launchMultiplier ?? 1),
    );
    const launchSpeed =
      (620 + normalizedStrength * 420) *
      this.characterModel.physicsScale *
      launchMultiplier;

    return {
      x: (dx / safeDistance) * launchSpeed,
      y: (dy / safeDistance) * launchSpeed,
    };
  }

  handleContactTriggerHits() {
    const characterBounds = this.characterModel.getBounds();
    const stoneBounds = this.physicsController?.getStoneBounds?.() ?? null;
    const solidifiedBounds = (
      this.physicsController?.getSolidifiedBlocks?.() ?? []
    ).map((block) => ({
      left: block.left,
      top: block.top,
      right: block.left + block.width,
      bottom: block.top + block.height,
    }));

    this.stageModel.contactTriggers.forEach((trigger) => {
      if (trigger.isUsed) {
        return;
      }

      const sources =
        trigger.contactSources.length > 0
          ? trigger.contactSources
          : ["character"];
      const touchedByCharacter =
        sources.includes("character") &&
        intersects(characterBounds, trigger.rect);
      const touchedByStone =
        stoneBounds &&
        sources.includes("stone") &&
        intersects(stoneBounds, trigger.rect);
      const touchedByLava =
        sources.includes("lava") &&
        this.stageModel.hazards.some(
          (hazard) =>
            (hazard.type === "lava" || hazard.type === "super-lava") &&
            intersects(hazard, trigger.rect),
        );
      const touchedBySolidified =
        sources.includes("solidified") &&
        solidifiedBounds.some((block) => intersects(block, trigger.rect));

      if (
        !touchedByCharacter &&
        !touchedByStone &&
        !touchedByLava &&
        !touchedBySolidified
      ) {
        return;
      }

      const collapseState = this.stageModel.activateContactTrigger(trigger.id);

      if (!collapseState) {
        return;
      }

      this.gameView.animateTriggerResult(collapseState);
    });
  }

  updateMonsters(dt) {
    const characterBounds = this.characterModel.getBounds();
    const baseSpeed = this.stageModel.bounds.width * 0.135;

    this.monsterStates.forEach((monster) => {
      if (monster.isDead) {
        return;
      }

      this.applyMonsterGravity(monster, dt);

      let monsterBounds = this.getMonsterBounds(monster);

      if (this.isRectTouchingHazard(monsterBounds)) {
        monster.isDead = true;
        monster.isAlert = false;
        return;
      }

      const characterCenterX =
        (characterBounds.left + characterBounds.right) / 2;
      const characterCenterY =
        (characterBounds.top + characterBounds.bottom) / 2;
      const monsterCenterX = monster.x + monster.width / 2;
      const monsterCenterY = monster.y + monster.height / 2;
      const samePlatform =
        Math.abs(characterCenterY - monsterCenterY) <=
        Math.max(
          monster.height * 0.55,
          characterBounds.bottom - characterBounds.top,
        );
      const canSeeCharacter =
        samePlatform &&
        !this.isSightBlocked(
          monsterCenterX,
          characterCenterX,
          monsterCenterY,
          monster.id,
        );

      monster.isAlert = canSeeCharacter;

      if (!canSeeCharacter) {
        return;
      }

      monster.direction = characterCenterX < monsterCenterX ? -1 : 1;
      this.moveMonster(
        monster,
        monster.direction * baseSpeed * (monster.speedMultiplier ?? 1) * dt,
      );

      monsterBounds = this.getMonsterBounds(monster);

      if (this.isRectTouchingHazard(monsterBounds)) {
        monster.isDead = true;
        monster.isAlert = false;
      }
    });
  }

  applyMonsterGravity(monster, dt) {
    const gravity = 1800 * (this.stageModel.bounds.width / 1280);
    const maxFallSpeed = 1400 * (this.stageModel.bounds.width / 1280);

    monster.vy = Math.min((monster.vy ?? 0) + gravity * dt, maxFallSpeed);

    if (monster.vy <= 0) {
      return;
    }

    const nextY = monster.y + monster.vy * dt;
    const nextBounds = {
      left: monster.x,
      top: nextY,
      right: monster.x + monster.width,
      bottom: nextY + monster.height,
    };

    for (const solid of this.stageModel.solids) {
      if (!intersects(nextBounds, solid)) {
        continue;
      }

      monster.y = solid.top - monster.height;
      monster.vy = 0;
      return;
    }

    monster.y = nextY;
  }

  moveMonster(monster, dx) {
    const nextX = monster.x + dx;
    const nextBounds = {
      left: nextX,
      top: monster.y,
      right: nextX + monster.width,
      bottom: monster.y + monster.height,
    };

    for (const solid of this.stageModel.solids) {
      if (!intersects(nextBounds, solid)) {
        continue;
      }

      if (dx > 0) {
        monster.x = solid.left - monster.width;
      } else if (dx < 0) {
        monster.x = solid.right;
      }

      return;
    }

    monster.x = clamp(
      nextX,
      0,
      Math.max(0, this.stageModel.bounds.width - monster.width),
    );
  }

  isSightBlocked(startX, endX, y, monsterId) {
    const minX = Math.min(startX, endX);
    const maxX = Math.max(startX, endX);

    return this.stageModel.solids.some((solid) => {
      if (solid.bottom <= y || solid.top >= y) {
        return false;
      }

      const overlapsLine = !(solid.right <= minX || solid.left >= maxX);

      if (!overlapsLine) {
        return false;
      }

      // Ignore the monster's own standing platform if the line only clips the top edge.
      return true;
    });
  }

  getMonsterBounds(monster) {
    return {
      left: monster.x,
      top: monster.y,
      right: monster.x + monster.width,
      bottom: monster.y + monster.height,
    };
  }

  isCharacterTouchingMonster() {
    const characterBounds = this.characterModel.getBounds();

    return [...this.monsterStates.values()].some(
      (monster) =>
        !monster.isDead &&
        intersects(characterBounds, this.getMonsterBounds(monster)),
    );
  }

  isRectTouchingHazard(bounds) {
    return this.stageModel.hazards.some((hazard) => intersects(bounds, hazard));
  }

  handlePlayerDeath() {
    this.isDraggingStone = false;
    this.isPreparingStoneThrow = false;
    this.stoneAim = null;
    this.activeCannon = null;
    this.isAimingCannon = false;
    this.restartStage();
  }

  restartStage() {
    this.gameView.resetStageState();
    this.inputController.resetTransientActions?.();
    this.stageModel.resetStage();
    const resetStageState = this.stageModel.refresh();

    const characterSize = this.gameView.measureCharacter();
    this.characterModel.syncSize(characterSize);
    this.characterModel.syncPhysics(
      resetStageState?.width ?? this.stageModel.bounds.width,
    );
    this.characterModel.updateSpawn(
      this.stageModel.getSpawnPoint(characterSize),
    );
    this.characterModel.resetToSpawn();
    this.gameView.refreshStageAnchors?.();
    this.initializeStageActors();

    this.physicsController?.reset(this.stageModel);
    this.syncPhysicsRuntimeState();
    this.elapsedTimeMs = 0;
    this.isStageCleared = false;
    this.isDraggingStone = false;
    this.isPreparingStoneThrow = false;
    this.stoneAim = null;
    this.activeCannon = null;
    this.isAimingCannon = false;
    this.customMissionAlarm = null;
    this.portalCooldownMs = 0;
    this.gameView.hideClearOverlay();
    this.gameView.setNextStageVisibility(false);
    this.gameView.updateTimer(this.formatTime(this.elapsedTimeMs));
    this.accumulator = 0;
    this.lastTimestamp = 0;
    this.activeTrigger = null;
    this.updateActiveTrigger();
  }

  isCharacterTouchingTreasure() {
    const treasureBounds = this.physicsController?.getTreasureBounds?.();

    if (!treasureBounds) {
      return false;
    }

    return intersects(
      this.characterModel.getBounds(),
      expandTreasureInteractionBounds(treasureBounds),
    );
  }

  handleTreasureInteraction() {
    if (!this.isCharacterTouchingTreasure()) {
      return false;
    }

    if (!this.isTreasureBarrierActive()) {
      return true;
    }

    if (!this.isMissionAlarmActive()) {
      this.showMissionAlarm(
        this.getStageMissionConfig()?.lockedTreasureMessage ??
          STAGE4_LOCKED_TREASURE_MESSAGE,
      );
    }

    return false;
  }

  handlePortalTraversal() {
    if (this.portalCooldownMs > 0) {
      return false;
    }

    const entryPortal = this.stageModel.getPortalEntry(
      this.characterModel.getBounds(),
      0,
    );

    if (!entryPortal?.targetId) {
      return false;
    }

    const exitPortal = this.stageModel.getPortalById(entryPortal.targetId);

    if (!exitPortal) {
      return false;
    }

    const exitPosition = this.getPortalExitPosition(exitPortal);
    this.characterModel.launch({
      x: exitPosition.x,
      y: exitPosition.y,
      vx: 0,
      vy: 0,
    });
    this.portalCooldownMs = 450;
    this.isDraggingStone = false;
    this.isPreparingStoneThrow = false;
    this.stoneAim = null;
    this.activeCannon = null;
    this.isAimingCannon = false;
    this.updateActiveTrigger();
    return true;
  }

  getPortalExitPosition(portal) {
    const bounds = portal.rect;
    const characterWidth = this.characterModel.width;
    const characterHeight = this.characterModel.height;
    const margin = Math.max(10, this.stageModel.bounds.width * 0.01);
    let x = bounds.left + (bounds.width - characterWidth) / 2;
    let y = bounds.top + (bounds.height - characterHeight) / 2;

    switch (portal.exitDirection) {
      case "left":
        x = bounds.left - characterWidth - margin;
        break;
      case "top":
        y = bounds.top - characterHeight - margin;
        break;
      case "bottom":
        y = bounds.bottom + margin;
        break;
      case "right":
      default:
        x = bounds.right + margin;
        break;
    }

    return {
      x: clamp(
        x,
        0,
        Math.max(0, this.stageModel.bounds.width - characterWidth),
      ),
      y: clamp(
        y,
        0,
        Math.max(0, this.stageModel.bounds.height - characterHeight),
      ),
    };
  }

  handleStageClear() {
    this.isStageCleared = true;
    this.inputController.resetTransientActions?.();
    this.activeTrigger = null;
    this.isDraggingStone = false;
    this.isPreparingStoneThrow = false;
    this.stoneAim = null;
    this.activeCannon = null;
    this.isAimingCannon = false;
    this.customMissionAlarm = null;
    this.gameView.showClearOverlay({
      timeText: this.formatTime(this.elapsedTimeMs),
      stars: this.getStarRating(this.elapsedTimeMs),
      showNextStage: Boolean(
        this.stage?.supportsNextStage && this.nextStagePath,
      ),
    });
  }

  getStarRating(timeMs) {
    const overtimeMs = Math.max(0, timeMs - 30000);
    const penaltySteps = Math.ceil(overtimeMs / 5000);
    return Math.max(0, 3 - penaltySteps * 0.5);
  }

  formatTime(timeMs) {
    const totalCentiseconds = Math.max(0, Math.floor(timeMs / 10));
    const minutes = Math.floor(totalCentiseconds / 6000);
    const seconds = Math.floor((totalCentiseconds % 6000) / 100);
    const centiseconds = totalCentiseconds % 100;

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}:${String(centiseconds).padStart(2, "0")}`;
  }

  syncPhysicsRuntimeState() {
    this.stageModel.setRuntimeSolids(
      this.physicsController?.getSolidifiedBlocks?.() ?? [],
    );
    this.stageModel.setRuntimeHazards(
      this.physicsController?.getHazards?.() ?? [],
    );
    const activeWaterZones =
      this.physicsController?.getActiveWaterZones?.() ?? null;

    if (activeWaterZones === null) {
      this.stageModel.clearRuntimeWaterZones();
      return;
    }

    this.stageModel.setRuntimeWaterZones(activeWaterZones);
  }

  canThrowStone() {
    if (this.getStoneState() === "held") {
      return true;
    }

    return (
      this.physicsController?.canPickupStone?.(
        this.characterModel.getBounds(),
        Math.max(16, this.stageModel.bounds.width * 0.015),
      ) ?? false
    );
  }

  getStoneState() {
    return this.physicsController?.getStoneState?.() ?? "missing";
  }

  getHeldStoneInteraction() {
    if (this.getStoneState() !== "held") {
      return null;
    }

    return {
      position:
        this.physicsController?.getHeldStonePosition?.() ??
        this.getStoneCarryPoint(),
      isAiming: this.isDraggingStone,
    };
  }

  handleStoneAutoPickup() {
    if (this.isAimingCannon) {
      return;
    }

    const stoneState = this.getStoneState();

    if (stoneState === "held" || stoneState === "thrown") {
      return;
    }

    const pickupPadding = Math.max(12, this.stageModel.bounds.width * 0.012);
    const source = this.stageModel.getOverlappingStoneSource(
      this.characterModel.getBounds(),
      pickupPadding,
    );

    if (source) {
      const carryPoint = this.getStoneCarryPoint();
      this.stageModel.consumeStoneSource(source.id);
      this.physicsController.pickupStone(carryPoint);
      this.physicsController.setHeldStonePosition(carryPoint);
      this.isDraggingStone = false;
      this.isPreparingStoneThrow = false;
      this.stoneAim = null;
      return;
    }

    if (stoneState !== "grounded") {
      return;
    }

    const canPickup = this.physicsController?.canPickupStone?.(
      this.characterModel.getBounds(),
      pickupPadding,
    );

    if (!canPickup) {
      return;
    }

    const carryPoint = this.getStoneCarryPoint();
    this.physicsController.pickupStone(carryPoint);
    this.physicsController.setHeldStonePosition(carryPoint);
    this.isDraggingStone = false;
    this.isPreparingStoneThrow = false;
    this.stoneAim = null;
  }

  handleStoneInteraction(input) {
    const pointer = input.pointer;
    const stoneState = this.getStoneState();
    const aimThreshold = Math.max(34, this.stageModel.bounds.width * 0.028);

    if (!pointer || !this.physicsController) {
      this.isDraggingStone = false;
      this.stoneAim = null;
      return;
    }

    if (stoneState === "held") {
      const carryPoint = this.getStoneCarryPoint();
      const pointerPosition = pointer.position ?? carryPoint;
      const dragDistance = this.getPointerDistance(
        pointer.dragStart ?? pointerPosition,
        pointerPosition,
      );

      this.physicsController.setHeldStonePosition(carryPoint);

      if (pointer.justPressed) {
        this.isPreparingStoneThrow = true;
        this.isDraggingStone = false;
        this.physicsController.clearStoneProjectileState();
      }

      if (pointer.isDown && !this.isPreparingStoneThrow) {
        this.isPreparingStoneThrow = true;
      }

      if (pointer.isDown && dragDistance >= aimThreshold) {
        this.isDraggingStone = true;
      }

      if (pointer.isDown) {
        const releasePoint = this.getStoneReleasePoint(
          carryPoint,
          pointerPosition,
        );
        this.stoneAim = {
          start: releasePoint,
          end: pointerPosition,
        };
      } else if (!pointer.justReleased) {
        this.stoneAim = null;
      }

      if (!pointer.justReleased) {
        return;
      }

      this.isPreparingStoneThrow = false;
      this.isDraggingStone = false;
      this.stoneAim = null;

      if (dragDistance < aimThreshold) {
        this.physicsController.clearStoneProjectileState();
        this.physicsController.setHeldStonePosition(carryPoint);
        return;
      }

      const releasePoint = this.getStoneReleasePoint(
        carryPoint,
        pointerPosition,
      );
      const throwVelocity = this.getStoneThrowVelocity({
        origin: releasePoint,
        target: pointerPosition,
        dragDistance: this.getPointerDistance(carryPoint, pointerPosition),
      });

      this.physicsController.throwStone({
        position: releasePoint,
        velocity: throwVelocity,
      });
      return;
    }

    this.isDraggingStone = false;
    this.isPreparingStoneThrow = false;
    this.stoneAim = null;
  }

  getStoneCarryPoint() {
    const viewOrigin = this.gameView?.getStoneAimOrigin?.();

    if (viewOrigin) {
      return viewOrigin;
    }

    const bounds = this.characterModel.getBounds();
    const offsetX = bounds.width * 0.04 * this.characterModel.facing;

    return {
      x: bounds.left + bounds.width / 2 + offsetX,
      y: bounds.top - Math.max(bounds.height * 0.38, 24),
    };
  }

  getStoneReleasePoint(carryPoint, pointerPoint) {
    const dx = pointerPoint.x - carryPoint.x;
    const dy = pointerPoint.y - carryPoint.y;
    const distance = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
    const releaseOffset = Math.max(12, this.stageModel.bounds.width * 0.012);

    return {
      x: carryPoint.x + (dx / distance) * releaseOffset,
      y: carryPoint.y + (dy / distance) * releaseOffset,
    };
  }

  getStoneThrowVelocity({ origin, target, dragDistance = null }) {
    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    const distance = Math.max(Math.sqrt(dx * dx + dy * dy), 1);
    const strength = clamp(dragDistance ?? distance, 24, 280);
    const launchSpeed = clamp(strength * 0.12, 4, 34);

    return {
      x: (dx / distance) * launchSpeed,
      y: (dy / distance) * launchSpeed,
    };
  }

  getPointerDistance(startPoint, endPoint) {
    const dx = endPoint.x - startPoint.x;
    const dy = endPoint.y - startPoint.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  handleProjectileTriggerHits() {
    const triggerIds = this.physicsController?.consumeTriggerHits?.() ?? [];

    triggerIds.forEach((triggerId) => {
      const collapseState =
        this.stageModel.activateProjectileTrigger(triggerId);

      if (!collapseState) {
        return;
      }

      this.gameView.animateTriggerResult(collapseState);

      if (this.activeTrigger?.id === triggerId) {
        this.activeTrigger = null;
      }
    });
  }

  destroy() {
    this.stop();
    this.physicsController?.destroy?.();
    this.inputController?.destroy?.();
    this.stageModel?.destroy?.();
    this.gameView?.destroy?.();
  }
}
