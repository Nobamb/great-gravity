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

export class PhysicsModel {
  constructor({ container, lavaElement, waterElement, treasureElement }) {
    this.container = container;
    this.lavaElement = lavaElement;
    this.waterElement = waterElement;
    this.treasureElement = treasureElement;
    this.enabled = typeof window !== "undefined" && Boolean(window.Matter);
    this.initialized = false;

    this.staticBodies = [];
    this.dynamicBodies = {
      lava: [],
      water: [],
      treasure: null,
    };
    this.fluidOrigins = {
      lava: null,
      water: null,
    };
    // 유체가 갇혀 있어야 할 영역 (블록들이 없어지기 전 기준)
    this.fluidContainment = {
      lava: null,
      water: null,
    };
    this.renderObstacles = [];
    this.elapsed = 0;
    this.renderObstaclePadding = 2;
    this.solidifiedRects = [];
    this.solidifiedCellKeys = new Set();
    this.solidifyConfig = {
      maxBlocksPerStep: 6,
      contactRatio: 1.08,
      removalPaddingRatio: 0.58,
      friction: 0.92,
    };

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
        // 내부 압력 (입자가 서로 밀어내는 힘) - 물은 강한 압력
        pressureStrength: 0.00012,
        targetSpacingScale: 2.8,
      },
      lava: {
        key: "lava",
        radiusScale: 0.082,
        maxCols: 10,
        maxRows: 7,
        density: 0.004,
        friction: 0.4,
        frictionAir: 0.08,
        restitution: 0.0,
        spreadForce: 0.0000012,
        downwardBias: 0.000008,
        maxSpeed: 3,
        // 용암은 약한 압력 (느리게 퍼짐)
        pressureStrength: 0.00003,
        targetSpacingScale: 2.4,
      },
    };

    if (!this.enabled) {
      console.warn(
        "matter.js가 로드되지 않아 환경 물리 시뮬레이션을 비활성화합니다.",
      );
      return;
    }

    const { Bodies, Body, Engine, World } = window.Matter;
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
    this.dynamicBodies = {
      lava: [],
      water: [],
      treasure: null,
    };
    this.fluidOrigins = {
      lava: null,
      water: null,
    };
    this.fluidContainment = {
      lava: null,
      water: null,
    };
    this.renderObstacles = [];
    this.elapsed = 0;
    this.solidifiedRects = [];
    this.solidifiedCellKeys = new Set();
  }

  initialize(stageModel) {
    if (!this.enabled) return;
    this.rebuildDynamicBodies();
    this.rebuildStaticBodies(stageModel);
    this.syncSolidifiedState(stageModel.runtimeSolids);
    this.initialized = true;
  }

  syncStage(stageModel, { resetDynamics = false, hardReset = false } = {}) {
    if (!this.enabled) return;
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
      ...this.dynamicBodies.lava,
      ...this.dynamicBodies.water,
      ...(this.dynamicBodies.treasure ? [this.dynamicBodies.treasure] : []),
    ]);

    const containerRect = this.container.getBoundingClientRect();
    const lavaRect = createRelativeRect(
      this.lavaElement.getBoundingClientRect(),
      containerRect,
    );
    const waterRect = createRelativeRect(
      this.waterElement.getBoundingClientRect(),
      containerRect,
    );
    const treasureRect = createRelativeRect(
      this.treasureElement.getBoundingClientRect(),
      containerRect,
    );

    this.fluidOrigins.lava = lavaRect;
    this.fluidOrigins.water = waterRect;
    // 유체의 초기 CSS 영역을 기본 containment 영역으로 설정
    this.fluidContainment.lava = { ...lavaRect };
    this.fluidContainment.water = { ...waterRect };
    this.dynamicBodies.lava = this.createFluidBodies(
      lavaRect,
      this.fluidConfigs.lava,
    );
    this.dynamicBodies.water = this.createFluidBodies(
      waterRect,
      this.fluidConfigs.water,
    );
    this.dynamicBodies.treasure = this.createTreasureBody(treasureRect);

    this.addBodies([
      ...this.dynamicBodies.lava,
      ...this.dynamicBodies.water,
      this.dynamicBodies.treasure,
    ]);

    this.elapsed = 0;
  }

  rebuildStaticBodies(stageModel) {
    this.removeBodies(this.staticBodies);
    const physicsSolids = stageModel.domSolids ?? stageModel.solids;

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
    // 상단 경계벽 추가 — 유체가 위쪽으로 빠져나가지 않도록
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

    // 유체 containment 영역을 현재 배치된 고체 블록들 기준으로 재계산
    this._updateFluidContainment(physicsSolids);

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
      Math.max(rect.width, rect.height) * this.solidifyConfig.removalPaddingRatio;

    ["water", "lava"].forEach((key) => {
      const remainingBodies = [];
      const removedBodies = [];

      this.dynamicBodies[key].forEach((body) => {
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

      this.removeBodies(removedBodies);
      this.dynamicBodies[key] = remainingBodies;
    });
  }

  addSolidifiedBlock(rect) {
    if (this.solidifiedCellKeys.has(rect.id)) {
      this.removeFluidBodiesNearRect(rect);
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

  /**
   * 유체 각각이 갇혀 있어야 할 AABB 영역을 현재 활성화된 고체 블록 기반으로 계산합니다.
   * 유체 원본 영역을 시작으로, 주변의 고체들이 얼마나 경계를 막고 있는지 확인하고,
   * 블록이 사라져서 열린 방향으로만 확장해줍니다.
   */
  _updateFluidContainment(solids) {
    ["lava", "water"].forEach((key) => {
      const origin = this.fluidOrigins[key];
      if (!origin) return;

      // 기본: 유체 영역 자체
      const containment = {
        left: origin.left,
        top: origin.top,
        right: origin.right,
        bottom: origin.bottom,
        width: origin.width,
        height: origin.height,
      };

      // 유체 영역의 4면에 인접한 고체가 있는지 확인
      const margin = 8; // 접촉 판정 여유값
      let hasLeftWall = false;
      let hasRightWall = false;
      let hasTopWall = false;
      let hasBottomWall = false;

      for (const solid of solids) {
        const solidRight = solid.left + solid.width;
        const solidBottom = solid.top + solid.height;

        // 수직으로 겹치는지 (상하 경계 확인용)
        const vertOverlap =
          solid.top < origin.bottom + margin &&
          solidBottom > origin.top - margin;
        // 수평으로 겹치는지 (좌우 경계 확인용)
        const horzOverlap =
          solid.left < origin.right + margin &&
          solidRight > origin.left - margin;

        // 왼쪽 벽: 유체 좌측과 고체 우측이 가까움
        if (vertOverlap && Math.abs(solidRight - origin.left) < margin) {
          hasLeftWall = true;
        }
        // 오른쪽 벽: 유체 우측과 고체 좌측이 가까움
        if (vertOverlap && Math.abs(solid.left - origin.right) < margin) {
          hasRightWall = true;
        }
        // 상단 벽: 유체 상단과 고체 하단이 가까움
        if (horzOverlap && Math.abs(solidBottom - origin.top) < margin) {
          hasTopWall = true;
        }
        // 하단 벽: 유체 하단과 고체 상단이 가까움
        if (horzOverlap && Math.abs(solid.top - origin.bottom) < margin) {
          hasBottomWall = true;
        }
      }

      // 벽이 없는 방향으로는 컨테이너 끝까지 확장 (유체가 흘러나갈 수 있도록)
      const containerW = this.container.clientWidth;
      const containerH = this.container.clientHeight;
      if (!hasLeftWall) containment.left = 0;
      if (!hasRightWall) containment.right = containerW;
      if (!hasTopWall) containment.top = 0;
      if (!hasBottomWall) containment.bottom = containerH + 120;

      containment.width = containment.right - containment.left;
      containment.height = containment.bottom - containment.top;

      this.fluidContainment[key] = containment;
    });
  }

  createFluidBodies(rect, config) {
    const particleRadius = clamp(
      Math.min(rect.width, rect.height) * config.radiusScale,
      3.5,
      12,
    );
    const cols = clamp(
      Math.floor(rect.width / (particleRadius * 1.65)),
      4,
      config.maxCols,
    );
    const rows = clamp(
      Math.floor(rect.height / (particleRadius * 1.35)),
      3,
      config.maxRows,
    );
    const bodies = [];
    const startX = rect.left + particleRadius * 1.2;
    const startY = rect.top + particleRadius * 1.2;

    for (let row = 0; row < rows; row++) {
      for (let col = 0; col < cols; col++) {
        const offsetX = (row % 2) * particleRadius * 0.45;
        const x = startX + col * particleRadius * 1.6 + offsetX;
        const y = startY + row * particleRadius * 1.28;
        const body = this.Bodies.circle(x, y, particleRadius, {
          friction: config.friction,
          frictionAir: config.frictionAir,
          restitution: config.restitution,
          density: config.density,
          slop: 0.001,
        });
        body.plugin.renderKind = config.key;
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

  step(dt) {
    if (!this.enabled || !this.initialized) return;

    this.elapsed += dt;
    this._applyFluidForces(this.dynamicBodies.water, this.fluidConfigs.water);
    this._applyFluidForces(this.dynamicBodies.lava, this.fluidConfigs.lava);
    this._applyInternalPressure(
      this.dynamicBodies.water,
      this.fluidConfigs.water,
    );
    this._applyInternalPressure(
      this.dynamicBodies.lava,
      this.fluidConfigs.lava,
    );
    this.Engine.update(this.engine, dt * 1000);
    this.solidifyFluidContacts();
    this._clampFluidVelocities();
    this._removeOffscreenFluidBodies();
  }

  solidifyFluidContacts() {
    if (
      this.dynamicBodies.water.length === 0 ||
      this.dynamicBodies.lava.length === 0
    ) {
      return;
    }

    let createdBlocks = 0;

    for (const waterBody of this.dynamicBodies.water) {
      for (const lavaBody of this.dynamicBodies.lava) {
        const dx = lavaBody.position.x - waterBody.position.x;
        const dy = lavaBody.position.y - waterBody.position.y;
        const contactDistance =
          (waterBody.circleRadius + lavaBody.circleRadius) *
          this.solidifyConfig.contactRatio;

        if (dx * dx + dy * dy > contactDistance * contactDistance) {
          continue;
        }

        const centerX = (waterBody.position.x + lavaBody.position.x) / 2;
        const centerY = (waterBody.position.y + lavaBody.position.y) / 2;
        const solidRect = this.getSolidifiedRectForPoint(centerX, centerY);

        if (this.addSolidifiedBlock(solidRect)) {
          createdBlocks += 1;
        }

        if (createdBlocks >= this.solidifyConfig.maxBlocksPerStep) {
          return;
        }
      }
    }
  }

  getSolidifiedRects() {
    return this.solidifiedRects.map((solid) => ({
      id: solid.id,
      left: solid.left,
      top: solid.top,
      width: solid.width,
      height: solid.height,
      effect: solid.effect || null,
    }));
  }

  getLavaHazards() {
    return this.dynamicBodies.lava.map((body, index) => {
      const radius = body.circleRadius;

      return {
        id: `lava-${index}`,
        left: body.position.x - radius,
        top: body.position.y - radius,
        width: radius * 2,
        height: radius * 2,
        type: "lava",
      };
    });
  }

  /**
   * 유체에 퍼짐 힘과 아래 방향 바이어스를 적용합니다.
   * - 물: 빠르게 퍼지고 빠르게 흐름
   * - 용암: 느리게 퍼지고 느리게 흐름
   */
  _applyFluidForces(bodies, config) {
    if (bodies.length === 0) return;

    const centerX =
      bodies.reduce((s, b) => s + b.position.x, 0) / bodies.length;

    bodies.forEach((body, i) => {
      const spreadDir =
        Math.sign(body.position.x - centerX) || (i % 2 === 0 ? -1 : 1);
      const spread = spreadDir * config.spreadForce * body.mass;
      const osc =
        Math.sin(this.elapsed * 1.5 + i * 0.37) *
        config.spreadForce *
        0.3 *
        body.mass;
      const down = config.downwardBias * body.mass;

      this.Body.applyForce(body, body.position, {
        x: spread + osc,
        y: down,
      });
    });
  }

  /**
   * 입자 간 내부 압력을 적용합니다 (유체 부피 유지).
   * 입자가 너무 가까이 있으면 서로 밀어냅니다.
   * 경계 근처에서는 압력을 약화시켜 블록 바깥으로 밀리는 것을 방지합니다.
   */
  _applyInternalPressure(bodies, config) {
    const count = bodies.length;
    if (count === 0) return;

    const containment = this.fluidContainment[config.key];
    const avgRadius = bodies[0].circleRadius;
    const targetSpacing = avgRadius * config.targetSpacingScale;
    const targetSq = targetSpacing * targetSpacing;

    for (let i = 0; i < count; i++) {
      for (let j = i + 1; j < count; j++) {
        const dx = bodies[j].position.x - bodies[i].position.x;
        const dy = bodies[j].position.y - bodies[i].position.y;
        const distSq = dx * dx + dy * dy;

        if (distSq < targetSq && distSq > 0.01) {
          const dist = Math.sqrt(distSq);
          const overlap = 1.0 - dist / targetSpacing;

          // 경계 근처에서 압력을 감쇠 — 유체가 블록 밖으로 밀려나가는 것을 방지
          let boundaryDamping = 1.0;
          if (containment) {
            const edgeMargin = avgRadius * 3;
            for (const body of [bodies[i], bodies[j]]) {
              const distFromLeft = body.position.x - containment.left;
              const distFromRight = containment.right - body.position.x;
              const distFromTop = body.position.y - containment.top;
              const distFromBottom = containment.bottom - body.position.y;
              const minEdgeDist = Math.min(
                distFromLeft, distFromRight,
                distFromTop, distFromBottom
              );
              if (minEdgeDist < edgeMargin) {
                const factor = clamp(minEdgeDist / edgeMargin, 0.05, 1.0);
                boundaryDamping = Math.min(boundaryDamping, factor);
              }
            }
          }

          const forceMag = overlap * config.pressureStrength * bodies[i].mass * boundaryDamping;
          const nx = dx / dist;
          const ny = dy / dist;

          this.Body.applyForce(bodies[i], bodies[i].position, {
            x: -nx * forceMag,
            y: -ny * forceMag,
          });
          this.Body.applyForce(bodies[j], bodies[j].position, {
            x: nx * forceMag,
            y: ny * forceMag,
          });
        }
      }
    }
  }

  /**
   * 유체 입자의 속도를 제한합니다.
   * - 용암: 매우 느린 최대 속도 (점성 유체)
   * - 물: 빠른 최대 속도 (저점성 액체)
   * - 극단적인 상향 속도만 부드럽게 감쇠
   */
  _clampFluidVelocities() {
    const allFluids = [
      { bodies: this.dynamicBodies.water, config: this.fluidConfigs.water },
      { bodies: this.dynamicBodies.lava, config: this.fluidConfigs.lava },
    ];

    for (const { bodies, config } of allFluids) {
      const containment = this.fluidContainment[config.key];

      bodies.forEach((body) => {
        // 극단적 상향 속도만 감쇠 (약간의 바운스는 허용)
        if (body.velocity.y < -4) {
          this.Body.setVelocity(body, {
            x: body.velocity.x,
            y: body.velocity.y * 0.5,
          });
        }

        // 전체 속도 제한
        const speed = Math.sqrt(body.velocity.x ** 2 + body.velocity.y ** 2);
        if (speed > config.maxSpeed) {
          const scale = config.maxSpeed / speed;
          this.Body.setVelocity(body, {
            x: body.velocity.x * scale,
            y: body.velocity.y * scale,
          });
        }

        // 유체 containment 영역 안에서만 움직이도록 클램핑
        const r = body.circleRadius;
        if (containment) {
          const bx = clamp(body.position.x, containment.left + r, containment.right - r);
          const by = clamp(body.position.y, containment.top + r, containment.bottom - r);
          const hitX = bx !== body.position.x;
          const hitY = by !== body.position.y;
          if (hitX || hitY) {
            this.Body.setPosition(body, { x: bx, y: by });
            // 경계에 부딪히면 해당 방향 속도를 감쇠
            let vx = body.velocity.x;
            let vy = body.velocity.y;
            if (hitX) vx *= 0.08;
            if (hitY) vy *= 0.08;
            this.Body.setVelocity(body, { x: vx, y: vy });
          }
        }
      });
    }
  }

  _removeOffscreenFluidBodies() {
    const removalLine = this.container.clientHeight + 120;

    ["water", "lava"].forEach((key) => {
      const remainingBodies = [];

      this.dynamicBodies[key].forEach((body) => {
        if (body.position.y - body.circleRadius > removalLine) {
          this.removeBodies([body]);
          return;
        }

        remainingBodies.push(body);
      });

      this.dynamicBodies[key] = remainingBodies;
    });
  }

  addBodies(bodies) {
    const validBodies = bodies.filter(Boolean);
    if (validBodies.length === 0) return;
    this.World.add(this.world, validBodies);
  }

  removeBodies(bodies) {
    const validBodies = bodies.filter(Boolean);
    if (!this.enabled || validBodies.length === 0) return;
    validBodies.forEach((body) => {
      this.World.remove(this.world, body);
    });
  }
}
