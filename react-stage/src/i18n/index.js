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

const commonHowToPlay = {
    en: {
        title: "How to Play",
        close: "Close how to play",
        tabs: { pages: "Page Guide", elements: "Game Elements" },
        pages: {
            shared: {
                settingsTitle: "Settings Button (Header)",
                settingsDescription: "Opens the settings popup.",
                accountTitle: "Account Button (Header)",
                accountDescription: "Shows the login or account entry point. Login features are planned for a later update.",
            },
            main: {
                title: "Main Page",
                howToButtonTitle: "How to Play Button",
                howToButtonDescription: "Opens this guide. You can also press H to open the same guide.",
                startButtonTitle: "Start Button",
                startButtonDescription: "Moves to the stage select page.",
            },
            select: {
                title: "Stage Select Page",
                backTitle: "Main Menu",
                backDescription: "Moves back to the main page.",
                stageTitle: "Stage Cards",
                stageDescription: "Shows stages, stars, death count, and best clear time. Locked stages require clearing the previous stage first.",
                paginationTitle: "Prev / Next",
                paginationDescription: "Changes the visible stage page.",
                rankingTitle: "Ranking",
                rankingDescription: "Opens the selected stage ranking page when ranking support is available.",
                startTitle: "Start",
                startDescription: "Starts the selected stage.",
            },
            game: {
                title: "Game Screen",
                settingsTitle: "Settings Button (In Game)",
                settingsDescription: "Opens the in-game settings popup.",
                timerTitle: "Timer",
                timerDescription: "Shows the current play time in real time.",
                joystickTitle: "Joystick (Mobile)",
                joystickDescription: "Controls character movement on mobile screens.",
                mobileButtonsTitle: "Mobile Buttons",
                mobileButtonsDescription: "E is interact, R is restart, and the yellow button is jump.",
                howToPlayTitle: "How to Play",
                howToPlayDescription: "Jump with the character, use terrain and interactions, and reach the treasure or defeat the boss to clear the stage. Clearing a stage unlocks the next one.",
            },
        },
        elements: {
            player: { title: "Player", description: "Moves left and right, climbs ladders, jumps, interacts with triggers, and can swim in water for a limited time." },
            jumpBlock: { title: "Jump Block", description: "Boosts the character's jump height when jumped from this block." },
            defaultBlock: { title: "Normal Block", description: "A standard platform that supports the character and other gameplay objects." },
            triggerBlock: { title: "Trigger Block", description: "Interact with it to remove the connected normal block." },
            redButton: { title: "Red Button", description: "Interact with it to remove the connected white blocks." },
            whiteBlock: { title: "White Block", description: "A removable block controlled by a red button." },
            ladder: { title: "Ladder", description: "Use vertical controls to climb up or down." },
            lava: { title: "Lava", description: "A dangerous fluid. It can defeat monsters but harms the character. Water can turn lava into solidified lava." },
            fire: { title: "Fire", description: "A hazard that interacts with lava, water, and ice." },
            superLava: { title: "Super Lava", description: "Created when lava meets fire. It can only be solidified through ice water." },
            water: { title: "Water", description: "The character can swim in it for a limited time. Water also reacts with lava and ice." },
            ice: { title: "Ice", description: "Melts into water with fire and can freeze water into ice water." },
            iceWater: { title: "Ice Water", description: "A cold fluid that can turn super lava into solidified lava." },
            solidifiedLava: { title: "Solidified Lava", description: "Created when lava and water react. It can be used as footing or as an obstacle." },
            stone: { title: "Stone", description: "Can be thrown to break solidified lava or activate trigger blocks and red buttons." },
            treasure: { title: "Treasure", description: "Reach the treasure to clear regular stages." },
            timerBlock: { title: "Timer Block", description: "A temporary block that disappears after its timer finishes." },
            monster: { title: "Monster", description: "A hazard that damages the player. Some stages require defeating monsters to clear." },
            cannon: { title: "Cannon / Gold Cannon", description: "Cannons launch the character along a dragged trajectory. Gold cannons work like normal cannons and can be used only once, but they can launch the character farther than normal cannons." },
            portal: { title: "Portal In / Out", description: "Entering the orange portal moves the character to the blue exit portal." },
        },
    },
    ko: {
        title: "게임 방법",
        close: "게임 방법 닫기",
        tabs: { pages: "페이지 별 설명", elements: "게임 내 요소" },
        pages: {
            shared: {
                settingsTitle: "환경설정 버튼(헤더)",
                settingsDescription: "환경설정 팝업창을 여는 버튼입니다.",
                accountTitle: "프로필 버튼(헤더)",
                accountDescription: "로그인 또는 계정 진입점을 표시합니다. 로그인 기능은 추후 구현 예정입니다.",
            },
            main: {
                title: "메인 페이지",
                howToButtonTitle: "게임 방법 버튼",
                howToButtonDescription: "게임 방법 안내창을 엽니다. H 키를 눌러서도 같은 안내창을 확인할 수 있습니다.",
                startButtonTitle: "게임 시작 버튼",
                startButtonDescription: "스테이지 선택 페이지로 이동합니다.",
            },
            select: {
                title: "스테이지 선택 페이지",
                backTitle: "메인 화면으로",
                backDescription: "메인 페이지로 돌아갑니다.",
                stageTitle: "스테이지 카드",
                stageDescription: "스테이지, 별점, 사망 횟수, 최고 기록을 표시합니다. 잠긴 스테이지는 이전 스테이지를 클리어해야 진행할 수 있습니다.",
                paginationTitle: "이전 / 다음",
                paginationDescription: "표시되는 스테이지 페이지를 바꿉니다.",
                rankingTitle: "랭킹보기",
                rankingDescription: "랭킹 기능이 활성화되면 선택한 스테이지의 랭킹 페이지로 이동합니다.",
                startTitle: "시작하기",
                startDescription: "선택한 스테이지를 시작합니다.",
            },
            game: {
                title: "게임 화면",
                settingsTitle: "환경설정 버튼(게임 내)",
                settingsDescription: "게임 중 환경설정 팝업창을 엽니다.",
                timerTitle: "타이머",
                timerDescription: "현재 게임 진행 시간을 실시간으로 표시합니다.",
                joystickTitle: "조이스틱(Mobile)",
                joystickDescription: "모바일 화면에서 캐릭터 이동을 조작합니다.",
                mobileButtonsTitle: "모바일 조작 버튼",
                mobileButtonsDescription: "E는 상호작용, R은 다시 시작, 노란색 버튼은 점프입니다.",
                howToPlayTitle: "게임방법",
                howToPlayDescription: "캐릭터를 점프하면서, 다양한 지형지물을 활용하고 상호작용을 하면서 보물에 접근을 하거나 보스와 싸워서 이기게 된다면 클리어를 할 수 있습니다. 스테이지를 클리어하면 다음 스테이지로 이동할 수 있습니다.",
            },
        },
        elements: {
            player: { title: "플레이어", description: "좌우로 이동하고, 사다리를 오르내리며, 점프와 상호작용을 사용할 수 있습니다. 물속에서는 제한된 시간 동안 헤엄칠 수 있습니다." },
            jumpBlock: { title: "점프 블록", description: "이 블록 위에서 점프하면 더 높은 점프가 가능합니다." },
            defaultBlock: { title: "일반 블록", description: "캐릭터와 여러 오브젝트가 올라설 수 있는 기본 지형입니다." },
            triggerBlock: { title: "트리거 블록", description: "상호작용하면 연결된 일반 블록을 제거합니다." },
            redButton: { title: "레드 버튼", description: "상호작용하면 연결된 흰색 블록들을 제거합니다." },
            whiteBlock: { title: "흰색 블록", description: "레드 버튼으로 사라지는 블록입니다." },
            ladder: { title: "사다리", description: "상하 조작으로 오르내릴 수 있습니다." },
            lava: { title: "용암", description: "위험한 유체입니다. 몬스터를 처치할 수 있지만 캐릭터에게도 치명적입니다. 물과 만나면 굳은 용암이 됩니다." },
            fire: { title: "불", description: "용암, 물, 얼음과 상호작용하는 위험 요소입니다." },
            superLava: { title: "초용암", description: "용암과 불이 만나 생성됩니다. 얼음물을 통해서만 굳은 용암으로 바뀝니다." },
            water: { title: "물", description: "캐릭터가 제한 시간 동안 헤엄칠 수 있습니다. 용암, 얼음과도 반응합니다." },
            ice: { title: "얼음", description: "불과 만나면 물이 되고, 물과 만나면 얼음물을 만들 수 있습니다." },
            iceWater: { title: "얼음물", description: "초용암을 굳은 용암으로 바꿀 수 있는 차가운 유체입니다." },
            solidifiedLava: { title: "굳은 용암", description: "용암과 물이 반응해 생기는 오브젝트입니다. 발판 또는 장애물로 작동할 수 있습니다." },
            stone: { title: "돌", description: "던져서 굳은 용암을 부수거나 트리거 블록, 레드 버튼을 작동시킬 수 있습니다." },
            treasure: { title: "보물", description: "일반 스테이지에서 보물에 도달하면 클리어됩니다." },
            timerBlock: { title: "타이머 블록", description: "일정 시간이 지나면 사라지는 임시 블록입니다." },
            monster: { title: "몬스터", description: "플레이어에게 피해를 주는 위험 요소입니다. 일부 스테이지에서는 몬스터 처치가 클리어 조건입니다." },
            cannon: { title: "대포 / 황금대포", description: "대포는 드래그한 궤적으로 캐릭터를 발사합니다. 황금대포는 대포와 동일한 기능을 수행하지만 단 한번만 사용 가능하지만 기존 대포보다 더 멀리 날아갈 수 있습니다." },
            portal: { title: "포탈 in/out", description: "주황색 포탈에 들어가면 파란색 출구 포탈로 이동합니다." },
        },
    },
};

commonHowToPlay.ja = {
    ...commonHowToPlay.en,
    title: "遊び方",
    close: "遊び方を閉じる",
    tabs: { pages: "ページ説明", elements: "ゲーム要素" },
    pages: {
        ...commonHowToPlay.en.pages,
        game: {
            ...commonHowToPlay.en.pages.game,
            howToPlayTitle: "遊び方",
            howToPlayDescription: "キャラクターをジャンプさせ、地形や相互作用を利用して宝物に到達するか、ボスを倒すとクリアできます。ステージをクリアすると次のステージへ進めます。",
        },
    },
    elements: {
        ...commonHowToPlay.en.elements,
        cannon: {
            title: "大砲 / 黄金の大砲",
            description: "大砲はドラッグした軌道に沿ってキャラクターを発射します。黄金の大砲は通常の大砲と同じ機能ですが、一度だけ使用でき、通常の大砲より遠くまで飛ばせます。",
        },
    },
};

commonHowToPlay.zh = {
    ...commonHowToPlay.en,
    title: "游戏方法",
    close: "关闭游戏方法",
    tabs: { pages: "页面说明", elements: "游戏元素" },
    pages: {
        ...commonHowToPlay.en.pages,
        game: {
            ...commonHowToPlay.en.pages.game,
            howToPlayTitle: "游戏方法",
            howToPlayDescription: "让角色跳跃，利用各种地形和互动机制接近宝物，或击败 Boss 后即可通关。通关当前关卡后可以进入下一关。",
        },
    },
    elements: {
        ...commonHowToPlay.en.elements,
        cannon: {
            title: "大炮 / 黄金大炮",
            description: "大炮会沿拖拽出的轨迹发射角色。黄金大炮功能与普通大炮相同，只能使用一次，但可以比普通大炮飞得更远。",
        },
    },
};

const resources = {
    en: {
        translation: {
            common: {
                account: "Account",
                settings: "Settings",
                settingsTooltipFull: "Settings\nYou can also press Q.",
                settingsTooltipShort: "Settings",
                howToPlayTooltipFull: "You can also press H\nto open How to Play.",
                howToPlayTooltipShort: "How to Play",
                stars: "{{count}} stars",
            },
            main: { eyebrow: "NEON CORE PLATFORMER", start: "Start", howToPlay: "How to Play" },
            preferences: {
                title: "Preferences", pauseTitle: "Game Paused", close: "Close preferences",
                bgmVolume: "BGM Volume", gameVolume: "Game Volume", mute: "Mute", unmute: "Unmute",
                language: "Language", screenSize: "Screen Size", defaultScreen: "Default", fullscreen: "Fullscreen",
                portraitScreen: "Portrait", landscapeScreen: "Landscape", retry: "Retry",
                stageSelect: "Go to Stage Select", mainMenu: "Go to Main Menu",
            },
            stageSelect: {
                backToMain: "Main Menu", titlePrefix: "Select", titleAccent: "a Stage",
                lockedMessage: "Clear the previous stage before playing this stage.",
                deathCount: "Deaths", clearTime: "Clear Time", bestRecord: "Best",
                selectPrompt: "Select a stage", actionHint: "Click a card to show Start and Ranking buttons",
                previous: "Prev", next: "Next", ranking: "Ranking", start: "Start", pagesLabel: "stage pages",
            },
            clear: { title: "Stage Clear", retry: "Retry", nextStage: "Next Stage", stageSelect: "Stage Select", main: "Main Menu", deathCount: "Deaths" },
            game: {
                holdRestart: "Hold R to restart",
                remainingMonsterMission: "remaining monster mission",
                lockedTreasureDefault: "The treasure is blocked!\nDefeat the monster first.",
                lockedTreasureStage7: "The treasure is blocked!\nDefeat 2 monsters first.",
            },
            howToPlay: commonHowToPlay.en,
        },
    },
    ko: {
        translation: {
            common: {
                account: "계정", settings: "환경설정",
                settingsTooltipFull: "환경설정\nQ를 눌러서도 확인이 가능합니다.",
                settingsTooltipShort: "환경설정",
                howToPlayTooltipFull: "H버튼을 클릭시에도\n게임방법이 표시됩니다",
                howToPlayTooltipShort: "게임 방법",
                stars: "별 {{count}}개",
            },
            main: { eyebrow: "네온 코어 플랫폼", start: "시작하기", howToPlay: "게임 방법" },
            preferences: {
                title: "환경설정", pauseTitle: "게임 일시정지", close: "환경설정 닫기",
                bgmVolume: "BGM 음량", gameVolume: "게임 음량", mute: "음소거", unmute: "음소거 해제",
                language: "언어 선택", screenSize: "화면 크기", defaultScreen: "기본 화면", fullscreen: "전체 화면",
                portraitScreen: "세로 화면", landscapeScreen: "가로 화면", retry: "다시하기",
                stageSelect: "스테이지 선택 화면 이동", mainMenu: "메인 화면 이동",
            },
            stageSelect: {
                backToMain: "메인 화면으로", titlePrefix: "스테이지를", titleAccent: "선택해주세요",
                lockedMessage: "이전 스테이지를 클리어해야 해당 스테이지를 진행할 수 있습니다.",
                deathCount: "사망 횟수", clearTime: "클리어 시간", bestRecord: "최고 기록",
                selectPrompt: "스테이지를 선택해 주세요", actionHint: "카드를 클릭하면 시작하기와 랭킹보기 버튼이 표시됩니다.",
                previous: "이전", next: "다음", ranking: "랭킹보기", start: "시작하기", pagesLabel: "스테이지 페이지",
            },
            clear: { title: "Stage Clear", retry: "다시하기", nextStage: "다음 스테이지", stageSelect: "스테이지 선택", main: "메인화면", deathCount: "사망 횟수" },
            game: {
                holdRestart: "R을 길게 눌러 다시 시작",
                remainingMonsterMission: "남은 몬스터 미션",
                lockedTreasureDefault: "지금은 보물에 접근할 수 없습니다!\n몬스터를 처치하고 오세요.",
                lockedTreasureStage7: "지금은 보물에 접근할 수 없습니다!\n몬스터 2마리를 처치하고 오세요.",
            },
            howToPlay: commonHowToPlay.ko,
        },
    },
    ja: {
        translation: {
            common: {
                account: "アカウント", settings: "設定",
                settingsTooltipFull: "設定\nQキーでも確認できます。",
                settingsTooltipShort: "設定",
                howToPlayTooltipFull: "Hキーでも\n遊び方を表示できます。",
                howToPlayTooltipShort: "遊び方",
                stars: "星 {{count}} 個",
            },
            main: { eyebrow: "NEON CORE PLATFORMER", start: "スタート", howToPlay: "遊び方" },
            preferences: {
                title: "設定", pauseTitle: "一時停止", close: "設定を閉じる",
                bgmVolume: "BGM 音量", gameVolume: "ゲーム音量", mute: "ミュート", unmute: "ミュート解除",
                language: "言語", screenSize: "画面サイズ", defaultScreen: "標準", fullscreen: "全画面",
                portraitScreen: "縦画面", landscapeScreen: "横画面", retry: "リトライ",
                stageSelect: "ステージ選択へ", mainMenu: "メインメニューへ",
            },
            stageSelect: {
                backToMain: "メインメニュー", titlePrefix: "ステージを", titleAccent: "選択してください",
                lockedMessage: "前のステージをクリアするとプレイできます。",
                deathCount: "死亡回数", clearTime: "クリア時間", bestRecord: "ベスト記録",
                selectPrompt: "ステージを選択してください", actionHint: "カードをクリックすると開始とランキングボタンが表示されます。",
                previous: "前へ", next: "次へ", ranking: "ランキング", start: "スタート", pagesLabel: "ステージページ",
            },
            clear: { title: "Stage Clear", retry: "リトライ", nextStage: "次のステージ", stageSelect: "ステージ選択", main: "メイン", deathCount: "死亡回数" },
            game: {
                holdRestart: "Rを長押しでリスタート",
                remainingMonsterMission: "残りモンスターミッション",
                lockedTreasureDefault: "宝物にはまだ近づけません！\n先にモンスターを倒してください。",
                lockedTreasureStage7: "宝物にはまだ近づけません！\n先にモンスターを2体倒してください。",
            },
            howToPlay: commonHowToPlay.ja,
        },
    },
    zh: {
        translation: {
            common: {
                account: "账户", settings: "设置",
                settingsTooltipFull: "设置\n也可以按 Q 查看。",
                settingsTooltipShort: "设置",
                howToPlayTooltipFull: "也可以按 H\n显示游戏方法。",
                howToPlayTooltipShort: "游戏方法",
                stars: "{{count}} 颗星",
            },
            main: { eyebrow: "NEON CORE PLATFORMER", start: "开始", howToPlay: "游戏方法" },
            preferences: {
                title: "设置", pauseTitle: "游戏暂停", close: "关闭设置",
                bgmVolume: "BGM 音量", gameVolume: "游戏音量", mute: "静音", unmute: "取消静音",
                language: "语言", screenSize: "画面大小", defaultScreen: "默认", fullscreen: "全屏",
                portraitScreen: "竖屏", landscapeScreen: "横屏", retry: "重试",
                stageSelect: "前往关卡选择", mainMenu: "前往主菜单",
            },
            stageSelect: {
                backToMain: "主菜单", titlePrefix: "选择", titleAccent: "关卡",
                lockedMessage: "请先通关前一个关卡。",
                deathCount: "死亡次数", clearTime: "通关时间", bestRecord: "最佳记录",
                selectPrompt: "请选择关卡", actionHint: "点击卡片后会显示开始和排行榜按钮。",
                previous: "上一页", next: "下一页", ranking: "排行榜", start: "开始", pagesLabel: "关卡页面",
            },
            clear: { title: "Stage Clear", retry: "重试", nextStage: "下一关", stageSelect: "选择关卡", main: "主菜单", deathCount: "死亡次数" },
            game: {
                holdRestart: "长按 R 重新开始",
                remainingMonsterMission: "剩余怪物任务",
                lockedTreasureDefault: "现在无法接近宝物！\n请先击败怪物。",
                lockedTreasureStage7: "现在无法接近宝物！\n请先击败 2 只怪物。",
            },
            howToPlay: commonHowToPlay.zh,
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
    });

syncDocumentLanguage(initialLanguage);
i18n.on("languageChanged", syncDocumentLanguage);

export default i18n;
