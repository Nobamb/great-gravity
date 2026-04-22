import { createContext, useContext, useEffect, useRef, useState } from "react";
import i18n, {
    LANGUAGE_STORAGE_KEY,
    normalizeLanguage,
} from "../i18n/index.js";

const PreferencesContext = createContext(null);
const SCREEN_MODE_STORAGE_KEY = "great-gravity-screen-mode";
const RESTART_STAGE_EVENT = "great-gravity:restart-stage";

function readStoredScreenMode() {
    if (typeof window === "undefined") {
        return "default";
    }

    try {
        const storedValue = window.localStorage.getItem(SCREEN_MODE_STORAGE_KEY);
        return storedValue === "fullscreen" ? "fullscreen" : "default";
    } catch {
        return "default";
    }
}

function writeStoredScreenMode(mode) {
    if (typeof window === "undefined") {
        return;
    }

    try {
        window.localStorage.setItem(
            SCREEN_MODE_STORAGE_KEY,
            mode === "fullscreen" ? "fullscreen" : "default",
        );
    } catch {
        // Ignore storage errors; fullscreen controls should still work.
    }
}

function writeStoredLanguage(language) {
    if (typeof window === "undefined") {
        return;
    }

    try {
        window.localStorage.setItem(LANGUAGE_STORAGE_KEY, normalizeLanguage(language));
    } catch {
        // Ignore storage errors; language switching should still work in memory.
    }
}

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
    const [isMuted, setIsMutedState] = useState(false);
    const [isAutoplayMuted, setIsAutoplayMuted] = useState(true);
    const [language, setLanguageState] = useState(() => normalizeLanguage(i18n.language));
    const [isActualFullscreen, setIsActualFullscreen] = useState(false);
    const [screenModePreference, setScreenModePreference] = useState(readStoredScreenMode);
    const screenModePreferenceRef = useRef(screenModePreference);
    const isFullscreen = isActualFullscreen;

    const openPreferences = () => setIsPreferencesOpen(true);
    const closePreferences = () => setIsPreferencesOpen(false);
    const togglePreferences = () => setIsPreferencesOpen((prev) => !prev);
    const isAudioMuted = isMuted || isAutoplayMuted;
    const setIsMuted = (nextValue) => {
        setIsMutedState((previousValue) => {
            const resolvedValue =
                typeof nextValue === "function" ? nextValue(previousValue) : nextValue;

            return Boolean(resolvedValue);
        });
        setIsAutoplayMuted(false);
    };
    const clearAutoplayMute = () => {
        setIsAutoplayMuted(false);
    };
    const setLanguage = (nextLanguage) => {
        const normalizedLanguage = normalizeLanguage(nextLanguage);

        setLanguageState(normalizedLanguage);
        writeStoredLanguage(normalizedLanguage);

        if (i18n.language !== normalizedLanguage) {
            i18n.changeLanguage(normalizedLanguage);
        }
    };
    const persistScreenModePreference = (mode) => {
        const nextMode = mode === "fullscreen" ? "fullscreen" : "default";
        screenModePreferenceRef.current = nextMode;
        setScreenModePreference(nextMode);
        writeStoredScreenMode(nextMode);
    };
    const syncFullscreenState = () => {
        const nextIsFullscreen = Boolean(getFullscreenElement());

        setIsActualFullscreen(nextIsFullscreen);

        if (!nextIsFullscreen && screenModePreferenceRef.current === "fullscreen") {
            persistScreenModePreference("default");
        }
    };
    const rememberCurrentScreenMode = () => {
        persistScreenModePreference(
            getFullscreenElement() || screenModePreferenceRef.current === "fullscreen"
                ? "fullscreen"
                : "default",
        );
    };
    const enterFullscreen = () => {
        const target = getFullscreenTarget();

        persistScreenModePreference("fullscreen");

        if (!target || getFullscreenElement() || typeof target.requestFullscreen !== "function") {
            syncFullscreenState();
            return;
        }

        target.requestFullscreen()
            .then(syncFullscreenState)
            .catch(syncFullscreenState);
    };
    const exitFullscreen = () => {
        persistScreenModePreference("default");

        if (!getFullscreenElement() || typeof document.exitFullscreen !== "function") {
            syncFullscreenState();
            return;
        }

        document.exitFullscreen()
            .then(syncFullscreenState)
            .catch(syncFullscreenState);
    };
    const toggleFullscreen = () => {
        if (getFullscreenElement() || screenModePreferenceRef.current === "fullscreen") {
            exitFullscreen();
            return;
        }

        enterFullscreen();
    };
    const requestPreferredFullscreen = () => {
        if (screenModePreferenceRef.current !== "fullscreen" || getFullscreenElement()) {
            syncFullscreenState();
            return;
        }

        const target = getFullscreenTarget();

        if (!target || typeof target.requestFullscreen !== "function") {
            syncFullscreenState();
            return;
        }

        target.requestFullscreen()
            .then(syncFullscreenState)
            .catch(syncFullscreenState);
    };

    useEffect(() => {
        const handleLanguageChanged = (nextLanguage) => {
            const normalizedLanguage = normalizeLanguage(nextLanguage);

            setLanguageState(normalizedLanguage);
            writeStoredLanguage(normalizedLanguage);
        };

        handleLanguageChanged(i18n.language);
        i18n.on("languageChanged", handleLanguageChanged);

        return () => {
            i18n.off("languageChanged", handleLanguageChanged);
        };
    }, []);

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key.toLowerCase() === "q") {
                togglePreferences();
            }

            if (e.key === "F5" && window.location.pathname.startsWith("/stage/")) {
                e.preventDefault();
                rememberCurrentScreenMode();
                window.dispatchEvent(new Event(RESTART_STAGE_EVENT, { cancelable: true }));
                return;
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
        const handleRestoreInteraction = () => {
            requestPreferredFullscreen();
        };

        window.addEventListener("pointerdown", handleRestoreInteraction);
        window.addEventListener("keydown", handleRestoreInteraction);
        return () => {
            window.removeEventListener("pointerdown", handleRestoreInteraction);
            window.removeEventListener("keydown", handleRestoreInteraction);
        };
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
        isAutoplayMuted,
        isAudioMuted,
        clearAutoplayMute,
        language,
        setLanguage,
        isFullscreen,
        enterFullscreen,
        exitFullscreen,
        toggleFullscreen,
        syncFullscreenState,
        rememberCurrentScreenMode,
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
