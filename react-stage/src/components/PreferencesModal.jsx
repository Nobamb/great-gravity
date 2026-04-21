import { useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { usePreferences } from "../contexts/PreferencesContext";

const LANGUAGE_OPTIONS = [
    { value: "ko", label: "한국어" },
    { value: "en", label: "English" },
    { value: "ja", label: "日本語" },
    { value: "zh", label: "中文" },
];

export default function PreferencesModal() {
    const {
        isPreferencesOpen,
        closePreferences,
        bgmVolume,
        setBgmVolume,
        gameVolume,
        setGameVolume,
        isMuted,
        setIsMuted,
        language,
        setLanguage,
        isFullscreen,
        enterFullscreen,
        exitFullscreen,
    } = usePreferences();
    const [isLanguageOpen, setIsLanguageOpen] = useState(false);

    const location = useLocation();
    const navigate = useNavigate();

    if (!isPreferencesOpen) return null;

    const isMenuPage = location.pathname === "/" || location.pathname === "/select";
    const isStagePage = location.pathname.startsWith("/stage/");
    const currentLanguageLabel =
        LANGUAGE_OPTIONS.find((option) => option.value === language)?.label ??
        LANGUAGE_OPTIONS[0].label;

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            closePreferences();
        }
    };

    const handleRetry = () => {
        window.location.reload();
    };

    const handleClose = () => {
        setIsLanguageOpen(false);
        closePreferences();
    };

    const handleLanguageSelect = (value) => {
        setLanguage(value);
        setIsLanguageOpen(false);
    };

    return (
        <div className="preferences-overlay" onClick={handleBackdropClick}>
            <div className="preferences-modal">
                <div className="preferences-header">
                    <h2>{isMenuPage ? "환경설정" : "게임 일시정지"}</h2>
                    <button
                        type="button"
                        className="close-button"
                        onClick={handleClose}
                        aria-label="환경설정 닫기"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </div>

                <div className="preferences-content">
                    {isMenuPage && (
                        <>
                            <div className="preference-item">
                                <label>BGM 음량</label>
                                <div className="volume-control">
                                    <button
                                        type="button"
                                        className={`mute-icon-button ${isMuted ? "muted" : ""}`}
                                        onClick={() => setIsMuted(!isMuted)}
                                        aria-label={isMuted ? "음소거 해제" : "음소거"}
                                    >
                                        <span className="material-symbols-outlined">
                                            {isMuted ? "volume_off" : "volume_up"}
                                        </span>
                                    </button>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={isMuted ? 0 : bgmVolume}
                                        onChange={(e) => {
                                            const nextVolume = Number(e.target.value);
                                            setBgmVolume(nextVolume);
                                            if (isMuted && nextVolume > 0) setIsMuted(false);
                                        }}
                                    />
                                    <span>{isMuted ? 0 : bgmVolume}%</span>
                                </div>
                            </div>

                            <div className="preference-item">
                                <label id="preferences-language-label">언어 선택</label>
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

                            <div className="preference-item">
                                <label>화면 크기</label>
                                <div className="button-group">
                                    <button
                                        type="button"
                                        className={!isFullscreen ? "active" : ""}
                                        onClick={exitFullscreen}
                                    >
                                        기본 화면
                                    </button>
                                    <button
                                        type="button"
                                        className={isFullscreen ? "active" : ""}
                                        onClick={enterFullscreen}
                                    >
                                        전체 화면
                                    </button>
                                </div>
                            </div>
                        </>
                    )}

                    {isStagePage && (
                        <>
                            <div className="preference-item">
                                <label>게임 음량</label>
                                <div className="volume-control">
                                    <button
                                        type="button"
                                        className={`mute-icon-button ${isMuted ? "muted" : ""}`}
                                        onClick={() => setIsMuted(!isMuted)}
                                        aria-label={isMuted ? "음소거 해제" : "음소거"}
                                    >
                                        <span className="material-symbols-outlined">
                                            {isMuted ? "volume_off" : "volume_up"}
                                        </span>
                                    </button>
                                    <input
                                        type="range"
                                        min="0"
                                        max="100"
                                        value={isMuted ? 0 : gameVolume}
                                        onChange={(e) => {
                                            const nextVolume = Number(e.target.value);
                                            setGameVolume(nextVolume);
                                            if (isMuted && nextVolume > 0) setIsMuted(false);
                                        }}
                                    />
                                    <span>{isMuted ? 0 : gameVolume}%</span>
                                </div>
                            </div>

                            <div className="preference-actions">
                                <button
                                    type="button"
                                    className="action-button retry"
                                    onClick={handleRetry}
                                >
                                    다시하기
                                </button>
                                <button
                                    type="button"
                                    className="action-button"
                                    onClick={() => {
                                        navigate("/select");
                                        handleClose();
                                    }}
                                >
                                    스테이지 선택 이동
                                </button>
                                <button
                                    type="button"
                                    className="action-button"
                                    onClick={() => {
                                        navigate("/");
                                        handleClose();
                                    }}
                                >
                                    메인 화면 이동
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
