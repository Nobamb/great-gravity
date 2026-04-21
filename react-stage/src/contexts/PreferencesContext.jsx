import { createContext, useContext, useEffect, useState } from "react";

const PreferencesContext = createContext(null);

function getFullscreenElement() {
    return document.fullscreenElement;
}

function getFullscreenTarget() {
    return document.getElementById("screen") ?? document.documentElement;
}

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
    const syncFullscreenState = () => {
        setIsFullscreen(Boolean(getFullscreenElement()));
    };
    const enterFullscreen = () => {
        const target = getFullscreenTarget();

        if (!target || getFullscreenElement() || typeof target.requestFullscreen !== "function") {
            syncFullscreenState();
            return;
        }

        target.requestFullscreen()
            .then(syncFullscreenState)
            .catch(syncFullscreenState);
    };
    const exitFullscreen = () => {
        if (!getFullscreenElement() || typeof document.exitFullscreen !== "function") {
            syncFullscreenState();
            return;
        }

        document.exitFullscreen()
            .then(syncFullscreenState)
            .catch(syncFullscreenState);
    };
    const toggleFullscreen = () => {
        if (getFullscreenElement()) {
            exitFullscreen();
            return;
        }

        enterFullscreen();
    };

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key.toLowerCase() === "q") {
                togglePreferences();
            }

            if (e.key === "F11") {
                e.preventDefault();
                toggleFullscreen();
            }

            if (e.key === "Escape" && getFullscreenElement()) {
                exitFullscreen();
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, []);

    useEffect(() => {
        syncFullscreenState();

        document.addEventListener("fullscreenchange", syncFullscreenState);
        window.addEventListener("resize", syncFullscreenState);
        return () => {
            document.removeEventListener("fullscreenchange", syncFullscreenState);
            window.removeEventListener("resize", syncFullscreenState);
        };
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
        enterFullscreen,
        exitFullscreen,
        toggleFullscreen,
        syncFullscreenState,
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
