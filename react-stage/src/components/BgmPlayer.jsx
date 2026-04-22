import { useEffect, useMemo, useRef } from "react";
import { useLocation } from "react-router-dom";
import { usePreferences } from "../contexts/PreferencesContext.jsx";

const BGM_BASE_URL = (import.meta.env.VITE_BGM_BASE_URL ?? "")
    .trim()
    .replace(/\/+$/, "");

function getBgmFilename(pathname) {
    if (pathname === "/stage/boss") {
        return "boss_bgm.mp3";
    }

    if (pathname.startsWith("/stage/")) {
        return "stage_bgm.mp3";
    }

    return "main_bgm.mp3";
}

function getBgmSource(pathname) {
    if (!BGM_BASE_URL) {
        return "";
    }

    return `${BGM_BASE_URL}/${getBgmFilename(pathname)}`;
}

export default function BgmPlayer() {
    const location = useLocation();
    const {
        bgmVolume,
        isAudioMuted,
        clearAutoplayMute,
    } = usePreferences();
    const audioRef = useRef(null);
    const hasSeenRouteRef = useRef(false);
    const hasUserInteractionRef = useRef(false);
    const sourceUrl = useMemo(
        () => getBgmSource(location.pathname),
        [location.pathname],
    );

    useEffect(() => {
        if (typeof Audio === "undefined") {
            return undefined;
        }

        const audio = new Audio();
        audio.loop = true;
        audio.preload = "auto";
        audioRef.current = audio;

        return () => {
            audio.pause();
            audio.removeAttribute("src");
            audio.load();
            audioRef.current = null;
        };
    }, []);

    useEffect(() => {
        const markUserInteraction = () => {
            hasUserInteractionRef.current = true;
        };

        window.addEventListener("pointerdown", markUserInteraction);
        window.addEventListener("keydown", markUserInteraction);

        return () => {
            window.removeEventListener("pointerdown", markUserInteraction);
            window.removeEventListener("keydown", markUserInteraction);
        };
    }, []);

    useEffect(() => {
        if (!hasSeenRouteRef.current) {
            hasSeenRouteRef.current = true;
            return;
        }

        if (hasUserInteractionRef.current) {
            clearAutoplayMute();
        }
    }, [location.pathname]);

    useEffect(() => {
        const audio = audioRef.current;

        if (!audio) {
            return;
        }

        if (!sourceUrl) {
            audio.pause();
            audio.removeAttribute("src");
            audio.load();
            return;
        }

        if (audio.src !== sourceUrl) {
            audio.src = sourceUrl;
            audio.currentTime = 0;
            audio.load();
        }

        audio.muted = isAudioMuted;
        audio.volume = Math.max(0, Math.min(1, bgmVolume / 100));

        audio.play().catch(() => {
            // Browsers can still reject playback until a user gesture occurs.
        });
    }, [bgmVolume, isAudioMuted, sourceUrl]);

    return null;
}
