import { createContext, useContext, useEffect, useState } from "react";

const PreferencesContext = createContext(null);

export function PreferencesProvider({ children }) {
    const [isPreferencesOpen, setIsPreferencesOpen] = useState(false);
    const [bgmVolume, setBgmVolume] = useState(50);
    const [gameVolume, setGameVolume] = useState(50);
    const [isMuted, setIsMuted] = useState(false);
    const [language, setLanguage] = useState("ko"); // ko, en, ja, zh
    const [isFullscreen, setIsFullscreen] = useState(false);

    const openPreferences = () => setIsPreferencesOpen(true);
    const closePreferences = () => setIsPreferencesOpen(false);
    const togglePreferences = () => setIsPreferencesOpen((prev) => !prev);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key.toLowerCase() === "q") {
                togglePreferences();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    useEffect(() => {
        const handleFullscreenChange = () => {
            setIsFullscreen(!!document.fullscreenElement);
        };
        document.addEventListener("fullscreenchange", handleFullscreenChange);
        return () => document.removeEventListener("fullscreenchange", handleFullscreenChange);
    }, []);

    const value = {
        isPreferencesOpen,
        openPreferences,
        closePreferences,
        togglePreferences,
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
    };

    return (
        <PreferencesContext.Provider value={value}>
            {children}
        </PreferencesContext.Provider>
    );
}

export function usePreferences() {
    const context = useContext(PreferencesContext);
    if (!context) {
        throw new Error("usePreferences must be used within a PreferencesProvider");
    }
    return context;
}
