import i18n from "i18next";
import { initReactI18next } from "react-i18next";

export const LANGUAGE_STORAGE_KEY = "great-gravity-language";
export const SUPPORTED_LANGUAGES = ["en", "ko", "ja", "zh"];
export const DEFAULT_LANGUAGE = "en";

export function normalizeLanguage(value) {
    return SUPPORTED_LANGUAGES.includes(value) ? value : DEFAULT_LANGUAGE;
}

function readStoredLanguage() {
    if (typeof window === "undefined") {
        return DEFAULT_LANGUAGE;
    }

    try {
        return normalizeLanguage(window.localStorage.getItem(LANGUAGE_STORAGE_KEY));
    } catch {
        return DEFAULT_LANGUAGE;
    }
}

function syncDocumentLanguage(language) {
    if (typeof document !== "undefined") {
        document.documentElement.lang = normalizeLanguage(language);
    }
}

const resources = {
    en: {
        translation: {
            common: {
                account: "Account",
                settings: "Settings",
                stars: "{{count}} stars",
            },
            main: {
                eyebrow: "NEON CORE PLATFORMER",
                start: "Start",
                howToPlay: "How to Play",
            },
            preferences: {
                title: "Preferences",
                pauseTitle: "Game Paused",
                close: "Close preferences",
                bgmVolume: "BGM Volume",
                gameVolume: "Game Volume",
                mute: "Mute",
                unmute: "Unmute",
                language: "Language",
                screenSize: "Screen Size",
                defaultScreen: "Default",
                fullscreen: "Fullscreen",
                retry: "Retry",
                stageSelect: "Go to Stage Select",
                mainMenu: "Go to Main Menu",
            },
            stageSelect: {
                backToMain: "Main Menu",
                titlePrefix: "Select",
                titleAccent: "a Stage",
                lockedMessage: "Clear the previous stage before playing this stage.",
                deathCount: "Deaths",
                clearTime: "Clear Time",
                bestRecord: "Best",
                selectPrompt: "Select a stage",
                actionHint: "Click a card to show Start and Ranking buttons",
                previous: "Prev",
                next: "Next",
                ranking: "Ranking",
                start: "Start",
                pagesLabel: "stage pages",
            },
            clear: {
                title: "Stage Clear",
                retry: "Retry",
                nextStage: "Next Stage",
                main: "Main Menu",
            },
            game: {
                holdRestart: "Hold R to restart",
                remainingMonsterMission: "remaining monster mission",
                lockedTreasureDefault: "The treasure is blocked!\nDefeat the monster first.",
                lockedTreasureStage7: "The treasure is blocked!\nDefeat 2 monsters first.",
            },
        },
    },
    ko: {
        translation: {
            common: {
                account: "계정",
                settings: "환경설정",
                stars: "별 {{count}}개",
            },
            main: {
                eyebrow: "네온 코어 플랫포머",
                start: "시작하기",
                howToPlay: "게임 방법",
            },
            preferences: {
                title: "환경설정",
                pauseTitle: "게임 일시정지",
                close: "환경설정 닫기",
                bgmVolume: "BGM 음량",
                gameVolume: "게임 음량",
                mute: "음소거",
                unmute: "음소거 해제",
                language: "언어 선택",
                screenSize: "화면 크기",
                defaultScreen: "기본 화면",
                fullscreen: "전체 화면",
                retry: "다시하기",
                stageSelect: "스테이지 선택 화면 이동",
                mainMenu: "메인 화면 이동",
            },
            stageSelect: {
                backToMain: "메인 화면으로",
                titlePrefix: "스테이지를",
                titleAccent: "선택해주세요",
                lockedMessage: "이전 스테이지를 클리어해야 해당 스테이지를 진행할 수 있습니다.",
                deathCount: "사망 횟수",
                clearTime: "클리어 시간",
                bestRecord: "최고 기록",
                selectPrompt: "스테이지를 선택해 주세요",
                actionHint: "카드를 클릭하면 시작하기와 랭킹보기 버튼이 나타납니다",
                previous: "이전",
                next: "다음",
                ranking: "랭킹보기",
                start: "시작하기",
                pagesLabel: "스테이지 페이지",
            },
            clear: {
                title: "Stage Clear",
                retry: "다시하기",
                nextStage: "다음 스테이지",
                main: "메인화면",
            },
            game: {
                holdRestart: "R을 길게 눌러 다시 시작",
                remainingMonsterMission: "남은 몬스터 미션",
                lockedTreasureDefault: "지금은 보물에 접근할 수 없습니다!\n몬스터를 처치하고 오세요.",
                lockedTreasureStage7: "지금은 보물에 접근할 수 없습니다!\n몬스터 2마리를 처치하고 오세요.",
            },
        },
    },
    ja: {
        translation: {
            common: {
                account: "アカウント",
                settings: "設定",
                stars: "星 {{count}} 個",
            },
            main: {
                eyebrow: "ネオンコアプラットフォーマー",
                start: "開始",
                howToPlay: "遊び方",
            },
            preferences: {
                title: "設定",
                pauseTitle: "ゲーム一時停止",
                close: "設定を閉じる",
                bgmVolume: "BGM 音量",
                gameVolume: "ゲーム音量",
                mute: "ミュート",
                unmute: "ミュート解除",
                language: "言語選択",
                screenSize: "画面サイズ",
                defaultScreen: "通常画面",
                fullscreen: "全画面",
                retry: "リトライ",
                stageSelect: "ステージ選択へ",
                mainMenu: "メイン画面へ",
            },
            stageSelect: {
                backToMain: "メイン画面へ",
                titlePrefix: "ステージを",
                titleAccent: "選択してください",
                lockedMessage: "前のステージをクリアすると、このステージをプレイできます。",
                deathCount: "死亡回数",
                clearTime: "クリア時間",
                bestRecord: "ベスト記録",
                selectPrompt: "ステージを選択してください",
                actionHint: "カードをクリックすると開始とランキングボタンが表示されます",
                previous: "前へ",
                next: "次へ",
                ranking: "ランキング",
                start: "開始",
                pagesLabel: "ステージページ",
            },
            clear: {
                title: "Stage Clear",
                retry: "リトライ",
                nextStage: "次のステージ",
                main: "メイン画面",
            },
            game: {
                holdRestart: "R を長押ししてリスタート",
                remainingMonsterMission: "残りモンスターミッション",
                lockedTreasureDefault: "まだ宝物に近づけません！\n先にモンスターを倒してください。",
                lockedTreasureStage7: "まだ宝物に近づけません！\n先にモンスターを2体倒してください。",
            },
        },
    },
    zh: {
        translation: {
            common: {
                account: "账户",
                settings: "设置",
                stars: "{{count}} 颗星",
            },
            main: {
                eyebrow: "霓虹核心平台跳跃",
                start: "开始",
                howToPlay: "玩法说明",
            },
            preferences: {
                title: "设置",
                pauseTitle: "游戏暂停",
                close: "关闭设置",
                bgmVolume: "BGM 音量",
                gameVolume: "游戏音量",
                mute: "静音",
                unmute: "取消静音",
                language: "语言选择",
                screenSize: "画面大小",
                defaultScreen: "默认画面",
                fullscreen: "全屏",
                retry: "重试",
                stageSelect: "前往关卡选择",
                mainMenu: "前往主菜单",
            },
            stageSelect: {
                backToMain: "返回主菜单",
                titlePrefix: "选择",
                titleAccent: "关卡",
                lockedMessage: "请先通关前一个关卡，才能挑战此关卡。",
                deathCount: "死亡次数",
                clearTime: "通关时间",
                bestRecord: "最佳记录",
                selectPrompt: "请选择关卡",
                actionHint: "点击卡片后会显示开始和排行榜按钮",
                previous: "上一页",
                next: "下一页",
                ranking: "排行榜",
                start: "开始",
                pagesLabel: "关卡页",
            },
            clear: {
                title: "Stage Clear",
                retry: "重试",
                nextStage: "下一关",
                main: "主菜单",
            },
            game: {
                holdRestart: "长按 R 重新开始",
                remainingMonsterMission: "剩余怪物任务",
                lockedTreasureDefault: "现在还不能接近宝物！\n请先击败怪物。",
                lockedTreasureStage7: "现在还不能接近宝物！\n请先击败 2 只怪物。",
            },
        },
    },
};

const initialLanguage = readStoredLanguage();

i18n
    .use(initReactI18next)
    .init({
        resources,
        lng: initialLanguage,
        fallbackLng: DEFAULT_LANGUAGE,
        interpolation: {
            escapeValue: false,
        },
        returnNull: false,
    });

syncDocumentLanguage(initialLanguage);

i18n.on("languageChanged", syncDocumentLanguage);

export default i18n;
