## 1. 내가 이번에 기존에 만들어놓은 index.html의 레이아웃의 형태를 image/basic-design/에 있는 사진들을 참고해서 레이아웃 구성들을 좀 더 수정해주었음 해 
지금 내용들을 확인해보면 요소들이 지금 번잡하게 나열되어있잖아, 아예 레이아웃들을 image/basic-design/에 있는 사진들을 참고해서 내가 초기에 원하는 형태로 만들어주었음 하거든, 전체적인 레이아웃 형태는 basic-design/에 있는 basic-layout.png를 기반으로 다시 만들어보면 좋겠어, 자세한 규칙들은 일단 agents.md에 자세하게 정리를 해 둔 상황이야, 레이아웃을 수정해주면 되는데 만들어진 전체적인 디자인들은 그대로 두면 돼

### 1-1. 지금 살짝 아쉬운 게, 지금 화면에 표시된 쓸데없는 글씨들이 너무 많은 상태거든, 그리고 레이아웃 환경들이 basic-design에 있는 사진들처럼 깔끔하게 정돈되어있지 않은 상태야 그래서 그것들을 다시 제대로 바꿔보았으면 좋겠거든

일단 화면상에서 없애볼 만한 것들이 timer-block, angle-indicator, cannon(cannon-barrel이랑 angle-indicator 포함), portal, mech-pin 모두, platform, stage-info, bottom-bar 요소들 모두 삭제해주어도 되고, stone-bridge는 조금만 더 아래로 두고, stone-bridge에서 바로 오른쪽에는 위에는 용암, 아래에는 물로 구성되어 나뉘어져 있는 형태로 레이아웃들이 존재하면 좋겠고, 지금 lava-fall, ice-water가 각각 대각선으로 교차되어 지정되어있는 형태잖아, 걔네들도 일단 basic-layout.png를 참고해서 각각 위에는 lava-fall, 아래에는 ice-water 요소가 각각 직각으로 들어있도록 수정해줬으면 좋겠고, lava-fall이랑 ice-water 둘다 왔다갔다 하는 연출 삭제해주었으면 좋겠고, 그냥 하나가 전체적으로 색깔이 꽉차있는 형태의 레이아웃이면 좋겠어 그리고 basic-layout.png처럼 보물들이 있는 발판도 x좌표는 그대로에 y좌표만 중앙에 위치하도록 만들어주고, basic-layout.png처럼 각 블록 끝에 빨간 색의 짧은 블록이 살짝 튀어나와있는 형태를 만들어주면 좋겠어
전체적인 레이아웃 구조들은 basic-layout.png를 참고해서 만들어주면 돼


### 1-2. 지금 index.html의 디자인을 좀 바꿔보려고 하거든, 지금 상황이 index.html을 바꿨는데 UI 상으로 좀 버그가 발생했어 

spawn-pad 클래스를 가진 요소에 character 요소가 위치해있지 않은 채 character 요소는 공중부양을 하면서 중앙에 있고, 오른쪽의 블록들이 있는 부분들에서 빨간 색의 블록들도 좀 벗어난 상태거든? 예를 들어 mid-ledge 요소에서는 before 요소가 왼쪽 끝의 바깥에 있어야 하는데 그러지 않고, mid-ledge요소 중앙에 있어 그리고 main-support 요소의 before 요소도 main-support요소의 윗 부분이 아닌 top-beam의 중앙 윗부분에 위치해있어, 그리고 right-frame 요소에서도 맨 위에 before 요소가 있어야 하는데 top-beam의 after요소로 거의 오른쪽 위에 위치해있고, goal-ledge 요소도 아래에 위치해있어야 하는데 지금 coins, sword요소에 겹쳐있는 상태야, ice-water 요소의 bottom위치와 동일한 위치에 있도록 하였으면 좋겠어(coin, sword가 떨어질 때 바쳐줄 수 있는 레이아웃 형태), 그리고 coin, sword요소도 mid-ledge 요소의 상단에 딱 붙어있는 형태였으면 하고, coins는 하단이 절반정도 잘린 형태, 그리고 sword는 coin보다도 z-index값을 낮추어서 coin 속에 sword가 있는 형태로 만들어졌으면 해 그리고 ice-water의 바닥 부분도 block 하나를 만들어줘 bottom-bar라는 이름으로 ice-water의 바닥에 위치해있으면 돼 button-block 요소도 삭제를 해주고, 왼쪽 상단에는 타이머(분 : 초 : 밀리초) UI좀 아름다운 형태로 하나 만들어줬으면 해 전체적인 레이아웃 구조는 basic-layout.png를 참고해서 만들어주면 돼, 프로젝트 설명은 agents.md에 정리해두었어