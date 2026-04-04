import BackgroundLayer from "./BackgroundLayer.jsx";
import CharacterSprite from "./CharacterSprite.jsx";
import ClearOverlay from "./ClearOverlay.jsx";
import TimerPanel from "./TimerPanel.jsx";
import TreasurePile from "./TreasurePile.jsx";

function TriggerBlock({ className, triggerId, triggerDirection, triggerTargets }) {
    return (
        <div
            className={className}
            data-trigger-id={triggerId}
            data-trigger-direction={triggerDirection}
            data-trigger-targets={triggerTargets}
        ></div>
    );
}

function Stage1Layout({ treasureRef }) {
    return (
        <>
            <div className="spawn-pad" data-collider="solid" data-spawn="player"></div>
            <div
                className="jump-block"
                data-collider="solid"
                data-effect="jump-boost"
            ></div>

            <div className="stone-bridge" data-collider="solid"></div>
            <div className="ladder" data-collider="ladder"></div>

            <div
                className="main-support zIndex100"
                data-collider="solid"
                data-triggerable="true"
                data-collapse-id="main-support"
            >
                <TriggerBlock
                    className="trigger-block trigger-block--top"
                    triggerId="main-support-trigger"
                    triggerDirection="top"
                    triggerTargets="main-support"
                />
            </div>

            <div className="top-beam zIndex100" data-collider="solid"></div>

            <div
                className="mid-ledge zIndex100"
                data-collider="solid"
                data-triggerable="true"
                data-collapse-id="mid-ledge"
            >
                <TriggerBlock
                    className="trigger-block trigger-block--left"
                    triggerId="mid-ledge-trigger"
                    triggerDirection="left"
                    triggerTargets="mid-ledge"
                />
            </div>

            <div className="goal-location zIndex100" data-collider="solid"></div>

            <TreasurePile ref={treasureRef} />

            <div
                className="right-frame zIndex100"
                data-collider="solid"
                data-triggerable="true"
                data-collapse-id="right-frame"
            >
                <TriggerBlock
                    className="trigger-block trigger-block--top"
                    triggerId="right-frame-trigger"
                    triggerDirection="top"
                    triggerTargets="right-frame"
                />
            </div>

            <div
                className="lava-fall fluid-zone fluid-zone--lava"
                data-fluid-type="lava"
                data-fluid-id="stage1-lava"
            ></div>
            <div
                className="ice-water fluid-zone fluid-zone--water"
                data-fluid-type="water"
                data-fluid-id="stage1-water"
            ></div>
            <div className="bottom-bar zIndex100" data-collider="solid"></div>
            <div className="goal-ledge" data-collider="solid"></div>
        </>
    );
}

function Stage2Layout({ treasureRef }) {
    return (
        <>
            <div className="stage2-left-frame stage2-post stage2-post--outer" data-collider="solid"></div>
            <div className="stage2-left-frame stage2-post stage2-post--inner" data-collider="solid"></div>
            <div
                className="stage2-left-frame stage2-cap"
                data-collider="solid"
                data-triggerable="true"
                data-collapse-id="stage2-left-cap"
            >
                <TriggerBlock
                    className="trigger-block trigger-block--top stage2-cap-trigger"
                    triggerId="stage2-left-cap-trigger"
                    triggerDirection="top"
                    triggerTargets="stage2-left-cap"
                />
            </div>

            <div className="stage2-right-frame stage2-post stage2-post--outer" data-collider="solid"></div>
            <div className="stage2-right-frame stage2-post stage2-post--inner" data-collider="solid"></div>
            <div
                className="stage2-right-frame stage2-cap"
                data-collider="solid"
                data-triggerable="true"
                data-collapse-id="stage2-right-cap"
            >
                <TriggerBlock
                    className="trigger-block trigger-block--top stage2-cap-trigger"
                    triggerId="stage2-right-cap-trigger"
                    triggerDirection="top"
                    triggerTargets="stage2-right-cap"
                />
            </div>

            <div
                className="stage2-fluid-zone stage2-fluid-zone--left-lava fluid-zone fluid-zone--lava"
                data-fluid-type="lava"
                data-fluid-id="stage2-left-lava"
            ></div>
            <div
                className="stage2-fluid-zone stage2-fluid-zone--left-water fluid-zone fluid-zone--water"
                data-fluid-type="water"
                data-fluid-id="stage2-left-water"
            ></div>
            <div
                className="stage2-fluid-zone stage2-fluid-zone--right-water fluid-zone fluid-zone--water"
                data-fluid-type="water"
                data-fluid-id="stage2-right-water"
            ></div>
            <div
                className="stage2-fluid-zone stage2-fluid-zone--right-lava fluid-zone fluid-zone--lava"
                data-fluid-type="lava"
                data-fluid-id="stage2-right-lava"
            ></div>

            <div className="stage2-fluid-divider stage2-fluid-divider--left" data-collider="solid"></div>
            <div className="stage2-fluid-divider stage2-fluid-divider--right" data-collider="solid"></div>

            <div
                className="stage2-white-block stage2-white-block--left zIndex100"
                data-collider="solid"
                data-triggerable="true"
                data-collapse-id="stage2-left-white"
            ></div>
            <div
                className="stage2-white-block stage2-white-block--right zIndex100"
                data-collider="solid"
                data-triggerable="true"
                data-collapse-id="stage2-right-white"
            ></div>

            <TriggerBlock
                className="trigger-block stage2-button-trigger"
                triggerId="stage2-button-trigger"
                triggerDirection="top"
                triggerTargets="stage2-left-white,stage2-right-white"
            />

            <div className="spawn-pad stage2-spawn-pad" data-collider="solid" data-spawn="player"></div>

            <div
                className="jump-block stage2-jump-block stage2-jump-block--low-left"
                data-collider="solid"
                data-effect="jump-boost"
            ></div>
            <div
                className="jump-block stage2-jump-block stage2-jump-block--upper-left"
                data-collider="solid"
                data-effect="jump-boost"
            ></div>
            <div
                className="jump-block stage2-jump-block stage2-jump-block--right"
                data-collider="solid"
                data-effect="jump-boost"
            ></div>

            <div className="stage2-treasure-pocket stage2-treasure-pocket--left" data-collider="solid"></div>
            <div className="stage2-treasure-pocket stage2-treasure-pocket--right" data-collider="solid"></div>
            <div className="stage2-treasure-base" data-collider="solid"></div>
            <div className="stage2-treasure-support" data-collider="solid"></div>

            <TreasurePile ref={treasureRef} className="stage2-treasure-pile" />
        </>
    );
}

function renderStageLayout(stageId, treasureRef) {
    switch (stageId) {
        case "stage2":
            return <Stage2Layout treasureRef={treasureRef} />;
        case "stage1":
        default:
            return <Stage1Layout treasureRef={treasureRef} />;
    }
}

export default function StageGeometry({
    stage,
    containerRef,
    characterRef,
    treasureRef,
}) {
    return (
        <div
            id="game-container"
            ref={containerRef}
            className={`stage-shell stage-shell--${stage.id}`}
            data-stage-id={stage.id}
        >
            <BackgroundLayer />
            <TimerPanel title={stage.title} />

            {renderStageLayout(stage.id, treasureRef)}

            <CharacterSprite ref={characterRef} />
            <ClearOverlay />

            <div className="vignette"></div>
        </div>
    );
}
