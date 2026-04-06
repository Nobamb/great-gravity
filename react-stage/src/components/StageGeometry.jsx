import BackgroundLayer from "./BackgroundLayer.jsx";
import CharacterSprite from "./CharacterSprite.jsx";
import ClearOverlay from "./ClearOverlay.jsx";
import CustomMissionAlarm from "./CustomMissionAlarm.jsx";
import MissionHud from "./MissionHud.jsx";
import TimerPanel from "./TimerPanel.jsx";
import TreasurePile from "./TreasurePile.jsx";

function TriggerBlock({
    className,
    triggerId,
    triggerDirection,
    triggerTargets,
    projectileTrigger = true,
    interactTrigger = true,
}) {
    return (
        <div
            className={className}
            data-trigger-id={triggerId}
            data-trigger-direction={triggerDirection}
            data-trigger-targets={triggerTargets}
            data-projectile-trigger={projectileTrigger ? "true" : undefined}
            data-interact-trigger={interactTrigger ? undefined : "false"}
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

function Stage2Layout({
    treasureRef,
    treasureAnchorRef,
    stoneRef,
    stoneAnchorRef,
    stoneAimRef,
}) {
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
                    className="trigger-block stage2-side-trigger stage2-cap-trigger stage2-cap-trigger--left"
                    triggerId="stage2-left-cap-trigger"
                    triggerDirection="right"
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
                    className="trigger-block stage2-side-trigger stage2-cap-trigger stage2-cap-trigger--right"
                    triggerId="stage2-right-cap-trigger"
                    triggerDirection="left"
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

            <div
                className="stage2-fluid-divider stage2-fluid-divider--left"
                data-collider="solid"
                data-triggerable="true"
                data-collapse-id="stage2-left-divider"
            >
                <TriggerBlock
                    className="trigger-block stage2-side-trigger stage2-divider-trigger stage2-divider-trigger--left"
                    triggerId="stage2-left-divider-trigger"
                    triggerDirection="left"
                    triggerTargets="stage2-left-divider"
                />
            </div>
            <div
                className="stage2-fluid-divider stage2-fluid-divider--right"
                data-collider="solid"
                data-triggerable="true"
                data-collapse-id="stage2-right-divider"
            >
                <TriggerBlock
                    className="trigger-block stage2-side-trigger stage2-divider-trigger stage2-divider-trigger--right"
                    triggerId="stage2-right-divider-trigger"
                    triggerDirection="right"
                    triggerTargets="stage2-right-divider"
                />
            </div>

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
                className="trigger-block stage2-button-hitbox"
                triggerId="stage2-button-trigger"
                triggerDirection="top"
                triggerTargets="stage2-left-white,stage2-right-white"
                projectileTrigger={true}
                interactTrigger={false}
            />
            <div className="stage2-button-trigger" aria-hidden="true"></div>

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
            <div
                className="jump-block stage2-jump-block stage2-jump-block--upper-right"
                data-collider="solid"
                data-effect="jump-boost"
            ></div>

            <div className="stage2-throw-stone-anchor" ref={stoneAnchorRef}></div>
            <div
                className="throw-stone stage2-stone-source stage2-stone-source--left"
                data-stone-source="true"
                data-stone-source-id="stage2-stone-left"
            ></div>
            <div
                className="throw-stone stage2-stone-source stage2-stone-source--upper-right"
                data-stone-source="true"
                data-stone-source-id="stage2-stone-upper-right"
            ></div>
            <div className="throw-stone stage2-projectile-stone" ref={stoneRef}></div>
            <svg className="stone-aim-overlay" width="100%" height="100%" aria-hidden="true">
                <line
                    className="stone-aim-line"
                    data-stone-aim-line
                    ref={stoneAimRef}
                    hidden
                ></line>
                <circle
                    className="stone-aim-reticle"
                    data-stone-aim-reticle
                    hidden
                ></circle>
                <line
                    className="stone-aim-reticle-axis"
                    data-stone-aim-reticle-axis="horizontal"
                    hidden
                ></line>
                <line
                    className="stone-aim-reticle-axis"
                    data-stone-aim-reticle-axis="vertical"
                    hidden
                ></line>
            </svg>

            <div className="stage2-treasure-base" data-collider="solid"></div>
            <div className="stage2-treasure-support" data-collider="solid"></div>
            <div className="stage2-treasure-anchor" ref={treasureAnchorRef}></div>

            <TreasurePile ref={treasureRef} className="stage2-treasure-pile" />
        </>
    );
}

function Stage3Layout({
    treasureRef,
    treasureAnchorRef,
    stoneRef,
    stoneAnchorRef,
    stoneAimRef,
}) {
    return (
        <>
            <div className="stage3-left-wall" data-collider="solid"></div>
            <div className="stage3-left-tower stage3-frame" data-collider="solid"></div>
            <div className="stage3-left-tower stage3-frame stage3-frame--right" data-collider="solid"></div>
            <div className="stage3-left-tower-cap stage3-frame" data-collider="solid"></div>
            <div className="stage3-left-tower-divider stage3-frame" data-collider="solid" data-triggerable="true" data-collapse-id="stage3-left-tower-divider" id="stage3-left-tower-divider"></div>
            <div className="trigger-block trigger-block--right stage3-left-tower-divider-trigger" data-trigger="true" data-trigger-id="stage3-divider-trigger" data-trigger-direction="right" data-trigger-targets="stage3-left-tower-divider" data-projectile-trigger="true"></div>
            <div className="stage3-timed-block stage3-timed-block--upper" data-collider="solid" data-triggerable="true" data-timed-block="true" data-collapse-id="stage3-timed-block-upper"></div>
            <div className="stage3-stone-anchor stage3-stone-anchor--upper"></div>
            <div className="stage3-stone-source throw-stone stage3-stone-source--upper" data-stone-source="true" data-stone-source-id="stage3-stone-upper"></div>
            <div className="stage3-left-shaft stage3-frame" data-collider="solid"></div>
            <div className="stage3-left-bottom-floor stage3-frame" data-collider="solid"></div>

            <div
                className="stage3-fluid-zone stage3-fluid-zone--left-lava fluid-zone fluid-zone--lava"
                data-fluid-type="lava"
                data-fluid-id="stage3-left-lava"
            ></div>
            <div
                className="stage3-fluid-zone stage3-fluid-zone--left-water fluid-zone fluid-zone--water"
                data-fluid-type="water"
                data-fluid-id="stage3-left-water"
            ></div>
            <div className="stage3-left-bottom-lava fluid-zone fluid-zone--lava" data-fluid-type="lava" data-fluid-id="stage3-bottom-lava"></div>
            <div className="stage3-left-bottom-water fluid-zone fluid-zone--water" data-fluid-type="water" data-fluid-id="stage3-bottom-water"></div>

            <div className="spawn-pad stage3-spawn-pad" data-collider="solid" data-spawn="player"></div>
            <div
                className="stage3-timed-block"
                data-collider="solid"
                data-triggerable="true"
                data-timed-block="true"
                data-collapse-id="stage3-timed-block"
            ></div>
            <div className="stage3-mid-vertical-block stage3-frame" data-collider="solid" data-triggerable="true" data-collapse-id="stage3-mid-vertical-block" id="stage3-mid-vertical-block">
                <div className="trigger-block trigger-block--top stage3-mid-vertical-trigger" data-trigger="true" data-trigger-id="stage3-mid-vertical-trigger" data-trigger-direction="top" data-trigger-targets="stage3-mid-vertical-block" data-projectile-trigger="true"></div>
            </div>
            <div
                className="stage3-initial-solidified stage3-mid-vertical-solid stage3-mid-vertical-solid--top"
                data-solidified-block="true"
                data-solidified-id="stage3-mid-vertical-solid-top"
                data-solidified-anchored="true"
            ></div>
            <div
                className="stage3-initial-solidified stage3-mid-vertical-solid stage3-mid-vertical-solid--mid"
                data-solidified-block="true"
                data-solidified-id="stage3-mid-vertical-solid-mid"
                data-solidified-anchored="true"
            ></div>
            <div
                className="stage3-initial-solidified stage3-bottom-seal-solid stage3-bottom-seal-solid--upper"
                data-solidified-block="true"
                data-solidified-id="stage3-bottom-seal-solid-upper"
            ></div>
            <div
                className="stage3-initial-solidified stage3-bottom-seal-solid stage3-bottom-seal-solid--lower"
                data-solidified-block="true"
                data-solidified-id="stage3-bottom-seal-solid-lower"
            ></div>
            <div
                className="stage3-timed-block stage3-timed-block--low"
                data-collider="solid"
                data-triggerable="true"
                data-timed-block="true"
                data-collapse-id="stage3-timed-block-low"
            ></div>
            <div
                className="jump-block stage3-jump-block stage3-jump-block--mid"
                data-collider="solid"
                data-effect="jump-boost"
            ></div>

            <div className="stage3-main-platform stage3-frame" data-collider="solid"></div>
            <div className="stage3-center-support stage3-frame" data-collider="solid"></div>

            <div className="stage3-stone-anchor" ref={stoneAnchorRef}></div>
            <div
                className="stage3-stone-source throw-stone"
                data-stone-source="true"
                data-stone-source-id="stage3-stone-left"
            ></div>
            <div className="throw-stone stage3-projectile-stone" ref={stoneRef}></div>

            <div
                className="trigger-block stage3-contact-hitbox"
                data-contact-trigger="true"
                data-trigger-id="stage3-white-gate-trigger"
                data-trigger-direction="top"
                data-trigger-targets="stage3-white-gate"
                data-contact-sources="character,stone,lava,solidified"
            ></div>
            <div className="stage3-contact-button" aria-hidden="true"></div>

            <div
                className="stage3-cannon"
                data-cannon="true"
                data-cannon-id="stage3-main-cannon"
            >
                <div className="stage3-cannon-seat" data-cannon-seat="true"></div>
                <div className="stage3-cannon-barrel" data-cannon-muzzle="true"></div>
                <div className="stage3-cannon-wheel stage3-cannon-wheel--left"></div>
                <div className="stage3-cannon-wheel stage3-cannon-wheel--right"></div>
            </div>

            <div className="stage3-right-chamber stage3-frame stage3-frame--right-outer" data-collider="solid" data-triggerable="true" data-collapse-id="stage3-right-chamber-outer" id="stage3-right-chamber-outer">
                <div className="trigger-block trigger-block--bottom stage3-right-chamber-trigger--left" data-trigger="true" data-trigger-id="stage3-right-chamber-outer-trigger" data-trigger-direction="bottom" data-trigger-targets="stage3-right-chamber-outer" data-projectile-trigger="true"></div>
            </div>
            <div className="stage3-right-chamber-mid stage3-frame" data-collider="solid" data-triggerable="true" data-collapse-id="stage3-right-chamber-mid" id="stage3-right-chamber-mid">
                <div className="trigger-block trigger-block--bottom stage3-right-chamber-trigger--mid" data-trigger="true" data-trigger-id="stage3-right-chamber-mid-trigger" data-trigger-direction="bottom" data-trigger-targets="stage3-right-chamber-mid" data-projectile-trigger="true"></div>
            </div>
            <div className="stage3-right-chamber stage3-frame stage3-frame--right-inner" data-collider="solid"></div>
            <div className="stage3-right-chamber-cap stage3-frame" data-collider="solid"></div>
            <div
                className="stage3-right-water-shelf stage3-frame"
                data-collider="solid"
                data-triggerable="true"
                data-collapse-id="stage3-right-water-shelf"
                id="stage3-right-water-shelf"
            >
                <div
                    className="trigger-block stage3-right-water-shelf-trigger"
                    data-trigger="true"
                    data-trigger-id="stage3-right-water-shelf-trigger"
                    data-trigger-direction="left"
                    data-trigger-targets="stage3-right-water-shelf"
                    data-projectile-trigger="true"
                ></div>
            </div>
            <div className="stage3-right-floor stage3-frame" data-collider="solid"></div>

            <div
                className="stage3-fluid-zone stage3-fluid-zone--right-water fluid-zone fluid-zone--water"
                data-fluid-type="water"
                data-fluid-id="stage3-right-water"
            ></div>
            <div
                className="stage3-fluid-zone stage3-fluid-zone--right-lava fluid-zone fluid-zone--lava"
                data-fluid-type="lava"
                data-fluid-id="stage3-right-lava"
            ></div>

            <div
                className="stage3-white-gate"
                data-collider="solid"
                data-triggerable="true"
                data-collapse-id="stage3-white-gate"
            ></div>

            <div
                className="stage3-monster"
                data-monster="true"
                data-monster-id="stage3-guardian"
                data-monster-direction="left"
            >
                <div className="stage3-monster-eye"></div>
                <div className="stage3-monster-teeth"></div>
            </div>

            <div className="stage3-treasure-base stage3-frame" data-collider="solid"></div>
            <div className="stage3-treasure-anchor" ref={treasureAnchorRef}></div>
            <TreasurePile ref={treasureRef} className="stage3-treasure-pile" />

            <svg className="stone-aim-overlay" width="100%" height="100%" aria-hidden="true">
                <line
                    className="stone-aim-line"
                    data-stone-aim-line
                    ref={stoneAimRef}
                    hidden
                ></line>
                <circle
                    className="stone-aim-reticle"
                    data-stone-aim-reticle
                    hidden
                ></circle>
                <line
                    className="stone-aim-reticle-axis"
                    data-stone-aim-reticle-axis="horizontal"
                    hidden
                ></line>
                <line
                    className="stone-aim-reticle-axis"
                    data-stone-aim-reticle-axis="vertical"
                    hidden
                ></line>
            </svg>
        </>
    );
}

function Stage4Layout({
    treasureRef,
    treasureAnchorRef,
    stoneRef,
    stoneAnchorRef,
    stoneAimRef,
}) {
    return (
        <>
            <div className="spawn-pad stage4-spawn-pad" data-collider="solid" data-spawn="player"></div>
            <div className="stage3-frame stage4-main-floor" data-collider="solid"></div>
            <div className="stage3-frame stage4-lower-floor" data-collider="solid"></div>

            <div className="stage3-frame stage4-tank-left-wall" data-collider="solid"></div>
            <div className="stage3-frame stage4-tank-right-wall" data-collider="solid"></div>
            <div className="stage3-frame stage4-tank-top" data-collider="solid"></div>
            <div
                className="stage3-frame stage4-tank-gate stage4-tank-gate--upper"
                data-collider="solid"
                data-triggerable="true"
                data-collapse-id="stage4-upper-gate"
            ></div>
            <div
                className="stage3-frame stage4-tank-gate stage4-tank-gate--lower"
                data-collider="solid"
                data-triggerable="true"
                data-collapse-id="stage4-lower-gate"
            ></div>

            <TriggerBlock
                className="trigger-block stage4-tank-trigger stage4-tank-trigger--upper"
                triggerId="stage4-upper-gate-trigger"
                triggerDirection="left"
                triggerTargets="stage4-upper-gate"
            />
            <TriggerBlock
                className="trigger-block stage4-tank-trigger stage4-tank-trigger--lower"
                triggerId="stage4-lower-gate-trigger"
                triggerDirection="left"
                triggerTargets="stage4-lower-gate"
            />

            <div
                className="stage4-fluid-zone stage4-fluid-zone--water fluid-zone fluid-zone--water"
                data-fluid-type="water"
                data-fluid-id="stage4-upper-water"
            ></div>
            <div
                className="stage4-fluid-zone stage4-fluid-zone--lava fluid-zone fluid-zone--lava"
                data-fluid-type="lava"
                data-fluid-id="stage4-lower-lava"
            ></div>

            <div
                className="trigger-block stage4-contact-hitbox"
                data-contact-trigger="true"
                data-trigger-id="stage4-white-gate-trigger"
                data-trigger-direction="top"
                data-trigger-targets="stage4-white-vertical"
                data-contact-sources="character,stone,solidified"
            ></div>
            <div className="stage4-contact-button" aria-hidden="true"></div>

            <div
                className="stage3-monster stage4-monster"
                data-monster="true"
                data-monster-id="stage4-guardian"
                data-monster-direction="left"
            >
                <div className="stage3-monster-eye"></div>
                <div className="stage3-monster-teeth"></div>
            </div>

            <div
                className="jump-block stage4-jump-block stage4-jump-block--lower"
                data-collider="solid"
                data-effect="jump-boost"
            ></div>
            <div
                className="jump-block stage4-jump-block stage4-jump-block--upper"
                data-collider="solid"
                data-effect="jump-boost"
            ></div>

            <div
                className="stage3-cannon stage4-cannon"
                data-cannon="true"
                data-cannon-id="stage4-main-cannon"
            >
                <div className="stage3-cannon-seat stage4-cannon-seat" data-cannon-seat="true"></div>
                <div className="stage3-cannon-barrel" data-cannon-muzzle="true"></div>
                <div className="stage3-cannon-wheel stage3-cannon-wheel--left"></div>
                <div className="stage3-cannon-wheel stage3-cannon-wheel--right"></div>
            </div>

            <div
                className="jump-block stage4-jump-block stage4-jump-block--goal"
                data-collider="solid"
                data-effect="jump-boost"
            ></div>
            <div
                className="stage3-white-gate stage4-white-block stage4-white-block--vertical"
                data-collider="solid"
                data-triggerable="true"
                data-collapse-id="stage4-white-vertical"
            ></div>

            <div className="stage3-frame stage4-goal-ledge" data-collider="solid"></div>
            <div className="stage3-frame stage4-goal-post" data-collider="solid"></div>
            <div className="stage3-frame stage4-treasure-base" data-collider="solid"></div>
            <div className="stage4-treasure-anchor" ref={treasureAnchorRef}></div>
            <div
                className="stage4-treasure-barrier"
                data-stage4-treasure-barrier="true"
                aria-hidden="true"
            ></div>
            <TreasurePile ref={treasureRef} className="stage4-treasure-pile" />

            <div className="stage4-stone-anchor" ref={stoneAnchorRef}></div>
            <div
                className="stage4-stone-source throw-stone stage4-stone-source--right"
                data-stone-source="true"
                data-stone-source-id="stage4-stone-right"
            ></div>
            <div className="throw-stone stage4-projectile-stone" ref={stoneRef}></div>

            <svg className="stone-aim-overlay" width="100%" height="100%" aria-hidden="true">
                <line
                    className="stone-aim-line"
                    data-stone-aim-line
                    ref={stoneAimRef}
                    hidden
                ></line>
                <circle
                    className="stone-aim-reticle"
                    data-stone-aim-reticle
                    hidden
                ></circle>
                <line
                    className="stone-aim-reticle-axis"
                    data-stone-aim-reticle-axis="horizontal"
                    hidden
                ></line>
                <line
                    className="stone-aim-reticle-axis"
                    data-stone-aim-reticle-axis="vertical"
                    hidden
                ></line>
            </svg>
        </>
    );
}

function renderStageLayout(
    stageId,
    treasureRef,
    treasureAnchorRef,
    stoneRef,
    stoneAnchorRef,
    stoneAimRef,
) {
    switch (stageId) {
        case "stage4":
            return (
                <Stage4Layout
                    treasureRef={treasureRef}
                    treasureAnchorRef={treasureAnchorRef}
                    stoneRef={stoneRef}
                    stoneAnchorRef={stoneAnchorRef}
                    stoneAimRef={stoneAimRef}
                />
            );
        case "stage3":
            return (
                <Stage3Layout
                    treasureRef={treasureRef}
                    treasureAnchorRef={treasureAnchorRef}
                    stoneRef={stoneRef}
                    stoneAnchorRef={stoneAnchorRef}
                    stoneAimRef={stoneAimRef}
                />
            );
        case "stage2":
            return (
                <Stage2Layout
                    treasureRef={treasureRef}
                    treasureAnchorRef={treasureAnchorRef}
                    stoneRef={stoneRef}
                    stoneAnchorRef={stoneAnchorRef}
                    stoneAimRef={stoneAimRef}
                />
            );
        case "stage1":
        default:
            return <Stage1Layout treasureRef={treasureRef} />;
    }
}

export default function StageGeometry({
    stage,
    containerRef,
    characterRef,
    heldStoneRef,
    treasureRef,
    treasureAnchorRef,
    stoneRef,
    stoneAnchorRef,
    stoneAimRef,
}) {
    const isStage4 = stage.id === "stage4";
    const stage4MissionFaces = [
        (
            <div className="mission-ui__monster" aria-hidden="true" key="stage4-guardian-face">
                <div className="mission-ui__monster-eye"></div>
                <div className="mission-ui__monster-teeth"></div>
            </div>
        ),
    ];
    const stage4MissionCounts = [
        (
            <span key="stage4-guardian-count">
                x <span data-mission-count-id="stage4-guardian">1</span>
            </span>
        ),
    ];

    return (
        <div
            id="game-container"
            ref={containerRef}
            className={`stage-shell stage-shell--${stage.id}`}
            data-stage-id={stage.id}
        >
            <BackgroundLayer />
            <TimerPanel title={stage.title} />
            {isStage4 ? (
                <MissionHud
                    missionFaces={stage4MissionFaces}
                    missionCounts={stage4MissionCounts}
                    ariaLabel="remaining monster mission"
                />
            ) : null}

            {renderStageLayout(
                stage.id,
                treasureRef,
                treasureAnchorRef,
                stoneRef,
                stoneAnchorRef,
                stoneAimRef,
            )}

            <CharacterSprite ref={characterRef} heldStoneRef={heldStoneRef} />
            {isStage4 ? <CustomMissionAlarm /> : null}
            <ClearOverlay />

            <div className="vignette"></div>
        </div>
    );
}
