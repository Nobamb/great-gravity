import { useLocation, useNavigate } from "react-router-dom";
import { usePreferences } from "../contexts/PreferencesContext";

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
        setIsFullscreen,
    } = usePreferences();

    const location = useLocation();
    const navigate = useNavigate();

    if (!isPreferencesOpen) return null;

    const isMenuPage = location.pathname === "/" || location.pathname === "/select";
    const isStagePage = location.pathname.startsWith("/stage/");

    const handleBackdropClick = (e) => {
        if (e.target === e.currentTarget) {
            closePreferences();
        }
    };

    const toggleFullscreen = () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen().catch(() => {});
        } else {
            if (document.exitFullscreen) {
                document.exitFullscreen().catch(() => {});
            }
        }
    };

    const handleRetry = () => {
        // Trigger a reload of the current stage route.
        // Or dispatch the R-key logic if possible.
        // For now, reloading the page is a safe way to reset the stage.
        window.location.reload();
    };

    return (
        <div className="preferences-overlay" onClick={handleBackdropClick}>
            <div className="preferences-modal">
                <div className="preferences-header">
                    <h2>{isMenuPage ? "환경설정" : "게임 일시정지"}</h2>
                    <button className="close-button" onClick={closePreferences}>
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
                                            setBgmVolume(Number(e.target.value));
                                            if (isMuted && Number(e.target.value) > 0) setIsMuted(false);
                                        }}
                                    />
                                    <span>{isMuted ? 0 : bgmVolume}%</span>
                                </div>
                            </div>

                            <div className="preference-item">
                                <label>언어 선택</label>
                                <select
                                    value={language}
                                    onChange={(e) => setLanguage(e.target.value)}
                                >
                                    <option value="ko">한국어</option>
                                    <option value="en">English</option>
                                    <option value="ja">日本語</option>
                                    <option value="zh">中文</option>
                                </select>
                            </div>

                            <div className="preference-item">
                                <label>화면 크기</label>
                                <div className="button-group">
                                    <button
                                        className={!isFullscreen ? "active" : ""}
                                        onClick={() => {
                                            if (document.fullscreenElement) {
                                                document.exitFullscreen().catch(() => {});
                                            }
                                        }}
                                    >
                                        기본 화면
                                    </button>
                                    <button
                                        className={isFullscreen ? "active" : ""}
                                        onClick={() => {
                                            if (!document.fullscreenElement) {
                                                document.documentElement.requestFullscreen().catch(() => {});
                                            }
                                        }}
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
                                            setGameVolume(Number(e.target.value));
                                            if (isMuted && Number(e.target.value) > 0) setIsMuted(false);
                                        }}
                                    />
                                    <span>{isMuted ? 0 : gameVolume}%</span>
                                </div>
                            </div>

                            <div className="preference-actions">
                                <button
                                    className="action-button retry"
                                    onClick={handleRetry}
                                >
                                    다시하기
                                </button>
                                <button
                                    className="action-button"
                                    onClick={() => {
                                        navigate("/select");
                                        closePreferences();
                                    }}
                                >
                                    스테이지 선택 이동
                                </button>
                                <button
                                    className="action-button"
                                    onClick={() => {
                                        navigate("/");
                                        closePreferences();
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
