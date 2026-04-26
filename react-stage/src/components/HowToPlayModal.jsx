import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { ElementPreview, PagePreview } from "./HowToPlayPreviews.jsx";

const PAGE_SECTIONS = [
    {
        titleKey: "howToPlay.pages.main.title",
        preview: "main",
        items: [
            ["howToPlay.pages.main.howToButtonTitle", "howToPlay.pages.main.howToButtonDescription"],
            ["howToPlay.pages.main.startButtonTitle", "howToPlay.pages.main.startButtonDescription"],
            ["howToPlay.pages.shared.settingsTitle", "howToPlay.pages.shared.settingsDescription"],
            ["howToPlay.pages.shared.accountTitle", "howToPlay.pages.shared.accountDescription"],
        ],
    },
    {
        titleKey: "howToPlay.pages.select.title",
        preview: "select",
        items: [
            ["howToPlay.pages.shared.settingsTitle", "howToPlay.pages.shared.settingsDescription"],
            ["howToPlay.pages.shared.accountTitle", "howToPlay.pages.shared.accountDescription"],
            ["howToPlay.pages.select.backTitle", "howToPlay.pages.select.backDescription"],
            ["howToPlay.pages.select.stageTitle", "howToPlay.pages.select.stageDescription"],
            ["howToPlay.pages.select.paginationTitle", "howToPlay.pages.select.paginationDescription"],
            ["howToPlay.pages.select.rankingTitle", "howToPlay.pages.select.rankingDescription"],
            ["howToPlay.pages.select.startTitle", "howToPlay.pages.select.startDescription"],
        ],
    },
    {
        titleKey: "howToPlay.pages.game.title",
        preview: "game",
        items: [
            ["howToPlay.pages.game.settingsTitle", "howToPlay.pages.game.settingsDescription"],
            ["howToPlay.pages.game.timerTitle", "howToPlay.pages.game.timerDescription"],
            ["howToPlay.pages.game.joystickTitle", "howToPlay.pages.game.joystickDescription"],
            ["howToPlay.pages.game.mobileButtonsTitle", "howToPlay.pages.game.mobileButtonsDescription"],
            ["howToPlay.pages.game.howToPlayTitle", "howToPlay.pages.game.howToPlayDescription"],
        ],
    },
];

const ELEMENT_SECTIONS = [
    ["player", "howToPlay.elements.player.title", "howToPlay.elements.player.description"],
    ["jump-block", "howToPlay.elements.jumpBlock.title", "howToPlay.elements.jumpBlock.description"],
    ["default-block", "howToPlay.elements.defaultBlock.title", "howToPlay.elements.defaultBlock.description"],
    ["trigger-block", "howToPlay.elements.triggerBlock.title", "howToPlay.elements.triggerBlock.description"],
    ["red-button", "howToPlay.elements.redButton.title", "howToPlay.elements.redButton.description"],
    ["white-block", "howToPlay.elements.whiteBlock.title", "howToPlay.elements.whiteBlock.description"],
    ["ladder", "howToPlay.elements.ladder.title", "howToPlay.elements.ladder.description"],
    ["lava", "howToPlay.elements.lava.title", "howToPlay.elements.lava.description"],
    ["fire", "howToPlay.elements.fire.title", "howToPlay.elements.fire.description"],
    ["super-lava", "howToPlay.elements.superLava.title", "howToPlay.elements.superLava.description"],
    ["water", "howToPlay.elements.water.title", "howToPlay.elements.water.description"],
    ["ice", "howToPlay.elements.ice.title", "howToPlay.elements.ice.description"],
    ["ice-water", "howToPlay.elements.iceWater.title", "howToPlay.elements.iceWater.description"],
    ["solidified-lava", "howToPlay.elements.solidifiedLava.title", "howToPlay.elements.solidifiedLava.description"],
    ["stone", "howToPlay.elements.stone.title", "howToPlay.elements.stone.description"],
    ["treasure", "howToPlay.elements.treasure.title", "howToPlay.elements.treasure.description"],
    ["timer-block", "howToPlay.elements.timerBlock.title", "howToPlay.elements.timerBlock.description"],
    ["monster", "howToPlay.elements.monster.title", "howToPlay.elements.monster.description"],
    ["cannon", "howToPlay.elements.cannon.title", "howToPlay.elements.cannon.description"],
    ["portal", "howToPlay.elements.portal.title", "howToPlay.elements.portal.description"],
];

export default function HowToPlayModal({ isOpen, onClose }) {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState("pages");

    useEffect(() => {
        const handleKeyDown = (event) => {
            if (event.key === "Escape" && isOpen) {
                onClose();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="howto-modal-overlay" onClick={onClose}>
            <div className="howto-modal" onClick={(event) => event.stopPropagation()}>
                <header className="howto-modal__header">
                    <h2 className="howto-modal__title">{t("howToPlay.title")}</h2>
                    <button
                        type="button"
                        className="howto-modal__close-btn"
                        onClick={onClose}
                        aria-label={t("howToPlay.close")}
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </header>

                <div className="howto-modal__tabs">
                    <button
                        type="button"
                        className={`howto-modal__tab ${activeTab === "pages" ? "howto-modal__tab--active" : ""}`}
                        onClick={() => setActiveTab("pages")}
                    >
                        {t("howToPlay.tabs.pages")}
                    </button>
                    <button
                        type="button"
                        className={`howto-modal__tab ${activeTab === "elements" ? "howto-modal__tab--active" : ""}`}
                        onClick={() => setActiveTab("elements")}
                    >
                        {t("howToPlay.tabs.elements")}
                    </button>
                </div>

                <div className="howto-modal__content-area">
                    {activeTab === "pages" && (
                        <div className="howto-modal__content howto-modal__content--pages">
                            {PAGE_SECTIONS.map((section) => (
                                <section className="howto-section" key={section.titleKey}>
                                    <h3>{t(section.titleKey)}</h3>
                                    <PagePreview type={section.preview} />
                                    <dl>
                                        {section.items.map(([titleKey, descriptionKey]) => (
                                            <div className="howto-definition" key={titleKey}>
                                                <dt><strong>{t(titleKey)}</strong></dt>
                                                <dd>{t(descriptionKey)}</dd>
                                            </div>
                                        ))}
                                    </dl>
                                </section>
                            ))}
                        </div>
                    )}

                    {activeTab === "elements" && (
                        <div className="howto-modal__content howto-modal__content--elements">
                            {ELEMENT_SECTIONS.map(([type, titleKey, descriptionKey]) => (
                                <section className="howto-section" key={type}>
                                    <h3>{t(titleKey)}</h3>
                                    <ElementPreview type={type} />
                                    <p>{t(descriptionKey)}</p>
                                </section>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
