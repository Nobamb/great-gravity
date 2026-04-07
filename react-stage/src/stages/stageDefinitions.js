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
        nextStageId: null,
        supportsNextStage: false,
        title: "Stage 5",
    },
};

export const STAGE_LIST = Object.values(STAGE_DEFINITIONS);

export function getStagePath(stageId) {
    return STAGE_DEFINITIONS[stageId]?.path ?? "/";
}
