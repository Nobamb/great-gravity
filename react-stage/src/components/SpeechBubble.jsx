import React from "react";
import { useTranslation } from "react-i18next";

function SpeechBubble({ isVisible }) {
    const { t } = useTranslation();

    return (
        <div className={`speech-bubble ${isVisible ? "speech-bubble--visible" : ""}`}>
            <span className="speech-bubble__text--desktop">{t("common.settingsTooltipFull")}</span>
            <span className="speech-bubble__text--mobile">{t("common.settingsTooltipShort")}</span>
        </div>
    );
}

export default SpeechBubble;