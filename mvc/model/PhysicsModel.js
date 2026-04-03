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
        this.elapsed = 0;

        if (!this.enabled) {
            console.warn("matter.js가 로드되지 않아 환경 물리 시뮬레이션을 비활성화합니다.");
            return;
        }

        const { Bodies, Body, Composite, Engine, World } = window.Matter;
        this.Bodies = Bodies;
        this.Body = Body;
        this.Composite = Composite;
        this.Engine = Engine;
        this.World = World;
        this.engine = Engine.create({
            gravity: {
                x: 0,
                y: 1.15,
                scale: 0.001,
            },
        });
        this.world = this.engine.world;
    }

    initialize(stageModel) {
        if (!this.enabled) {
            return;
        }

        this.rebuildDynamicBodies();
        this.rebuildStaticBodies(stageModel);
        this.initialized = true;
    }

    syncStage(stageModel, { resetDynamics = false } = {}) {
        if (!this.enabled) {
            return;
        }

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
        const lavaRect = createRelativeRect(this.lavaElement.getBoundingClientRect(), containerRect);
        const waterRect = createRelativeRect(this.waterElement.getBoundingClientRect(), containerRect);
        const treasureRect = createRelativeRect(this.treasureElement.getBoundingClientRect(), containerRect);

        this.fluidOrigins.lava = lavaRect;
        this.fluidOrigins.water = waterRect;
        this.dynamicBodies.lava = this.createFluidBodies(lavaRect, {
            key: "lava",
            radiusScale: 0.16,
            maxCols: 7,
            maxRows: 5,
            density: 0.0036,
            friction: 0.12,
            frictionAir: 0.075,
            restitution: 0.02,
        });
        this.dynamicBodies.water = this.createFluidBodies(waterRect, {
            key: "water",
            radiusScale: 0.13,
            maxCols: 10,
            maxRows: 6,
            density: 0.0013,
            friction: 0.002,
            frictionAir: 0.01,
            restitution: 0.08,
        });
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

        this.staticBodies = [
            floor,
            leftWall,
            rightWall,
            ...stageModel.solids.map((solid) => {
                return this.Bodies.rectangle(
                    solid.left + solid.width / 2,
                    solid.top + solid.height / 2,
                    Math.max(2, solid.width),
                    Math.max(2, solid.height),
                    {
                        isStatic: true,
                        friction: solid.effect === "jump-boost" ? 0.02 : 0.4,
                    },
                );
            }),
        ];

        this.addBodies(this.staticBodies);
    }

    createFluidBodies(rect, config) {
        const particleRadius = clamp(
            Math.min(rect.width, rect.height) * config.radiusScale,
            7,
            18,
        );
        const cols = clamp(
            Math.floor(rect.width / (particleRadius * 1.75)),
            3,
            config.maxCols,
        );
        const rows = clamp(
            Math.floor(rect.height / (particleRadius * 1.5)),
            2,
            config.maxRows,
        );
        const bodies = [];
        const startX = rect.left + particleRadius * 1.25;
        const startY = rect.top + particleRadius * 1.25;

        for (let row = 0; row < rows; row += 1) {
            for (let col = 0; col < cols; col += 1) {
                const offsetX = (row % 2) * particleRadius * 0.45;
                const x = startX + (col * particleRadius * 1.7) + offsetX;
                const y = startY + (row * particleRadius * 1.38);
                const body = this.Bodies.circle(x, y, particleRadius, {
                    friction: config.friction,
                    frictionAir: config.frictionAir,
                    restitution: config.restitution,
                    density: config.density,
                    slop: 0.04,
                });

                body.plugin.renderKind = config.key;
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
                chamfer: {
                    radius: Math.min(rect.width, rect.height) * 0.12,
                },
            },
        );

        body.plugin.renderWidth = rect.width;
        body.plugin.renderHeight = rect.height;
        return body;
    }

    step(dt) {
        if (!this.enabled || !this.initialized) {
            return;
        }

        this.elapsed += dt;
        this.applyWaterBehavior();
        this.applyLavaBehavior();
        this.Engine.update(this.engine, dt * 1000);
    }

    applyWaterBehavior() {
        this.dynamicBodies.water.forEach((body, index) => {
            const forceX = Math.sin((this.elapsed * 4.2) + (index * 0.55)) * 0.000012 * body.mass;
            const forceY = 0.0000025 * body.mass;

            this.Body.applyForce(body, body.position, {
                x: forceX,
                y: forceY,
            });
        });
    }

    applyLavaBehavior() {
        this.dynamicBodies.lava.forEach((body, index) => {
            const forceX = (0.000004 + (Math.sin((this.elapsed * 1.4) + (index * 0.8)) * 0.000003)) * body.mass;
            const forceY = 0.000005 * body.mass;

            this.Body.applyForce(body, body.position, {
                x: forceX,
                y: forceY,
            });
        });
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
}
