import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
    getStagePath,
    STAGE_LIST,
} from "../stages/stageDefinitions.js";
import {
    formatProgressTime,
    getProgressSnapshot,
} from "../stages/progressStorage.js";

const STAR_TRACK = "\u2606";
const STAR_FILL = "\u2605";
const LOCKED_STAGE_MESSAGE = "이전 스테이지를 클리어해야 해당 스테이지를 진행할 수 있습니다.";

function StarRating({ value }) {
    return (
        <div className="stage-select-card__stars" aria-label={`${value} stars`}>
            {Array.from({ length: 3 }).map((_, index) => {
                const fillAmount = Math.max(0, Math.min(1, value - index));

                return (
                    <span className="stage-select-card__star" key={index}>
                        <span className="stage-select-card__star-track">{STAR_TRACK}</span>
                        <span
                            className="stage-select-card__star-mask"
                            style={{ width: `${fillAmount * 100}%` }}
                        >
                            <span className="stage-select-card__star-fill">{STAR_FILL}</span>
                        </span>
                    </span>
                );
            })}
        </div>
    );
}

export default function StageSelectPage() {
    const navigate = useNavigate();
    const popupTimerRef = useRef(null);
    const [progress] = useState(() => getProgressSnapshot());
    const [selectedStageId, setSelectedStageId] = useState(null);
    const [popupMessage, setPopupMessage] = useState(null);
    const selectedStage = useMemo(
        () => STAGE_LIST.find((stage) => stage.id === selectedStageId) ?? null,
        [selectedStageId],
    );
    const selectedProgress = selectedStage ? progress[selectedStage.id] : null;
    const showStageActions = Boolean(selectedStage && selectedProgress?.unlocked);

    useEffect(() => () => {
        if (popupTimerRef.current) {
            window.clearTimeout(popupTimerRef.current);
        }
    }, []);

    function showLockedPopup() {
        setPopupMessage(LOCKED_STAGE_MESSAGE);

        if (popupTimerRef.current) {
            window.clearTimeout(popupTimerRef.current);
        }

        popupTimerRef.current = window.setTimeout(() => {
            setPopupMessage(null);
            popupTimerRef.current = null;
        }, 2200);
    }

    return (
        <div id="game-container" className="menu-page menu-page--select">
            <div className="menu-page__mesh menu-page__mesh--select"></div>
            <div className="menu-page__glow menu-page__glow--cyan"></div>
            <div className="menu-page__glow menu-page__glow--lava"></div>

            <header className="menu-header">
                <div className="menu-header__brand">GREAT-GRAVITY</div>
                <div className="menu-header__actions">
                    <button
                        type="button"
                        className="menu-header__icon"
                        aria-label="account"
                    >
                        <span className="material-symbols-outlined">account_circle</span>
                    </button>
                    <button
                        type="button"
                        className="menu-header__icon"
                        aria-label="settings"
                    >
                        <span className="material-symbols-outlined">settings</span>
                    </button>
                </div>
            </header>

            <main className="stage-select">
                <div className="stage-select__heading">
                    <button
                        type="button"
                        className="stage-select__back"
                        onClick={() => {
                            navigate("/");
                        }}
                    >
                        <span className="material-symbols-outlined">arrow_back_ios</span>
                        <span>메인 화면으로</span>
                    </button>
                    <h1 className="stage-select__title">
                        스테이지를<span>선택해주세요</span>
                    </h1>
                </div>

                <div className="stage-select__grid">
                    {STAGE_LIST.map((stage) => {
                        const stageProgress = progress[stage.id];
                        const isUnlocked = Boolean(stageProgress?.unlocked);
                        const isSelected = stage.id === selectedStageId;
                        const isCleared = Boolean(stageProgress?.cleared);

                        return (
                            <button
                                type="button"
                                key={stage.id}
                                className={[
                                    "stage-select-card",
                                    `stage-select-card--${stage.accent}`,
                                    isSelected ? "is-selected" : "",
                                    !isUnlocked ? "is-locked" : "",
                                ].filter(Boolean).join(" ")}
                                onClick={() => {
                                    if (!isUnlocked) {
                                        showLockedPopup();
                                        return;
                                    }

                                    setSelectedStageId(stage.id);
                                }}
                            >
                                <span className="stage-select-card__index">
                                    {stage.selectLabel}
                                </span>
                                {isUnlocked ? (
                                    <div className="stage-select-card__content">
                                        <StarRating value={stageProgress?.bestStars ?? 0} />
                                        <div className="stage-select-card__meta">
                                            <p>
                                                사망 횟수: <span>{stageProgress?.deathCount ?? 0}</span>
                                            </p>
                                            <p>
                                                클리어 시간: <span>{isCleared ? formatProgressTime(stageProgress?.bestTimeMs) : "--:--:--"}</span>
                                            </p>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="stage-select-card__lock">
                                        <span className="material-symbols-outlined">lock</span>
                                    </div>
                                )}
                            </button>
                        );
                    })}
                </div>

                <div className="stage-select__footer">
                    <div className="stage-select__selection">
                        <div className="stage-select__selection-label">
                            {selectedStage?.title ?? "스테이지를 선택해 주세요"}
                        </div>
                        <div className="stage-select__selection-meta">
                            {showStageActions ? (
                                <>
                                    <span>사망 횟수 {selectedProgress?.deathCount ?? 0}</span>
                                    <span>최고 기록 {formatProgressTime(selectedProgress?.bestTimeMs)}</span>
                                </>
                            ) : (
                                <span>카드를 클릭하면 시작하기와 랭킹보기 버튼이 나타납니다</span>
                            )}
                        </div>
                    </div>
                    {showStageActions ? (
                        <div className="stage-select__actions">
                            <button
                                type="button"
                                className="menu-button menu-button--secondary stage-select__action"
                                disabled
                            >
                                랭킹보기
                            </button>
                            <button
                                type="button"
                                className="menu-button menu-button--primary stage-select__action"
                                onClick={() => {
                                    navigate(getStagePath(selectedStage.id));
                                }}
                            >
                                시작하기
                            </button>
                        </div>
                    ) : null}
                </div>
            </main>

            <div
                className={`stage-select-popup ${popupMessage ? "is-visible" : ""}`}
                role="status"
                aria-live="polite"
            >
                {popupMessage}
            </div>
        </div>
    );
}
