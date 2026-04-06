const CUSTOM_MISSION_ALARM_DURATION_MS = 1600;

export class GameView {
  constructor(characterElement, { heldStoneElement = null, stoneAimElement = null } = {}) {
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
      heldStoneElement ?? this.characterElement?.querySelector(".held-stone") ?? null;
    this.stoneAimElement =
      stoneAimElement ?? this.containerElement?.querySelector("[data-stone-aim-line]") ?? null;
    this.stoneAimReticleElement =
      this.containerElement?.querySelector("[data-stone-aim-reticle]") ?? null;
    this.stoneAimReticleHorizontalElement =
      this.containerElement?.querySelector('[data-stone-aim-reticle-axis="horizontal"]') ?? null;
    this.stoneAimReticleVerticalElement =
      this.containerElement?.querySelector('[data-stone-aim-reticle-axis="vertical"]') ?? null;
    this.monsterElements = new Map(
      Array.from(this.containerElement?.querySelectorAll("[data-monster='true']") ?? []).map(
        (element) => [element.dataset.monsterId, element],
      ),
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
      Array.from(this.containerElement?.querySelectorAll("[data-timed-block='true']") ?? []).map(
        (element) => [element.dataset.collapseId, element],
      ),
    );
    this.cannonElements = new Map(
      Array.from(this.containerElement?.querySelectorAll("[data-cannon='true']") ?? []).map(
        (element) => [element.dataset.cannonId, element],
      ),
    );
    this.stage4MonsterCountElement =
      this.containerElement?.querySelector("[data-mission-count-id='stage4-guardian']") ?? null;
    this.stage4TreasureBarrierElement =
      this.containerElement?.querySelector("[data-stage4-treasure-barrier='true']") ?? null;
    this.customMissionAlarmElement =
      this.containerElement?.querySelector(".custom-mission-alarm") ?? null;
    this.customMissionAlarmTextElement =
      this.customMissionAlarmElement?.querySelector("[data-custom-mission-alarm-text='true']") ?? null;
    this.activeTriggerElement = null;
    this.collapseTimers = new Map();
    this.customMissionAlarmTimer = null;
    this.activeMissionAlarmToken = null;
    this.boundRetryClick = null;
    this.boundNextClick = null;
  }

  measureCharacter() {
    const rect = this.characterElement.getBoundingClientRect();

    return {
      width: rect.width,
      height: rect.height,
    };
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
      !character.onGround && !character.isClimbing,
    );
    this.characterElement.classList.toggle("is-climbing", character.isClimbing);
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
      y: headRect.top - containerRect.top - Math.max(headRect.height * 0.35, 10),
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
      this.stoneAimReticleHorizontalElement.setAttribute("x1", `${stoneAim.end.x - axisLength}`);
      this.stoneAimReticleHorizontalElement.setAttribute("y1", `${stoneAim.end.y}`);
      this.stoneAimReticleHorizontalElement.setAttribute("x2", `${stoneAim.end.x + axisLength}`);
      this.stoneAimReticleHorizontalElement.setAttribute("y2", `${stoneAim.end.y}`);
    }

    if (this.stoneAimReticleVerticalElement) {
      this.stoneAimReticleVerticalElement.removeAttribute("hidden");
      this.stoneAimReticleVerticalElement.style.display = "block";
      this.stoneAimReticleVerticalElement.setAttribute("x1", `${stoneAim.end.x}`);
      this.stoneAimReticleVerticalElement.setAttribute("y1", `${stoneAim.end.y - axisLength}`);
      this.stoneAimReticleVerticalElement.setAttribute("x2", `${stoneAim.end.x}`);
      this.stoneAimReticleVerticalElement.setAttribute("y2", `${stoneAim.end.y + axisLength}`);
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
    if (this.stage4MonsterCountElement) {
      const remainingMonsterCount = Math.max(
        0,
        Number(stageMission?.remainingMonsterCount ?? 0),
      );
      this.stage4MonsterCountElement.textContent = `${remainingMonsterCount}`;
    }

    if (this.stage4TreasureBarrierElement) {
      this.stage4TreasureBarrierElement.hidden = !stageMission?.isTreasureBarrierActive;
    }
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
      this.customMissionAlarmTextElement.textContent = missionAlarm.message ?? "";
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
      this.heldStoneElement.classList.remove("is-held-ui", "is-carried", "is-airborne");
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
    if (this.stage4MonsterCountElement) {
      this.stage4MonsterCountElement.textContent = "1";
    }
    if (this.stage4TreasureBarrierElement) {
      this.stage4TreasureBarrierElement.hidden = false;
    }
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
      this.heldStoneElement.classList.remove("is-held-ui", "is-carried", "is-airborne");
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
    if (this.stage4MonsterCountElement) {
      this.stage4MonsterCountElement.textContent = "1";
    }
    if (this.stage4TreasureBarrierElement) {
      this.stage4TreasureBarrierElement.hidden = false;
    }
    this.hideMissionAlarm();
    this.boundRetryClick = null;
    this.boundNextClick = null;
  }
}
