import CharacterSprite from "./CharacterSprite.jsx";
import Cannon from "./Cannon.jsx";
import DefaultBlock from "./DefaultBlock.jsx";
import JumpBlock from "./JumpBlock.jsx";
import Ladder from "./Ladder.jsx";
import { PortalIn, PortalOut } from "./Portal.jsx";
import { IceZone, LavaZone, WaterZone } from "./StageElements.jsx";
import TreasurePile from "./TreasurePile.jsx";
import TriggerableBlock from "./TriggerableBlock.jsx";

const PARTICLE_LAYOUT = [
    { x: 18, y: 64, size: 28 },
    { x: 30, y: 43, size: 34 },
    { x: 43, y: 61, size: 26 },
    { x: 55, y: 36, size: 32 },
    { x: 66, y: 57, size: 38 },
    { x: 77, y: 43, size: 25 },
    { x: 50, y: 75, size: 30 },
];

const STAR_TRACK = "\u2606";
const STAR_FILL = "\u2605";

const STAGE_SELECT_PREVIEW_STAGES = [
    { label: "1", accent: "blue", stars: 3, deaths: 0, clearTime: "00:42:15", unlocked: true },
    { label: "2", accent: "red", stars: 2, deaths: 3, clearTime: "01:18:40", unlocked: true },
    { label: "3", accent: "blue", stars: 1, deaths: 7, clearTime: "--:--:--", unlocked: true },
    { label: "4", accent: "red", unlocked: false },
    { label: "5", accent: "blue", unlocked: false },
    { label: "6", accent: "red", unlocked: false },
    { label: "7", accent: "blue", unlocked: false },
    { label: "BOSS", accent: "red", unlocked: false },
];

function PreviewStarRating({ value }) {
    return (
        <div className="howto-select-preview__stars" aria-hidden="true">
            {Array.from({ length: 3 }).map((_, index) => {
                const fillAmount = Math.max(0, Math.min(1, value - index));

                return (
                    <span className="howto-select-preview__star" key={index}>
                        <span className="howto-select-preview__star-track">{STAR_TRACK}</span>
                        <span
                            className="howto-select-preview__star-mask"
                            style={{ width: `${fillAmount * 100}%` }}
                        >
                            <span className="howto-select-preview__star-fill">{STAR_FILL}</span>
                        </span>
                    </span>
                );
            })}
        </div>
    );
}

function PreviewShell({ children, className = "", label }) {
    return (
        <div
            className={`howto-preview ${className}`.trim()}
            aria-label={label}
            role="img"
        >
            {children}
        </div>
    );
}

function PagePreviewFrame({ children, className = "", label }) {
    return (
        <PreviewShell className={`howto-page-preview ${className}`.trim()} label={label}>
            <div className="howto-page-preview__canvas">
                <div className="howto-page-preview__fixed-scene">
                    {children}
                </div>
            </div>
        </PreviewShell>
    );
}

function HeaderPreview() {
    return (
        <div className="howto-page-preview__header">
            <span className="howto-page-preview__brand">GREAT-GRAVITY</span>
            <span className="howto-page-preview__icon material-symbols-outlined">account_circle</span>
            <span className="howto-page-preview__icon material-symbols-outlined">settings</span>
        </div>
    );
}

function MainPagePreview() {
    return (
        <PagePreviewFrame className="howto-page-preview--main" label="메인 페이지 미리보기">
            <HeaderPreview />
            <div className="howto-page-preview__mesh"></div>
            <div className="howto-page-preview__hero">
                <span className="howto-page-preview__eyebrow">GRAVITY PUZZLE</span>
                <strong>GREAT<br />GRAVITY</strong>
                <span className="howto-page-preview__rule"></span>
                <div className="howto-page-preview__actions">
                    <span className="howto-page-preview__button howto-page-preview__button--primary">
                        <span>게임 시작</span>
                        <span className="material-symbols-outlined">play_arrow</span>
                    </span>
                    <span className="howto-page-preview__button">
                        <span>게임 방법</span>
                        <span className="material-symbols-outlined">info</span>
                    </span>
                </div>
            </div>
        </PagePreviewFrame>
    );
}

function StageSelectPreview() {
    return (
        <PagePreviewFrame className="howto-page-preview--select" label="스테이지 선택 페이지 미리보기">
            <HeaderPreview />
            <div className="howto-select-preview">
                <div className="howto-select-preview__heading">
                    <span className="howto-select-preview__back">
                        <span className="material-symbols-outlined">arrow_back_ios</span>
                        <span>메인 화면으로</span>
                    </span>
                    <strong className="howto-select-preview__title">스테이지를<span>선택해주세요</span></strong>
                </div>
                <div className="howto-select-preview__grid">
                    {STAGE_SELECT_PREVIEW_STAGES.map((stage) => (
                        <span
                            className={[
                                "howto-select-preview__card",
                                `howto-select-preview__card--${stage.accent}`,
                                stage.label === "1" ? "is-selected" : "",
                                !stage.unlocked ? "is-locked" : "",
                            ].filter(Boolean).join(" ")}
                            key={stage.label}
                        >
                            <span className="howto-select-preview__card-index">{stage.label}</span>
                            {stage.unlocked ? (
                                <span className="howto-select-preview__card-content">
                                    <PreviewStarRating value={stage.stars} />
                                    <span className="howto-select-preview__card-meta">
                                        <span>사망 횟수: <b>{stage.deaths}</b></span>
                                        <span>클리어 시간: <b>{stage.clearTime}</b></span>
                                    </span>
                                </span>
                            ) : (
                                <span className="howto-select-preview__lock">
                                    <span className="material-symbols-outlined">lock</span>
                                </span>
                            )}
                        </span>
                    ))}
                </div>
                <div className="howto-select-preview__footer">
                    <span className="howto-select-preview__selection">
                        <span className="howto-select-preview__selection-label">Stage 1</span>
                        <span className="howto-select-preview__selection-meta">
                            <span>사망 횟수 0</span>
                            <span>최고 기록 00:42:15</span>
                        </span>
                    </span>
                    <span className="howto-select-preview__pagination">
                        <span className="howto-select-preview__page-button is-disabled">이전</span>
                        <span className="howto-select-preview__page-indicator">1/2</span>
                        <span className="howto-select-preview__page-button">다음</span>
                    </span>
                    <span className="howto-select-preview__actions">
                        <span className="howto-page-preview__button">랭킹보기</span>
                        <span className="howto-page-preview__button howto-page-preview__button--primary">시작하기</span>
                    </span>
                </div>
            </div>
        </PagePreviewFrame>
    );
}

function GamePagePreview() {
    return (
        <PagePreviewFrame className="howto-page-preview--game" label="게임 화면 미리보기">
            <div className="howto-stage-preview">
                <button type="button" className="game-preferences-btn" aria-hidden="true" tabIndex={-1}>
                    <span className="material-symbols-outlined">settings</span>
                </button>
                <div className="timer-ui">
                    <div className="timer-ui__value">00:12:48</div>
                </div>
                <div className="spawn-pad"></div>
                <JumpBlock className="stage1-jump-block" />
                <DefaultBlock className="stone-bridge" />
                <Ladder width="4.2%" height="49%" right="37.2%" top="24%" />
                <DefaultBlock className="main-support zIndex100" hasTrigger triggerPlacement="top" />
                <DefaultBlock className="top-beam zIndex100" />
                <DefaultBlock className="mid-ledge zIndex100" hasTrigger triggerPlacement="left" />
                <DefaultBlock className="goal-location zIndex100" />
                <LavaZone className="lava-fall fluid-zone fluid-zone--lava" zoneId="howto-stage-lava" />
                <WaterZone className="ice-water fluid-zone fluid-zone--water" zoneId="howto-stage-water" />
                <DefaultBlock className="bottom-bar zIndex100" />
                <DefaultBlock className="goal-ledge" />
                <TreasurePile />
                <div className="howto-stage-preview__character">
                    <CharacterSprite />
                </div>
                <div className="mobile-controls howto-stage-preview__mobile">
                    <div className="mobile-controls__dpad" aria-hidden="true">
                        <div className="mobile-controls__joystick-stick"></div>
                    </div>
                    <div className="mobile-controls__actions">
                        <span className="mobile-btn mobile-btn--action mobile-btn--r">
                            <span>R</span>
                        </span>
                        <span className="mobile-btn mobile-btn--action mobile-btn--e">
                            <span>E</span>
                        </span>
                        <span className="mobile-btn mobile-btn--action mobile-btn--jump">
                            <span className="material-symbols-outlined">upload</span>
                        </span>
                    </div>
                </div>
            </div>
        </PagePreviewFrame>
    );
}

function ElementCanvas({ children, className = "" }) {
    return (
        <div className={`howto-element-preview ${className}`.trim()} aria-hidden="true">
            {children}
        </div>
    );
}

function MonsterPreview() {
    return (
        <div className="stage3-monster howto-element-preview__monster">
            <div className="stage3-monster-eye"></div>
            <div className="stage3-monster-teeth"></div>
        </div>
    );
}

function RedButtonPreview() {
    return (
        <div className="howto-element-preview__red-button-stage">
            <span className="howto-element-preview__red-button"></span>
        </div>
    );
}

function ParticlePreview({ type, withFire = false }) {
    const particleClassName = type === "water" ? "water-particle" : "lava-particle";

    return (
        <div className={`howto-element-preview__particle-stage howto-element-preview__particle-stage--${type}`}>
            {withFire ? (
                <>
                    <span className="stage5-flame-glow"></span>
                    <span className="howto-element-preview__fire-core fluid-zone fluid-zone--fire stage5-fluid-zone--fire"></span>
                </>
            ) : null}
            {PARTICLE_LAYOUT.map((particle, index) => (
                <span
                    className={[
                        "physics-particle",
                        type === "water" ? "physics-particle--water" : "physics-particle--lava",
                        particleClassName,
                        "howto-element-preview__particle",
                    ].join(" ")}
                    key={`${type}-particle-${index}`}
                    style={{
                        left: `${particle.x}%`,
                        top: `${particle.y}%`,
                        width: `calc(${particle.size} * var(--cw))`,
                        height: `calc(${particle.size} * var(--cw))`,
                    }}
                ></span>
            ))}
        </div>
    );
}

function IceWaterPreview() {
    return (
        <div className="howto-element-preview__particle-stage howto-element-preview__particle-stage--ice-water">
            {PARTICLE_LAYOUT.map((particle, index) => (
                <span
                    className="physics-particle physics-particle--water water-particle howto-element-preview__particle"
                    key={`ice-water-particle-${index}`}
                    style={{
                        left: `${particle.x}%`,
                        top: `${particle.y}%`,
                        width: `calc(${particle.size} * var(--cw))`,
                        height: `calc(${particle.size} * var(--cw))`,
                    }}
                ></span>
            ))}
            <span className="howto-element-preview__ice-shard howto-element-preview__ice-shard--a"></span>
            <span className="howto-element-preview__ice-shard howto-element-preview__ice-shard--b"></span>
        </div>
    );
}

function FirePreview() {
    return (
        <div className="howto-element-preview__fire-stage">
            <span className="stage5-flame-glow"></span>
            <span className="howto-element-preview__fire-core fluid-zone fluid-zone--fire stage5-fluid-zone--fire"></span>
        </div>
    );
}

function CannonPreview() {
    return (
        <div className="howto-element-preview__cannon-stage">
            <div className="howto-element-preview__cannon-slot">
                <Cannon className="howto-element-preview__cannon" cannonId="howto-cannon" />
            </div>
            <div className="howto-element-preview__cannon-slot">
                <Cannon className="howto-element-preview__gold-cannon" cannonId="howto-gold-cannon" variant="gold" singleUse />
            </div>
        </div>
    );
}

function ElementPreviewInner({ type }) {
    switch (type) {
        case "player":
            return (
                <div className="howto-element-preview__player-stage">
                    <CharacterSprite />
                </div>
            );
        case "jump-block":
            return <JumpBlock className="howto-element-preview__jump-block" />;
        case "default-block":
            return <DefaultBlock className="howto-element-preview__default-block" />;
        case "trigger-block":
            return (
                <TriggerableBlock
                    className="howto-element-preview__trigger-block"
                    triggerPlacement="right"
                    triggerId="howto-trigger"
                    triggerDirection="right"
                    triggerTargets="howto-block"
                />
            );
        case "red-button":
            return <RedButtonPreview />;
        case "white-block":
            return <div className="howto-element-preview__white-block"></div>;
        case "ladder":
            return <Ladder className="howto-element-preview__ladder" />;
        case "lava":
            return <ParticlePreview type="lava" />;
        case "fire":
            return <FirePreview />;
        case "super-lava":
            return <ParticlePreview type="super-lava" withFire />;
        case "water":
            return <ParticlePreview type="water" />;
        case "ice":
            return <IceZone className="howto-element-preview__ice" zoneId="howto-ice" />;
        case "ice-water":
            return <IceWaterPreview />;
        case "solidified-lava":
            return <div className="solidified-block howto-element-preview__solidified-lava"></div>;
        case "stone":
            return <div className="throw-stone howto-element-preview__stone"></div>;
        case "treasure":
            return <TreasurePile className="howto-element-preview__treasure" />;
        case "timer-block":
            return <div className="howto-element-preview__timer-block"></div>;
        case "monster":
            return <MonsterPreview />;
        case "cannon":
            return <CannonPreview />;
        case "portal":
            return (
                <>
                    <PortalIn className="howto-element-preview__portal howto-element-preview__portal--in" portalId="howto-portal-in" targetId="howto-portal-out" />
                    <PortalOut className="howto-element-preview__portal howto-element-preview__portal--out" portalId="howto-portal-out" />
                </>
            );
        default:
            return null;
    }
}

export function PagePreview({ type }) {
    if (type === "main") {
        return <MainPagePreview />;
    }

    if (type === "select") {
        return <StageSelectPreview />;
    }

    return <GamePagePreview />;
}

export function ElementPreview({ type }) {
    return (
        <ElementCanvas className={`howto-element-preview--${type}`}>
            <ElementPreviewInner type={type} />
        </ElementCanvas>
    );
}
