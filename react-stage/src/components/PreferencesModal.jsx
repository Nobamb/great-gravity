import { useState } from "react";
import { useTranslation } from "react-i18next";
import { useLocation, useNavigate } from "react-router-dom";
import { usePreferences } from "../contexts/PreferencesContext";

const LANGUAGE_OPTIONS = [
    { value: "en", label: "English" },
    { value: "ko", label: "한국어" },
    { value: "ja", label: "日本語" },
    { value: "zh", label: "简体中文" },
];
const RESTART_STAGE_EVENT = "great-gravity:restart-stage";

function ScreenSizePreference({ isFullscreen, enterFullscreen, exitFullscreen }) {
    const { t } = useTranslation();

    return (
        <div className="preference-item">
            <label>{t("preferences.screenSize")}</label>
            <div className="button-group">
                <button
                    type="button"
                    className={!isFullscreen ? "active" : ""}
                    onClick={exitFullscreen}
                >
                    {t("preferences.defaultScreen")}
                </button>
                <button
                    type="button"
                    className={isFullscreen ? "active" : ""}
                    onClick={enterFullscreen}
                >
                    {t("preferences.fullscreen")}
                </button>
            </div>
        </div>
    );
}

export default function PreferencesModal() {
    const {
        isPreferencesOpen,
        closePreferences,
        bgmVolume,
        setBgmVolume,
        gameVolume,
        setGameVolume,
        setIsMuted,
        isAudioMuted,
        language,
        setLanguage,
        isFullscreen,
        enterFullscreen,
        exitFullscreen,
        rememberCurrentScreenMode,
    } = usePreferences();
    const { t } = useTranslation();
    const [isLanguageOpen, setIsLanguageOpen] = useState(false);

    const location = useLocation();
    const navigate = useNavigate();

    if (!isPreferencesOpen) return null;

    const isMenuPage = location.pathname === "/" || location.pathname === "/select";
    const isStagePage = location.pathname.startsWith("/stage/");
    const currentLanguageLabel =
        LANGUAGE_OPTIONS.find((option) => option.value === language)?.label ??
        LANGUAGE_OPTIONS[0].label;

    const handleClose = () => {
        setIsLanguageOpen(false);
        closePreferences();
    };

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            handleClose();
        }
    };

    const handleRetry = () => {
        rememberCurrentScreenMode();

        const restartEvent = new Event(RESTART_STAGE_EVENT, { cancelable: true });
        const wasHandled = !window.dispatchEvent(restartEvent);

        handleClose();

        if (!wasHandled) {
            window.location.reload();
        }
    };

    const handleLanguageSelect = (value) => {
        setLanguage(value);
        setIsLanguageOpen(false);
    };

    return (
        <div className="preferences-overlay" onClick={handleBackdropClick}>
            <div className={`preferences-modal ${isStagePage ? "preferences-modal--stage" : ""}`}>
                <div className="preferences-header">
                    <h2>{isMenuPage ? t("preferences.title") : t("preferences.pauseTitle")}</h2>
                    <button
                        type="button"
                        className="close-button"
                        onClick={handleClose}
                        aria-label={t("preferences.close")}
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="preferences-content">
                    {isMenuPage && (
                        <>
                            <div className="preference-item">
                                <label>{t("preferences.bgmVolume")}</label>
                                <div className="volume-control">
                                    <button
                                        type="button"
                                        className={`mute-icon-button ${isAudioMuted ? "muted" : ""}`}
                                        onClick={() => setIsMuted(!isAudioMuted)}
                                        aria-label={isAudioMuted ? t("preferences.unmute") : t("preferences.mute")}
                                    >
                                        <span className="material-symbols-outlined">
                                            {isAudioMuted ? "volume_off" : "volume_up"}
                                        </span>
                                    </button>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={isAudioMuted ? 0 : bgmVolume}
                                        onChange={(e) => {
                                            const nextVolume = Number(e.target.value);
                                            setBgmVolume(nextVolume);
                                            if (isAudioMuted && nextVolume > 0) setIsMuted(false);
                                        }}
                                    />
                                    <span>{isAudioMuted ? 0 : bgmVolume}%</span>
                                </div>
                            </div>

                            <div className="preference-item">
                                <label id="preferences-language-label">
                                    {t("preferences.language")}
                                </label>
                                <div className="language-select">
                                    <button
                                        type="button"
                                        className={`language-select__trigger ${isLanguageOpen ? "active" : ""}`}
                                        onClick={() => {
                                            setIsLanguageOpen((isOpen) => !isOpen);
                                        }}
                                        aria-labelledby="preferences-language-label"
                                        aria-haspopup="listbox"
                                        aria-expanded={isLanguageOpen}
                                    >
                                        <span>{currentLanguageLabel}</span>
                                        <span className="material-symbols-outlined">expand_more</span>
                                    </button>
                                    {isLanguageOpen && (
                                        <div className="language-select__options" role="listbox">
                                            {LANGUAGE_OPTIONS.map((option) => (
                                                <button
                                                    type="button"
                                                    key={option.value}
                                                    role="option"
                                                    aria-selected={language === option.value}
                                                    className={[
                                                        "language-select__option",
                                                        language === option.value ? "active" : "",
                                                    ].filter(Boolean).join(" ")}
                                                    onClick={() => handleLanguageSelect(option.value)}
                                                >
                                                    {option.label}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            <ScreenSizePreference
                                isFullscreen={isFullscreen}
                                enterFullscreen={enterFullscreen}
                                exitFullscreen={exitFullscreen}
                            />
                        </>
                    )}

                    {isStagePage && (
                        <>
                            <div className="preference-item">
                                <label>{t("preferences.gameVolume")}</label>
                                <div className="volume-control">
                                    <button
                                        type="button"
                                        className={`mute-icon-button ${isAudioMuted ? "muted" : ""}`}
                                        onClick={() => setIsMuted(!isAudioMuted)}
                                        aria-label={isAudioMuted ? t("preferences.unmute") : t("preferences.mute")}
                                    >
                                        <span className="material-symbols-outlined">
                                            {isAudioMuted ? "volume_off" : "volume_up"}
                                        </span>
                                    </button>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={isAudioMuted ? 0 : gameVolume}
                                        onChange={(e) => {
                                            const nextVolume = Number(e.target.value);
                                            setGameVolume(nextVolume);
                                            if (isAudioMuted && nextVolume > 0) setIsMuted(false);
                                        }}
                                    />
                                    <span>{isAudioMuted ? 0 : gameVolume}%</span>
                                </div>
                            </div>

                            <div className="preference-actions">
                                <button
                                    type="button"
                                    className="action-button retry"
                                    onClick={handleRetry}
                                >
                                    {t("preferences.retry")}
                                </button>
                                <button
                                    type="button"
                                    className="action-button"
                                    onClick={() => {
                                        navigate("/select");
                                        handleClose();
                                    }}
                                >
                                    {t("preferences.stageSelect")}
                                </button>
                                <button
                                    type="button"
                                    className="action-button"
                                    onClick={() => {
                                        navigate("/");
                                        handleClose();
                                    }}
                                >
                                    {t("preferences.mainMenu")}
                                </button>
                            </div>

                            <ScreenSizePreference
                                isFullscreen={isFullscreen}
                                enterFullscreen={enterFullscreen}
                                exitFullscreen={exitFullscreen}
                            />
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
