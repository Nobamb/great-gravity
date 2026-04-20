import {
    getStageDefinition,
    STAGE_LIST,
} from "./stageDefinitions.js";

export const PROGRESS_STORAGE_KEY = "great-gravity-progress-v1";

function createDefaultStageProgress(stageId) {
    return {
        unlocked: stageId === "stage1",
        cleared: false,
        deathCount: 0,
        bestTimeMs: null,
        bestStars: 0,
    };
}

function createDefaultProgress() {
    return Object.fromEntries(
        STAGE_LIST.map((stage) => [stage.id, createDefaultStageProgress(stage.id)]),
    );
}

function getLocalStorage() {
    if (typeof window === "undefined") {
        return null;
    }

    try {
        return window.localStorage;
    } catch {
        return null;
    }
}

function normalizeStageProgress(stageId, value) {
    const base = createDefaultStageProgress(stageId);
    const stageValue = value && typeof value === "object" ? value : {};
    const bestTimeMs = Number.isFinite(stageValue.bestTimeMs)
        ? Math.max(0, stageValue.bestTimeMs)
        : null;
    const bestStars = bestTimeMs === null
        ? 0
        : getStarRatingForTime(stageId, bestTimeMs);

    return {
        ...base,
        unlocked: Boolean(stageValue.unlocked ?? base.unlocked),
        cleared: Boolean(stageValue.cleared),
        deathCount: Number.isFinite(stageValue.deathCount)
            ? Math.max(0, Math.floor(stageValue.deathCount))
            : 0,
        bestTimeMs,
        bestStars: bestTimeMs === null ? 0 : bestStars,
    };
}

function normalizeProgress(progress) {
    const source = progress && typeof progress === "object" ? progress : {};

    return Object.fromEntries(
        STAGE_LIST.map((stage) => [
            stage.id,
            normalizeStageProgress(stage.id, source[stage.id]),
        ]),
    );
}

export function loadProgress() {
    const storage = getLocalStorage();
    const defaults = createDefaultProgress();

    if (!storage) {
        return defaults;
    }

    try {
        const rawValue = storage.getItem(PROGRESS_STORAGE_KEY);

        if (!rawValue) {
            return defaults;
        }

        const parsed = JSON.parse(rawValue);
        return normalizeProgress(parsed);
    } catch {
        return defaults;
    }
}

export function saveProgress(progress) {
    const normalizedProgress = normalizeProgress(progress);
    const storage = getLocalStorage();

    if (!storage) {
        return normalizedProgress;
    }

    try {
        storage.setItem(PROGRESS_STORAGE_KEY, JSON.stringify(normalizedProgress));
    } catch {
        return normalizedProgress;
    }

    return normalizedProgress;
}

export function getProgressSnapshot() {
    return loadProgress();
}

export function recordStageClear(stageId, { timeMs, deathCount } = {}) {
    const progress = loadProgress();
    const stageProgress = progress[stageId];
    const stageDefinition = getStageDefinition(stageId);

    if (!stageProgress || !stageDefinition) {
        return progress;
    }

    const nextStageId = stageDefinition.nextStageId;
    const safeTimeMs = Number.isFinite(timeMs) ? Math.max(0, timeMs) : null;
    const safeStars = getStarRatingForTime(stageId, safeTimeMs);
    const safeDeathCount = Number.isFinite(deathCount)
        ? Math.max(0, Math.floor(deathCount))
        : 0;
    const shouldUpdateBestTime =
        safeTimeMs !== null &&
        (stageProgress.bestTimeMs === null || safeTimeMs < stageProgress.bestTimeMs);
    const shouldUpdateDeathCount =
        !stageProgress.cleared || safeDeathCount < stageProgress.deathCount;

    progress[stageId] = {
        ...stageProgress,
        unlocked: true,
        cleared: true,
        deathCount: shouldUpdateDeathCount ? safeDeathCount : stageProgress.deathCount,
        bestTimeMs: shouldUpdateBestTime ? safeTimeMs : stageProgress.bestTimeMs,
        bestStars: shouldUpdateBestTime ? safeStars : stageProgress.bestStars,
    };

    if (nextStageId && progress[nextStageId]) {
        progress[nextStageId] = {
            ...progress[nextStageId],
            unlocked: true,
        };
    }

    return saveProgress(progress);
}

export function getStarRatingForTime(stageId, timeMs) {
    if (!Number.isFinite(timeMs)) {
        return 0;
    }

    const stageDefinition = getStageDefinition(stageId);
    const thresholds = stageDefinition?.starThresholds;

    if (!thresholds) {
        return 0;
    }

    if (timeMs <= thresholds.threeStarsMs) {
        return 3;
    }

    if (timeMs <= thresholds.twoStarsMs) {
        return 2;
    }

    return 1;
}

export function formatProgressTime(timeMs) {
    if (!Number.isFinite(timeMs)) {
        return "--:--:--";
    }

    const totalCentiseconds = Math.max(0, Math.floor(timeMs / 10));
    const minutes = Math.floor(totalCentiseconds / 6000);
    const seconds = Math.floor((totalCentiseconds % 6000) / 100);
    const centiseconds = totalCentiseconds % 100;

    return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}:${String(centiseconds).padStart(2, "0")}`;
}
