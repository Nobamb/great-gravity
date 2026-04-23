import PreferencesModal from "./PreferencesModal.jsx";
import { usePreferences } from "../contexts/PreferencesContext.jsx";

export default function Screen({ children }) {
    const { isMobileViewport, isViewportLandscape, isLandscapeScreen } = usePreferences();
    const screenClasses = [
        isMobileViewport ? "screen--mobile" : "",
        isMobileViewport && isViewportLandscape ? "screen--viewport-landscape" : "",
        isMobileViewport && !isViewportLandscape ? "screen--viewport-portrait" : "",
        isMobileViewport && isLandscapeScreen ? "screen--mobile-landscape" : "",
        isMobileViewport && !isLandscapeScreen ? "screen--mobile-portrait" : "",
    ].filter(Boolean).join(" ");

    return (
        <div id="screen" className={screenClasses}>
            {children}
            <PreferencesModal />
        </div>
    );
}
