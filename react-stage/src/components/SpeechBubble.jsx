import React from "react";
import { useTranslation } from "react-i18next";

function SpeechBubble({
    isVisible,
    desktopKey = "common.settingsTooltipFull",
    mobileKey = "common.settingsTooltipShort",
}) {
    const { t } = useTranslation();

    return (
        <div className={`speech-bubble ${isVisible ? "speech-bubble--visible" : ""}`}>
            <span className="speech-bubble__text--desktop">{t(desktopKey)}</span>
            <span className="speech-bubble__text--mobile">{t(mobileKey)}</span>
        </div>
    );
}

export default SpeechBubble;
