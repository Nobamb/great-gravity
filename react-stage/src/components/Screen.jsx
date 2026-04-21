import PreferencesModal from "./PreferencesModal.jsx";

export default function Screen({ children }) {
    return (
        <div id="screen">
            {children}
            <PreferencesModal />
        </div>
    );
}
