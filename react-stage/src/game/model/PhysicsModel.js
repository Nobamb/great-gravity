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
        this.dynamicBodies = {
            lava: [],
            water: [],
            treasure: null,
            stone: null,
        };
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
                frictionAir: 0.05,
                restitution: 0.0,
                spreadForce: 0.0000012,
                downwardBias: 0.000018,
                maxSpeed: 5,
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
        this.dynamicBodies = {
            lava: [],
            water: [],
            treasure: null,
            stone: null,
        };
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
            ...this.dynamicBodies.lava,
            ...this.dynamicBodies.water,
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

        const treasureSourceElement = this.treasureAnchorElement ?? this.treasureElement;
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

        this.addBodies([
            ...this.dynamicBodies.lava,
            ...this.dynamicBodies.water,
            this.dynamicBodies.treasure,
        ]);

        this.elapsed = 0;
    }

    rebuildDynamicBodyCache() {
        this.dynamicBodies.lava = this.fluidZones
            .filter((zone) => zone.key === "lava")
            .flatMap((zone) => zone.bodies);
        this.dynamicBodies.water = this.fluidZones
            .filter((zone) => zone.key === "water")
            .flatMap((zone) => zone.bodies);
    }

    rebuildStaticBodies(stageModel) {
        this.removeBodies(this.staticBodies);
        const physicsSolids = stageModel.domSolids ?? stageModel.solids;
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
        if (!this.solidifiedCellKeys.has(blockId)) {
            return false;
        }

        this.solidifiedRects = this.solidifiedRects.filter((solid) => solid.id !== blockId);
        this.solidifiedCellKeys.delete(blockId);
        return true;
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

        for (let row = 0; row < rows; row += 1) {
            for (let col = 0; col < cols; col += 1) {
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
            this.applyFluidForces(zone.bodies, zone.config);
            this.applyInternalPressure(zone);
        });

        this.Engine.update(this.engine, dt * 1000);
        this.solidifyFluidContacts();
        this.clampFluidVelocities();
        this.removeOffscreenFluidBodies();
        this.detectProjectileTriggerHits();
        this.detectSolidifiedBlockHits();
        this.updateStoneState();
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
        return this.stoneHeldPosition
            ? { ...this.stoneHeldPosition }
            : null;
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

        if (
            !stoneBody ||
            !this.stoneBodyInWorld ||
            this.stoneState !== "thrown" ||
            stoneBody.plugin.isHeld ||
            stoneBody.plugin.hasTriggeredProjectile ||
            this.projectileTriggers.length === 0
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
            const travelDistance = Math.sqrt(travelDx * travelDx + travelDy * travelDy);

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
            const centerInside =
                stoneBody.position.x >= liveRect.left &&
                stoneBody.position.x <= liveRect.right &&
                stoneBody.position.y >= liveRect.top &&
                stoneBody.position.y <= liveRect.bottom;

            if (!centerInside) {
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

        const hitBlock = this.solidifiedRects.find((block) => !(
            stoneBounds.right < block.left ||
            stoneBounds.left > block.right ||
            stoneBounds.bottom < block.top ||
            stoneBounds.top > block.bottom
        ));

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
            for (let compareIndex = index + 1; compareIndex < count; compareIndex += 1) {
                const dx = bodies[compareIndex].position.x - bodies[index].position.x;
                const dy = bodies[compareIndex].position.y - bodies[index].position.y;
                const distanceSquared = dx * dx + dy * dy;

                if (distanceSquared >= targetDistanceSquared || distanceSquared <= 0.01) {
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
                            const factor = clamp(
                                minimumEdgeDistance / edgeMargin,
                                0.05,
                                1.0,
                            );
                            boundaryDamping = Math.min(boundaryDamping, factor);
                        }
                    }
                }

                const forceMagnitude =
                    overlap * config.pressureStrength * bodies[index].mass * boundaryDamping;
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
            const config = zone.config;

            zone.bodies.forEach((body) => {
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
            ...this.dynamicBodies.lava,
            ...this.dynamicBodies.water,
            ...(this.dynamicBodies.treasure ? [this.dynamicBodies.treasure] : []),
            ...(this.dynamicBodies.stone ? [this.dynamicBodies.stone] : []),
        ]);
        this.staticBodies = [];
        this.fluidZones = [];
        this.dynamicBodies = {
            lava: [],
            water: [],
            treasure: null,
            stone: null,
        };
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
        this.initialized = false;
        this.Engine.clear(this.engine);
    }
}
