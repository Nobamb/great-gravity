## 1. 내가 이번에 기존에 만들어놓은 index.html의 레이아웃의 형태를 image/basic-design/에 있는 사진들을 참고해서 레이아웃 구성들을 좀 더 수정해주었음 해 
지금 내용들을 확인해보면 요소들이 지금 번잡하게 나열되어있잖아, 아예 레이아웃들을 image/basic-design/에 있는 사진들을 참고해서 내가 초기에 원하는 형태로 만들어주었음 하거든, 전체적인 레이아웃 형태는 basic-design/에 있는 basic-layout.png를 기반으로 다시 만들어보면 좋겠어, 자세한 규칙들은 일단 agents.md에 자세하게 정리를 해 둔 상황이야, 레이아웃을 수정해주면 되는데 만들어진 전체적인 디자인들은 그대로 두면 돼

### 1-1. 지금 살짝 아쉬운 게, 지금 화면에 표시된 쓸데없는 글씨들이 너무 많은 상태거든, 그리고 레이아웃 환경들이 basic-design에 있는 사진들처럼 깔끔하게 정돈되어있지 않은 상태야 그래서 그것들을 다시 제대로 바꿔보았으면 좋겠거든

일단 화면상에서 없애볼 만한 것들이 timer-block, angle-indicator, cannon(cannon-barrel이랑 angle-indicator 포함), portal, mech-pin 모두, platform, stage-info, bottom-bar 요소들 모두 삭제해주어도 되고, stone-bridge는 조금만 더 아래로 두고, stone-bridge에서 바로 오른쪽에는 위에는 용암, 아래에는 물로 구성되어 나뉘어져 있는 형태로 레이아웃들이 존재하면 좋겠고, 지금 lava-fall, ice-water가 각각 대각선으로 교차되어 지정되어있는 형태잖아, 걔네들도 일단 basic-layout.png를 참고해서 각각 위에는 lava-fall, 아래에는 ice-water 요소가 각각 직각으로 들어있도록 수정해줬으면 좋겠고, lava-fall이랑 ice-water 둘다 왔다갔다 하는 연출 삭제해주었으면 좋겠고, 그냥 하나가 전체적으로 색깔이 꽉차있는 형태의 레이아웃이면 좋겠어 그리고 basic-layout.png처럼 보물들이 있는 발판도 x좌표는 그대로에 y좌표만 중앙에 위치하도록 만들어주고, basic-layout.png처럼 각 블록 끝에 빨간 색의 짧은 블록이 살짝 튀어나와있는 형태를 만들어주면 좋겠어
전체적인 레이아웃 구조들은 basic-layout.png를 참고해서 만들어주면 돼