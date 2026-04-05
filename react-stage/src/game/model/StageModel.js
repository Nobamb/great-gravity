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

        this.domSolids = [];
        this.runtimeSolids = [];
        this.runtimeHazards = [];
        this.solids = [];
        this.hazards = [];
        this.ladders = [];
        this.bounds = {
            width: 0,
            height: 0,
        };
        this.initialTriggerStates = null;
        this.triggers = [];
        this.projectileTriggers = [];
        this.stoneSources = [];
        this.dirty = true;
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

        this.rebuildSolidList();
        this.hazards = [...this.runtimeHazards];

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
                        const collapseState =
                            target.element.dataset.collapseState || "";
                        return collapseState === "collapsed" ||
                            collapseState === "collapsing";
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
                    isProjectileTrigger: element.dataset.projectileTrigger === "true",
                    isUsed,
                };
            })
            .filter(Boolean);

        this.triggers = resolvedTriggers.filter((trigger) => !trigger.isProjectileTrigger);
        this.projectileTriggers = resolvedTriggers.filter((trigger) => trigger.isProjectileTrigger);
        this.stoneSources = Array.from(
            this.container.querySelectorAll(this.stoneSourceSelector),
        ).map((element, index) => ({
            id: element.dataset.stoneSourceId || `stone-source-${index}`,
            element,
            rect: createRelativeRect(
                element.getBoundingClientRect(),
                containerRect,
            ),
        }));

        if (!this.initialTriggerStates) {
            this.initialTriggerStates = {
                triggers: [...this.triggers, ...this.projectileTriggers].map((trigger) => ({
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

    getInteractableTrigger(bounds, padding = 0) {
        const expandedBounds = expandRect(bounds, padding);
        let bestMatch = null;
        let bestArea = 0;

        for (const trigger of this.triggers) {
            if (trigger.isUsed || trigger.isProjectileTrigger) {
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

    resetStage() {
        if (!this.initialTriggerStates) {
            return;
        }

        this.clearRuntimeSolids();
        this.clearRuntimeHazards();

        this.triggers?.forEach((trigger) => {
            trigger.isUsed = false;
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

        return this.stoneSources.find((source) => {
            const isConsumed =
                source.element.hidden ||
                source.element.dataset.stoneSourceState === "consumed";

            if (isConsumed) {
                return false;
            }

            return getOverlapArea(expandedBounds, source.rect) > 0;
        }) ?? null;
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

    destroy() {
        this.resizeObserver?.disconnect();
        window.removeEventListener("resize", this.markDirty);
    }
}
