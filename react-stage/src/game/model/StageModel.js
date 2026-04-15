function createRelativeRect(elementRect, containerRect) {
  const left = elementRect.left - containerRect.left;
  const top = elementRect.top - containerRect.top;

  return {
    left,
    top,
    width: elementRect.width,
    height: elementRect.height,
    right: left + elementRect.width,
    bottom: top + elementRect.height,
  };
}

function getOverlapArea(a, b) {
  const overlapX = Math.min(a.right, b.right) - Math.max(a.left, b.left);
  const overlapY = Math.min(a.bottom, b.bottom) - Math.max(a.top, b.top);

  if (overlapX <= 0 || overlapY <= 0) {
    return 0;
  }

  return overlapX * overlapY;
}

function intersects(a, b) {
  return a.left < b.right && a.right > b.left && a.top < b.bottom && a.bottom > b.top;
}

function getHorizontalOverlap(a, b) {
  return Math.max(0, Math.min(a.right, b.right) - Math.max(a.left, b.left));
}

function expandRect(rect, padding) {
  return {
    left: rect.left - padding,
    top: rect.top - padding,
    right: rect.right + padding,
    bottom: rect.bottom + padding,
  };
}

function normalizeSolidRect(rect) {
  return {
    id: rect.id || null,
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    right: rect.left + rect.width,
    bottom: rect.top + rect.height,
    effect: rect.effect || null,
    elementType: rect.elementType || null,
    supportType: rect.supportType || null,
    isAnchored: rect.isAnchored === true,
    velocityY: rect.velocityY ?? 0,
  };
}

function normalizeHazardRect(rect) {
  return {
    id: rect.id || null,
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height,
    right: rect.left + rect.width,
    bottom: rect.top + rect.height,
    type: rect.type || "hazard",
  };
}

function normalizeWaterRect(rect) {
  const width =
    typeof rect.width === "number"
      ? rect.width
      : Math.max(0, (rect.right ?? rect.left) - rect.left);
  const height =
    typeof rect.height === "number"
      ? rect.height
      : Math.max(0, (rect.bottom ?? rect.top) - rect.top);

  return {
    id: rect.id || rect.zoneId || null,
    zoneId: rect.zoneId || null,
    left: rect.left,
    top: rect.top,
    width,
    height,
    right: rect.right ?? rect.left + width,
    bottom: rect.bottom ?? rect.top + height,
  };
}

function parseTargetIds(rawValue) {
  if (!rawValue) {
    return [];
  }

  return rawValue
    .split(",")
    .map((value) => value.trim())
    .filter(Boolean);
}

export class StageModel {
  constructor(container) {
    this.container = container;
    this.solidSelector = '[data-collider="solid"]';
    this.ladderSelector = '[data-collider="ladder"]';
    this.spawnSelector = '[data-spawn="player"]';
    this.triggerSelector = ".trigger-block";
    this.triggerableSelector = '[data-triggerable="true"]';
    this.stoneSourceSelector = '[data-stone-source="true"]';
    this.timedBlockSelector = '[data-timed-block="true"]';
    this.cannonSelector = '[data-cannon="true"]';
    this.monsterSelector = '[data-monster="true"]';
    this.initialSolidifiedSelector = '[data-solidified-block="true"]';
    this.portalSelector = "[data-portal-id]";
    this.waterZoneSelector = '[data-fluid-type="water"]';

    this.domSolids = [];
    this.runtimeSolids = [];
    this.runtimeHazards = [];
    this.initialSolidifiedBlocks = [];
    this.solids = [];
    this.hazards = [];
    this.ladders = [];
    this.waterZones = [];
    this.runtimeWaterZones = [];
    this.hasRuntimeWaterZonesSnapshot = false;
    this.bounds = {
      width: 0,
      height: 0,
    };
    this.initialTriggerStates = null;
    this.allTriggers = [];
    this.triggers = [];
    this.projectileTriggers = [];
    this.contactTriggers = [];
    this.stoneSources = [];
    this.timedBlocks = [];
    this.cannons = [];
    this.monsters = [];
    this.portals = [];
    this.dirty = true;
    this.shouldSeedInitialSolidifiedBlocks = true;
    this.containerRect = container.getBoundingClientRect();

    this.markDirty = this.markDirty.bind(this);
    this.refresh = this.refresh.bind(this);

    if (typeof ResizeObserver !== "undefined") {
      this.resizeObserver = new ResizeObserver(this.markDirty);
      this.resizeObserver.observe(this.container);
    } else {
      this.resizeObserver = null;
    }

    window.addEventListener("resize", this.markDirty);
  }

  markDirty() {
    this.dirty = true;
  }

  refresh() {
    if (!this.dirty) {
      return null;
    }

    this.dirty = false;

    const previousWidth = this.bounds.width;
    const previousHeight = this.bounds.height;
    const containerRect = this.container.getBoundingClientRect();

    this.containerRect = containerRect;
    this.bounds = {
      width: containerRect.width,
      height: containerRect.height,
    };

    this.domSolids = Array.from(
      this.container.querySelectorAll(this.solidSelector),
    ).map((element) => {
      const rect = createRelativeRect(
        element.getBoundingClientRect(),
        containerRect,
      );

      return normalizeSolidRect({
        ...rect,
        effect: element.dataset.effect || null,
        elementType: element.dataset.elementType || null,
        supportType: element.dataset.supportType || null,
      });
    });

    this.initialSolidifiedBlocks = Array.from(
      this.container.querySelectorAll(this.initialSolidifiedSelector),
    ).map((element, index) => {
      const rect = createRelativeRect(
        element.getBoundingClientRect(),
        containerRect,
      );

      return normalizeSolidRect({
        // 1. 고유 ID 부여: HTML의 data-solidified-id 값을 쓰거나 없으면 순번으로 생성
        id: element.dataset.solidifiedId || `initial-solidified-${index}`,

        // 2. 위치와 크기: element.getBoundingClientRect()로 계산된 rect 정보 복사
        ...rect,

        // 3. 특수 효과: data-effect (예: 점프 부스트 등) 값 가져오기
        effect: element.dataset.effect || null,

        // 4. 원소 타입: data-element-type (예: ice, lava) 값 가져오기
        elementType: element.dataset.elementType || null,

        // 5. 고정 여부 (핵심!): HTML에 data-solidified-anchored="true"라고 적혀있으면
        //    공중에 고정되고, 아니면(false) 중력에 의해 아래로 툭 떨어지게 됨
        isAnchored: element.dataset.solidifiedAnchored === "true",
      });
    });

    if (
      previousWidth > 0 &&
      previousHeight > 0 &&
      (previousWidth !== this.bounds.width ||
        previousHeight !== this.bounds.height)
    ) {
      const scaleX = this.bounds.width / previousWidth;
      const scaleY = this.bounds.height / previousHeight;
      this.runtimeSolids = this.runtimeSolids.map((solid) =>
        normalizeSolidRect({
          ...solid,
          left: solid.left * scaleX,
          top: solid.top * scaleY,
          width: solid.width * scaleX,
          height: solid.height * scaleY,
          velocityY: (solid.velocityY ?? 0) * scaleY,
        }),
      );
      this.runtimeHazards = this.runtimeHazards.map((hazard) =>
        normalizeHazardRect({
          ...hazard,
          left: hazard.left * scaleX,
          top: hazard.top * scaleY,
          width: hazard.width * scaleX,
          height: hazard.height * scaleY,
          type: hazard.type,
          id: hazard.id,
        }),
      );
    }

    if (this.shouldSeedInitialSolidifiedBlocks) {
      this.runtimeSolids = this.initialSolidifiedBlocks.map((solid) =>
        normalizeSolidRect(solid),
      );
      this.shouldSeedInitialSolidifiedBlocks = false;
    }

    this.rebuildSolidList();
    this.hazards = [...this.runtimeHazards];
    this.waterZones = Array.from(
      this.container.querySelectorAll(this.waterZoneSelector),
    ).map((element, index) => ({
      id: element.dataset.fluidId || `water-zone-${index}`,
      rect: createRelativeRect(element.getBoundingClientRect(), containerRect),
    }));

    this.ladders = Array.from(
      this.container.querySelectorAll(this.ladderSelector),
    ).map((element) =>
      createRelativeRect(element.getBoundingClientRect(), containerRect),
    );

    const triggerableTargets = Array.from(
      this.container.querySelectorAll(this.triggerableSelector),
    ).map((element, index) => {
      const id = element.dataset.collapseId || `collapse-target-${index}`;

      return {
        id,
        element,
        rect: createRelativeRect(
          element.getBoundingClientRect(),
          containerRect,
        ),
      };
    });

    const targetMap = new Map(
      triggerableTargets.map((target) => [target.id, target]),
    );

    const resolvedTriggers = Array.from(
      this.container.querySelectorAll(this.triggerSelector),
    )
      .map((element, index) => {
        const parentTarget = element.closest(this.triggerableSelector);
        const targetIds = parseTargetIds(element.dataset.triggerTargets);
        const resolvedTargets = (
          targetIds.length > 0
            ? targetIds
            : parentTarget?.dataset.collapseId
              ? [parentTarget.dataset.collapseId]
              : []
        )
          .map((targetId) => targetMap.get(targetId))
          .filter(Boolean);

        if (resolvedTargets.length === 0) {
          return null;
        }

        const isUsed =
          element.dataset.triggerUsed === "true" ||
          resolvedTargets.every((target) => {
            const collapseState = target.element.dataset.collapseState || "";
            return (
              collapseState === "collapsed" || collapseState === "collapsing"
            );
          });

        return {
          id: element.dataset.triggerId || `trigger-${index}`,
          direction: element.dataset.triggerDirection || "left",
          element,
          rect: createRelativeRect(
            element.getBoundingClientRect(),
            containerRect,
          ),
          targets: resolvedTargets,
          supportsInteract:
            element.dataset.interactTrigger !== "false" &&
            element.dataset.contactTrigger !== "true",
          isProjectileTrigger: element.dataset.projectileTrigger === "true",
          isContactTrigger: element.dataset.contactTrigger === "true",
          contactSources: parseTargetIds(element.dataset.contactSources),
          isUsed,
        };
      })
      .filter(Boolean);

    this.allTriggers = resolvedTriggers;
    this.triggers = resolvedTriggers.filter(
      (trigger) => trigger.supportsInteract,
    );
    this.projectileTriggers = resolvedTriggers.filter(
      (trigger) => trigger.isProjectileTrigger,
    );
    this.contactTriggers = resolvedTriggers.filter(
      (trigger) => trigger.isContactTrigger,
    );
    this.stoneSources = Array.from(
      this.container.querySelectorAll(this.stoneSourceSelector),
    ).map((element, index) => ({
      id: element.dataset.stoneSourceId || `stone-source-${index}`,
      element,
      rect: createRelativeRect(element.getBoundingClientRect(), containerRect),
    }));
    this.timedBlocks = Array.from(
      this.container.querySelectorAll(this.timedBlockSelector),
    ).map((element, index) => ({
      id: element.dataset.collapseId || `timed-block-${index}`,
      element,
      rect: createRelativeRect(element.getBoundingClientRect(), containerRect),
      isCollapsed:
        element.dataset.collider === "disabled" ||
        ["collapsed", "collapsing"].includes(
          element.dataset.collapseState || "",
        ),
    }));
    this.cannons = Array.from(
      this.container.querySelectorAll(this.cannonSelector),
    ).map((element, index) => {
      const rect = createRelativeRect(
        element.getBoundingClientRect(),
        containerRect,
      );
      const seatElement = element.querySelector('[data-cannon-seat="true"]');
      const muzzleElement = element.querySelector(
        '[data-cannon-muzzle="true"]',
      );
      const seatRect = seatElement
        ? createRelativeRect(seatElement.getBoundingClientRect(), containerRect)
        : rect;
      const muzzleRect = muzzleElement
        ? createRelativeRect(
            muzzleElement.getBoundingClientRect(),
            containerRect,
          )
        : rect;

      return {
        id: element.dataset.cannonId || `cannon-${index}`,
        element,
        rect,
        variant: element.dataset.cannonVariant || "normal",
        singleUse: element.dataset.cannonSingleUse === "true",
        launchMultiplier: Math.max(
          1,
          Number(element.dataset.cannonLaunchMultiplier || 1),
        ),
        isDisabled: element.dataset.cannonDisabled === "true",
        seatPoint: {
          x: seatRect.left + seatRect.width / 2,
          y: seatRect.top + seatRect.height / 2,
        },
        muzzlePoint: {
          x: muzzleRect.left + muzzleRect.width / 2,
          y: muzzleRect.top + muzzleRect.height / 2,
        },
      };
    });
    this.monsters = Array.from(
      this.container.querySelectorAll(this.monsterSelector),
    ).map((element, index) => ({
      id: element.dataset.monsterId || `monster-${index}`,
      element,
      rect: createRelativeRect(element.getBoundingClientRect(), containerRect),
      direction:
        (element.dataset.monsterDirection || "left") === "right" ? 1 : -1,
      speedMultiplier: Math.max(
        0.1,
        Number(element.dataset.monsterSpeedMultiplier || 1),
      ),
    }));
    this.portals = Array.from(
      this.container.querySelectorAll(this.portalSelector),
    ).map((element, index) => ({
      id: element.dataset.portalId || `portal-${index}`,
      kind: element.dataset.portalKind || "in",
      targetId: element.dataset.portalTarget || null,
      exitDirection: element.dataset.portalExitDirection || "right",
      element,
      rect: createRelativeRect(element.getBoundingClientRect(), containerRect),
    }));

    if (!this.initialTriggerStates) {
      this.initialTriggerStates = {
        triggers: [...this.allTriggers].map((trigger) => ({
          id: trigger.id,
          element: trigger.element,
          triggerUsed: trigger.element.dataset.triggerUsed || null,
        })),
        targets: triggerableTargets.map((target) => ({
          id: target.id,
          element: target.element,
          collider: target.element.dataset.collider || null,
          collapseState: target.element.dataset.collapseState || null,
          nestedSolidStates: Array.from(
            target.element.querySelectorAll(this.solidSelector),
          ).map((element) => ({
            element,
            collider: element.dataset.collider || null,
          })),
        })),
        stoneSources: this.stoneSources.map((source) => ({
          id: source.id,
          element: source.element,
          hidden: source.element.hidden,
          sourceState: source.element.dataset.stoneSourceState || null,
        })),
        cannons: this.cannons.map((cannon) => ({
          id: cannon.id,
          element: cannon.element,
          disabled: cannon.element.dataset.cannonDisabled || null,
        })),
      };
    }

    return {
      width: this.bounds.width,
      height: this.bounds.height,
      changed:
        previousWidth > 0 &&
        previousHeight > 0 &&
        (previousWidth !== this.bounds.width ||
          previousHeight !== this.bounds.height),
      scaleX: previousWidth > 0 ? this.bounds.width / previousWidth : 1,
      scaleY: previousHeight > 0 ? this.bounds.height / previousHeight : 1,
    };
  }

  getSpawnPoint(characterSize) {
    const spawnElement = this.container.querySelector(this.spawnSelector);

    if (!spawnElement) {
      return { x: 0, y: 0 };
    }

    const spawnRect = createRelativeRect(
      spawnElement.getBoundingClientRect(),
      this.containerRect,
    );

    return {
      x: spawnRect.left + (spawnRect.width - characterSize.width) / 2,
      y: spawnRect.top - characterSize.height,
    };
  }

  getLadderForBounds(bounds, horizontalPadding = 0) {
    const expandedBounds = {
      left: bounds.left - horizontalPadding,
      top: bounds.top,
      right: bounds.right + horizontalPadding,
      bottom: bounds.bottom,
    };

    let bestMatch = null;
    let bestArea = 0;

    for (const ladder of this.ladders) {
      const overlapArea = getOverlapArea(expandedBounds, ladder);

      if (overlapArea > bestArea) {
        bestArea = overlapArea;
        bestMatch = ladder;
      }
    }

    return bestMatch;
  }

  getWaterZoneForBounds(bounds) {
    let bestMatch = null;
    let bestArea = 0;
    const zoneSource = this.hasRuntimeWaterZonesSnapshot
      ? this.runtimeWaterZones
      : this.waterZones;

    for (const zone of zoneSource) {
      const rect = this.hasRuntimeWaterZonesSnapshot ? zone : zone.rect;

      if (!intersects(bounds, rect)) {
        continue;
      }

      const overlapArea = getOverlapArea(bounds, rect);

      if (overlapArea > bestArea) {
        bestArea = overlapArea;
        bestMatch = rect;
      }
    }

    return bestMatch;
  }

  getInteractableTrigger(bounds, padding = 0) {
    const expandedBounds = expandRect(bounds, padding);
    let bestMatch = null;
    let bestArea = 0;

    for (const trigger of this.triggers) {
      if (trigger.isUsed || !trigger.supportsInteract) {
        continue;
      }

      const overlapArea = getOverlapArea(expandedBounds, trigger.rect);

      if (overlapArea > bestArea) {
        bestArea = overlapArea;
        bestMatch = trigger;
      }
    }

    return bestMatch;
  }

  activateTrigger(triggerId) {
    const trigger = this.triggers.find(
      (item) => item.id === triggerId && !item.isUsed,
    );

    return this.activateResolvedTrigger(trigger);
  }

  activateProjectileTrigger(triggerId) {
    const trigger = this.projectileTriggers.find(
      (item) => item.id === triggerId && !item.isUsed,
    );

    return this.activateResolvedTrigger(trigger);
  }

  activateContactTrigger(triggerId) {
    const trigger = this.contactTriggers.find(
      (item) => item.id === triggerId && !item.isUsed,
    );

    return this.activateResolvedTrigger(trigger);
  }

  activateResolvedTrigger(trigger) {
    if (!trigger) {
      return null;
    }

    const uniqueTargets = Array.from(
      new Map(trigger.targets.map((target) => [target.id, target])).values(),
    );

    if (uniqueTargets.length === 0) {
      return null;
    }

    trigger.isUsed = true;
    trigger.element.dataset.triggerUsed = "true";

    const animations = uniqueTargets.map((target) => {
      const nestedSolidElements = Array.from(
        target.element.querySelectorAll(this.solidSelector),
      );

      target.element.dataset.collider = "disabled";
      target.element.dataset.collapseState = "collapsing";
      nestedSolidElements.forEach((element) => {
        element.dataset.collider = "disabled";
      });

      const { x, y } = this.getCollapseOffset(target, trigger);

      return {
        targetElement: target.element,
        x,
        y,
      };
    });

    this.markDirty();

    return {
      triggerElement: trigger.element,
      animations,
      durationMs: 300,
    };
  }

  restoreTriggerTargets(targetIds = [], triggerIds = []) {
    if (!this.initialTriggerStates) {
      return false;
    }

    const targetIdSet = new Set(targetIds);
    const triggerIdSet = new Set(triggerIds);
    let didRestore = false;

    this.initialTriggerStates.targets.forEach((state) => {
      if (!targetIdSet.has(state.id)) {
        return;
      }

      if (state.collider === null) {
        delete state.element.dataset.collider;
      } else {
        state.element.dataset.collider = state.collider;
      }

      if (state.collapseState === null) {
        delete state.element.dataset.collapseState;
      } else {
        state.element.dataset.collapseState = state.collapseState;
      }

      state.nestedSolidStates.forEach(({ element, collider }) => {
        if (collider === null) {
          delete element.dataset.collider;
        } else {
          element.dataset.collider = collider;
        }
      });

      didRestore = true;
    });

    this.initialTriggerStates.triggers.forEach((state) => {
      if (!triggerIdSet.has(state.id)) {
        return;
      }

      if (state.triggerUsed === null) {
        delete state.element.dataset.triggerUsed;
      } else {
        state.element.dataset.triggerUsed = state.triggerUsed;
      }

      didRestore = true;
    });

    if (!didRestore) {
      return false;
    }

    this.allTriggers?.forEach((trigger) => {
      if (triggerIdSet.has(trigger.id)) {
        trigger.isUsed = false;
      }
    });

    this.markDirty();
    return true;
  }

  reseedTriggerTargets(targetIds = [], triggerIds = []) {
    if (!this.initialTriggerStates) {
      return false;
    }

    const targetIdSet = new Set(targetIds);
    const triggerIdSet = new Set(triggerIds);
    const refreshedTargetStates = [];
    const refreshedTriggerStates = [];

    targetIdSet.forEach((targetId) => {
      const element = this.container.querySelector(
        `[data-collapse-id="${targetId}"]`,
      );

      if (!element) {
        return;
      }

      refreshedTargetStates.push({
        id: targetId,
        element,
        collider: element.dataset.collider || null,
        collapseState: element.dataset.collapseState || null,
        nestedSolidStates: Array.from(
          element.querySelectorAll(this.solidSelector),
        ).map((solidElement) => ({
          element: solidElement,
          collider: solidElement.dataset.collider || null,
        })),
      });
    });

    triggerIdSet.forEach((triggerId) => {
      const element = this.container.querySelector(
        `[data-trigger-id="${triggerId}"]`,
      );

      if (!element) {
        return;
      }

      refreshedTriggerStates.push({
        id: triggerId,
        element,
        triggerUsed: element.dataset.triggerUsed || null,
      });
    });

    this.initialTriggerStates.targets = [
      ...this.initialTriggerStates.targets.filter(
        (state) => !targetIdSet.has(state.id),
      ),
      ...refreshedTargetStates,
    ];
    this.initialTriggerStates.triggers = [
      ...this.initialTriggerStates.triggers.filter(
        (state) => !triggerIdSet.has(state.id),
      ),
      ...refreshedTriggerStates,
    ];

    return refreshedTargetStates.length > 0 || refreshedTriggerStates.length > 0;
  }

  expireTimedBlock(timedBlockId) {
    const timedBlock = this.timedBlocks.find(
      (item) => item.id === timedBlockId && !item.isCollapsed,
    );

    if (!timedBlock) {
      return null;
    }

    timedBlock.isCollapsed = true;
    timedBlock.element.dataset.collider = "disabled";
    timedBlock.element.dataset.collapseState = "collapsing";
    this.markDirty();

    return {
      triggerElement: null,
      animations: [
        {
          targetElement: timedBlock.element,
          x: 0,
          y: Math.max(timedBlock.rect.height + 18, this.bounds.height * 0.04),
        },
      ],
      durationMs: 280,
    };
  }

  resetStage() {
    if (!this.initialTriggerStates) {
      return;
    }

    this.clearRuntimeSolids();
    this.clearRuntimeHazards();
    this.clearRuntimeWaterZones();
    this.shouldSeedInitialSolidifiedBlocks = true;

    [...(this.allTriggers ?? [])].forEach((trigger) => {
      trigger.isUsed = false;
    });

    this.timedBlocks?.forEach((timedBlock) => {
      timedBlock.isCollapsed = false;
    });

    this.initialTriggerStates.triggers.forEach((state) => {
      if (state.triggerUsed === null) {
        delete state.element.dataset.triggerUsed;
      } else {
        state.element.dataset.triggerUsed = state.triggerUsed;
      }
    });

    this.initialTriggerStates.targets.forEach((state) => {
      if (state.collider === null) {
        delete state.element.dataset.collider;
      } else {
        state.element.dataset.collider = state.collider;
      }

      if (state.collapseState === null) {
        delete state.element.dataset.collapseState;
      } else {
        state.element.dataset.collapseState = state.collapseState;
      }

      state.nestedSolidStates.forEach(({ element, collider }) => {
        if (collider === null) {
          delete element.dataset.collider;
        } else {
          element.dataset.collider = collider;
        }
      });
    });

    this.initialTriggerStates.stoneSources?.forEach((state) => {
      state.element.hidden = state.hidden;

      if (state.sourceState === null) {
        delete state.element.dataset.stoneSourceState;
      } else {
        state.element.dataset.stoneSourceState = state.sourceState;
      }
    });

    this.initialTriggerStates.cannons?.forEach((state) => {
      if (state.disabled === null) {
        delete state.element.dataset.cannonDisabled;
      } else {
        state.element.dataset.cannonDisabled = state.disabled;
      }
    });

    this.markDirty();
  }

  setRuntimeSolids(solids = []) {
    this.runtimeSolids = solids.map((solid) => normalizeSolidRect(solid));
    this.rebuildSolidList();
  }

  clearRuntimeSolids() {
    this.runtimeSolids = [];
    this.rebuildSolidList();
  }

  setRuntimeHazards(hazards = []) {
    this.runtimeHazards = hazards.map((hazard) => normalizeHazardRect(hazard));
    this.hazards = [...this.runtimeHazards];
  }

  clearRuntimeHazards() {
    this.runtimeHazards = [];
    this.hazards = [];
  }

  setRuntimeWaterZones(zones = null) {
    if (!Array.isArray(zones)) {
      this.clearRuntimeWaterZones();
      return;
    }

    this.runtimeWaterZones = zones.map((zone) => normalizeWaterRect(zone));
    this.hasRuntimeWaterZonesSnapshot = true;
  }

  clearRuntimeWaterZones() {
    this.runtimeWaterZones = [];
    this.hasRuntimeWaterZonesSnapshot = false;
  }

  rebuildSolidList() {
    this.solids = [...this.domSolids, ...this.runtimeSolids];
  }

  getCollapseOffset(target, trigger) {
    const extraDistance = Math.max(18, this.bounds.width * 0.015);
    const horizontalDistance =
      target.rect.width + Math.max(trigger.rect.width, 18) + extraDistance;
    const verticalDistance =
      target.rect.height + Math.max(trigger.rect.height, 18) + extraDistance;

    switch (trigger.direction) {
      case "right":
        return { x: -horizontalDistance, y: 0 };
      case "top":
        return { x: 0, y: verticalDistance };
      case "bottom":
        return { x: 0, y: -verticalDistance };
      case "left":
      default:
        return { x: horizontalDistance, y: 0 };
    }
  }

  getOverlappingStoneSource(bounds, padding = 0) {
    const expandedBounds = expandRect(bounds, padding);

    return (
      this.stoneSources.find((source) => {
        const isConsumed =
          source.element.hidden ||
          source.element.dataset.stoneSourceState === "consumed";

        if (isConsumed) {
          return false;
        }

        return getOverlapArea(expandedBounds, source.rect) > 0;
      }) ?? null
    );
  }

  consumeStoneSource(sourceId) {
    const source = this.stoneSources.find((item) => item.id === sourceId);

    if (!source) {
      return false;
    }

    source.element.hidden = true;
    source.element.dataset.stoneSourceState = "consumed";
    return true;
  }

  getStandingTimedBlock(bounds, tolerance = 10) {
    return (
      this.timedBlocks.find((timedBlock) => {
        if (
          timedBlock.isCollapsed ||
          timedBlock.element.dataset.collider === "disabled"
        ) {
          return false;
        }

        const verticalGap = Math.abs(bounds.bottom - timedBlock.rect.top);
        const horizontalOverlap =
          Math.min(bounds.right, timedBlock.rect.right) -
          Math.max(bounds.left, timedBlock.rect.left);

        return verticalGap <= tolerance && horizontalOverlap > 12;
      }) ?? null
    );
  }

  getSupportingSolid(
    bounds,
    {
      tolerance = 8,
      minHorizontalOverlap = 12,
      supportTypes = null,
      solidRectTransform = null,
    } = {},
  ) {
    const allowedSupportTypes = Array.isArray(supportTypes)
      ? new Set(supportTypes)
      : null;
    let bestMatch = null;

    this.solids.forEach((solid) => {
      if (
        allowedSupportTypes &&
        !allowedSupportTypes.has(solid.supportType || null)
      ) {
        return;
      }

      const transformedRect =
        typeof solidRectTransform === "function"
          ? solidRectTransform(solid)
          : solid;
      const solidRect = transformedRect
        ? {
            ...solid,
            ...transformedRect,
            right:
              transformedRect.right ??
              transformedRect.left + transformedRect.width,
            bottom:
              transformedRect.bottom ??
              transformedRect.top + transformedRect.height,
          }
        : null;

      if (!solidRect) {
        return;
      }

      const verticalGap = solidRect.top - bounds.bottom;
      const horizontalOverlap = getHorizontalOverlap(bounds, solidRect);

      if (
        verticalGap < -tolerance ||
        verticalGap > tolerance ||
        horizontalOverlap < minHorizontalOverlap
      ) {
        return;
      }

      const candidate = {
        solid,
        rect: solidRect,
        verticalGap,
        horizontalOverlap,
      };

      if (!bestMatch) {
        bestMatch = candidate;
        return;
      }

      const candidatePenalty = verticalGap < 0 ? 1 : 0;
      const bestPenalty = bestMatch.verticalGap < 0 ? 1 : 0;
      const candidateDistance = Math.abs(verticalGap);
      const bestDistance = Math.abs(bestMatch.verticalGap);

      if (
        candidatePenalty < bestPenalty ||
        (candidatePenalty === bestPenalty &&
          (candidateDistance < bestDistance ||
            (candidateDistance === bestDistance &&
              solidRect.top < bestMatch.rect.top)))
      ) {
        bestMatch = candidate;
      }
    });

    return bestMatch;
  }

  getNearbyCannon(bounds, padding = 0) {
    const expandedBounds = expandRect(bounds, padding);
    let bestMatch = null;
    let bestArea = 0;

    this.cannons.forEach((cannon) => {
      if (cannon.isDisabled) {
        return;
      }

      const overlapArea = getOverlapArea(expandedBounds, cannon.rect);

      if (overlapArea > bestArea) {
        bestArea = overlapArea;
        bestMatch = cannon;
      }
    });

    return bestMatch;
  }

  disableCannon(cannonId) {
    const cannon = this.cannons.find((item) => item.id === cannonId);

    if (!cannon || cannon.isDisabled) {
      return false;
    }

    cannon.isDisabled = true;
    cannon.element.dataset.cannonDisabled = "true";
    this.markDirty();
    return true;
  }

  getPortalEntry(bounds, padding = 0) {
    const expandedBounds = expandRect(bounds, padding);
    const centerX = (bounds.left + bounds.right) / 2;
    const centerY = (bounds.top + bounds.bottom) / 2;
    const boundsArea = Math.max(1, (bounds.right - bounds.left) * (bounds.bottom - bounds.top));
    let bestMatch = null;
    let bestArea = 0;

    this.portals.forEach((portal) => {
      if (portal.kind !== "in") {
        return;
      }

      const overlapArea = getOverlapArea(expandedBounds, portal.rect);
      const portalContainsCenter =
        centerX >= portal.rect.left &&
        centerX <= portal.rect.right &&
        centerY >= portal.rect.top &&
        centerY <= portal.rect.bottom;

      if (!portalContainsCenter) {
        return;
      }

      if (overlapArea < boundsArea * 0.18) {
        return;
      }

      if (overlapArea > bestArea) {
        bestArea = overlapArea;
        bestMatch = portal;
      }
    });

    return bestMatch;
  }

  getPortalById(portalId) {
    return this.portals.find((portal) => portal.id === portalId) ?? null;
  }

  destroy() {
    this.clearRuntimeWaterZones();
    this.resizeObserver?.disconnect();
    window.removeEventListener("resize", this.markDirty);
  }
}
