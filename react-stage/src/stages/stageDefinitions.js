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
        nextStageId: null,
        supportsNextStage: false,
        title: "Stage 3",
    },
};

export const STAGE_LIST = Object.values(STAGE_DEFINITIONS);

export function getStagePath(stageId) {
    return STAGE_DEFINITIONS[stageId]?.path ?? "/";
}
