import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router-dom";
import {
    getStagePath,
    STAGE_LIST,
} from "../stages/stageDefinitions.js";
import {
    formatProgressTime,
    getProgressSnapshot,
} from "../stages/progressStorage.js";
import { usePreferences } from "../contexts/PreferencesContext.jsx";

const STAR_TRACK = "\u2606";
const STAR_FILL = "\u2605";
const MOBILE_MAX_WIDTH_QUERY = "(max-width: 1023px)";
const MOBILE_ITEMS_PER_PAGE = 4;

function StarRating({ value }) {
    const { t } = useTranslation();

    return (
        <div className="stage-select-card__stars" aria-label={t("common.stars", { count: value })}>
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

function getInitialCompactLayout() {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
        return false;
    }

    return window.matchMedia(MOBILE_MAX_WIDTH_QUERY).matches;
}

export default function StageSelectPage() {
    const navigate = useNavigate();
    const { openPreferences } = usePreferences();
    const { t } = useTranslation();
    const popupTimerRef = useRef(null);
    const [progress] = useState(() => getProgressSnapshot());
    const [selectedStageId, setSelectedStageId] = useState(null);
    const [popupMessage, setPopupMessage] = useState(null);
    const [isCompactLayout, setIsCompactLayout] = useState(getInitialCompactLayout);
    const [currentPageIndex, setCurrentPageIndex] = useState(0);
    const selectedStage = useMemo(
        () => STAGE_LIST.find((stage) => stage.id === selectedStageId) ?? null,
        [selectedStageId],
    );
    const selectedProgress = selectedStage ? progress[selectedStage.id] : null;
    const showStageActions = Boolean(selectedStage && selectedProgress?.unlocked);
    const totalPages = Math.max(1, Math.ceil(STAGE_LIST.length / MOBILE_ITEMS_PER_PAGE));
    const visibleStages = useMemo(() => {
        if (!isCompactLayout) {
            return STAGE_LIST;
        }

        const startIndex = currentPageIndex * MOBILE_ITEMS_PER_PAGE;
        return STAGE_LIST.slice(startIndex, startIndex + MOBILE_ITEMS_PER_PAGE);
    }, [currentPageIndex, isCompactLayout]);
    const pageIndicatorText = isCompactLayout
        ? `${currentPageIndex + 1}/${totalPages}`
        : "1/1";

    useEffect(() => () => {
        if (popupTimerRef.current) {
            window.clearTimeout(popupTimerRef.current);
        }
    }, []);

    useEffect(() => {
        if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
            return undefined;
        }

        const mediaQueryList = window.matchMedia(MOBILE_MAX_WIDTH_QUERY);
        const handleChange = (event) => {
            setIsCompactLayout(event.matches);
        };

        setIsCompactLayout(mediaQueryList.matches);

        if (typeof mediaQueryList.addEventListener === "function") {
            mediaQueryList.addEventListener("change", handleChange);
            return () => {
                mediaQueryList.removeEventListener("change", handleChange);
            };
        }

        mediaQueryList.addListener(handleChange);
        return () => {
            mediaQueryList.removeListener(handleChange);
        };
    }, []);

    useEffect(() => {
        if (!isCompactLayout) {
            if (currentPageIndex !== 0) {
                setCurrentPageIndex(0);
            }
            return;
        }

        setCurrentPageIndex((previousPageIndex) =>
            Math.min(previousPageIndex, totalPages - 1),
        );
    }, [currentPageIndex, isCompactLayout, totalPages]);

    useEffect(() => {
        if (!isCompactLayout || !selectedStageId) {
            return;
        }

        const selectedStageIndex = STAGE_LIST.findIndex((stage) => stage.id === selectedStageId);

        if (selectedStageIndex < 0) {
            return;
        }

        const nextPageIndex = Math.floor(selectedStageIndex / MOBILE_ITEMS_PER_PAGE);
        setCurrentPageIndex((previousPageIndex) =>
            previousPageIndex === nextPageIndex ? previousPageIndex : nextPageIndex,
        );
    }, [isCompactLayout, selectedStageId]);

    function showLockedPopup() {
        setPopupMessage("locked");

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
                        aria-label={t("common.account")}
                    >
                        <span className="material-symbols-outlined">account_circle</span>
                    </button>
                    <button
                        type="button"
                        className="menu-header__icon"
                        aria-label={t("common.settings")}
                        onClick={openPreferences}
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
                        <span>{t("stageSelect.backToMain")}</span>
                    </button>
                    <h1 className="stage-select__title">
                        {t("stageSelect.titlePrefix")}<span>{t("stageSelect.titleAccent")}</span>
                    </h1>
                </div>

                <div className="stage-select__grid">
                    {visibleStages.map((stage) => {
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
                                                {t("stageSelect.deathCount")}: <span>{stageProgress?.deathCount ?? 0}</span>
                                            </p>
                                            <p>
                                                {t("stageSelect.clearTime")}: <span>{isCleared ? formatProgressTime(stageProgress?.bestTimeMs) : "--:--:--"}</span>
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
                            {selectedStage?.title ?? t("stageSelect.selectPrompt")}
                        </div>
                        <div className="stage-select__selection-meta">
                            {showStageActions ? (
                                <>
                                    <span>{t("stageSelect.deathCount")} {selectedProgress?.deathCount ?? 0}</span>
                                    <span>{t("stageSelect.bestRecord")} {formatProgressTime(selectedProgress?.bestTimeMs)}</span>
                                </>
                            ) : (
                                <span>{t("stageSelect.actionHint")}</span>
                            )}
                        </div>
                    </div>

                    <div className="stage-select__pagination" aria-label={t("stageSelect.pagesLabel")}>
                        <button
                            type="button"
                            className="stage-select__page-button"
                            onClick={() => {
                                if (!isCompactLayout) {
                                    return;
                                }

                                setCurrentPageIndex((previousPageIndex) =>
                                    Math.max(0, previousPageIndex - 1),
                                );
                            }}
                            disabled={!isCompactLayout || currentPageIndex === 0}
                        >
                            {t("stageSelect.previous")}
                        </button>
                        <span className="stage-select__page-indicator">
                            {pageIndicatorText}
                        </span>
                        <button
                            type="button"
                            className="stage-select__page-button"
                            onClick={() => {
                                if (!isCompactLayout) {
                                    return;
                                }

                                setCurrentPageIndex((previousPageIndex) =>
                                    Math.min(totalPages - 1, previousPageIndex + 1),
                                );
                            }}
                            disabled={!isCompactLayout || currentPageIndex === totalPages - 1}
                        >
                            {t("stageSelect.next")}
                        </button>
                    </div>

                    {showStageActions ? (
                        <div className="stage-select__actions">
                            <button
                                type="button"
                                className="menu-button menu-button--secondary stage-select__action"
                                disabled
                            >
                                {t("stageSelect.ranking")}
                            </button>
                            <button
                                type="button"
                                className="menu-button menu-button--primary stage-select__action"
                                onClick={() => {
                                    navigate(getStagePath(selectedStage.id));
                                }}
                            >
                                {t("stageSelect.start")}
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
                {popupMessage ? t("stageSelect.lockedMessage") : null}
            </div>
        </div>
    );
}
