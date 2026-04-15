const CUSTOM_MISSION_ALARM_DURATION_MS = 1600;

export class GameView {
  constructor(
    characterElement,
    { heldStoneElement = null, stoneAimElement = null } = {},
  ) {
    this.containerElement = characterElement.parentElement;
    this.characterElement = characterElement;
    this.timerElement =
      this.containerElement?.querySelector(".timer-ui") ?? null;
    this.clearOverlayElement =
      this.containerElement?.querySelector(".clear-overlay") ?? null;
    this.clearTimeElement =
      this.clearOverlayElement?.querySelector(".clear-time") ?? null;
    this.clearRetryButton =
      this.clearOverlayElement?.querySelector(".clear-action--retry") ?? null;
    this.clearNextButton =
      this.clearOverlayElement?.querySelector(".clear-action--next") ?? null;
    this.clearMainButton =
      this.clearOverlayElement?.querySelector(".clear-action--main") ?? null;
    this.clearStarMasks = Array.from(
      this.clearOverlayElement?.querySelectorAll(".clear-star-mask") ?? [],
    );
    this.characterHeadElement =
      this.characterElement?.querySelector(".character-head") ?? null;
    this.worldStoneElement =
      this.containerElement?.querySelector(".throw-stone") ?? null;
    this.heldStoneElement =
      heldStoneElement ??
      this.characterElement?.querySelector(".held-stone") ??
      null;
    this.stoneAimElement =
      stoneAimElement ??
      this.containerElement?.querySelector("[data-stone-aim-line]") ??
      null;
    this.stoneAimReticleElement =
      this.containerElement?.querySelector("[data-stone-aim-reticle]") ?? null;
    this.stoneAimReticleHorizontalElement =
      this.containerElement?.querySelector(
        '[data-stone-aim-reticle-axis="horizontal"]',
      ) ?? null;
    this.stoneAimReticleVerticalElement =
      this.containerElement?.querySelector(
        '[data-stone-aim-reticle-axis="vertical"]',
      ) ?? null;
    this.monsterElements = new Map(
      Array.from(
        this.containerElement?.querySelectorAll("[data-monster='true']") ?? [],
      ).map((element) => [element.dataset.monsterId, element]),
    );
    this.monsterBasePositions = new Map(
      Array.from(this.monsterElements.entries()).map(([id, element]) => [
        id,
        {
          left: element.offsetLeft,
          top: element.offsetTop,
        },
      ]),
    );
    this.timedBlockElements = new Map(
      Array.from(
        this.containerElement?.querySelectorAll("[data-timed-block='true']") ??
          [],
      ).map((element) => [element.dataset.collapseId, element]),
    );
    this.cannonElements = new Map(
      Array.from(
        this.containerElement?.querySelectorAll("[data-cannon='true']") ?? [],
      ).map((element) => [element.dataset.cannonId, element]),
    );
    this.missionCountElements = new Map(
      Array.from(
        this.containerElement?.querySelectorAll("[data-mission-count-id]") ??
          [],
      ).map((element) => [element.dataset.missionCountId, element]),
    );
    this.initialMissionCounts = new Map(
      Array.from(this.missionCountElements.entries()).map(([id, element]) => [
        id,
        element.textContent,
      ]),
    );
    this.stage4MonsterCountElement =
      this.missionCountElements.get("stage4-guardian") ?? null;
    this.treasureBarrierElements = new Map(
      Array.from(
        this.containerElement?.querySelectorAll("[data-treasure-barrier-id]") ??
          [],
      ).map((element) => [element.dataset.treasureBarrierId, element]),
    );
    this.stage4TreasureBarrierElement =
      this.containerElement?.querySelector(
        "[data-stage4-treasure-barrier='true']",
      ) ?? null;
    this.customMissionAlarmElement =
      this.containerElement?.querySelector(".custom-mission-alarm") ?? null;
    this.customMissionAlarmTextElement =
      this.customMissionAlarmElement?.querySelector(
        "[data-custom-mission-alarm-text='true']",
      ) ?? null;
    this.breathElement =
      this.containerElement?.querySelector("[data-breath-ui='true']") ?? null;
    this.breathFillElement =
      this.breathElement?.querySelector("[data-breath-fill='true']") ?? null;
    this.bossHudElement =
      this.containerElement?.querySelector("[data-boss-hud='true']") ?? null;
    this.bossHpFillElement =
      this.containerElement?.querySelector("[data-boss-hp-fill='true']") ??
      null;
    this.bossHpLabelElement =
      this.containerElement?.querySelector("[data-boss-hp-label='true']") ??
      null;
    this.bossRootElement =
      this.containerElement?.querySelector("[data-boss-root='true']") ?? null;
    this.bossStructureElement =
      this.containerElement?.querySelector("[data-boss-structure='true']") ??
      null;
    this.bossVisualElement =
      this.containerElement?.querySelector("[data-boss-visual='true']") ?? null;
    this.bossVisualImageElement =
      this.containerElement?.querySelector("[data-boss-visual-image='true']") ??
      null;
    this.bossHandElement =
      this.containerElement?.querySelector("[data-boss-hand='true']") ?? null;
    this.bossHitFlashElement =
      this.containerElement?.querySelector("[data-boss-hitflash='true']") ??
      null;
    this.bossStoneLayerElement =
      this.containerElement?.querySelector("[data-boss-stone-layer='true']") ??
      null;
    this.bossRushWarningElement =
      this.containerElement?.querySelector("[data-boss-rush-warning='true']") ??
      null;
    this.bossEndingElement =
      this.containerElement?.querySelector("[data-boss-ending='true']") ?? null;
    this.bossEndingWarningElement =
      this.containerElement?.querySelector(
        "[data-boss-ending-warning='true']",
      ) ?? null;
    this.bossEndingCardElement =
      this.containerElement?.querySelector("[data-boss-ending-card='true']") ??
      null;
    this.bossStoneSlots = this.getBossStoneSlots();
    this.activeTriggerElement = null;
    this.collapseTimers = new Map();
    this.customMissionAlarmTimer = null;
    this.activeMissionAlarmToken = null;
    this.boundRetryClick = null;
    this.boundNextClick = null;
    this.reportedBossImageErrors = new Set();
    this.reportedBossImageLoads = new Set();
    this.reportedBossStoneSlotLoads = new Set();
    this.reportedBossStoneSlotErrors = new Set();
    this.lastBossStoneRenderSignature = "";
    this.lastBossRushDebugSignature = "";
    this.lastBossEndingDebugSignature = "";
    this.bossStoneAssetMetrics = {
      naturalWidth: 0,
      naturalHeight: 0,
      aspectRatio: 1,
    };
    this.bossRushAssetMetrics = {
      naturalWidth: 0,
      naturalHeight: 0,
      aspectRatio: 1,
    };
    this.bossEndAssetMetrics = {
      naturalWidth: 0,
      naturalHeight: 0,
      aspectRatio: 1,
    };
    this.boundBossVisualImageError = this.handleBossVisualImageError.bind(this);
    this.boundBossVisualImageLoad = this.handleBossVisualImageLoad.bind(this);
    this.boundBossStoneImageError = this.handleBossStoneImageError.bind(this);
    this.boundBossStoneImageLoad = this.handleBossStoneImageLoad.bind(this);

    if (this.bossVisualImageElement) {
      this.bossVisualImageElement.addEventListener(
        "error",
        this.boundBossVisualImageError,
      );
      this.bossVisualImageElement.addEventListener(
        "load",
        this.boundBossVisualImageLoad,
      );
    }

    this.preloadBossRushAssetMetrics();
    this.preloadBossEndAssetMetrics();
    this.bindBossStoneSlotListeners();
  }

  measureCharacter() {
    const rect = this.characterElement.getBoundingClientRect();

    return {
      width: rect.width,
      height: rect.height,
    };
  }

  refreshBossStageElements() {
    this.bossStructureElement =
      this.containerElement?.querySelector("[data-boss-structure='true']") ??
      null;
    this.bossStoneLayerElement =
      this.containerElement?.querySelector("[data-boss-stone-layer='true']") ??
      null;
    this.bossStoneSlots = this.getBossStoneSlots();
    this.lastBossStoneRenderSignature = "";
    this.bindBossStoneSlotListeners();
  }

  refreshStageAnchors() {
    this.monsterBasePositions = new Map(
      Array.from(this.monsterElements.entries()).map(([id, element]) => [
        id,
        {
          left: element.offsetLeft,
          top: element.offsetTop,
        },
      ]),
    );
    this.refreshBossStageElements();
  }

  bindControls({ onRetry, onNextStage } = {}) {
    this.bindButton(this.clearRetryButton, "boundRetryClick", onRetry);
    this.bindButton(this.clearNextButton, "boundNextClick", onNextStage);
  }

  bindButton(buttonElement, propertyKey, handler) {
    if (buttonElement && this[propertyKey]) {
      buttonElement.removeEventListener("click", this[propertyKey]);
    }

    this[propertyKey] = typeof handler === "function" ? handler : null;

    if (buttonElement && this[propertyKey]) {
      buttonElement.addEventListener("click", this[propertyKey]);
    }
  }

  setNextStageVisibility(isVisible) {
    if (!this.clearNextButton) {
      return;
    }

    this.clearNextButton.hidden = !isVisible;
    this.clearNextButton.disabled = !isVisible;
  }

  updateTimer(timeText) {
    if (this.timerElement) {
      this.timerElement.textContent = timeText;
    }
  }

  showClearOverlay({ timeText, stars, showNextStage = false }) {
    if (!this.clearOverlayElement) {
      return;
    }

    if (this.clearTimeElement) {
      this.clearTimeElement.textContent = timeText;
    }

    this.setNextStageVisibility(showNextStage);

    this.clearStarMasks.forEach((maskElement, index) => {
      const fillAmount = Math.max(0, Math.min(1, stars - index));
      maskElement.style.width = `${fillAmount * 100}%`;
    });

    this.clearOverlayElement.hidden = false;
  }

  hideClearOverlay() {
    if (this.clearOverlayElement) {
      this.clearOverlayElement.hidden = true;
    }
  }

  render(character, interaction = {}) {
    this.characterElement.style.transform = `translate3d(${character.x}px, ${character.y}px, 0)`;
    this.characterElement.classList.add("is-ready");
    this.characterElement.classList.toggle(
      "is-moving",
      Math.abs(character.vx) > 8 && character.onGround,
    );
    this.characterElement.classList.toggle(
      "is-jumping",
      !character.onGround && !character.isClimbing && !character.isSwimming,
    );
    this.characterElement.classList.toggle("is-climbing", character.isClimbing);
    this.characterElement.classList.toggle("is-swimming", character.isSwimming);
    this.characterElement.classList.toggle(
      "is-facing-left",
      character.facing < 0,
    );
    this.characterElement.classList.toggle(
      "is-throw-ready",
      Boolean(interaction.canThrowStone),
    );
    this.characterElement.classList.toggle(
      "is-throwing",
      Boolean(interaction.isDraggingStone),
    );
    this.renderHeldStone(interaction.heldStone ?? null);
    this.renderStoneAim(interaction.stoneAim ?? null);
    this.renderTimedBlocks(interaction.timedBlocks ?? []);
    this.renderMonsters(interaction.monsters ?? []);
    this.renderCannonState(interaction.cannonState ?? null);
    this.renderStageMission(interaction.stageMission ?? null);
    this.renderMissionAlarm(interaction.missionAlarm ?? null);
    this.renderBossState(interaction.bossState ?? null);
    this.renderBreathHud(character);

    if (
      this.activeTriggerElement &&
      this.activeTriggerElement !== interaction.activeTriggerElement
    ) {
      this.activeTriggerElement.classList.remove("is-interactable");
    }

    this.activeTriggerElement = interaction.activeTriggerElement || null;

    if (this.activeTriggerElement) {
      this.activeTriggerElement.classList.add("is-interactable");
    }
  }

  renderHeldStone(heldStone) {
    if (!this.heldStoneElement) {
      return;
    }

    const isHeld = Boolean(heldStone?.position);

    this.heldStoneElement.hidden = !isHeld;
    this.heldStoneElement.classList.toggle("is-held-ui", isHeld);
    this.heldStoneElement.classList.toggle("is-carried", isHeld);

    if (!isHeld) {
      this.heldStoneElement.style.left = "";
      this.heldStoneElement.style.top = "";
      this.heldStoneElement.style.transform = "";
      return;
    }

    this.heldStoneElement.style.left = "";
    this.heldStoneElement.style.top = "";
    this.heldStoneElement.style.transform = "";
  }

  getStoneAimOrigin() {
    if (!this.containerElement) {
      return null;
    }

    const containerRect = this.containerElement.getBoundingClientRect();
    const heldStoneRect =
      this.heldStoneElement && !this.heldStoneElement.hidden
        ? this.heldStoneElement.getBoundingClientRect()
        : null;

    if (heldStoneRect && heldStoneRect.width > 0 && heldStoneRect.height > 0) {
      return {
        x: heldStoneRect.left - containerRect.left + heldStoneRect.width / 2,
        y: heldStoneRect.top - containerRect.top + heldStoneRect.height / 2,
      };
    }

    const headRect = this.characterHeadElement?.getBoundingClientRect();

    if (!headRect) {
      return null;
    }

    return {
      x: headRect.left - containerRect.left + headRect.width / 2,
      y:
        headRect.top - containerRect.top - Math.max(headRect.height * 0.35, 10),
    };
  }

  renderStoneAim(stoneAim) {
    if (!this.stoneAimElement) {
      return;
    }

    if (!stoneAim?.start || !stoneAim?.end) {
      this.resetStoneAimVisuals();
      return;
    }

    this.stoneAimElement.removeAttribute("hidden");
    this.stoneAimElement.style.display = "block";
    this.stoneAimElement.setAttribute("x1", `${stoneAim.start.x}`);
    this.stoneAimElement.setAttribute("y1", `${stoneAim.start.y}`);
    this.stoneAimElement.setAttribute("x2", `${stoneAim.end.x}`);
    this.stoneAimElement.setAttribute("y2", `${stoneAim.end.y}`);

    const reticleRadius = Math.max(this.measureCharacter().width * 0.36, 12);
    const axisLength = reticleRadius * 0.55;

    if (this.stoneAimReticleElement) {
      this.stoneAimReticleElement.removeAttribute("hidden");
      this.stoneAimReticleElement.style.display = "block";
      this.stoneAimReticleElement.setAttribute("cx", `${stoneAim.end.x}`);
      this.stoneAimReticleElement.setAttribute("cy", `${stoneAim.end.y}`);
      this.stoneAimReticleElement.setAttribute("r", `${reticleRadius}`);
    }

    if (this.stoneAimReticleHorizontalElement) {
      this.stoneAimReticleHorizontalElement.removeAttribute("hidden");
      this.stoneAimReticleHorizontalElement.style.display = "block";
      this.stoneAimReticleHorizontalElement.setAttribute(
        "x1",
        `${stoneAim.end.x - axisLength}`,
      );
      this.stoneAimReticleHorizontalElement.setAttribute(
        "y1",
        `${stoneAim.end.y}`,
      );
      this.stoneAimReticleHorizontalElement.setAttribute(
        "x2",
        `${stoneAim.end.x + axisLength}`,
      );
      this.stoneAimReticleHorizontalElement.setAttribute(
        "y2",
        `${stoneAim.end.y}`,
      );
    }

    if (this.stoneAimReticleVerticalElement) {
      this.stoneAimReticleVerticalElement.removeAttribute("hidden");
      this.stoneAimReticleVerticalElement.style.display = "block";
      this.stoneAimReticleVerticalElement.setAttribute(
        "x1",
        `${stoneAim.end.x}`,
      );
      this.stoneAimReticleVerticalElement.setAttribute(
        "y1",
        `${stoneAim.end.y - axisLength}`,
      );
      this.stoneAimReticleVerticalElement.setAttribute(
        "x2",
        `${stoneAim.end.x}`,
      );
      this.stoneAimReticleVerticalElement.setAttribute(
        "y2",
        `${stoneAim.end.y + axisLength}`,
      );
    }
  }

  resetStoneAimVisuals() {
    if (this.stoneAimElement) {
      this.stoneAimElement.setAttribute("hidden", "");
      this.stoneAimElement.style.display = "none";
      this.stoneAimElement.setAttribute("x1", "0");
      this.stoneAimElement.setAttribute("y1", "0");
      this.stoneAimElement.setAttribute("x2", "0");
      this.stoneAimElement.setAttribute("y2", "0");
    }

    if (this.stoneAimReticleElement) {
      this.stoneAimReticleElement.setAttribute("hidden", "");
      this.stoneAimReticleElement.style.display = "none";
      this.stoneAimReticleElement.setAttribute("cx", "0");
      this.stoneAimReticleElement.setAttribute("cy", "0");
      this.stoneAimReticleElement.setAttribute("r", "0");
    }

    if (this.stoneAimReticleHorizontalElement) {
      this.stoneAimReticleHorizontalElement.setAttribute("hidden", "");
      this.stoneAimReticleHorizontalElement.style.display = "none";
      this.stoneAimReticleHorizontalElement.setAttribute("x1", "0");
      this.stoneAimReticleHorizontalElement.setAttribute("y1", "0");
      this.stoneAimReticleHorizontalElement.setAttribute("x2", "0");
      this.stoneAimReticleHorizontalElement.setAttribute("y2", "0");
    }

    if (this.stoneAimReticleVerticalElement) {
      this.stoneAimReticleVerticalElement.setAttribute("hidden", "");
      this.stoneAimReticleVerticalElement.style.display = "none";
      this.stoneAimReticleVerticalElement.setAttribute("x1", "0");
      this.stoneAimReticleVerticalElement.setAttribute("y1", "0");
      this.stoneAimReticleVerticalElement.setAttribute("x2", "0");
      this.stoneAimReticleVerticalElement.setAttribute("y2", "0");
    }
  }

  renderTimedBlocks(timedBlocks) {
    this.timedBlockElements.forEach((element) => {
      element.classList.remove("is-ticking");
      element.style.removeProperty("--timed-progress");
    });

    timedBlocks.forEach(({ id, progress = 0, isActive = false }) => {
      const element = this.timedBlockElements.get(id);

      if (!element) {
        return;
      }

      element.style.setProperty("--timed-progress", `${progress}`);
      element.classList.toggle("is-ticking", isActive);
    });
  }

  renderMonsters(monsters) {
    this.monsterElements.forEach((element) => {
      element.classList.remove("is-alert", "is-dead", "is-facing-left");
      element.style.transform = "";
    });

    monsters.forEach((monster) => {
      const element = this.monsterElements.get(monster.id);

      if (!element) {
        return;
      }

      const basePosition = this.monsterBasePositions.get(monster.id) ?? {
        left: 0,
        top: 0,
      };
      const scaleX = monster.direction < 0 ? -1 : 1;
      element.style.transform = `translate3d(${monster.x - basePosition.left}px, ${monster.y - basePosition.top}px, 0) scaleX(${scaleX})`;
      element.classList.toggle("is-alert", monster.isAlert && !monster.isDead);
      element.classList.toggle("is-dead", monster.isDead);
    });
  }

  renderCannonState(cannonState) {
    this.cannonElements.forEach((element) => {
      element.classList.remove("is-aiming");
    });

    if (!cannonState?.id) {
      return;
    }

    const element = this.cannonElements.get(cannonState.id);
    element?.classList.toggle("is-aiming", Boolean(cannonState.isAiming));
  }

  renderStageMission(stageMission) {
    const remainingMonsterCount = Math.max(
      0,
      Number(stageMission?.remainingMonsterCount ?? 0),
    );
    const missionCountElement = stageMission?.missionCountId
      ? this.missionCountElements.get(stageMission.missionCountId)
      : this.stage4MonsterCountElement;

    if (missionCountElement) {
      missionCountElement.textContent = `${remainingMonsterCount}`;
    }

    this.treasureBarrierElements.forEach((element, barrierId) => {
      element.hidden =
        barrierId !== stageMission?.missionCountId ||
        !stageMission?.isTreasureBarrierActive;
    });

    if (
      this.stage4TreasureBarrierElement &&
      !this.treasureBarrierElements.has("stage4-guardian")
    ) {
      this.stage4TreasureBarrierElement.hidden =
        !stageMission?.isTreasureBarrierActive;
    }
  }

  getBossStoneSrc() {
    return this.bossStoneLayerElement?.dataset.bossStoneSrc ?? "";
  }

  getBossStoneSlots() {
    if (!this.bossStoneLayerElement) {
      return [];
    }

    return Array.from(
      this.bossStoneLayerElement.querySelectorAll("[data-boss-stone-slot]"),
    )
      .sort(
        (a, b) =>
          Number(a.dataset.bossStoneSlot ?? 0) -
          Number(b.dataset.bossStoneSlot ?? 0),
      )
      .map((element) => ({
        element,
        imageElement:
          element.querySelector("[data-boss-stone-image='true']") ?? null,
      }));
  }

  getBossStoneAssetMetrics() {
    return {
      naturalWidth: this.bossStoneAssetMetrics.naturalWidth,
      naturalHeight: this.bossStoneAssetMetrics.naturalHeight,
      aspectRatio: this.bossStoneAssetMetrics.aspectRatio,
    };
  }

  getBossRushAssetMetrics() {
    return {
      naturalWidth: this.bossRushAssetMetrics.naturalWidth,
      naturalHeight: this.bossRushAssetMetrics.naturalHeight,
      aspectRatio: this.bossRushAssetMetrics.aspectRatio,
    };
  }

  getBossEndAssetMetrics() {
    return {
      naturalWidth: this.bossEndAssetMetrics.naturalWidth,
      naturalHeight: this.bossEndAssetMetrics.naturalHeight,
      aspectRatio: this.bossEndAssetMetrics.aspectRatio,
    };
  }

  updateBossRushAssetMetrics(imageElement) {
    if (
      !imageElement ||
      imageElement.naturalWidth <= 0 ||
      imageElement.naturalHeight <= 0
    ) {
      return;
    }

    this.bossRushAssetMetrics = {
      naturalWidth: imageElement.naturalWidth,
      naturalHeight: imageElement.naturalHeight,
      aspectRatio: imageElement.naturalWidth / imageElement.naturalHeight,
    };
  }

  preloadBossRushAssetMetrics() {
    const rushSrc = this.getBossPoseImageSrc("rush");

    if (!rushSrc || typeof Image === "undefined") {
      return;
    }

    const preloadImage = new Image();
    preloadImage.addEventListener("load", () => {
      this.updateBossRushAssetMetrics(preloadImage);
    });
    preloadImage.src = rushSrc;
  }

  updateBossEndAssetMetrics(imageElement) {
    if (
      !imageElement ||
      imageElement.naturalWidth <= 0 ||
      imageElement.naturalHeight <= 0
    ) {
      return;
    }

    this.bossEndAssetMetrics = {
      naturalWidth: imageElement.naturalWidth,
      naturalHeight: imageElement.naturalHeight,
      aspectRatio: imageElement.naturalWidth / imageElement.naturalHeight,
    };
  }

  preloadBossEndAssetMetrics() {
    const endSrc = this.bossEndingElement?.dataset.bossEndSrc ?? "";

    if (!endSrc || typeof Image === "undefined") {
      if (!endSrc) {
        console.warn("[boss-ending] missing end.webp src");
      }
      return;
    }

    const preloadImage = new Image();
    preloadImage.addEventListener("load", () => {
      this.updateBossEndAssetMetrics(preloadImage);
      const loadKey = `end.webp:${endSrc}`;

      if (!this.reportedBossImageLoads.has(loadKey)) {
        this.reportedBossImageLoads.add(loadKey);
      }
    });
    preloadImage.addEventListener("error", () => {
      const failureKey = `end.webp:${endSrc}`;

      if (!this.reportedBossImageErrors.has(failureKey)) {
        console.warn("[boss-ending] failed to load end.webp", endSrc);
        this.reportedBossImageErrors.add(failureKey);
      }
    });
    preloadImage.src = endSrc;
  }

  bindBossStoneSlotListeners() {
    this.bossStoneSlots.forEach(({ imageElement }) => {
      if (!imageElement) {
        return;
      }

      imageElement.removeEventListener("load", this.boundBossStoneImageLoad);
      imageElement.removeEventListener("error", this.boundBossStoneImageError);
      imageElement.addEventListener("load", this.boundBossStoneImageLoad);
      imageElement.addEventListener("error", this.boundBossStoneImageError);

      if (imageElement.complete) {
        if (imageElement.naturalWidth > 0) {
          this.logBossStoneSlotLoad(imageElement);
        } else {
          this.logBossStoneSlotError(imageElement);
        }
      }
    });
  }

  logBossStoneSlotLoad(imageElement) {
    const slotIndex =
      imageElement.closest("[data-boss-stone-slot]")?.dataset.bossStoneSlot ??
      "unknown";
    const signature = `${slotIndex}:${imageElement.currentSrc || imageElement.src}`;

    if (this.reportedBossStoneSlotLoads.has(signature)) {
      return;
    }

    this.reportedBossStoneSlotLoads.add(signature);
    this.bossStoneAssetMetrics = {
      naturalWidth: imageElement.naturalWidth,
      naturalHeight: imageElement.naturalHeight,
      aspectRatio:
        imageElement.naturalWidth > 0 && imageElement.naturalHeight > 0
          ? imageElement.naturalWidth / imageElement.naturalHeight
          : 1,
    };
  }

  logBossStoneSlotError(imageElement) {
    const slotIndex =
      imageElement.closest("[data-boss-stone-slot]")?.dataset.bossStoneSlot ??
      "unknown";
    const signature = `${slotIndex}:${imageElement.currentSrc || imageElement.src}`;

    if (this.reportedBossStoneSlotErrors.has(signature)) {
      return;
    }

    this.reportedBossStoneSlotErrors.add(signature);
    console.warn("[boss-stone] slot image error", {
      slot: Number(slotIndex),
      src: imageElement.currentSrc || imageElement.src || "",
    });
  }

  handleBossStoneImageLoad(event) {
    const imageElement = event.currentTarget;

    if (!imageElement) {
      return;
    }

    this.logBossStoneSlotLoad(imageElement);
  }

  handleBossStoneImageError(event) {
    const imageElement = event.currentTarget;

    if (!imageElement) {
      return;
    }

    this.logBossStoneSlotError(imageElement);
  }

  clearBossStoneElements() {
    if (this.bossStoneSlots.length === 0) {
      this.bossStoneSlots = this.getBossStoneSlots();
      this.bindBossStoneSlotListeners();
    }
    this.lastBossStoneRenderSignature = "";
    this.bossStoneSlots.forEach(({ element }) => {
      element.hidden = true;
      element.removeAttribute("data-boss-stone-id");
      element.style.left = "";
      element.style.top = "";
      element.style.width = "";
      element.style.height = "";
      element.classList.remove("is-final-wave");
    });
  }

  renderBossStones(stones) {
    if (!this.bossStoneLayerElement) {
      return;
    }

    if (this.bossStoneSlots.length !== 5) {
      this.bossStoneSlots = this.getBossStoneSlots();
      this.bindBossStoneSlotListeners();

      if (this.bossStoneSlots.length !== 5) {
        console.warn("[boss-stone] slot count mismatch", {
          slotCount: this.bossStoneSlots.length,
        });
      }
    }
    const stoneSrc = this.getBossStoneSrc();
    this.bossStoneSlots.forEach((slot) => {
      slot.element.hidden = true;
      slot.element.removeAttribute("data-boss-stone-id");
      slot.element.style.left = "";
      slot.element.style.top = "";
      slot.element.style.width = "";
      slot.element.style.height = "";
      slot.element.classList.remove("is-final-wave");
    });

    stones.forEach((stone, index) => {
      const slot = this.bossStoneSlots[index];

      if (!slot) {
        return;
      }

      if (
        stoneSrc &&
        slot.imageElement &&
        (slot.imageElement.getAttribute("src") ?? "") !== stoneSrc
      ) {
        slot.imageElement.src = stoneSrc;
      }

      slot.element.hidden = false;
      slot.element.dataset.bossStoneId = stone.id;
      slot.element.style.left = `${stone.left}px`;
      slot.element.style.top = `${stone.top}px`;
      slot.element.style.width = `${stone.width}px`;
      slot.element.style.height = `${stone.height}px`;
      slot.element.classList.toggle("is-final-wave", Boolean(stone.finalWave));
    });

    const renderSignature = stones
      .map((stone, index) => `${index}:${stone.id}`)
      .join("|");

    if (renderSignature !== this.lastBossStoneRenderSignature) {
      this.lastBossStoneRenderSignature = renderSignature;
    }
  }

  getRenderedBossStoneBounds() {
    if (!this.containerElement) {
      return [];
    }

    const containerRect = this.containerElement.getBoundingClientRect();

    return this.bossStoneSlots
      .filter(({ element }) => !element.hidden)
      .map(({ element }) => {
        const rect = element.getBoundingClientRect();

        return {
          left: rect.left - containerRect.left,
          top: rect.top - containerRect.top,
          right: rect.right - containerRect.left,
          bottom: rect.bottom - containerRect.top,
          width: rect.width,
          height: rect.height,
        };
      });
  }

  getBossPoseImageSrc(pose = "base") {
    if (!this.bossRootElement) {
      return "";
    }

    const poseImageMap = {
      base: this.bossRootElement.dataset.bossBaseSrc ?? "",
      upset: this.bossRootElement.dataset.bossUpsetSrc ?? "",
      attack: this.bossRootElement.dataset.bossAttackBodySrc ?? "",
      rush: this.bossRootElement.dataset.bossRushSrc ?? "",
    };

    return poseImageMap[pose] || poseImageMap.base || "";
  }

  getBossPoseAssetLabel(pose = "base") {
    const poseAssetLabelMap = {
      base: "boss.webp",
      upset: "upset.webp",
      attack: "attack-body.webp",
      rush: "rush.webp",
    };

    return poseAssetLabelMap[pose] ?? poseAssetLabelMap.base;
  }

  handleBossVisualImageLoad(event) {
    const imageElement = event.currentTarget;

    if (!imageElement) {
      return;
    }

    imageElement.dataset.loaded = "true";

    const assetLabel = imageElement.dataset.assetLabel ?? "boss.webp";
    const currentSrc = imageElement.currentSrc || imageElement.src || "";
    const loadKey = `${assetLabel}:${currentSrc}`;

    if (assetLabel === "rush.webp") {
      this.updateBossRushAssetMetrics(imageElement);
    }

    if (
      assetLabel === "attack-body.webp" &&
      currentSrc &&
      !this.reportedBossImageLoads.has(loadKey)
    ) {
      this.reportedBossImageLoads.add(loadKey);
    }
  }

  handleBossVisualImageError(event) {
    const imageElement = event.currentTarget;

    if (!imageElement) {
      return;
    }

    const assetLabel = imageElement.dataset.assetLabel ?? "boss.webp";
    const attemptedSrc = imageElement.currentSrc || imageElement.src || "";
    const fallbackSrc = imageElement.dataset.fallbackSrc ?? "";
    const failureKey = `${assetLabel}:${attemptedSrc}`;

    if (!this.reportedBossImageErrors.has(failureKey)) {
      console.warn(`[boss] failed to load ${assetLabel}`, attemptedSrc);
      this.reportedBossImageErrors.add(failureKey);
    }

    imageElement.dataset.loaded = "false";

    if (fallbackSrc && attemptedSrc !== fallbackSrc) {
      imageElement.src = fallbackSrc;
      imageElement.dataset.assetLabel = "boss.webp";
      return;
    }

    imageElement.removeAttribute("src");
  }

  renderBossState(bossState) {
    if (!this.bossRootElement) {
      return;
    }

    const hasBoss = Boolean(bossState);

    if (this.bossHudElement) {
      this.bossHudElement.hidden = !hasBoss;
    }

    if (!hasBoss) {
      this.resetBossState();
      return;
    }

    const hpPercent = Math.max(
      0,
      Math.min(100, Number(bossState.hpPercent ?? 0)),
    );

    if (this.bossHpFillElement) {
      this.bossHpFillElement.style.width = `${hpPercent}%`;
    }

    if (this.bossHpLabelElement) {
      this.bossHpLabelElement.textContent = `${Math.round(hpPercent)}%`;
    }

    this.containerElement?.style.setProperty(
      "--boss-stage-shake-x",
      `${bossState.shake?.x ?? 0}px`,
    );
    this.containerElement?.style.setProperty(
      "--boss-stage-shake-y",
      `${bossState.shake?.y ?? 0}px`,
    );

    if (this.bossStructureElement) {
      this.bossStructureElement.style.transform = `translate3d(-50%, ${bossState.structure?.offsetY ?? 0}px, 0)`;
    }

    this.bossRootElement.hidden = !bossState.isVisible;
    this.bossRootElement.classList.toggle(
      "is-groggy",
      Boolean(bossState.isGroggy),
    );
    this.bossRootElement.classList.toggle(
      "is-damaged",
      Boolean(bossState.isDamaged),
    );
    this.bossRootElement.classList.toggle(
      "is-defeated",
      Boolean(bossState.isDefeated),
    );
    this.bossRootElement.dataset.pose = bossState.pose ?? "base";
    this.bossRootElement.style.width = `${bossState.width ?? 0}px`;
    this.bossRootElement.style.height = `${bossState.height ?? 0}px`;
    const spriteScaleX =
      typeof bossState.spriteScaleX === "number"
        ? bossState.spriteScaleX
        : bossState.facing < 0
          ? -1
          : 1;
    this.bossRootElement.style.left = `${bossState.x ?? 0}px`;
    this.bossRootElement.style.top = `${bossState.y ?? 0}px`;
    this.bossRootElement.style.transform = "none";

    if (this.bossVisualElement) {
      const pose = bossState.pose ?? "base";
      this.bossVisualElement.dataset.pose = pose;
      this.bossVisualElement.style.backgroundImage =
        pose === "attack" ? "var(--boss-attack-body-image)" : "";
      this.bossVisualElement.style.transform = `scaleX(${spriteScaleX})`;
      this.bossVisualElement.style.transformOrigin = "center center";
    }

    if (this.bossVisualImageElement) {
      const pose = bossState.pose ?? "base";
      this.bossVisualImageElement.dataset.pose = pose;
      this.bossVisualImageElement.hidden = pose === "attack";

      if (pose !== "attack") {
        const poseImageSrc = this.getBossPoseImageSrc(pose);
        const fallbackSrc = this.getBossPoseImageSrc("base");

        this.bossVisualImageElement.dataset.assetLabel =
          this.getBossPoseAssetLabel(pose);
        this.bossVisualImageElement.dataset.fallbackSrc = fallbackSrc;

        if (
          (this.bossVisualImageElement.getAttribute("src") ?? "") !==
          poseImageSrc
        ) {
          if (poseImageSrc) {
            this.bossVisualImageElement.src = poseImageSrc;
          } else {
            this.bossVisualImageElement.removeAttribute("src");
          }
        }
      }
    }

    if (bossState.pose === "rush") {
      const rootLeft = this.bossRootElement.style.left || "";
      const rootTop = this.bossRootElement.style.top || "";
      const visualTransform = this.bossVisualElement?.style.transform || "";
      const assetLabel =
        this.bossVisualImageElement?.dataset.assetLabel ??
        this.getBossPoseAssetLabel("rush");
      const debugSignature = [
        bossState.phase ?? bossState.pose ?? "",
        bossState.x ?? 0,
        bossState.y ?? 0,
        rootLeft,
        rootTop,
        spriteScaleX,
        visualTransform,
        assetLabel,
      ].join("|");

      if (debugSignature !== this.lastBossRushDebugSignature) {
        console.info("[boss-rush]", {
          phase: bossState.phase ?? bossState.pose ?? "rush",
          x: bossState.x ?? 0,
          y: bossState.y ?? 0,
          left: bossState.x ?? 0,
          top: bossState.y ?? 0,
          spriteScaleX,
          rootLeft,
          rootTop,
          visualTransform,
          assetLabel,
        });
        this.lastBossRushDebugSignature = debugSignature;
      }
    } else {
      this.lastBossRushDebugSignature = "";
    }

    if (this.bossHitFlashElement) {
      this.bossHitFlashElement.hidden = true;
    }

    if (this.bossHandElement) {
      const hand = bossState.hand ?? { visible: false };
      this.bossHandElement.hidden = !hand.visible;

      if (hand.visible) {
        this.bossHandElement.style.backgroundImage =
          "var(--boss-attack-hand-image)";
        this.bossHandElement.style.width = `${hand.width}px`;
        this.bossHandElement.style.height = `${hand.height}px`;
        this.bossHandElement.style.transform = `translate3d(${hand.x - (bossState.x ?? 0)}px, ${hand.y - (bossState.y ?? 0)}px, 0) scaleX(${spriteScaleX})`;
      } else {
        this.bossHandElement.style.backgroundImage = "";
      }
    }

    if (this.bossRushWarningElement) {
      const warning = bossState.rushWarning ?? { visible: false };
      this.bossRushWarningElement.hidden = !warning.visible;

      if (warning.visible) {
        this.bossRushWarningElement.style.width = `${warning.width}px`;
        this.bossRushWarningElement.style.height = `${warning.height}px`;
        this.bossRushWarningElement.style.transform = `translate3d(${warning.left}px, ${warning.top}px, 0)`;
      }
    }

    this.renderBossStones(bossState.stones ?? []);

    if (
      this.bossEndingElement &&
      this.bossEndingCardElement &&
      this.bossEndingWarningElement
    ) {
      const ending = bossState.ending ?? { visible: false };
      const phase = bossState.phase ?? bossState.pose ?? "unknown";
      const endSrc = this.bossEndingElement.dataset.bossEndSrc ?? "";
      const warningVisible = Boolean(ending.warningVisible);
      const cardVisible = Boolean(ending.cardVisible);
      const warningX = Number.isFinite(ending.warningX) ? ending.warningX : 0;
      const warningY = Number.isFinite(ending.warningY) ? ending.warningY : 0;
      const warningWidth = Number.isFinite(ending.warningWidth)
        ? ending.warningWidth
        : 0;
      const warningHeight = Number.isFinite(ending.warningHeight)
        ? ending.warningHeight
        : 0;
      this.bossEndingElement.hidden = !warningVisible && !cardVisible;

      this.bossEndingWarningElement.hidden = false;
      this.bossEndingWarningElement.style.width = `${warningWidth}px`;
      this.bossEndingWarningElement.style.height = `${warningHeight}px`;
      this.bossEndingWarningElement.style.transform = `translate3d(${warningX}px, ${warningY}px, 0)`;
      this.bossEndingWarningElement.style.opacity = `${
        warningVisible ? (ending.warningOpacity ?? 1) : 0
      }`;

      const containerRect =
        this.containerElement?.getBoundingClientRect?.() ?? null;
      const warningRect =
        this.bossEndingWarningElement.getBoundingClientRect?.() ?? null;
      const resolvedWidthRaw = warningRect?.width ?? warningWidth;
      const resolvedHeightRaw = warningRect?.height ?? warningHeight;
      const resolvedXRaw =
        warningRect && containerRect
          ? warningRect.left - containerRect.left
          : warningX;
      const resolvedYRaw =
        warningRect && containerRect
          ? warningRect.top - containerRect.top
          : warningY;
      const resolvedWidth = Number.isFinite(resolvedWidthRaw)
        ? resolvedWidthRaw
        : warningWidth;
      const resolvedHeight = Number.isFinite(resolvedHeightRaw)
        ? resolvedHeightRaw
        : warningHeight;
      const resolvedX = Number.isFinite(resolvedXRaw) ? resolvedXRaw : warningX;
      const resolvedY = Number.isFinite(resolvedYRaw) ? resolvedYRaw : warningY;
      const dropDistanceRaw =
        warningRect && containerRect
          ? containerRect.height - resolvedY + warningRect.height
          : warningHeight * 1.2;
      const dropDistance = Number.isFinite(dropDistanceRaw)
        ? dropDistanceRaw
        : warningHeight * 1.2;
      const cardTranslateX = cardVisible ? resolvedX : warningX;
      const cardTranslateY = cardVisible
        ? resolvedY + dropDistance * (ending.dropProgress ?? 0)
        : warningY;
      const cardTranslateZ = cardVisible ? (ending.translateZ ?? 0) : -10000;
      const cardOpacity = cardVisible ? (ending.opacity ?? 1) : 0;
      const cardWidth = cardVisible ? resolvedWidth : warningWidth;
      const cardHeight = cardVisible ? resolvedHeight : warningHeight;
      const cardTransform = `translate3d(${cardTranslateX}px, ${cardTranslateY}px, ${cardTranslateZ}px)`;

      if (cardVisible) {
        this.bossEndingCardElement.style.width = `${cardWidth}px`;
        this.bossEndingCardElement.style.height = `${cardHeight}px`;
        this.bossEndingCardElement.style.transform = cardTransform;
        this.bossEndingCardElement.style.opacity = `${cardOpacity}`;
      } else {
        this.bossEndingCardElement.style.width = `${cardWidth}px`;
        this.bossEndingCardElement.style.height = `${cardHeight}px`;
        this.bossEndingCardElement.style.transform = cardTransform;
        this.bossEndingCardElement.style.opacity = `${cardOpacity}`;
      }

      const debugSignature = [
        phase,
        warningVisible ? 1 : 0,
        cardVisible ? 1 : 0,
        endSrc,
        warningX,
        warningY,
        warningWidth,
        warningHeight,
        resolvedX,
        resolvedY,
        resolvedWidth,
        resolvedHeight,
        cardTranslateX,
        cardTranslateY,
        cardTranslateZ,
        dropDistance,
        cardOpacity,
      ].join("|");

      if (debugSignature !== this.lastBossEndingDebugSignature) {
        this.lastBossEndingDebugSignature = debugSignature;
      }
    } else {
      this.lastBossEndingDebugSignature = "";
    }
  }

  resetBossState() {
    this.containerElement?.style.removeProperty("--boss-stage-shake-x");
    this.containerElement?.style.removeProperty("--boss-stage-shake-y");

    if (this.bossStructureElement) {
      this.bossStructureElement.style.transform = "translateX(-50%)";
    }

    if (this.bossRootElement) {
      this.bossRootElement.hidden = true;
      this.bossRootElement.classList.remove(
        "is-groggy",
        "is-damaged",
        "is-defeated",
      );
      this.bossRootElement.dataset.pose = "base";
      this.bossRootElement.style.width = "";
      this.bossRootElement.style.height = "";
      this.bossRootElement.style.left = "";
      this.bossRootElement.style.top = "";
      this.bossRootElement.style.transform = "";
    }

    if (this.bossVisualElement) {
      this.bossVisualElement.dataset.pose = "base";
      this.bossVisualElement.style.backgroundImage = "";
      this.bossVisualElement.style.transform = "";
      this.bossVisualElement.style.transformOrigin = "";
    }

    if (this.bossVisualImageElement) {
      this.bossVisualImageElement.hidden = false;
      this.bossVisualImageElement.dataset.pose = "base";
      this.bossVisualImageElement.dataset.assetLabel = "";
      this.bossVisualImageElement.dataset.fallbackSrc = "";
      this.bossVisualImageElement.dataset.loaded = "";
      this.bossVisualImageElement.removeAttribute("src");
    }

    if (this.bossHitFlashElement) {
      this.bossHitFlashElement.hidden = true;
    }

    if (this.bossHandElement) {
      this.bossHandElement.hidden = true;
      this.bossHandElement.style.backgroundImage = "";
      this.bossHandElement.style.width = "";
      this.bossHandElement.style.height = "";
      this.bossHandElement.style.transform = "";
    }

    if (this.bossRushWarningElement) {
      this.bossRushWarningElement.hidden = true;
      this.bossRushWarningElement.style.width = "";
      this.bossRushWarningElement.style.height = "";
      this.bossRushWarningElement.style.transform = "";
    }

    if (this.bossEndingElement) {
      this.bossEndingElement.hidden = true;
    }

    if (this.bossEndingWarningElement) {
      this.bossEndingWarningElement.hidden = true;
      this.bossEndingWarningElement.style.width = "";
      this.bossEndingWarningElement.style.height = "";
      this.bossEndingWarningElement.style.transform = "";
      this.bossEndingWarningElement.style.opacity = "0";
    }

    if (this.bossEndingCardElement) {
      this.bossEndingCardElement.style.width = "";
      this.bossEndingCardElement.style.height = "";
      this.bossEndingCardElement.style.transform = "";
      this.bossEndingCardElement.style.opacity = "0";
    }

    if (this.bossHpFillElement) {
      this.bossHpFillElement.style.width = "100%";
    }

    if (this.bossHpLabelElement) {
      this.bossHpLabelElement.textContent = "100%";
    }

    this.clearBossStoneElements();
    this.lastBossRushDebugSignature = "";
    this.lastBossEndingDebugSignature = "";
  }

  restoreBossStructureState(targetIds = [], triggerIds = []) {
    const targetIdSet = new Set(targetIds);
    const triggerIdSet = new Set(triggerIds);

    targetIdSet.forEach((targetId) => {
      const targetElement = this.containerElement?.querySelector(
        `[data-collapse-id="${targetId}"]`,
      );

      if (!targetElement) {
        return;
      }

      const timerId = this.collapseTimers.get(targetElement);

      if (timerId) {
        window.clearTimeout(timerId);
        this.collapseTimers.delete(targetElement);
      }

      targetElement.classList.remove(
        "is-collapsing",
        "is-collapsed",
        "is-resetting",
      );
      targetElement.style.removeProperty("--collapse-x");
      targetElement.style.removeProperty("--collapse-y");
    });

    triggerIdSet.forEach((triggerId) => {
      const triggerElement = this.containerElement?.querySelector(
        `[data-trigger-id="${triggerId}"]`,
      );

      triggerElement?.classList.remove("is-used", "is-interactable");
    });
  }

  renderBreathHud(character) {
    if (!this.breathElement || !this.breathFillElement) {
      return;
    }

    const breathRatio = Math.max(
      0,
      Math.min(1, Number(character.breathRatio ?? 1)),
    );
    const shouldShow = Boolean(character.isHeadUnderwater) || breathRatio < 1;

    if (!shouldShow || typeof character.getHeadBounds !== "function") {
      this.breathElement.hidden = true;
      this.breathElement.dataset.level = "high";
      this.breathFillElement.style.width = "100%";
      return;
    }

    const headBounds = character.getHeadBounds();
    const centerX = headBounds.left + headBounds.width / 2;
    const offsetY = Math.max(headBounds.height * 0.35, 12);
    const anchorY = headBounds.top - offsetY;
    const level =
      breathRatio <= 0.2 ? "low" : breathRatio <= 0.5 ? "mid" : "high";

    this.breathElement.hidden = false;
    this.breathElement.dataset.level = level;
    this.breathElement.style.transform = `translate3d(${centerX}px, ${anchorY}px, 0) translate(-50%, -100%)`;
    this.breathFillElement.style.width = `${breathRatio * 100}%`;
  }

  renderMissionAlarm(missionAlarm) {
    if (!missionAlarm?.token || !this.customMissionAlarmElement) {
      return;
    }

    if (missionAlarm.token === this.activeMissionAlarmToken) {
      return;
    }

    this.activeMissionAlarmToken = missionAlarm.token;

    if (this.customMissionAlarmTimer) {
      window.clearTimeout(this.customMissionAlarmTimer);
      this.customMissionAlarmTimer = null;
    }

    if (this.customMissionAlarmTextElement) {
      this.customMissionAlarmTextElement.textContent =
        missionAlarm.message ?? "";
    }

    this.customMissionAlarmElement.hidden = false;
    this.customMissionAlarmElement.classList.remove("is-animating");
    void this.customMissionAlarmElement.offsetWidth;
    this.customMissionAlarmElement.classList.add("is-animating");

    this.customMissionAlarmTimer = window.setTimeout(() => {
      this.hideMissionAlarm();
    }, CUSTOM_MISSION_ALARM_DURATION_MS);
  }

  hideMissionAlarm() {
    if (this.customMissionAlarmTimer) {
      window.clearTimeout(this.customMissionAlarmTimer);
      this.customMissionAlarmTimer = null;
    }

    this.activeMissionAlarmToken = null;

    if (!this.customMissionAlarmElement) {
      return;
    }

    this.customMissionAlarmElement.classList.remove("is-animating");
    this.customMissionAlarmElement.hidden = true;
  }

  resetMissionState() {
    this.missionCountElements.forEach((element, countId) => {
      element.textContent =
        this.initialMissionCounts.get(countId) ?? element.textContent;
    });

    this.treasureBarrierElements.forEach((element) => {
      element.hidden = false;
    });

    if (
      this.stage4TreasureBarrierElement &&
      !this.treasureBarrierElements.has("stage4-guardian")
    ) {
      this.stage4TreasureBarrierElement.hidden = false;
    }
  }

  animateTriggerResult({ triggerElement, animations = [], durationMs }) {
    if (triggerElement && this.activeTriggerElement === triggerElement) {
      triggerElement.classList.remove("is-interactable");
      this.activeTriggerElement = null;
    }

    triggerElement?.classList.add("is-used");

    animations.forEach(({ targetElement, x, y }) => {
      if (!targetElement) {
        return;
      }

      const previousTimer = this.collapseTimers.get(targetElement);
      if (previousTimer) {
        window.clearTimeout(previousTimer);
      }

      targetElement.style.setProperty("--collapse-x", `${x}px`);
      targetElement.style.setProperty("--collapse-y", `${y}px`);
      targetElement.classList.add("is-collapsing");

      const timerId = window.setTimeout(() => {
        targetElement.classList.add("is-collapsed");
        targetElement.dataset.collapseState = "collapsed";
        this.collapseTimers.delete(targetElement);
      }, durationMs);

      this.collapseTimers.set(targetElement, timerId);
    });
  }

  resetStageState() {
    for (const timerId of this.collapseTimers.values()) {
      window.clearTimeout(timerId);
    }
    this.collapseTimers.clear();

    this.activeTriggerElement?.classList.remove("is-interactable");
    this.activeTriggerElement = null;

    if (!this.containerElement) {
      return;
    }

    const triggerableElements = Array.from(
      this.containerElement.querySelectorAll('[data-triggerable="true"]'),
    );

    triggerableElements.forEach((element) => {
      element.classList.add("is-resetting");
      element.classList.remove("is-collapsing", "is-collapsed");
      element.style.removeProperty("--collapse-x");
      element.style.removeProperty("--collapse-y");
    });

    this.containerElement
      .querySelectorAll(
        ".trigger-block.is-used, .trigger-block.is-interactable",
      )
      .forEach((element) => {
        element.classList.remove("is-used", "is-interactable");
      });

    if (this.stoneAimElement) {
      this.resetStoneAimVisuals();
    }

    if (this.heldStoneElement) {
      this.heldStoneElement.hidden = true;
      this.heldStoneElement.classList.remove(
        "is-held-ui",
        "is-carried",
        "is-airborne",
      );
      this.heldStoneElement.style.left = "";
      this.heldStoneElement.style.top = "";
      this.heldStoneElement.style.transform = "";
    }

    this.monsterElements.forEach((element) => {
      element.classList.remove("is-alert", "is-dead", "is-facing-left");
      element.style.transform = "";
    });

    this.timedBlockElements.forEach((element) => {
      element.classList.remove("is-ticking");
      element.style.removeProperty("--timed-progress");
    });

    this.cannonElements.forEach((element) => {
      element.classList.remove("is-aiming");
    });

    // Trigger 블록이 죽은 직후에도 완전히 초기 위치/상태로 되돌아오도록 레이아웃을 확정합니다.
    this.resetMissionState();
    this.resetBossState();
    this.hideMissionAlarm();

    void this.containerElement.offsetWidth;

    triggerableElements.forEach((element) => {
      element.classList.remove("is-resetting");
    });

    this.hideClearOverlay();
  }

  destroy() {
    if (this.clearRetryButton && this.boundRetryClick) {
      this.clearRetryButton.removeEventListener("click", this.boundRetryClick);
    }
    if (this.clearNextButton && this.boundNextClick) {
      this.clearNextButton.removeEventListener("click", this.boundNextClick);
    }

    for (const timerId of this.collapseTimers.values()) {
      window.clearTimeout(timerId);
    }

    this.collapseTimers.clear();
    this.activeTriggerElement?.classList.remove("is-interactable");
    this.activeTriggerElement = null;
    if (this.stoneAimElement) {
      this.resetStoneAimVisuals();
    }
    if (this.heldStoneElement) {
      this.heldStoneElement.hidden = true;
      this.heldStoneElement.classList.remove(
        "is-held-ui",
        "is-carried",
        "is-airborne",
      );
      this.heldStoneElement.style.left = "";
      this.heldStoneElement.style.top = "";
      this.heldStoneElement.style.transform = "";
    }
    this.monsterElements.forEach((element) => {
      element.classList.remove("is-alert", "is-dead", "is-facing-left");
      element.style.transform = "";
    });
    this.timedBlockElements.forEach((element) => {
      element.classList.remove("is-ticking");
      element.style.removeProperty("--timed-progress");
    });
    this.cannonElements.forEach((element) => {
      element.classList.remove("is-aiming");
    });
    if (this.bossVisualImageElement) {
      this.bossVisualImageElement.removeEventListener(
        "error",
        this.boundBossVisualImageError,
      );
      this.bossVisualImageElement.removeEventListener(
        "load",
        this.boundBossVisualImageLoad,
      );
    }
    this.bossStoneSlots.forEach(({ imageElement }) => {
      imageElement?.removeEventListener("load", this.boundBossStoneImageLoad);
      imageElement?.removeEventListener("error", this.boundBossStoneImageError);
    });
    this.resetMissionState();
    this.resetBossState();
    this.hideMissionAlarm();
    this.boundRetryClick = null;
    this.boundNextClick = null;
  }
}
