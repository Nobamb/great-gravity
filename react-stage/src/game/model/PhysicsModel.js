import Matter from "matter-js";

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

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function isPointInsideRect(point, rect) {
  return (
    point.x >= rect.left &&
    point.x <= rect.right &&
    point.y >= rect.top &&
    point.y <= rect.bottom
  );
}

function doesSegmentIntersectRect(start, end, rect, padding = 0) {
  const expandedRect = {
    left: rect.left - padding,
    right: rect.right + padding,
    top: rect.top - padding,
    bottom: rect.bottom + padding,
  };

  if (
    isPointInsideRect(start, expandedRect) ||
    isPointInsideRect(end, expandedRect)
  ) {
    return true;
  }

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  const p = [-dx, dx, -dy, dy];
  const q = [
    start.x - expandedRect.left,
    expandedRect.right - start.x,
    start.y - expandedRect.top,
    expandedRect.bottom - start.y,
  ];
  let tMin = 0;
  let tMax = 1;

  for (let index = 0; index < 4; index += 1) {
    if (p[index] === 0) {
      if (q[index] < 0) {
        return false;
      }

      continue;
    }

    const ratio = q[index] / p[index];

    if (p[index] < 0) {
      tMin = Math.max(tMin, ratio);
    } else {
      tMax = Math.min(tMax, ratio);
    }

    if (tMin > tMax) {
      return false;
    }
  }

  return tMin <= tMax && tMax >= 0 && tMin <= 1;
}

const FLUID_KEYS = ["water", "lava", "fire", "ice-water", "super-lava"];

const HAZARD_TYPES = new Set(["lava", "fire", "super-lava"]);

function createFluidGroups() {
  return {
    water: [],
    lava: [],
    fire: [],
    "ice-water": [],
    "super-lava": [],
    treasure: null,
    stone: null,
  };
}

export class PhysicsModel {
  constructor({
    container,
    treasureElement,
    treasureAnchorElement = null,
    stoneElement = null,
    stoneAnchorElement = null,
  }) {
    this.container = container;
    this.treasureElement = treasureElement;
    this.treasureAnchorElement = treasureAnchorElement;
    this.stoneElement = stoneElement;
    this.stoneAnchorElement = stoneAnchorElement;
    this.enabled = Boolean(Matter?.Engine);
    this.initialized = false;

    this.staticBodies = [];
    this.fluidZones = [];
    this.dynamicBodies = createFluidGroups();
    this.stoneState = "missing";
    this.stoneSpawnRect = null;
    this.stoneHeldPosition = null;
    this.stoneBodyInWorld = false;
    this.stoneAirborneFrames = 0;
    this.stoneReleaseOrigin = null;
    this.projectileTriggers = [];
    this.pendingTriggerHits = [];
    this.renderObstacles = [];
    this.elapsed = 0;
    this.renderObstaclePadding = 2;
    this.solidifiedRects = [];
    this.solidifiedCellKeys = new Set();
    this.staticSolidRects = [];
    this.staticIceRects = [];
    this.solidifiedIdCounter = 0;
    this.solidifyConfig = {
      maxBlocksPerStep: 6,
      contactRatio: 1.08,
      removalPaddingRatio: 0.58,
      friction: 0.92,
      gravity: 880,
      maxFallSpeed: 520,
    };
    this.reactionLockDurationMs = 320;

    this.fluidConfigs = {
      water: {
        key: "water",
        radiusScale: 0.072,
        maxCols: 14,
        maxRows: 8,
        density: 0.001,
        friction: 0.005,
        frictionAir: 0.015,
        restitution: 0.05,
        spreadForce: 0.000008,
        downwardBias: 0.00002,
        maxSpeed: 10,
        pressureStrength: 0.00012,
        targetSpacingScale: 2.8,
      },
      "ice-water": {
        key: "ice-water",
        radiusScale: 0.075,
        maxCols: 14,
        maxRows: 8,
        density: 0.0013,
        friction: 0.006,
        frictionAir: 0.02,
        restitution: 0.04,
        spreadForce: 0.000007,
        downwardBias: 0.000018,
        maxSpeed: 8,
        pressureStrength: 0.00013,
        targetSpacingScale: 2.7,
      },
      lava: {
        key: "lava",
        radiusScale: 0.082,
        maxCols: 10,
        maxRows: 7,
        density: 0.004,
        friction: 0.4,
        frictionAir: 0.05,
        restitution: 0.0,
        spreadForce: 0.0000012,
        downwardBias: 0.000018,
        maxSpeed: 5,
        pressureStrength: 0.00003,
        targetSpacingScale: 2.4,
      },
      fire: {
        key: "fire",
        radiusScale: 0.066,
        maxCols: 9,
        maxRows: 7,
        density: 0.0018,
        friction: 0.01,
        frictionAir: 0.08,
        restitution: 0.0,
        spreadForce: 0.0000007,
        downwardBias: -0.000004,
        maxSpeed: 2.6,
        pressureStrength: 0.000018,
        targetSpacingScale: 2.2,
        lockedContainment: true,
      },
      "super-lava": {
        key: "super-lava",
        radiusScale: 0.086,
        maxCols: 10,
        maxRows: 7,
        density: 0.0044,
        friction: 0.36,
        frictionAir: 0.04,
        restitution: 0.0,
        spreadForce: 0.0000014,
        downwardBias: 0.000012,
        maxSpeed: 4.6,
        pressureStrength: 0.000035,
        targetSpacingScale: 2.35,
      },
    };

    if (!this.enabled) {
      console.warn(
        "matter.js가 로드되지 않아 환경 물리 시뮬레이션을 비활성화합니다.",
      );
      return;
    }

    const { Bodies, Body, Engine, World } = Matter;
    this.Bodies = Bodies;
    this.Body = Body;
    this.Engine = Engine;
    this.World = World;
    this.resetEngine();
  }

  createEngine() {
    return this.Engine.create({
      gravity: { x: 0, y: 1.0, scale: 0.001 },
      positionIterations: 10,
      velocityIterations: 8,
      constraintIterations: 4,
    });
  }

  resetEngine() {
    this.engine = this.createEngine();
    this.world = this.engine.world;
    this.staticBodies = [];
    this.fluidZones = [];
    this.dynamicBodies = createFluidGroups();
    this.stoneState = "missing";
    this.stoneSpawnRect = null;
    this.stoneHeldPosition = null;
    this.stoneBodyInWorld = false;
    this.stoneAirborneFrames = 0;
    this.stoneReleaseOrigin = null;
    this.projectileTriggers = [];
    this.pendingTriggerHits = [];
    this.renderObstacles = [];
    this.elapsed = 0;
    this.solidifiedRects = [];
    this.solidifiedCellKeys = new Set();
    this.staticSolidRects = [];
    this.staticIceRects = [];
    this.solidifiedIdCounter = 0;
  }

  initialize(stageModel) {
    if (!this.enabled) {
      return;
    }

    this.rebuildDynamicBodies();
    this.rebuildStaticBodies(stageModel);
    this.syncSolidifiedState(stageModel.runtimeSolids);
    this.initialized = true;
  }

  syncStage(stageModel, { resetDynamics = false, hardReset = false } = {}) {
    if (!this.enabled) {
      return;
    }

    if (hardReset) {
      this.resetEngine();
      this.rebuildDynamicBodies();
      this.rebuildStaticBodies(stageModel);
      this.syncSolidifiedState(stageModel.runtimeSolids);
      this.initialized = true;
      return;
    }

    if (resetDynamics || !this.initialized) {
      this.rebuildDynamicBodies();
    }

    this.rebuildStaticBodies(stageModel);
    this.syncSolidifiedState(stageModel.runtimeSolids);
    this.initialized = true;
  }

  rebuildDynamicBodies() {
    this.removeBodies([
      ...this.getAllFluidBodies(),
      ...(this.dynamicBodies.treasure ? [this.dynamicBodies.treasure] : []),
      ...(this.dynamicBodies.stone ? [this.dynamicBodies.stone] : []),
    ]);

    const containerRect = this.container.getBoundingClientRect();
    const fluidElements = Array.from(
      this.container.querySelectorAll("[data-fluid-type]"),
    );

    this.fluidZones = fluidElements
      .map((element, index) => {
        const key = element.dataset.fluidType;
        const config = this.fluidConfigs[key];

        if (!config) {
          return null;
        }

        const originRect = createRelativeRect(
          element.getBoundingClientRect(),
          containerRect,
        );

        return {
          id: element.dataset.fluidId || `${key}-${index}`,
          key,
          element,
          config,
          originRect,
          containmentRect: {
            ...originRect,
          },
          bodies: this.createFluidBodies(originRect, config),
        };
      })
      .filter(Boolean);

    const treasureSourceElement =
      this.treasureAnchorElement ?? this.treasureElement;
    const treasureRect = createRelativeRect(
      treasureSourceElement.getBoundingClientRect(),
      containerRect,
    );

    this.rebuildDynamicBodyCache();
    this.dynamicBodies.treasure = this.createTreasureBody(treasureRect);

    if (this.stoneElement && this.stoneAnchorElement) {
      const stoneRect = createRelativeRect(
        this.stoneAnchorElement.getBoundingClientRect(),
        containerRect,
      );
      this.stoneSpawnRect = stoneRect;
      this.dynamicBodies.stone = this.createStoneBody(stoneRect);
      this.stoneState = "missing";
    } else {
      this.dynamicBodies.stone = null;
      this.stoneSpawnRect = null;
      this.stoneState = "missing";
    }

    this.stoneHeldPosition = null;
    this.stoneBodyInWorld = false;
    this.stoneAirborneFrames = 0;
    this.stoneReleaseOrigin = null;

    this.addBodies([...this.getAllFluidBodies(), this.dynamicBodies.treasure]);

    this.elapsed = 0;
  }

  rebuildDynamicBodyCache() {
    FLUID_KEYS.forEach((key) => {
      this.dynamicBodies[key] = [];
    });

    this.fluidZones.forEach((zone) => {
      zone.bodies.forEach((body) => {
        const elementType = body.plugin.elementType ?? zone.key;

        if (!this.dynamicBodies[elementType]) {
          this.dynamicBodies[elementType] = [];
        }

        this.dynamicBodies[elementType].push(body);
      });
    });
  }

  getAllFluidBodies() {
    return FLUID_KEYS.flatMap((key) => this.dynamicBodies[key] ?? []);
  }

  rebuildStaticBodies(stageModel) {
    this.removeBodies(this.staticBodies);
    const physicsSolids = stageModel.domSolids ?? stageModel.solids;
    this.staticSolidRects = physicsSolids.map((solid) => ({
      left: solid.left,
      top: solid.top,
      width: solid.width,
      height: solid.height,
      right: solid.left + solid.width,
      bottom: solid.top + solid.height,
      elementType: solid.elementType || null,
    }));
    this.staticIceRects = this.staticSolidRects.filter(
      (solid) => solid.elementType === "ice",
    );
    this.projectileTriggers = Array.from(
      this.container.querySelectorAll('[data-projectile-trigger="true"]'),
    ).map((element, index) => {
      const rect = createRelativeRect(
        element.getBoundingClientRect(),
        this.container.getBoundingClientRect(),
      );

      return {
        id: element.dataset.triggerId || `projectile-trigger-${index}`,
        element,
        rect,
        isUsed: element.dataset.triggerUsed === "true",
      };
    });

    const boundaryThickness = Math.max(48, stageModel.bounds.width * 0.05);
    const minSolidThickness = Math.max(12, stageModel.bounds.width * 0.012);
    const solidCollisionPadding = Math.max(2, stageModel.bounds.width * 0.0025);
    const leftWall = this.Bodies.rectangle(
      -boundaryThickness / 2,
      stageModel.bounds.height / 2,
      boundaryThickness,
      stageModel.bounds.height * 2,
      { isStatic: true },
    );
    const rightWall = this.Bodies.rectangle(
      stageModel.bounds.width + boundaryThickness / 2,
      stageModel.bounds.height / 2,
      boundaryThickness,
      stageModel.bounds.height * 2,
      { isStatic: true },
    );
    const topWall = this.Bodies.rectangle(
      stageModel.bounds.width / 2,
      -boundaryThickness / 2,
      stageModel.bounds.width * 2,
      boundaryThickness,
      { isStatic: true },
    );

    this.renderObstacles = physicsSolids.map((solid) =>
      this.createObstacleRect(solid, {
        padding: this.renderObstaclePadding,
      }),
    );

    this.updateFluidContainment(physicsSolids);

    this.staticBodies = [
      leftWall,
      rightWall,
      topWall,
      ...physicsSolids.map((solid) => {
        const obstacleRect = this.createObstacleRect(solid, {
          padding: solidCollisionPadding,
          minThickness: minSolidThickness,
        });

        return this.Bodies.rectangle(
          obstacleRect.x + obstacleRect.width / 2,
          obstacleRect.y + obstacleRect.height / 2,
          Math.max(2, obstacleRect.width),
          Math.max(2, obstacleRect.height),
          {
            isStatic: true,
            friction: solid.effect === "jump-boost" ? 0.02 : 0.4,
          },
        );
      }),
    ];

    this.addBodies(this.staticBodies);
  }

  syncSolidifiedState(runtimeSolids = []) {
    this.solidifiedRects = runtimeSolids.map((solid) => ({
      id: solid.id || this.getSolidifiedCellKey(solid),
      left: solid.left,
      top: solid.top,
      width: solid.width,
      height: solid.height,
      right: solid.left + solid.width,
      bottom: solid.top + solid.height,
      effect: solid.effect || null,
      elementType: solid.elementType || null,
      isAnchored: solid.isAnchored === true,
      velocityY: solid.velocityY ?? 0,
    }));
    this.solidifiedCellKeys = new Set(
      this.solidifiedRects.map((solid) => solid.id),
    );
  }

  createObstacleRect(rect, { padding = 0, minThickness = 0 } = {}) {
    const paddedWidth = rect.width + padding * 2;
    const paddedHeight = rect.height + padding * 2;
    const width = Math.max(paddedWidth, minThickness || paddedWidth);
    const height = Math.max(paddedHeight, minThickness || paddedHeight);
    const offsetX = (width - rect.width) / 2;
    const offsetY = (height - rect.height) / 2;

    return {
      x: rect.left - offsetX,
      y: rect.top - offsetY,
      width,
      height,
    };
  }

  getSolidifyCellSize() {
    return clamp(this.container.clientWidth * 0.022, 18, 30);
  }

  getSolidifiedCellKey(rect) {
    const cellSize = this.getSolidifyCellSize();
    return `${Math.round(rect.left / cellSize)}:${Math.round(rect.top / cellSize)}`;
  }

  getSolidifiedRectForPoint(x, y) {
    const cellSize = this.getSolidifyCellSize();
    const maxLeft = Math.max(0, this.container.clientWidth - cellSize);
    const maxTop = Math.max(0, this.container.clientHeight - cellSize);
    const left = clamp(Math.floor(x / cellSize) * cellSize, 0, maxLeft);
    const top = clamp(Math.floor(y / cellSize) * cellSize, 0, maxTop);
    const id = `${Math.round(left / cellSize)}:${Math.round(top / cellSize)}`;

    return {
      id,
      left,
      top,
      width: cellSize,
      height: cellSize,
      right: left + cellSize,
      bottom: top + cellSize,
      effect: null,
    };
  }

  isRectBlocked(rect) {
    return this.renderObstacles.some((obstacle) => {
      const obstacleRight = obstacle.x + obstacle.width;
      const obstacleBottom = obstacle.y + obstacle.height;

      return !(
        rect.right <= obstacle.x ||
        rect.left >= obstacleRight ||
        rect.bottom <= obstacle.y ||
        rect.top >= obstacleBottom
      );
    });
  }

  removeFluidBodiesNearRect(rect) {
    const padding =
      Math.max(rect.width, rect.height) *
      this.solidifyConfig.removalPaddingRatio;
    let cacheDirty = false;

    this.fluidZones.forEach((zone) => {
      const remainingBodies = [];
      const removedBodies = [];

      zone.bodies.forEach((body) => {
        const radius = body.circleRadius;
        const overlapsRect = !(
          body.position.x + radius < rect.left - padding ||
          body.position.x - radius > rect.right + padding ||
          body.position.y + radius < rect.top - padding ||
          body.position.y - radius > rect.bottom + padding
        );

        if (overlapsRect) {
          removedBodies.push(body);
          return;
        }

        remainingBodies.push(body);
      });

      if (removedBodies.length > 0) {
        this.removeBodies(removedBodies);
        zone.bodies = remainingBodies;
        cacheDirty = true;
      }
    });

    if (cacheDirty) {
      this.rebuildDynamicBodyCache();
    }
  }

  addSolidifiedBlock(rect) {
    const overlapsExistingBlock = this.solidifiedRects.some(
      (solid) =>
        !(
          rect.right <= solid.left ||
          rect.left >= solid.right ||
          rect.bottom <= solid.top ||
          rect.top >= solid.bottom
        ),
    );

    if (overlapsExistingBlock) {
      return false;
    }

    if (this.solidifiedCellKeys.has(rect.id)) {
      return false;
    }

    if (this.isRectBlocked(rect)) {
      return false;
    }

    this.solidifiedRects.push(rect);
    this.solidifiedCellKeys.add(rect.id);
    this.removeFluidBodiesNearRect(rect);

    return true;
  }

  removeSolidifiedBlockById(blockId) {
    return Boolean(this.takeSolidifiedBlockById(blockId));
  }

  takeSolidifiedBlockById(blockId) {
    if (!this.solidifiedCellKeys.has(blockId)) {
      return null;
    }

    const blockIndex = this.solidifiedRects.findIndex(
      (solid) => solid.id === blockId,
    );

    if (blockIndex === -1) {
      this.solidifiedCellKeys.delete(blockId);
      return null;
    }

    const [removedBlock] = this.solidifiedRects.splice(blockIndex, 1);
    this.solidifiedCellKeys.delete(blockId);
    return removedBlock;
  }

  updateSolidifiedBlockPhysics(dt) {
    if (this.solidifiedRects.length === 0) {
      return;
    }

    const anchoredBlocks = this.solidifiedRects
      .filter((block) => block.isAnchored)
      .map((block) => ({
        left: block.left,
        top: block.top,
        right: block.right,
        bottom: block.bottom,
      }));
    const settledDynamicBlocks = [];
    const blocks = [...this.solidifiedRects].sort((a, b) => b.top - a.top);

    blocks.forEach((block) => {
      if (block.isAnchored) {
        block.velocityY = 0;
        return;
      }

      const nextVelocityY = Math.min(
        (block.velocityY ?? 0) + this.solidifyConfig.gravity * dt,
        this.solidifyConfig.maxFallSpeed,
      );
      let nextTop = block.top + nextVelocityY * dt;
      let nextBottom = nextTop + block.height;
      let resolvedVelocityY = nextVelocityY;
      let supportTop = Number.POSITIVE_INFINITY;

      const supports = [
        ...this.staticSolidRects,
        ...anchoredBlocks,
        ...settledDynamicBlocks,
      ];

      supports.forEach((support) => {
        const horizontalOverlap =
          block.left < support.right - 2 && block.right > support.left + 2;
        const startsAbove = block.bottom <= support.top + 4;

        if (!horizontalOverlap || !startsAbove) {
          return;
        }

        if (nextBottom >= support.top && support.top < supportTop) {
          supportTop = support.top;
        }
      });

      if (supportTop !== Number.POSITIVE_INFINITY) {
        nextTop = supportTop - block.height;
        nextBottom = supportTop;
        resolvedVelocityY = 0;
      }

      block.top = nextTop;
      block.bottom = nextBottom;
      block.right = block.left + block.width;
      block.velocityY = resolvedVelocityY;

      settledDynamicBlocks.push({
        left: block.left,
        top: block.top,
        right: block.right,
        bottom: block.bottom,
      });
    });
  }

  updateFluidContainment(solids) {
    this.fluidZones.forEach((zone) => {
      const origin = zone.originRect;
      const containment = {
        left: origin.left,
        top: origin.top,
        right: origin.right,
        bottom: origin.bottom,
        width: origin.width,
        height: origin.height,
      };

      const margin = 8;
      let hasLeftWall = false;
      let hasRightWall = false;
      let hasTopWall = false;

      for (const solid of solids) {
        const solidRight = solid.left + solid.width;
        const solidBottom = solid.top + solid.height;
        const vertOverlap =
          solid.top < origin.bottom + margin &&
          solidBottom > origin.top - margin;
        const horzOverlap =
          solid.left < origin.right + margin &&
          solidRight > origin.left - margin;

        if (vertOverlap && Math.abs(solidRight - origin.left) < margin) {
          hasLeftWall = true;
        }
        if (vertOverlap && Math.abs(solid.left - origin.right) < margin) {
          hasRightWall = true;
        }
        if (horzOverlap && Math.abs(solidBottom - origin.top) < margin) {
          hasTopWall = true;
        }
      }

      const containerWidth = this.container.clientWidth;
      const containerHeight = this.container.clientHeight;

      if (zone.config.lockedContainment) {
        zone.containmentRect = containment;
        return;
      }

      if (!hasLeftWall) {
        containment.left = 0;
      }
      if (!hasRightWall) {
        containment.right = containerWidth;
      }
      if (!hasTopWall) {
        containment.top = 0;
      }

      // Let fluid always continue downward when there is an opening.
      // Actual stage solids already block falling, so clamping the bottom
      // to the original fluid box prevents lava from draining naturally.
      containment.bottom = containerHeight + 120;

      containment.width = containment.right - containment.left;
      containment.height = containment.bottom - containment.top;
      zone.containmentRect = containment;
    });
  }

  createFluidBodies(
    rect,
    config,
    { densityScale = 1, spawnProfile = null } = {},
  ) {
    const normalizedDensityScale = Math.max(1, densityScale);
    const minParticleRadius = spawnProfile?.minParticleRadius ?? 3.5;
    const maxParticleRadius = spawnProfile?.maxParticleRadius ?? 12;
    const colCountSpacingMultiplier =
      spawnProfile?.colCountSpacingMultiplier ?? 1.65;
    const rowCountSpacingMultiplier =
      spawnProfile?.rowCountSpacingMultiplier ?? 1.35;
    const colStepMultiplier = spawnProfile?.colStepMultiplier ?? 1.6;
    const rowStepMultiplier = spawnProfile?.rowStepMultiplier ?? 1.28;
    const rowOffsetMultiplier = spawnProfile?.rowOffsetMultiplier ?? 0.45;
    const spawnInsetMultiplier = spawnProfile?.spawnInsetMultiplier ?? 1.2;
    const maxCols =
      spawnProfile?.maxCols ??
      Math.max(
        config.maxCols,
        Math.ceil(config.maxCols * normalizedDensityScale),
      );
    const maxRows =
      spawnProfile?.maxRows ??
      Math.max(
        config.maxRows,
        Math.ceil(config.maxRows * normalizedDensityScale),
      );
    const particleRadius = clamp(
      Math.min(rect.width, rect.height) *
        (config.radiusScale / Math.sqrt(normalizedDensityScale)),
      minParticleRadius,
      maxParticleRadius,
    );
    const cols = clamp(
      Math.floor(rect.width / (particleRadius * colCountSpacingMultiplier)),
      4,
      maxCols,
    );
    const rows = clamp(
      Math.floor(rect.height / (particleRadius * rowCountSpacingMultiplier)),
      3,
      maxRows,
    );
    const bodies = [];
    const startX = rect.left + particleRadius * spawnInsetMultiplier;
    const startY = rect.top + particleRadius * spawnInsetMultiplier;

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < cols; col += 1) {
        const offsetX = (row % 2) * particleRadius * rowOffsetMultiplier;
        const x = startX + col * particleRadius * colStepMultiplier + offsetX;
        const y = startY + row * particleRadius * rowStepMultiplier;
        const body = this.Bodies.circle(x, y, particleRadius, {
          friction: config.friction,
          frictionAir: config.frictionAir,
          restitution: config.restitution,
          density: config.density,
          slop: 0.001,
        });
        body.plugin.renderKind = config.key;
        body.plugin.elementType = config.key;
        body.plugin.fluidConfig = config;
        bodies.push(body);
      }
    }

    return bodies;
  }

  createTreasureBody(rect) {
    const body = this.Bodies.rectangle(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
      rect.width * 0.82,
      rect.height * 0.78,
      {
        friction: 0.72,
        frictionAir: 0.015,
        restitution: 0.04,
        density: 0.0032,
        chamfer: { radius: Math.min(rect.width, rect.height) * 0.12 },
      },
    );
    body.plugin.renderWidth = rect.width;
    body.plugin.renderHeight = rect.height;
    return body;
  }

  createStoneBody(rect) {
    const radius = Math.min(rect.width, rect.height) * 0.42;
    const body = this.Bodies.circle(
      rect.left + rect.width / 2,
      rect.top + rect.height / 2,
      radius,
      {
        friction: 0.65,
        frictionAir: 0.018,
        restitution: 0.22,
        density: 0.0045,
      },
    );
    body.plugin.renderWidth = radius * 2.25;
    body.plugin.renderHeight = radius * 2.25;
    body.plugin.isHeld = false;
    body.plugin.hasTriggeredProjectile = false;
    return body;
  }

  addStoneBodyToWorld() {
    const stoneBody = this.dynamicBodies.stone;

    if (!stoneBody || this.stoneBodyInWorld) {
      return;
    }

    this.addBodies([stoneBody]);
    this.stoneBodyInWorld = true;
  }

  removeStoneBodyFromWorld() {
    const stoneBody = this.dynamicBodies.stone;

    if (!stoneBody || !this.stoneBodyInWorld) {
      return;
    }

    this.removeBodies([stoneBody]);
    this.stoneBodyInWorld = false;
  }

  step(dt) {
    if (!this.enabled || !this.initialized) {
      return;
    }

    this.elapsed += dt;

    this.fluidZones.forEach((zone) => {
      const groupedBodies = new Map();

      zone.bodies.forEach((body) => {
        const key = body.plugin.elementType ?? zone.key;
        const entry = groupedBodies.get(key) ?? [];
        entry.push(body);
        groupedBodies.set(key, entry);
      });

      groupedBodies.forEach((bodies, key) => {
        const config = this.fluidConfigs[key] ?? zone.config;
        this.applyFluidForces(bodies, config);
        this.applyInternalPressure({
          ...zone,
          bodies,
          config,
        });
      });
    });

    this.Engine.update(this.engine, dt * 1000);
    this.processElementInteractions();
    this.updateSolidifiedBlockPhysics(dt);
    this.clampFluidVelocities();
    this.removeOffscreenFluidBodies();
    this.detectProjectileTriggerHits();
    this.detectSolidifiedBlockHits();
    this.updateStoneState();
  }

  processElementInteractions() {
    this.resolveRuntimeIceInteractions();
    this.resolveIceSurfaceInteractions();
    this.resolveRemovalPair("fire", "water");
    this.resolveConversionPair("lava", "fire", {
      keep: "lava",
      convertTo: "super-lava",
      remove: "fire",
    });
    this.resolveConversionPair("ice-water", "lava", {
      keep: "ice-water",
      convertTo: "water",
      remove: "lava",
      reactionLockMs: this.reactionLockDurationMs,
      ignoreReactionLock: true,
    });
    this.resolveConversionPair("super-lava", "water", {
      keep: "super-lava",
      convertTo: "lava",
      remove: "water",
    });
    this.resolveSolidificationPair("ice-water", "super-lava");
    this.resolveSolidificationPair("water", "lava", {
      ignoreReactionLock: true,
    });
    this.resolveWaterPercolationThroughSolidified();
  }

  resolveRuntimeIceInteractions() {
    const runtimeIceBlocks = this.solidifiedRects.filter(
      (solid) => solid.elementType === "ice",
    );

    if (runtimeIceBlocks.length === 0) {
      return false;
    }

    for (const iceBlock of runtimeIceBlocks) {
      const touchingLavaBodies = this.getBodiesTouchingRect(
        this.dynamicBodies.lava,
        iceBlock,
      );

      if (touchingLavaBodies.length > 0) {
        const removedIceBlock = this.takeSolidifiedBlockById(iceBlock.id);

        if (!removedIceBlock) {
          continue;
        }

        this.solidifyBodies(touchingLavaBodies, {
          maxBlocks: Math.max(
            this.solidifyConfig.maxBlocksPerStep * 4,
            touchingLavaBodies.length,
          ),
          fallbackRect: removedIceBlock,
        });
        this.spawnFluidBodiesFromRect("water", removedIceBlock, {
          densityScale: 1.7,
          reactionLockMs: this.reactionLockDurationMs,
          spawnProfile: {
            minParticleRadius: 0.9,
            maxParticleRadius: 7,
            colCountSpacingMultiplier: 0.78,
            rowCountSpacingMultiplier: 0.8,
            colStepMultiplier: 0.82,
            rowStepMultiplier: 0.84,
            rowOffsetMultiplier: 0.08,
            spawnInsetMultiplier: 0.12,
            maxCols: 96,
            maxRows: 56,
          },
        });
        this.rebuildDynamicBodyCache();
        return true;
      }

      const touchingWaterBodies = this.getBodiesTouchingRect(
        this.dynamicBodies.water,
        iceBlock,
      );

      if (touchingWaterBodies.length > 0) {
        this.removeBodiesFromZones(touchingWaterBodies);
        this.replaceIceBlockWithFluid(iceBlock, "ice-water", {
          densityScale: 1.7,
          reactionLockMs: this.reactionLockDurationMs,
          spawnProfile: {
            minParticleRadius: 1.05,
            maxParticleRadius: 7.5,
            colCountSpacingMultiplier: 0.92,
            rowCountSpacingMultiplier: 0.94,
            colStepMultiplier: 0.95,
            rowStepMultiplier: 0.97,
            rowOffsetMultiplier: 0.14,
            spawnInsetMultiplier: 0.18,
            maxCols: 72,
            maxRows: 40,
          },
        });
        this.rebuildDynamicBodyCache();
        return true;
      }
    }

    return false;
  }

  resolveIceSurfaceInteractions() {
    if (this.staticIceRects.length === 0) {
      return;
    }

    this.dynamicBodies.water.forEach((body) => {
      if (this.isBodyTouchingRect(body, this.staticIceRects)) {
        this.convertBodyType(body, "ice-water");
      }
    });

    this.dynamicBodies.fire.forEach((body) => {
      if (this.isBodyTouchingRect(body, this.staticIceRects)) {
        this.convertBodyType(body, "water");
      }
    });

    this.dynamicBodies["super-lava"].forEach((body) => {
      if (this.isBodyTouchingRect(body, this.staticIceRects)) {
        this.convertBodyType(body, "lava");
      }
    });

    this.rebuildDynamicBodyCache();
  }

  resolveRemovalPair(typeA, typeB) {
    const pair = this.findFirstContactPair(typeA, typeB);

    if (!pair) {
      return false;
    }

    this.removeBodyFromZones(pair.bodyA);
    this.removeBodyFromZones(pair.bodyB);
    this.rebuildDynamicBodyCache();
    return true;
  }

  resolveConversionPair(
    typeA,
    typeB,
    { keep, convertTo, remove, reactionLockMs = 0, ignoreReactionLock = false },
  ) {
    const pair = this.findFirstContactPair(typeA, typeB, {
      ignoreReactionLock,
    });

    if (!pair) {
      return false;
    }

    const keepBody = keep === typeA ? pair.bodyA : pair.bodyB;
    const removeBody = remove === typeA ? pair.bodyA : pair.bodyB;

    this.convertBodyType(keepBody, convertTo, { reactionLockMs });
    this.removeBodyFromZones(removeBody);
    this.rebuildDynamicBodyCache();
    return true;
  }

  resolveSolidificationPair(typeA, typeB, { ignoreReactionLock = false } = {}) {
    let createdBlocks = 0;

    while (createdBlocks < this.solidifyConfig.maxBlocksPerStep) {
      const contactPairs = this.findContactPairs(typeA, typeB, {
        ignoreReactionLock,
        maxPairs: this.solidifyConfig.maxBlocksPerStep * 3,
      });

      if (contactPairs.length === 0) {
        return createdBlocks > 0;
      }

      let createdThisPass = false;

      for (const pair of contactPairs) {
        const candidateRects = this.createSolidRectCandidatesFromBodies(
          pair.bodyA,
          pair.bodyB,
        );

        for (const candidateRect of candidateRects) {
          if (!this.addSolidifiedBlock(candidateRect)) {
            continue;
          }

          createdBlocks += 1;
          createdThisPass = true;
          this.rebuildDynamicBodyCache();
          break;
        }

        if (createdBlocks >= this.solidifyConfig.maxBlocksPerStep) {
          break;
        }
      }

      if (!createdThisPass) {
        break;
      }
    }

    return createdBlocks > 0;
  }

  createSolidRectCandidatesFromBodies(bodyA, bodyB) {
    const cellSize = this.getSolidifyCellSize();
    const centerX = (bodyA.position.x + bodyB.position.x) / 2;
    const centerY = (bodyA.position.y + bodyB.position.y) / 2;
    const candidatePoints = [
      { x: centerX, y: centerY },
      { x: bodyA.position.x, y: bodyA.position.y },
      { x: bodyB.position.x, y: bodyB.position.y },
      { x: centerX - cellSize, y: centerY },
      { x: centerX + cellSize, y: centerY },
      { x: centerX, y: centerY - cellSize },
      { x: centerX, y: centerY + cellSize },
    ];
    const seenCellKeys = new Set();
    const candidateRects = [];

    candidatePoints.forEach((point) => {
      const rect = this.createSolidRectForPoint(point.x, point.y);
      const cellKey = this.getSolidifiedCellKey(rect);

      if (seenCellKeys.has(cellKey)) {
        return;
      }

      seenCellKeys.add(cellKey);
      candidateRects.push(rect);
    });

    return candidateRects;
  }

  createSolidRectForPoint(x, y) {
    const solidRect = this.getSolidifiedRectForPoint(x, y);
    solidRect.id = `solidified-fluid-${this.solidifiedIdCounter}`;
    this.solidifiedIdCounter += 1;
    solidRect.isAnchored = false;
    solidRect.velocityY = 0;
    return solidRect;
  }

  findFirstContactPair(typeA, typeB, { ignoreReactionLock = false } = {}) {
    const [firstPair] = this.findContactPairs(typeA, typeB, {
      ignoreReactionLock,
      maxPairs: 1,
    });

    return firstPair ?? null;
  }

  findContactPairs(
    typeA,
    typeB,
    { ignoreReactionLock = false, maxPairs = Number.POSITIVE_INFINITY } = {},
  ) {
    const bodiesA = [...(this.dynamicBodies[typeA] ?? [])];
    const bodiesB = [...(this.dynamicBodies[typeB] ?? [])];
    const contactPairs = [];

    for (const bodyA of bodiesA) {
      if (!ignoreReactionLock && this.isBodyReactionLocked(bodyA)) {
        continue;
      }

      for (const bodyB of bodiesB) {
        if (!ignoreReactionLock && this.isBodyReactionLocked(bodyB)) {
          continue;
        }

        if (this.areBodiesTouching(bodyA, bodyB)) {
          contactPairs.push({ bodyA, bodyB });

          if (contactPairs.length >= maxPairs) {
            return contactPairs;
          }
        }
      }
    }

    return contactPairs;
  }

  areBodiesTouching(bodyA, bodyB) {
    const dx = bodyB.position.x - bodyA.position.x;
    const dy = bodyB.position.y - bodyA.position.y;
    const contactDistance =
      (bodyA.circleRadius + bodyB.circleRadius) *
      this.solidifyConfig.contactRatio;

    if (dx * dx + dy * dy > contactDistance * contactDistance) {
      return false;
    }

    return !this.isReactionPathBlocked(bodyA, bodyB);
  }

  isReactionPathBlocked(bodyA, bodyB) {
    const start = bodyA.position;
    const end = bodyB.position;
    const padding = Math.max(
      1.5,
      Math.min(bodyA.circleRadius, bodyB.circleRadius) * 0.3,
    );

    return this.staticSolidRects.some((solid) =>
      doesSegmentIntersectRect(start, end, solid, padding),
    );
  }

  isBodyTouchingRect(body, rects) {
    const radius = body.circleRadius;

    return rects.some(
      (rect) =>
        !(
          body.position.x + radius < rect.left ||
          body.position.x - radius > rect.right ||
          body.position.y + radius < rect.top ||
          body.position.y - radius > rect.bottom
        ),
    );
  }

  getBodiesTouchingRect(bodies = [], rect) {
    return bodies.filter(
      (body) =>
        !this.isBodyReactionLocked(body) &&
        this.isBodyTouchingRect(body, [rect]),
    );
  }

  resolveWaterPercolationThroughSolidified() {
    if (this.dynamicBodies.water.length === 0 || this.solidifiedRects.length === 0) {
      return false;
    }

    const lavaSolidifiedBlocks = this.solidifiedRects.filter(
      (solid) => solid.elementType !== "ice",
    );

    if (lavaSolidifiedBlocks.length === 0) {
      return false;
    }

    let hasMoved = false;

    this.dynamicBodies.water.forEach((body) => {
      const radius = body.circleRadius;
      const targetBlock = lavaSolidifiedBlocks.find((block) => {
        const horizontalOverlap =
          body.position.x + radius > block.left &&
          body.position.x - radius < block.right;
        const isAboveBlock =
          body.position.y >= block.top - radius * 2.4 &&
          body.position.y <= block.top + radius * 0.8;

        return horizontalOverlap && isAboveBlock;
      });

      if (!targetBlock) {
        return;
      }

      const nextX = clamp(
        body.position.x,
        targetBlock.left + radius,
        targetBlock.right - radius,
      );
      const nextY = targetBlock.bottom + radius + Math.max(2, radius * 0.45);

      if (this.isCircleBlockedByStaticSolid(nextX, nextY, radius, targetBlock)) {
        return;
      }

      this.Body.setPosition(body, { x: nextX, y: nextY });
      this.Body.setVelocity(body, {
        x: body.velocity.x * 0.35,
        y: Math.max(body.velocity.y, 1.8),
      });
      this.setBodyReactionLock(body, this.reactionLockDurationMs);
      hasMoved = true;
    });

    return hasMoved;
  }

  isCircleBlockedByStaticSolid(x, y, radius, ignoredRect = null) {
    return this.staticSolidRects.some((solid) => {
      if (solid === ignoredRect) {
        return false;
      }

      return !(
        x + radius <= solid.left ||
        x - radius >= solid.right ||
        y + radius <= solid.top ||
        y - radius >= solid.bottom
      );
    });
  }

  convertBodyType(body, nextType, { reactionLockMs = 0 } = {}) {
    const config = this.fluidConfigs[nextType];

    if (!config || !body) {
      return false;
    }

    body.plugin.renderKind = nextType;
    body.plugin.elementType = nextType;
    body.plugin.fluidConfig = config;

    if (reactionLockMs > 0) {
      this.setBodyReactionLock(body, reactionLockMs);
    } else {
      delete body.plugin.reactionLockUntil;
    }

    return true;
  }

  removeBodyFromZones(bodyToRemove) {
    this.fluidZones.forEach((zone) => {
      zone.bodies = zone.bodies.filter((body) => body !== bodyToRemove);
    });

    this.removeBodies([bodyToRemove]);
  }

  removeBodiesFromZones(bodiesToRemove = []) {
    const bodySet = new Set(bodiesToRemove.filter(Boolean));

    if (bodySet.size === 0) {
      return false;
    }

    this.fluidZones.forEach((zone) => {
      zone.bodies = zone.bodies.filter((body) => !bodySet.has(body));
    });

    this.removeBodies([...bodySet]);
    return true;
  }

  solidifyBodies(
    bodies = [],
    {
      maxBlocks = this.solidifyConfig.maxBlocksPerStep,
      fallbackRect = null,
    } = {},
  ) {
    const positions = bodies.map((body) => ({
      x: body.position.x,
      y: body.position.y,
    }));
    let createdBlocks = 0;

    for (const position of positions) {
      if (createdBlocks >= maxBlocks) {
        break;
      }

      if (
        this.addSolidifiedBlock(
          this.createSolidRectForPoint(position.x, position.y),
        )
      ) {
        createdBlocks += 1;
      }
    }

    if (createdBlocks === 0 && fallbackRect) {
      const fallbackPoints = [
        {
          x: fallbackRect.left + fallbackRect.width / 2,
          y: fallbackRect.top + fallbackRect.height / 2,
        },
        {
          x: fallbackRect.left + fallbackRect.width * 0.3,
          y: fallbackRect.top + fallbackRect.height * 0.35,
        },
        {
          x: fallbackRect.left + fallbackRect.width * 0.7,
          y: fallbackRect.top + fallbackRect.height * 0.35,
        },
        {
          x: fallbackRect.left + fallbackRect.width * 0.5,
          y: fallbackRect.top + fallbackRect.height * 0.7,
        },
      ];

      for (const point of fallbackPoints) {
        if (
          this.addSolidifiedBlock(
            this.createSolidRectForPoint(point.x, point.y),
          )
        ) {
          createdBlocks += 1;
          break;
        }
      }
    }

    return createdBlocks;
  }

  replaceIceBlockWithFluid(block, nextType, options = {}) {
    const removedBlock = this.takeSolidifiedBlockById(block.id);

    if (!removedBlock) {
      return false;
    }

    return this.spawnFluidBodiesFromRect(nextType, removedBlock, options);
  }

  spawnFluidBodiesFromRect(
    type,
    rect,
    { reactionLockMs = 0, densityScale = 1, spawnProfile = null } = {},
  ) {
    const zone = this.getInjectionZoneForType(type, rect);
    const config = this.fluidConfigs[type];

    if (!zone || !config) {
      return false;
    }

    const bodies = this.createFluidBodies(rect, config, {
      densityScale,
      spawnProfile,
    });
    if (reactionLockMs > 0) {
      bodies.forEach((body) => {
        this.setBodyReactionLock(body, reactionLockMs);
      });
    }
    zone.bodies.push(...bodies);
    this.addBodies(bodies);
    return true;
  }

  getInjectionZoneForType(type, rect) {
    if (this.fluidZones.length === 0) {
      return null;
    }

    const preferredZoneKey =
      type === "ice-water" ? "water" : type === "super-lava" ? "lava" : type;
    const candidateZones = this.fluidZones.filter(
      (zone) => zone.key === preferredZoneKey,
    );
    const zones = candidateZones.length > 0 ? candidateZones : this.fluidZones;

    if (zones.length === 1) {
      return zones[0];
    }

    const rectCenterX = rect.left + rect.width / 2;
    const rectCenterY = rect.top + rect.height / 2;
    let bestZone = zones[0];
    let bestDistance = Number.POSITIVE_INFINITY;

    zones.forEach((zone) => {
      const zoneCenterX = zone.originRect.left + zone.originRect.width / 2;
      const zoneCenterY = zone.originRect.top + zone.originRect.height / 2;
      const dx = zoneCenterX - rectCenterX;
      const dy = zoneCenterY - rectCenterY;
      const distance = dx * dx + dy * dy;

      if (distance < bestDistance) {
        bestDistance = distance;
        bestZone = zone;
      }
    });

    return bestZone;
  }

  isBodyReactionLocked(body) {
    const lockUntil = body?.plugin?.reactionLockUntil;
    return typeof lockUntil === "number" && lockUntil > this.elapsed;
  }

  setBodyReactionLock(body, durationMs) {
    if (!body) {
      return;
    }

    body.plugin.reactionLockUntil = this.elapsed + durationMs / 1000;
  }

  getSolidifiedRects() {
    return this.solidifiedRects.map((solid) => ({
      id: solid.id,
      left: solid.left,
      top: solid.top,
      width: solid.width,
      height: solid.height,
      effect: solid.effect || null,
      elementType: solid.elementType || null,
      isAnchored: solid.isAnchored === true,
      velocityY: solid.velocityY ?? 0,
    }));
  }

  getHazards() {
    return FLUID_KEYS.filter((type) => HAZARD_TYPES.has(type)).flatMap((type) =>
      (this.dynamicBodies[type] ?? []).map((body, index) => {
        const radius = body.circleRadius;

        return {
          id: `${type}-${index}`,
          left: body.position.x - radius,
          top: body.position.y - radius,
          width: radius * 2,
          height: radius * 2,
          type,
        };
      }),
    );
  }

  getFluidRenderGroups() {
    const renderGroups = [];

    this.fluidZones.forEach((zone) => {
      const groupedBodies = new Map();

      zone.bodies.forEach((body) => {
        const type = body.plugin.elementType ?? zone.key;
        const group = groupedBodies.get(type) ?? [];
        group.push({
          x: body.position.x,
          y: body.position.y,
          radius: body.circleRadius,
        });
        groupedBodies.set(type, group);
      });

      groupedBodies.forEach((particles, type) => {
        renderGroups.push({
          rendererId: `${zone.id}:${type}`,
          zoneId: zone.id,
          type,
          particles,
          clipRect: {
            left: zone.containmentRect.left,
            top: zone.containmentRect.top,
            width: zone.containmentRect.width,
            height: zone.containmentRect.height,
          },
        });
      });
    });

    return renderGroups;
  }

  getTreasureBounds() {
    const treasureBody = this.dynamicBodies.treasure;

    if (!treasureBody) {
      return null;
    }

    const width = treasureBody.plugin.renderWidth;
    const height = treasureBody.plugin.renderHeight;

    return {
      left: treasureBody.position.x - width / 2,
      top: treasureBody.position.y - height / 2,
      right: treasureBody.position.x + width / 2,
      bottom: treasureBody.position.y + height / 2,
      width,
      height,
    };
  }

  getStoneBounds() {
    const stoneBody = this.dynamicBodies.stone;

    if (!stoneBody || !this.stoneBodyInWorld) {
      return null;
    }

    const radius = stoneBody.circleRadius;

    return {
      left: stoneBody.position.x - radius,
      top: stoneBody.position.y - radius,
      right: stoneBody.position.x + radius,
      bottom: stoneBody.position.y + radius,
      width: radius * 2,
      height: radius * 2,
    };
  }

  getStoneState() {
    return this.stoneState;
  }

  getHeldStonePosition() {
    return this.stoneHeldPosition ? { ...this.stoneHeldPosition } : null;
  }

  canPickupStone(characterBounds, padding = 0) {
    const stoneBody = this.dynamicBodies.stone;

    if (
      !stoneBody ||
      !this.stoneBodyInWorld ||
      this.stoneState !== "grounded" ||
      stoneBody.plugin.isHeld
    ) {
      return false;
    }

    const speed = Math.sqrt(
      stoneBody.velocity.x ** 2 + stoneBody.velocity.y ** 2,
    );

    if (speed > 2.8) {
      return false;
    }

    const stoneBounds = this.getStoneBounds();

    if (!stoneBounds) {
      return false;
    }

    return !(
      stoneBounds.right < characterBounds.left - padding ||
      stoneBounds.left > characterBounds.right + padding ||
      stoneBounds.bottom < characterBounds.top - padding ||
      stoneBounds.top > characterBounds.bottom + padding
    );
  }

  pickupStone(position) {
    const stoneBody = this.dynamicBodies.stone;

    if (!stoneBody) {
      return false;
    }

    this.clearStoneProjectileState();
    this.removeStoneBodyFromWorld();
    this.Body.setVelocity(stoneBody, { x: 0, y: 0 });
    this.Body.setAngularVelocity(stoneBody, 0);
    this.Body.setAngle(stoneBody, 0);
    this.Body.setPosition(stoneBody, position);
    stoneBody.plugin.isHeld = true;
    stoneBody.plugin.hasTriggeredProjectile = false;
    this.stoneState = "held";
    this.stoneHeldPosition = { ...position };
    this.stoneAirborneFrames = 0;
    this.stoneReleaseOrigin = null;
    return true;
  }

  setHeldStonePosition(position) {
    if (this.stoneState !== "held") {
      return false;
    }

    this.stoneHeldPosition = { ...position };
    return true;
  }

  consumeStone({ keepPendingHits = false } = {}) {
    const stoneBody = this.dynamicBodies.stone;

    if (stoneBody) {
      this.Body.setVelocity(stoneBody, { x: 0, y: 0 });
      this.Body.setAngularVelocity(stoneBody, 0);
      stoneBody.plugin.isHeld = false;
      stoneBody.plugin.hasTriggeredProjectile = false;
    }

    this.removeStoneBodyFromWorld();
    this.stoneState = "missing";
    this.stoneHeldPosition = null;
    this.stoneAirborneFrames = 0;
    this.stoneReleaseOrigin = null;

    if (!keepPendingHits) {
      this.pendingTriggerHits = [];
    }
  }

  throwStone({ position, velocity }) {
    const stoneBody = this.dynamicBodies.stone;

    if (!stoneBody) {
      return false;
    }

    this.addStoneBodyToWorld();
    this.Body.setPosition(stoneBody, position);
    this.Body.setStatic(stoneBody, false);
    this.Body.setVelocity(stoneBody, velocity);
    this.Body.setAngularVelocity(stoneBody, velocity.x * 0.045);
    stoneBody.plugin.isHeld = false;
    stoneBody.plugin.hasTriggeredProjectile = false;
    this.stoneState = "thrown";
    this.stoneHeldPosition = null;
    this.stoneAirborneFrames = 0;
    this.stoneReleaseOrigin = { ...position };
    this.pendingTriggerHits = [];
    return true;
  }

  clearStoneProjectileState() {
    const stoneBody = this.dynamicBodies.stone;

    this.pendingTriggerHits = [];
    this.stoneReleaseOrigin = null;
    this.stoneAirborneFrames = 0;

    if (stoneBody) {
      stoneBody.plugin.hasTriggeredProjectile = false;
    }
  }

  detectProjectileTriggerHits() {
    const stoneBody = this.dynamicBodies.stone;
    const stoneBounds = this.getStoneBounds();

    if (
      !stoneBody ||
      !this.stoneBodyInWorld ||
      this.stoneState !== "thrown" ||
      stoneBody.plugin.isHeld ||
      stoneBody.plugin.hasTriggeredProjectile ||
      this.projectileTriggers.length === 0 ||
      !stoneBounds
    ) {
      return;
    }

    if (this.stoneAirborneFrames < 2) {
      return;
    }

    const speed = Math.sqrt(
      stoneBody.velocity.x ** 2 + stoneBody.velocity.y ** 2,
    );

    if (speed < 2.2) {
      return;
    }

    if (this.stoneReleaseOrigin) {
      const travelDx = stoneBody.position.x - this.stoneReleaseOrigin.x;
      const travelDy = stoneBody.position.y - this.stoneReleaseOrigin.y;
      const travelDistance = Math.sqrt(
        travelDx * travelDx + travelDy * travelDy,
      );

      if (travelDistance < Math.max(stoneBody.circleRadius * 2.2, 18)) {
        return;
      }
    }

    this.projectileTriggers.forEach((trigger) => {
      if (trigger.isUsed) {
        return;
      }

      const liveRect = trigger.element
        ? createRelativeRect(
            trigger.element.getBoundingClientRect(),
            this.container.getBoundingClientRect(),
          )
        : trigger.rect;
      const radius = stoneBody.circleRadius;
      const previousCenterX = stoneBody.position.x - stoneBody.velocity.x;
      const previousCenterY = stoneBody.position.y - stoneBody.velocity.y;
      const sweptBounds = {
        left: Math.min(stoneBounds.left, previousCenterX - radius),
        top: Math.min(stoneBounds.top, previousCenterY - radius),
        right: Math.max(stoneBounds.right, previousCenterX + radius),
        bottom: Math.max(stoneBounds.bottom, previousCenterY + radius),
      };
      const triggerPadding = Math.max(stoneBody.circleRadius * 0.35, 4);
      const overlapsTrigger = !(
        sweptBounds.right < liveRect.left - triggerPadding ||
        sweptBounds.left > liveRect.right + triggerPadding ||
        sweptBounds.bottom < liveRect.top - triggerPadding ||
        sweptBounds.top > liveRect.bottom + triggerPadding
      );

      if (!overlapsTrigger) {
        return;
      }

      trigger.isUsed = true;
      trigger.rect = liveRect;
      stoneBody.plugin.hasTriggeredProjectile = true;
      this.pendingTriggerHits.push(trigger.id);
      this.consumeStone({ keepPendingHits: true });
    });
  }

  detectSolidifiedBlockHits() {
    const stoneBody = this.dynamicBodies.stone;

    if (
      !stoneBody ||
      !this.stoneBodyInWorld ||
      this.stoneState !== "thrown" ||
      this.solidifiedRects.length === 0
    ) {
      return;
    }

    const stoneBounds = this.getStoneBounds();

    if (!stoneBounds) {
      return;
    }

    const hitBlock = this.solidifiedRects.find(
      (block) =>
        !(
          stoneBounds.right < block.left ||
          stoneBounds.left > block.right ||
          stoneBounds.bottom < block.top ||
          stoneBounds.top > block.bottom
        ),
    );

    if (!hitBlock) {
      return;
    }

    this.removeSolidifiedBlockById(hitBlock.id);
  }

  updateStoneState() {
    const stoneBody = this.dynamicBodies.stone;

    if (
      !stoneBody ||
      !this.stoneBodyInWorld ||
      this.stoneState === "missing" ||
      this.stoneState === "held"
    ) {
      return;
    }

    if (this.stoneState !== "thrown") {
      return;
    }

    this.stoneAirborneFrames += 1;

    const speed = Math.sqrt(
      stoneBody.velocity.x ** 2 + stoneBody.velocity.y ** 2,
    );
    const spin = Math.abs(stoneBody.angularVelocity);

    if (this.stoneAirborneFrames < 10) {
      return;
    }

    if (speed > 1.1 || spin > 0.04) {
      return;
    }

    this.consumeStone();
  }

  consumeTriggerHits() {
    if (this.pendingTriggerHits.length === 0) {
      return [];
    }

    const triggerHits = [...new Set(this.pendingTriggerHits)];
    this.pendingTriggerHits = [];
    return triggerHits;
  }

  applyFluidForces(bodies, config) {
    if (bodies.length === 0) {
      return;
    }

    const centerX =
      bodies.reduce((sum, body) => sum + body.position.x, 0) / bodies.length;

    bodies.forEach((body, index) => {
      const spreadDir =
        Math.sign(body.position.x - centerX) || (index % 2 === 0 ? -1 : 1);
      const spread = spreadDir * config.spreadForce * body.mass;
      const oscillation =
        Math.sin(this.elapsed * 1.5 + index * 0.37) *
        config.spreadForce *
        0.3 *
        body.mass;
      const downwardForce = config.downwardBias * body.mass;

      this.Body.applyForce(body, body.position, {
        x: spread + oscillation,
        y: downwardForce,
      });
    });
  }

  applyInternalPressure(zone) {
    const bodies = zone.bodies;
    const count = bodies.length;

    if (count === 0) {
      return;
    }

    const containment = zone.containmentRect;
    const config = zone.config;
    const averageRadius = bodies[0].circleRadius;
    const targetSpacing = averageRadius * config.targetSpacingScale;
    const targetDistanceSquared = targetSpacing * targetSpacing;

    for (let index = 0; index < count; index += 1) {
      for (
        let compareIndex = index + 1;
        compareIndex < count;
        compareIndex += 1
      ) {
        const dx = bodies[compareIndex].position.x - bodies[index].position.x;
        const dy = bodies[compareIndex].position.y - bodies[index].position.y;
        const distanceSquared = dx * dx + dy * dy;

        if (
          distanceSquared >= targetDistanceSquared ||
          distanceSquared <= 0.01
        ) {
          continue;
        }

        const distance = Math.sqrt(distanceSquared);
        const overlap = 1.0 - distance / targetSpacing;
        let boundaryDamping = 1.0;

        if (containment) {
          const edgeMargin = averageRadius * 3;

          for (const body of [bodies[index], bodies[compareIndex]]) {
            const distanceFromLeft = body.position.x - containment.left;
            const distanceFromRight = containment.right - body.position.x;
            const distanceFromTop = body.position.y - containment.top;
            const distanceFromBottom = containment.bottom - body.position.y;
            const minimumEdgeDistance = Math.min(
              distanceFromLeft,
              distanceFromRight,
              distanceFromTop,
              distanceFromBottom,
            );

            if (minimumEdgeDistance < edgeMargin) {
              const factor = clamp(minimumEdgeDistance / edgeMargin, 0.05, 1.0);
              boundaryDamping = Math.min(boundaryDamping, factor);
            }
          }
        }

        const forceMagnitude =
          overlap *
          config.pressureStrength *
          bodies[index].mass *
          boundaryDamping;
        const nx = dx / distance;
        const ny = dy / distance;

        this.Body.applyForce(bodies[index], bodies[index].position, {
          x: -nx * forceMagnitude,
          y: -ny * forceMagnitude,
        });
        this.Body.applyForce(
          bodies[compareIndex],
          bodies[compareIndex].position,
          {
            x: nx * forceMagnitude,
            y: ny * forceMagnitude,
          },
        );
      }
    }
  }

  clampFluidVelocities() {
    this.fluidZones.forEach((zone) => {
      const containment = zone.containmentRect;

      zone.bodies.forEach((body) => {
        const config = body.plugin.fluidConfig ?? zone.config;

        if (body.velocity.y < -4) {
          this.Body.setVelocity(body, {
            x: body.velocity.x,
            y: body.velocity.y * 0.5,
          });
        }

        const speed = Math.sqrt(body.velocity.x ** 2 + body.velocity.y ** 2);
        if (speed > config.maxSpeed) {
          const scale = config.maxSpeed / speed;
          this.Body.setVelocity(body, {
            x: body.velocity.x * scale,
            y: body.velocity.y * scale,
          });
        }

        const radius = body.circleRadius;
        if (containment) {
          const x = clamp(
            body.position.x,
            containment.left + radius,
            containment.right - radius,
          );
          const y = clamp(
            body.position.y,
            containment.top + radius,
            containment.bottom - radius,
          );
          const hitX = x !== body.position.x;
          const hitY = y !== body.position.y;

          if (hitX || hitY) {
            this.Body.setPosition(body, { x, y });
            let vx = body.velocity.x;
            let vy = body.velocity.y;

            if (hitX) {
              vx *= 0.08;
            }
            if (hitY) {
              vy *= 0.08;
            }

            this.Body.setVelocity(body, { x: vx, y: vy });
          }
        }
      });
    });
  }

  removeOffscreenFluidBodies() {
    const removalLine = this.container.clientHeight + 120;
    let cacheDirty = false;

    this.fluidZones.forEach((zone) => {
      const remainingBodies = [];

      zone.bodies.forEach((body) => {
        if (body.position.y - body.circleRadius > removalLine) {
          this.removeBodies([body]);
          cacheDirty = true;
          return;
        }

        remainingBodies.push(body);
      });

      zone.bodies = remainingBodies;
    });

    if (cacheDirty) {
      this.rebuildDynamicBodyCache();
    }
  }

  addBodies(bodies) {
    const validBodies = bodies.filter(Boolean);
    if (validBodies.length === 0) {
      return;
    }

    this.World.add(this.world, validBodies);
  }

  removeBodies(bodies) {
    const validBodies = bodies.filter(Boolean);

    if (!this.enabled || validBodies.length === 0) {
      return;
    }

    validBodies.forEach((body) => {
      this.World.remove(this.world, body);
    });
  }

  destroy() {
    if (!this.enabled) {
      return;
    }

    this.removeBodies([
      ...this.staticBodies,
      ...this.getAllFluidBodies(),
      ...(this.dynamicBodies.treasure ? [this.dynamicBodies.treasure] : []),
      ...(this.dynamicBodies.stone ? [this.dynamicBodies.stone] : []),
    ]);
    this.staticBodies = [];
    this.fluidZones = [];
    this.dynamicBodies = createFluidGroups();
    this.stoneState = "missing";
    this.stoneSpawnRect = null;
    this.stoneHeldPosition = null;
    this.stoneBodyInWorld = false;
    this.stoneAirborneFrames = 0;
    this.stoneReleaseOrigin = null;
    this.projectileTriggers = [];
    this.pendingTriggerHits = [];
    this.solidifiedRects = [];
    this.solidifiedCellKeys.clear();
    this.staticIceRects = [];
    this.initialized = false;
    this.Engine.clear(this.engine);
  }
}
