export const STAGE_DEFINITIONS = {
    stage1: {
        id: "stage1",
        path: "/stage1",
        nextStageId: "stage2",
        supportsNextStage: true,
        title: "Stage 1",
    },
    stage2: {
        id: "stage2",
        path: "/stage2",
        nextStageId: "stage3",
        supportsNextStage: true,
        title: "Stage 2",
    },
    stage3: {
        id: "stage3",
        path: "/stage3",
        nextStageId: "stage4",
        supportsNextStage: true,
        title: "Stage 3",
    },
    stage4: {
        id: "stage4",
        path: "/stage4",
        nextStageId: "stage5",
        supportsNextStage: true,
        title: "Stage 4",
    },
    stage5: {
        id: "stage5",
        path: "/stage5",
        nextStageId: "stage6",
        supportsNextStage: true,
        title: "Stage 5",
    },
    stage6: {
        id: "stage6",
        path: "/stage6",
        nextStageId: "stage7",
        supportsNextStage: true,
        title: "Stage 6",
    },
    stage7: {
        id: "stage7",
        path: "/stage7",
        nextStageId: "bossStage",
        supportsNextStage: true,
        title: "Stage 7",
    },
    bossStage: {
        id: "bossStage",
        path: "/boss-stage",
        nextStageId: null,
        supportsNextStage: false,
        title: "Boss Stage",
    },
};

export const STAGE_LIST = Object.values(STAGE_DEFINITIONS);

export function getStagePath(stageId) {
    return STAGE_DEFINITIONS[stageId]?.path ?? "/";
}
