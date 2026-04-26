import { useTranslation } from "react-i18next";

const BOSS_ASSET_BASE_URL = (import.meta.env.VITE_BOSS_ASSET_BASE_URL ?? "")
    .trim()
    .replace(/\/+$/, "");

const STAR_ASSET_URL = BOSS_ASSET_BASE_URL ? `${BOSS_ASSET_BASE_URL}/star.webp` : "";

export default function ClearOverlay() {
    const { t } = useTranslation();

    return (
        <div className="clear-overlay" hidden>
            <div className="clear-card">
                <div className="clear-header">
                    <div className="clear-title">{t("clear.title")}</div>
                </div>
                <div className="clear-stats">
                    <div className="clear-stat">
                        <span className="clear-stat__label">{t("stageSelect.clearTime")}</span>
                        <span className="clear-time">00:00:00</span>
                    </div>
                    <div className="clear-stat clear-death">
                        <span className="clear-stat__label">{t("clear.deathCount")}</span>
                        <span className="clear-death__value">0</span>
                    </div>
                </div>
                <div className="clear-stars" aria-label={t("common.stars", { count: 3 })}>
                    {Array.from({ length: 3 }).map((_, index) => (
                        <span
                            className="clear-star"
                            key={index}
                            style={{ "--clear-star-delay": `${index * 0.3}s` }}
                        >
                            <span className="clear-star-track">
                                {STAR_ASSET_URL ? (
                                    <img src={STAR_ASSET_URL} alt="" draggable="false" />
                                ) : null}
                            </span>
                            <span className="clear-star-mask">
                                <span className="clear-star-fill">
                                    {STAR_ASSET_URL ? (
                                        <img src={STAR_ASSET_URL} alt="" draggable="false" />
                                    ) : null}
                                </span>
                            </span>
                        </span>
                    ))}
                </div>
                <div className="clear-actions">
                    <button
                        type="button"
                        className="clear-action clear-action--retry"
                    >
                        {t("clear.retry")}
                    </button>
                    <button
                        type="button"
                        className="clear-action clear-action--next"
                    >
                        {t("clear.nextStage")}
                    </button>
                    <button
                        type="button"
                        className="clear-action clear-action--stage-select"
                    >
                        {t("clear.stageSelect")}
                    </button>
                    <button
                        type="button"
                        className="clear-action clear-action--main"
                    >
                        {t("clear.main")}
                    </button>
                </div>
            </div>
        </div>
    );
}
