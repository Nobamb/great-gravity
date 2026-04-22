import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { usePreferences } from "../contexts/PreferencesContext";
import SpeechBubble from "./SpeechBubble";

export default function MainPage() {
    const navigate = useNavigate();
    const { openPreferences } = usePreferences();
    const { t } = useTranslation();
    const [isSettingsHovered, setIsSettingsHovered] = useState(false);

    return (
        <div id="game-container" className="menu-page menu-page--main">
            <div className="menu-page__mesh menu-page__mesh--main"></div>
            <div className="menu-page__glow menu-page__glow--cyan"></div>
            <div className="menu-page__glow menu-page__glow--lava"></div>
            <div className="menu-page__scanlines"></div>

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
                    <div 
                        className="menu-header__icon-wrapper"
                        onMouseEnter={() => setIsSettingsHovered(true)}
                        onMouseLeave={() => setIsSettingsHovered(false)}
                    >
                        <button
                            type="button"
                            className="menu-header__icon"
                            aria-label={t("common.settings")}
                            onClick={openPreferences}
                        >
                            <span className="material-symbols-outlined">settings</span>
                        </button>
                        <SpeechBubble isVisible={isSettingsHovered} />
                    </div>
                </div>
            </header>

            <main className="menu-main menu-main--centered">
                <div className="menu-hero">
                    <div className="menu-hero__eyebrow">{t("main.eyebrow")}</div>
                    <h1 className="menu-hero__title">
                        <span>GREAT</span>
                        <span>GRAVITY</span>
                    </h1>
                    <div className="menu-hero__rule"></div>
                    <div className="menu-hero__actions">
                        <button
                            type="button"
                            className="menu-button menu-button--primary"
                            onClick={() => {
                                navigate("/select");
                            }}
                        >
                            <span>{t("main.start")}</span>
                            <span className="material-symbols-outlined">play_arrow</span>
                        </button>
                        <button
                            type="button"
                            className="menu-button menu-button--secondary"
                        >
                            <span>{t("main.howToPlay")}</span>
                            <span className="material-symbols-outlined">info</span>
                        </button>
                    </div>
                </div>
            </main>
        </div>
    );
}
