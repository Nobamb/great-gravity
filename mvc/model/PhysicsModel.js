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
    this.renderObstacles = [];
    this.elapsed = 0;

    this.fluidConfigs = {
      water: {
        key: "water",
        radiusScale: 0.105,
        maxCols: 12,
        maxRows: 7,
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
        radiusScale: 0.125,
        maxCols: 8,
        maxRows: 6,
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
    this.engine = Engine.create({
      gravity: { x: 0, y: 1.0, scale: 0.001 },
    });
    this.world = this.engine.world;
  }

  initialize(stageModel) {
    if (!this.enabled) return;
    this.rebuildDynamicBodies();
    this.rebuildStaticBodies(stageModel);
    this.initialized = true;
  }

  syncStage(stageModel, { resetDynamics = false } = {}) {
    if (!this.enabled) return;
    if (resetDynamics || !this.initialized) {
      this.rebuildDynamicBodies();
    }
    this.rebuildStaticBodies(stageModel);
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

    const boundaryThickness = Math.max(48, stageModel.bounds.width * 0.05);
    const floor = this.Bodies.rectangle(
      stageModel.bounds.width / 2,
      stageModel.bounds.height + boundaryThickness / 2,
      stageModel.bounds.width + boundaryThickness * 2,
      boundaryThickness,
      { isStatic: true },
    );
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

    this.renderObstacles = stageModel.solids.map((solid) => ({
      x: solid.left,
      y: solid.top,
      width: solid.width,
      height: solid.height,
    }));

    this.staticBodies = [
      floor,
      leftWall,
      rightWall,
      ...stageModel.solids.map((solid) =>
        this.Bodies.rectangle(
          solid.left + solid.width / 2,
          solid.top + solid.height / 2,
          Math.max(2, solid.width),
          Math.max(2, solid.height),
          {
            isStatic: true,
            friction: solid.effect === "jump-boost" ? 0.02 : 0.4,
          },
        ),
      ),
    ];

    this.addBodies(this.staticBodies);
  }

  createFluidBodies(rect, config) {
    const particleRadius = clamp(
      Math.min(rect.width, rect.height) * config.radiusScale,
      5,
      14,
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
          slop: 0.02,
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
    this._clampFluidVelocities();
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
   * 이를 통해 유체가 공간을 채우고 한곳에 뭉치지 않습니다.
   */
  _applyInternalPressure(bodies, config) {
    const count = bodies.length;
    if (count === 0) return;

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
          const forceMag = overlap * config.pressureStrength * bodies[i].mass;
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

    const containerW = this.container.clientWidth;
    const containerH = this.container.clientHeight;

    for (const { bodies, config } of allFluids) {
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

        // 게임 컨테이너 밖으로 나가지 않도록
        const r = body.circleRadius;
        const bx = clamp(body.position.x, r, containerW - r);
        const by = clamp(body.position.y, r, containerH - r);
        if (bx !== body.position.x || by !== body.position.y) {
          this.Body.setPosition(body, { x: bx, y: by });
        }
      });
    }
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
