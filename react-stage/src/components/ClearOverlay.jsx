import { useTranslation } from "react-i18next";

const STAR_TRACK = "\u2606";
const STAR_FILL = "\u2605";

export default function ClearOverlay() {
    const { t } = useTranslation();

    return (
        <div className="clear-overlay" hidden>
            <div className="clear-card">
                <div className="clear-title">{t("clear.title")}</div>
                <div className="clear-time">00:00:00</div>
                <div className="clear-stars" aria-label={t("common.stars", { count: 3 })}>
                    {Array.from({ length: 3 }).map((_, index) => (
                        <span className="clear-star" key={index}>
                            <span className="clear-star-track">{STAR_TRACK}</span>
                            <span className="clear-star-mask">
                                <span className="clear-star-fill">{STAR_FILL}</span>
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
                        hidden
                    >
                        {t("clear.nextStage")}
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
