export const STAGE_DEFINITIONS = {
    stage1: {
        id: "stage1",
        path: "/stage/1",
        legacyPaths: ["/stage1"],
        nextStageId: "stage2",
        supportsNextStage: true,
        title: "Stage 1",
        selectLabel: "1",
        accent: "blue",
        order: 1,
    },
    stage2: {
        id: "stage2",
        path: "/stage/2",
        legacyPaths: ["/stage2"],
        nextStageId: "stage3",
        supportsNextStage: true,
        title: "Stage 2",
        selectLabel: "2",
        accent: "red",
        order: 2,
    },
    stage3: {
        id: "stage3",
        path: "/stage/3",
        legacyPaths: ["/stage3"],
        nextStageId: "stage4",
        supportsNextStage: true,
        title: "Stage 3",
        selectLabel: "3",
        accent: "blue",
        order: 3,
    },
    stage4: {
        id: "stage4",
        path: "/stage/4",
        legacyPaths: ["/stage4"],
        nextStageId: "stage5",
        supportsNextStage: true,
        title: "Stage 4",
        selectLabel: "4",
        accent: "red",
        order: 4,
    },
    stage5: {
        id: "stage5",
        path: "/stage/5",
        legacyPaths: ["/stage5"],
        nextStageId: "stage6",
        supportsNextStage: true,
        title: "Stage 5",
        selectLabel: "5",
        accent: "blue",
        order: 5,
    },
    stage6: {
        id: "stage6",
        path: "/stage/6",
        legacyPaths: ["/stage6"],
        nextStageId: "stage7",
        supportsNextStage: true,
        title: "Stage 6",
        selectLabel: "6",
        accent: "red",
        order: 6,
    },
    stage7: {
        id: "stage7",
        path: "/stage/7",
        legacyPaths: ["/stage7"],
        nextStageId: "bossStage",
        supportsNextStage: true,
        title: "Stage 7",
        selectLabel: "7",
        accent: "blue",
        order: 7,
    },
    bossStage: {
        id: "bossStage",
        path: "/stage/boss",
        legacyPaths: ["/boss-stage"],
        nextStageId: null,
        supportsNextStage: false,
        title: "Boss Stage",
        selectLabel: "BOSS",
        accent: "red",
        order: 8,
    },
};

export const STAGE_LIST = Object.values(STAGE_DEFINITIONS).sort(
    (left, right) => left.order - right.order,
);

export const LEGACY_STAGE_ROUTES = STAGE_LIST.flatMap((stage) =>
    (stage.legacyPaths ?? []).map((legacyPath) => ({
        path: legacyPath,
        redirectTo: stage.path,
    })),
);

export function getStagePath(stageId) {
    return STAGE_DEFINITIONS[stageId]?.path ?? "/";
}

export function getStageDefinition(stageId) {
    return STAGE_DEFINITIONS[stageId] ?? null;
}
