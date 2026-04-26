import { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import { ElementPreview, PagePreview } from "./HowToPlayPreviews.jsx";

export default function HowToPlayModal({ isOpen, onClose }) {
    const { t } = useTranslation();
    const [activeTab, setActiveTab] = useState("pages");

    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.key === "Escape" && isOpen) {
                onClose();
            }
        };

        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [isOpen, onClose]);

    if (!isOpen) return null;

    return (
        <div className="howto-modal-overlay" onClick={onClose}>
            <div className="howto-modal" onClick={(e) => e.stopPropagation()}>
                <header className="howto-modal__header">
                    <h2 className="howto-modal__title">게임 방법</h2>
                    <button 
                        className="howto-modal__close-btn" 
                        onClick={onClose}
                        aria-label="닫기"
                    >
                        <span className="material-symbols-outlined">close</span>
                    </button>
                </header>

                <div className="howto-modal__tabs">
                    <button 
                        className={`howto-modal__tab ${activeTab === "pages" ? "howto-modal__tab--active" : ""}`}
                        onClick={() => setActiveTab("pages")}
                    >
                        페이지 별 설명
                    </button>
                    <button 
                        className={`howto-modal__tab ${activeTab === "elements" ? "howto-modal__tab--active" : ""}`}
                        onClick={() => setActiveTab("elements")}
                    >
                        게임 내 요소
                    </button>
                </div>

                <div className="howto-modal__content-area">
                    {activeTab === "pages" && (
                        <div className="howto-modal__content howto-modal__content--pages">
                            <section className="howto-section">
                                <h3>메인 페이지</h3>
                                <PagePreview type="main" />
                                <dl>
                                    <dt><strong>게임 방법 버튼</strong></dt>
                                    <dd>클릭시 게임 방법과 관련된 정보를 표시해주는 팝업창을 띄우는 버튼입니다. h키를 누르면서 해당 설명들을 확인할 수 있습니다.</dd>
                                    
                                    <dt><strong>게임 시작 버튼</strong></dt>
                                    <dd>스테이지 선택 페이지로 이동하는 버튼입니다. 비로그인 상태에서 시작할 수도 있지만, 어떤 컴퓨터에서도 게임 기록을 불러오고 싶다면 로그인 상태에서 시작하는 것을 추천합니다.</dd>

                                    <dt><strong>환경설정 버튼(헤더)</strong></dt>
                                    <dd>클릭 시 환경설정 관련 팝업창을 띄우는 버튼입니다.</dd>

                                    <dt><strong>프로필 버튼(헤더)</strong></dt>
                                    <dd>클릭 시 로그인/회원가입, 로그아웃을 할 수 있는 버튼입니다. 로그인을 하게 되면 게임 내의 플레이 기록을 저장할 수 있습니다. (로그인 기능 구현예정)</dd>
                                </dl>
                            </section>

                            <section className="howto-section">
                                <h3>스테이지 선택 페이지</h3>
                                <PagePreview type="select" />
                                <dl>
                                    <dt><strong>환경설정 버튼(헤더)</strong></dt>
                                    <dd>클릭 시 환경설정 관련 팝업창을 띄우는 버튼입니다.</dd>
                                    
                                    <dt><strong>프로필 버튼(헤더)</strong></dt>
                                    <dd>클릭 시 로그인/회원가입, 로그아웃을 할 수 있는 버튼입니다. 로그인을 하게 되면 게임 내의 플레이 기록을 저장할 수 있습니다. (로그인 기능 구현예정)</dd>

                                    <dt><strong>메인 화면으로</strong></dt>
                                    <dd>해당 버튼을 클릭하게 된다면, 곧바로 메인 화면으로 이동하게 됩니다.</dd>

                                    <dt><strong>스테이지</strong></dt>
                                    <dd>각 스테이지를 진행할 수 있는 버튼입니다. 이전에 클리어한 스테이지가 없다면, 진행이 불가능하고, 이전에 클리어한 스테이지가 존재한다면, 해당 스테이지를 플레이할 수 있습니다. 스테이지에는 획득한 스타, 사망횟수, 클리어 최고 기록이 표시됩니다.</dd>

                                    <dt><strong>이전/다음</strong></dt>
                                    <dd>각 스테이지 내에서 이동할 수 있는 페이지를 변경하는 버튼입니다. 가운데에는 스테이지 페이지가 존재하며, 이전 페이지 버튼을 누르게 된다면 이전 페이지로 이동하게 되고, 다음 페이지 버튼을 누르게 된다면 다음 페이지로 이동하게 됩니다.</dd>

                                    <dt><strong>랭킹보기</strong></dt>
                                    <dd>해당 스테이지의 랭킹을 볼 수 있는 페이지로 이동할 수 있는 버튼입니다. 로그인 기능을 사용하게 되면 랭킹을 확인할 수 있으며 주로 해당 스테이지에서 클리어하기 위해 발생한 사망 횟수, 클리어 최고 기록에 관하여 랭킹이 기록이 됩니다.</dd>

                                    <dt><strong>시작하기</strong></dt>
                                    <dd>선택한 스테이지에 대해 플레이를 시작하게 됩니다.</dd>
                                </dl>
                            </section>

                            <section className="howto-section">
                                <h3>게임 화면</h3>
                                <PagePreview type="game" />
                                <dl>
                                    <dt><strong>환경설정 버튼(게임 내)</strong></dt>
                                    <dd>클릭시 헤더의 환경설정 버튼처럼 환경설정 관련 팝업창을 띄웁니다.</dd>

                                    <dt><strong>타이머</strong></dt>
                                    <dd>게임 시작 이후, 게임 진행 시간을 분:초:밀리초 형태로 표시합니다. 게임 클리어 후에 기록된 게임 진행 시간을 실시간으로 기록하고 보여주기 위합니다.</dd>

                                    <dt><strong>조이스틱(Mobile)</strong></dt>
                                    <dd>모바일 환경에서 게임을 플레이할 때 화면상의 조이스틱을 이용하여 캐릭터를 조종할 수 있습니다. (화면이 켜져있을 때에만 표시됨, 모바일 환경이 아닐 때에는 표시되지 않음)</dd>

                                    <dt><strong>모바일 키패드(Mobile)</strong></dt>
                                    <dd>상호작용을 위한 E키, 재시작을 위한 R키, 점프를 위한 점프키가 표시됩니다. (화면이 켜져있을 때에만 표시됨, 모바일 환경이 아닐 때에는 표시되지 않음)</dd>
                                </dl>
                            </section>
                        </div>
                    )}

                    {activeTab === "elements" && (
                        <div className="howto-modal__content howto-modal__content--elements">
                            <section className="howto-section">
                                <h3>플레이어</h3>
                                <ElementPreview type="player" />
                                <p>플레이어는 좌우로 움직일 수 있고, 상하 조작키를 통해 사다리를 오르내릴 수 있습니다. trigger-block에 캐릭터가 상호작용을 하게 되거나 점프 키를 사용하여 점프를 진행할 수 있고, 물 속에서는 점프 키를 통해 계속해서 물 속에서 떠다니면서 헤엄칠 수 있습니다. 하지만 물 속에서는 호흡게이지가 발생하며, 호흡게이지가 5초가 될 때 까지 물 밖으로 나가지 않게 되면 캐릭터가 질식하여 사망하게 됩니다.</p>
                            </section>
                            <section className="howto-section">
                                <h3>점프 블록</h3>
                                <ElementPreview type="jump-block" />
                                <p>캐릭터가 점프 블록을 밟은 상태에서 캐릭터가 점프를 하게 되면 2배 가량의 높이로 점프하게 됩니다.</p>
                            </section>
                            <section className="howto-section">
                                <h3>일반 블록</h3>
                                <ElementPreview type="default-block" />
                                <p>일반적인 블록의 역할을 수행하며 캐릭터의 발판이 되어줄수도, 캐릭터의 벽이 되어줄 수도 있는 블록입니다. 또한 트리거 블록이 존재하는 일반 블록도 존재합니다.</p>
                            </section>
                            <section className="howto-section">
                                <h3>트리거 블록</h3>
                                <ElementPreview type="trigger-block" />
                                <p>일반 블록 내의 끝부분에 존재하며, 해당 트리거블록을 캐릭터가 같이 상호작용을 하게 되면 트리거 블록 내에 있던 일반 블록까지 사라지게 됩니다.</p>
                            </section>
                            <section className="howto-section">
                                <h3>레드 버튼</h3>
                                <ElementPreview type="red-button" />
                                <p>일반 블록의 측면에 위치해있으며, 캐릭터가 레드버튼과 상호작용을 하게 되면 흰 블록들이 모두 사라지게 됩니다.</p>
                            </section>
                            <section className="howto-section">
                                <h3>흰 블록</h3>
                                <ElementPreview type="white-block" />
                                <p>레드 버튼을 상호작용하게 되면 사라지게 되는 블록입니다.</p>
                            </section>
                            <section className="howto-section">
                                <h3>사다리</h3>
                                <ElementPreview type="ladder" />
                                <p>캐릭터가 위 아래 키를 통해 오르내릴 수 있는 요소입니다.</p>
                            </section>
                            <section className="howto-section">
                                <h3>용암</h3>
                                <ElementPreview type="lava" />
                                <p>붉은 색의 점도가 높은 편이며, 용암은 몬스터를 처치할 수 있는 유일한 수단이지만, 캐릭터 또한 접촉 시 사망하게 됩니다. 용암은 물과 닿게 되면 굳은 용암이 되어 캐릭터의 발판이 되어주거나 캐릭터가 이동할 수 있는 길을 막아버릴 수 있습니다. 굳은 용암은 돌을 통해 부술 수 있습니다. 용암을 전략적으로 활용하는 것도 중요합니다.</p>
                            </section>
                            <section className="howto-section">
                                <h3>불</h3>
                                <ElementPreview type="fire" />
                                <p>불은 자체적으로 움직이지 않으며, 캐릭터와 접촉시 사망판정이 발생하는 장애물입니다. 불은 용암과 접촉시 초용암이 되고, 물 또는 얼음과 접촉시 점차 사라지게 됩니다.</p>
                            </section>
                            <section className="howto-section">
                                <h3>초용암</h3>
                                <ElementPreview type="super-lava" />
                                <p>용암이 불과 닿게 된다면 초용암이 되고, 초용암은 물 또는 얼음과 닿게 되더라도 굳지 않고 일반 용암으로 변화합니다. 오로지 얼음물을 통해서만 굳은용암으로 변화합니다.</p>
                            </section>
                            <section className="howto-section">
                                <h3>물</h3>
                                <ElementPreview type="water" />
                                <p>푸른 색의 점도가 낮은 편이며, 물 속에서는 점프 키를 통해 계속해서 물 속에서 떠다니면서 헤엄칠 수 있습니다. 하지만 물 속에서는 호흡게이지가 발생하며, 호흡게이지가 5초가 될 때 까지 물 밖으로 나가지 않게 되면 캐릭터가 질식하여 사망하게 됩니다. 또한 물은 용암과 닿게 된다면 굳은 용암이 됩니다. 물이 얼음과 닿게 된다면 얼음물이 되어 초용암을 굳은 용암으로 바꿀 수 있습니다.</p>
                            </section>
                            <section className="howto-section">
                                <h3>얼음</h3>
                                <ElementPreview type="ice" />
                                <p>얼음은 불과 닿게 되면 꺼지면서 일반 물이 되면서 용암과 만나게 되면 굳은 용암과 함께 물로 변화하게 됩니다. 얼음은 캐릭터가 밟게 되면 미끄러지면서 앞으로 나아가는 성질이 있습니다. 또한, 얼음이 머리 위에 닿게 된다면 캐릭터는 사망하게 됩니다.</p>
                            </section>
                            <section className="howto-section">
                                <h3>얼음물</h3>
                                <ElementPreview type="ice-water" />
                                <p>물과 얼음이 만나게 되면 얼음물이 되어 초용암을 굳은 용암으로 바꿀 수 있습니다.</p>
                            </section>
                            <section className="howto-section">
                                <h3>굳은 용암</h3>
                                <ElementPreview type="solidified-lava" />
                                <p>용암과 물이 합쳐져서 발생한 오브젝트로, 캐릭터가 밟을 수 있지만 캐릭터의 길을 방해하게 될 수도 있습니다. 또한, 굳은 용암은 돌을 통해 부술 수 있습니다.</p>
                            </section>
                            <section className="howto-section">
                                <h3>돌</h3>
                                <ElementPreview type="stone" />
                                <p>돌을 던지게 되면 굳은 용암을 부수거나, 또는 트리거 블록이나 레드 버튼에 던지게 되면 상호작용이 가능하여 기능을 수행하게 합니다. 주로 돌을 얻은 직후 캐릭터 머리 위로 돌이 나타나게 되는데 해당 돌이 머리 위에 있는 상태에서 캐릭터를 기점으로 드래그를 하여 궤적을 지정한 후에 해당 궤적에 맞춰서 드래그를 마치게 되면 해당 방향에 맞추어서 날아가게 됩니다.</p>
                            </section>
                            <section className="howto-section">
                                <h3>보물</h3>
                                <ElementPreview type="treasure" />
                                <p>일반 스테이지에서 캐릭터가 보물에 접근하게 될 경우에 클리어 처리가 됩니다. 게임 클리어를 위해서 전략을 세우면서 접근해야 할 요소이죠.</p>
                            </section>
                            <section className="howto-section">
                                <h3>타이머 블록</h3>
                                <ElementPreview type="timer-block" />
                                <p>검은색의 블록으로, 캐릭터가 해당 블록을 밟고 난 뒤에 3초뒤에 밟았던 타이머 블록들이 사라지게 됩니다.</p>
                            </section>
                            <section className="howto-section">
                                <h3>몬스터</h3>
                                <ElementPreview type="monster" />
                                <p>캐릭터를 파악하게 되면 캐릭터에게 다가오는 몬스터로, 캐릭터가 닿으면 사망판정이 일어납니다. 몬스터는 블록으로 앞이 가로막히지 않은 상태에서 정면으로 마주하게 될 경우, 직접 다가가게 됩니다. 몬스터는 특정 경우에서는 스테이지 내에 충분한 몬스터들을 처치해야만 클리어를 할 수 있기도 하기에 스테이지 클리어 조건으로 나오게 되었다면 몬스터를 잘 유인해서 잡아주어야 합니다.</p>
                            </section>
                            <section className="howto-section">
                                <h3>대포/황금대포</h3>
                                <ElementPreview type="cannon" />
                                <p>캐릭터가 대포에 가까이 접근하게 되면 대포가 활성화되면서 드래그를 통해 대포를 원하는 궤적을 그리면서 쏠 수 있게 됩니다. 궤적을 맞춰서 드래그를 풀고 쏘게 되면 궤적에 맞춰서 캐릭터가 날아갑니다. 이용은 무제한으로 사용할 수 있습니다. 황금대포는 대포와 동일한 기능을 수행하지만 단 한번만 사용 가능하며, 대포를 쏘고 난 뒤에 더 이상 황금대포를 사용할 수 없습니다.</p>
                            </section>
                            <section className="howto-section">
                                <h3>포탈 in/out</h3>
                                <ElementPreview type="portal" />
                                <p>포탈은 in과 out 두가지가 존재하며, 붉은 색 포탈에 캐릭터가 들어가게 때에는 해당 포탈로 들어가게 되고, 푸른 색 포탈에서는 out이 나오게 됩니다.</p>
                            </section>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
