자세 랜드마크 인식 가이드

명상 자세를 취하고 있는 여성 모델의 포즈가 사지와 몸통의 위치를 나타내는 와이어프레임으로 강조 표시되어 있습니다.

MediaPipe Pose Landmarker 작업을 사용하면 이미지 또는 동영상에서 사람의 신체 랜드마크를 감지할 수 있습니다. 이 태스크를 사용하여 주요 신체 부위를 식별하고, 자세를 분석하고, 움직임을 분류할 수 있습니다. 이 태스크에서는 단일 이미지 또는 동영상으로 작동하는 머신러닝 (ML) 모델을 사용합니다. 이 태스크는 신체 자세 랜드마크를 이미지 좌표와 3차원 실제 좌표로 출력합니다.

사용해 보기arrow_forward

시작하기
대상 플랫폼의 구현 가이드를 따라 이 작업을 시작합니다. 다음 플랫폼별 가이드에서는 권장 모델, 권장 구성 옵션이 포함된 코드 예시 등 이 작업의 기본 구현을 안내합니다.

Android - 코드 예 - 가이드
Python - 코드 예시 - 가이드
웹 - 코드 예 - 가이드
태스크 세부정보
이 섹션에서는 이 태스크의 기능, 입력, 출력, 구성 옵션을 설명합니다.

기능
입력 이미지 처리 - 처리에는 이미지 회전, 크기 조절, 정규화, 색상 공간 변환이 포함됩니다.
점수 기준점: 예측 점수를 기준으로 결과를 필터링합니다.
태스크 입력	태스크 출력
Pose Landmarker는 다음 데이터 유형 중 하나를 입력으로 받습니다.
정지 이미지
디코딩된 동영상 프레임
라이브 동영상 피드
Pose Landmarker는 다음과 같은 결과를 출력합니다.
정규화된 이미지 좌표의 포즈 랜드마크
세계 좌표의 포즈 랜드마크
선택사항: 포즈의 세분화 마스크입니다.
구성 옵션
이 태스크에는 다음과 같은 구성 옵션이 있습니다.

옵션 이름	설명	값 범위	기본값
running_mode	태스크의 실행 모드를 설정합니다. 모드는 세 가지입니다.

IMAGE: 단일 이미지 입력의 모드입니다.

동영상: 동영상의 디코딩된 프레임 모드입니다.

LIVE_STREAM: 카메라와 같은 입력 데이터의 라이브 스트림 모드입니다. 이 모드에서는 결과를 비동기식으로 수신할 리스너를 설정하려면 resultListener를 호출해야 합니다.	{IMAGE, VIDEO, LIVE_STREAM}	IMAGE
num_poses	포즈 랜드마커에서 감지할 수 있는 최대 포즈 수입니다.	Integer > 0	1
min_pose_detection_confidence	포즈 감지가 성공으로 간주되는 최소 신뢰도 점수입니다.	Float [0.0,1.0]	0.5
min_pose_presence_confidence	포즈 랜드마크 감지에서 포즈 존재 점수의 최소 신뢰도 점수입니다.	Float [0.0,1.0]	0.5
min_tracking_confidence	포즈 추적이 성공으로 간주되는 최소 신뢰도 점수입니다.	Float [0.0,1.0]	0.5
output_segmentation_masks	포즈 랜드마커가 감지된 포즈의 세분화 마스크를 출력하는지 여부입니다.	Boolean	False
result_callback	포즈 랜드마커가 라이브 스트림 모드일 때 랜드마커 결과를 비동기식으로 수신하도록 결과 리스너를 설정합니다. 실행 모드가 LIVE_STREAM로 설정된 경우에만 사용할 수 있습니다.	ResultListener	N/A
모델
포즈 랜드마커는 일련의 모델을 사용하여 포즈 랜드마크를 예측합니다. 첫 번째 모델은 이미지 프레임 내에서 사람의 신체를 감지하고 두 번째 모델은 신체에서 랜드마크를 찾습니다.

다음 모델은 다운로드 가능한 모델 번들로 함께 패키징됩니다.

자세 감지 모델: 몇 가지 주요 자세 랜드마크를 사용하여 신체의 존재를 감지합니다.
포즈 랜드마커 모델: 포즈의 전체 매핑을 추가합니다. 모델은 33개의 3차원 자세 랜드마크의 추정치를 출력합니다.
이 번들은 MobileNetV2와 유사한 컨볼루션 신경망을 사용하며 기기 내 실시간 피트니스 애플리케이션에 최적화되어 있습니다. 이 BlazePose 모델의 변형은 3D 인간 신체 모델링 파이프라인인 GHUM을 사용하여 이미지 또는 동영상에서 개인의 전체 3D 신체 자세를 추정합니다.

주의: 이 MediaPipe 솔루션 미리보기는 초기 출시 버전입니다. 자세히 알아보기
모델 번들	입력 셰이프	데이터 유형	모델 카드	버전
포즈 랜드마커 (lite)	포즈 감지기: 224x224x3
포즈 랜드마커: 256x256x3	부동 소수점 수 16	정보	최신
포즈 랜드마커 (전체)	포즈 감지기: 224x224x3
포즈 랜드마커: 256x256x3	부동 소수점 수 16	정보	최신
포즈 랜드마커 (무거움)	포즈 감지기: 224x224x3
포즈 랜드마커: 256x256x3	부동 소수점 수 16	정보	최신
포즈 랜드마커 모델
포즈 랜드마커 모델은 다음 신체 부위의 대략적인 위치를 나타내는 33개의 신체 랜드마크 위치를 추적합니다.




0 - nose
1 - left eye (inner)
2 - left eye
3 - left eye (outer)
4 - right eye (inner)
5 - right eye
6 - right eye (outer)
7 - left ear
8 - right ear
9 - mouth (left)
10 - mouth (right)
11 - left shoulder
12 - right shoulder
13 - left elbow
14 - right elbow
15 - left wrist
16 - right wrist
17 - left pinky
18 - right pinky
19 - left index
20 - right index
21 - left thumb
22 - right thumb
23 - left hip
24 - right hip
25 - left knee
26 - right knee
27 - left ankle
28 - right ankle
29 - left heel
30 - right heel
31 - left foot index
32 - right foot index
모델 출력에는 각 랜드마크의 정규화된 좌표 (Landmarks)와 실제 좌표 (WorldLandmarks)가 모두 포함됩니다.

도움이 되었나요?

의견 보내기

홈
Google AI Edge
솔루션
도움이 되었나요?

의견 보내기웹용 포즈 랜드마크 감지 가이드

MediaPipe Pose Landmarker 작업을 사용하면 이미지 또는 동영상에서 사람의 신체 랜드마크를 감지할 수 있습니다. 이 태스크를 사용하여 주요 신체 부위를 식별하고, 자세를 분석하고, 움직임을 분류할 수 있습니다. 이 태스크에서는 단일 이미지 또는 동영상으로 작동하는 머신러닝 (ML) 모델을 사용합니다. 이 태스크는 신체 자세 랜드마크를 이미지 좌표와 3차원 실제 좌표로 출력합니다.

이 안내에서는 웹 및 JavaScript 앱에서 Pose Landmarker를 사용하는 방법을 보여줍니다. 이 태스크의 기능, 모델, 구성 옵션에 관한 자세한 내용은 개요를 참고하세요.

코드 예
Pose Landmarker의 예시 코드는 참고용으로 JavaScript에서 이 작업을 완전히 구현한 코드를 제공합니다. 이 코드는 이 작업을 테스트하고 자체 포즈 랜드마커 앱을 빌드하는 데 도움이 됩니다. 웹브라우저만 사용하여 포즈 랜드마커 예시 코드를 보고, 실행하고, 수정할 수 있습니다.

설정
이 섹션에서는 특히 Pose Landmarker를 사용하기 위해 개발 환경을 설정하는 주요 단계를 설명합니다. 플랫폼 버전 요구사항을 비롯한 웹 및 JavaScript 개발 환경 설정에 관한 일반적인 정보는 웹 설정 가이드를 참고하세요.

JavaScript 패키지
포즈 랜드마커 코드는 MediaPipe @mediapipe/tasks-vision NPM 패키지를 통해 사용할 수 있습니다. 플랫폼 설정 가이드의 안내에 따라 이러한 라이브러리를 찾아 다운로드할 수 있습니다.

주의: 이 MediaPipe 솔루션 미리보기는 초기 출시 버전입니다. 자세히 알아보기
다음 명령어를 사용하여 NPM을 통해 필요한 패키지를 설치할 수 있습니다.


npm install @mediapipe/tasks-vision
콘텐츠 전송 네트워크 (CDN) 서비스를 통해 작업 코드를 가져오려면 HTML 파일의 <head> 태그에 다음 코드를 추가합니다.


<!-- You can replace JSDeliver with another CDN if you prefer -->
<head>
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision/vision_bundle.js"
    crossorigin="anonymous"></script>
</head>
모델
MediaPipe Pose Landmarker 태스크에는 이 태스크와 호환되는 학습된 모델이 필요합니다. Pose Landmarker에 사용할 수 있는 학습된 모델에 관한 자세한 내용은 작업 개요 모델 섹션을 참고하세요.

모델을 선택하고 다운로드한 다음 프로젝트 디렉터리에 저장합니다.


<dev-project-root>/app/shared/models/
할 일 만들기
Pose Landmarker createFrom...() 함수 중 하나를 사용하여 추론 실행을 위한 작업을 준비합니다. 학습된 모델 파일의 상대 또는 절대 경로와 함께 createFromModelPath() 함수를 사용합니다. 모델이 이미 메모리에 로드된 경우 createFromModelBuffer() 메서드를 사용할 수 있습니다.

아래의 코드 예는 createFromOptions() 함수를 사용하여 태스크를 설정하는 방법을 보여줍니다. createFromOptions() 함수를 사용하면 구성 옵션으로 포즈 랜드마커를 맞춤설정할 수 있습니다. 구성 옵션에 관한 자세한 내용은 구성 옵션을 참고하세요.

다음 코드는 맞춤 옵션으로 작업을 빌드하고 구성하는 방법을 보여줍니다.


const vision = await FilesetResolver.forVisionTasks(
  // path/to/wasm/root
  "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm"
);
const poseLandmarker = await poseLandmarker.createFromOptions(
    vision,
    {
      baseOptions: {
        modelAssetPath: "path/to/model"
      },
      runningMode: runningMode
    });
구성 옵션
이 태스크에는 웹 및 JavaScript 애플리케이션에 관한 다음과 같은 구성 옵션이 있습니다.

옵션 이름	설명	값 범위	기본값
runningMode	태스크의 실행 모드를 설정합니다. 모드는 두 가지가 있습니다.

IMAGE: 단일 이미지 입력의 모드입니다.

동영상: 동영상의 디코딩된 프레임 또는 카메라와 같은 입력 데이터의 라이브 스트림에 관한 모드입니다.	{IMAGE, VIDEO}	IMAGE
numPoses	포즈 랜드마커에서 감지할 수 있는 최대 포즈 수입니다.	Integer > 0	1
minPoseDetectionConfidence	포즈 감지가 성공으로 간주되는 최소 신뢰도 점수입니다.	Float [0.0,1.0]	0.5
minPosePresenceConfidence	포즈 랜드마크 감지에서 포즈 존재 점수의 최소 신뢰도 점수입니다.	Float [0.0,1.0]	0.5
minTrackingConfidence	포즈 추적이 성공으로 간주되는 최소 신뢰도 점수입니다.	Float [0.0,1.0]	0.5
outputSegmentationMasks	포즈 랜드마커가 감지된 포즈의 세분화 마스크를 출력하는지 여부입니다.	Boolean	False
데이터 준비
Pose Landmarker는 호스트 브라우저에서 지원하는 모든 형식의 이미지에서 포즈를 감지할 수 있습니다. 이 작업은 크기 조절, 회전, 값 정규화 등 데이터 입력 전처리도 처리합니다. 동영상에서 포즈의 위치를 지정하려면 API를 사용하여 한 번에 한 프레임씩 빠르게 처리하고 프레임의 타임스탬프를 사용하여 동영상 내에서 포즈가 발생하는 시점을 확인할 수 있습니다.

태스크 실행
Pose Landmarker는 detect() (실행 모드 IMAGE 사용) 및 detectForVideo() (실행 모드 VIDEO 사용) 메서드를 사용하여 추론을 트리거합니다. 태스크는 데이터를 처리하고, 포즈의 랜드마크를 찾으려고 시도한 후 결과를 보고합니다.

Pose Landmarker detect() 및 detectForVideo() 메서드 호출은 동기식으로 실행되며 사용자 개입 스레드를 차단합니다. 기기의 카메라에서 동영상 프레임의 포즈를 감지하면 각 감지가 기본 스레드를 차단합니다. 웹 워커를 구현하여 다른 스레드에서 detect() 및 detectForVideo() 메서드를 실행하면 이를 방지할 수 있습니다.

다음 코드는 태스크 모델로 처리를 실행하는 방법을 보여줍니다.

이미지
동영상

const image = document.getElementById("image") as HTMLImageElement;
const poseLandmarkerResult = poseLandmarker.detect(image);
포즈 랜드마커 작업 실행의 더 완전한 구현은 코드 예시를 참고하세요.

결과 처리 및 표시
Pose Landmarker는 감지 실행마다 poseLandmarkerResult 객체를 반환합니다. 결과 객체에는 각 포즈 랜드마크의 좌표가 포함됩니다.

다음은 이 태스크의 출력 데이터 예시입니다.


PoseLandmarkerResult:
  Landmarks:
    Landmark #0:
      x            : 0.638852
      y            : 0.671197
      z            : 0.129959
      visibility   : 0.9999997615814209
      presence     : 0.9999984502792358
    Landmark #1:
      x            : 0.634599
      y            : 0.536441
      z            : -0.06984
      visibility   : 0.999909
      presence     : 0.999958
    ... (33 landmarks per pose)
  WorldLandmarks:
    Landmark #0:
      x            : 0.067485
      y            : 0.031084
      z            : 0.055223
      visibility   : 0.9999997615814209
      presence     : 0.9999984502792358
    Landmark #1:
      x            : 0.063209
      y            : -0.00382
      z            : 0.020920
      visibility   : 0.999976
      presence     : 0.999998
    ... (33 world landmarks per pose)
  SegmentationMasks:
    ... (pictured below)
출력에는 각 랜드마크의 정규화된 좌표 (Landmarks)와 실제 좌표 (WorldLandmarks)가 모두 포함됩니다.

출력에는 다음과 같은 정규화된 좌표 (Landmarks)가 포함됩니다.

x 및 y: 이미지 너비 (x) 및 높이 (y)에 따라 0.0~1.0 사이로 정규화된 랜드마크 좌표입니다.

z: 랜드마크 깊이로, 엉덩이의 중간 지점 깊이를 원점으로 합니다. 값이 작을수록 랜드마크가 카메라에 더 가깝습니다. z의 크기는 x와 거의 동일한 크기를 사용합니다.

visibility: 이미지 내에 랜드마크가 표시될 가능성입니다.

출력에는 다음과 같은 월드 좌표 (WorldLandmarks)가 포함됩니다.

x, y, z: 엉덩이의 중점을 원점으로 하는 실제 3차원 좌표(단위: 미터)입니다.

visibility: 이미지 내에 랜드마크가 표시될 가능성입니다.

다음 이미지는 태스크 출력의 시각화를 보여줍니다.

명상 자세를 취하고 있는 여성 모델의 포즈가 사지와 몸통의 위치를 나타내는 와이어프레임으로 강조 표시되어 있습니다.

선택사항인 세분화 마스크는 각 픽셀이 감지된 사람에 속할 가능성을 나타냅니다. 다음 이미지는 태스크 출력의 세분화 마스크입니다.

여성의 윤곽을 보여주는 이전 이미지의 세분화 마스크

Pose Landmarker 예시 코드는 태스크에서 반환된 결과를 표시하는 방법을 보여줍니다. 코드 예시를 참고하세요.

도움이 되었나요?

##

<!-- Copyright 2023 The MediaPipe Authors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License. -->
<link href="https://unpkg.com/material-components-web@latest/dist/material-components-web.min.css" rel="stylesheet">
<script src="https://unpkg.com/material-components-web@latest/dist/material-components-web.min.js"></script>
</script>

<body>
  <h1>Pose detection using the MediaPipe PoseLandmarker task</h1>

  <section id="demos" class="invisible">
    <h2>Demo: Detecting Images</h2>
    <p><b>Click on an image below</b> to see the key landmarks of the body.</p>

    <div class="detectOnClick">
      <!-- source: https://pixabay.com/photos/woman-asia-beautiful-cambodia-1822514/ -->
      <img src="https://assets.codepen.io/9177687/woman-ge0f199f92_640.jpg" width="100%" crossorigin="anonymous" title="Click to get detection!" />
    </div>
    <div class="detectOnClick">
      <!-- source: https://pixabay.com/photos/woman-relaxation-portrait-3053489/ -->
      <img src="https://assets.codepen.io/9177687/woman-g1af8d3deb_640.jpg" width="100%" crossorigin="anonymous" title="Click to get detection!" />
    </div>

    <h2>Demo: Webcam continuous pose landmarks detection</h2>
    <p>Stand in front of your webcam to get real-time pose landmarker detection.</br>Click <b>enable webcam</b> below and grant access to the webcam if prompted.</p>

    <div id="liveView" class="videoView">
      <button id="webcamButton" class="mdc-button mdc-button--raised">
        <span class="mdc-button__ripple"></span>
        <span class="mdc-button__label">ENABLE WEBCAM</span>
      </button>
      <div style="position: relative;">
        <video id="webcam" style="width: 1280px; height: 720px; position: abso" autoplay playsinline></video>
        <canvas class="output_canvas" id="output_canvas" width="1280" height="720" style="position: absolute; left: 0px; top: 0px;"></canvas>
      </div>
    </div>
  </section>

  ##

  ##

  /* Copyright 2023 The MediaPipe Authors.

Licensed under the Apache License, Version 2.0 (the "License");
you may not use this file except in compliance with the License.
You may obtain a copy of the License at

     http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing, software
distributed under the License is distributed on an "AS IS" BASIS,
WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
See the License for the specific language governing permissions and
limitations under the License. */

@use "@material";
body {
  font-family: roboto;
  margin: 2em;
  color: #3d3d3d;
  --mdc-theme-primary: #007f8b;
  --mdc-theme-on-primary: #f1f3f4;
}

h1 {
  color: #007f8b;
}

h2 {
  clear: both;
}

em {
  font-weight: bold;
}

video {
  clear: both;
  display: block;
  transform: rotateY(180deg);
  -webkit-transform: rotateY(180deg);
  -moz-transform: rotateY(180deg);
}

section {
  opacity: 1;
  transition: opacity 500ms ease-in-out;
}

header,
footer {
  clear: both;
}

.removed {
  display: none;
}

.invisible {
  opacity: 0.2;
}

.note {
  font-style: italic;
  font-size: 130%;
}

.videoView,
.detectOnClick {
  position: relative;
  float: left;
  width: 48%;
  margin: 2% 1%;
  cursor: pointer;
}

.videoView p,
.detectOnClick p {
  position: absolute;
  padding: 5px;
  background-color: #007f8b;
  color: #fff;
  border: 1px dashed rgba(255, 255, 255, 0.7);
  z-index: 2;
  font-size: 12px;
  margin: 0;
}

.highlighter {
  background: rgba(0, 255, 0, 0.25);
  border: 1px dashed #fff;
  z-index: 1;
  position: absolute;
}

.canvas {
  z-index: 1;
  position: absolute;
  pointer-events: none;
}

.output_canvas {
  transform: rotateY(180deg);
  -webkit-transform: rotateY(180deg);
  -moz-transform: rotateY(180deg);
}

.detectOnClick {
  z-index: 0;
}

.detectOnClick img {
  width: 100%;
}


##

##

// Copyright 2023 The MediaPipe Authors.

// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

import {
  PoseLandmarker,
  FilesetResolver,
  DrawingUtils
} from "https://cdn.skypack.dev/@mediapipe/tasks-vision@0.10.0";

const demosSection = document.getElementById("demos");

let poseLandmarker: PoseLandmarker = undefined;
let runningMode = "IMAGE";
let enableWebcamButton: HTMLButtonElement;
let webcamRunning: Boolean = false;
const videoHeight = "360px";
const videoWidth = "480px";

// Before we can use PoseLandmarker class we must wait for it to finish
// loading. Machine Learning models can be large and take a moment to
// get everything needed to run.
const createPoseLandmarker = async () => {
  const vision = await FilesetResolver.forVisionTasks(
    "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.0/wasm"
  );
  poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
    baseOptions: {
      modelAssetPath: `https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task`,
      delegate: "GPU"
    },
    runningMode: runningMode,
    numPoses: 2
  });
  demosSection.classList.remove("invisible");
};
createPoseLandmarker();

/********************************************************************
// Demo 1: Grab a bunch of images from the page and detection them
// upon click.
********************************************************************/

// In this demo, we have put all our clickable images in divs with the
// CSS class 'detectionOnClick'. Lets get all the elements that have
// this class.
const imageContainers = document.getElementsByClassName("detectOnClick");

// Now let's go through all of these and add a click event listener.
for (let i = 0; i < imageContainers.length; i++) {
  // Add event listener to the child element whichis the img element.
  imageContainers[i].children[0].addEventListener("click", handleClick);
}

// When an image is clicked, let's detect it and display results!
async function handleClick(event) {
  if (!poseLandmarker) {
    console.log("Wait for poseLandmarker to load before clicking!");
    return;
  }

  if (runningMode === "VIDEO") {
    runningMode = "IMAGE";
    await poseLandmarker.setOptions({ runningMode: "IMAGE" });
  }
  // Remove all landmarks drawed before
  const allCanvas = event.target.parentNode.getElementsByClassName("canvas");
  for (var i = allCanvas.length - 1; i >= 0; i--) {
    const n = allCanvas[i];
    n.parentNode.removeChild(n);
  }

  // We can call poseLandmarker.detect as many times as we like with
  // different image data each time. The result is returned in a callback.
  poseLandmarker.detect(event.target, (result) => {
    const canvas = document.createElement("canvas");
    canvas.setAttribute("class", "canvas");
    canvas.setAttribute("width", event.target.naturalWidth + "px");
    canvas.setAttribute("height", event.target.naturalHeight + "px");
    canvas.style =
      "left: 0px;" +
      "top: 0px;" +
      "width: " +
      event.target.width +
      "px;" +
      "height: " +
      event.target.height +
      "px;";

    event.target.parentNode.appendChild(canvas);
    const canvasCtx = canvas.getContext("2d");
    const drawingUtils = new DrawingUtils(canvasCtx);
    for (const landmark of result.landmarks) {
      drawingUtils.drawLandmarks(landmark, {
        radius: (data) => DrawingUtils.lerp(data.from!.z, -0.15, 0.1, 5, 1)
      });
      drawingUtils.drawConnectors(landmark, PoseLandmarker.POSE_CONNECTIONS);
    }
  });
}

/********************************************************************
// Demo 2: Continuously grab image from webcam stream and detect it.
********************************************************************/

const video = document.getElementById("webcam") as HTMLVideoElement;
const canvasElement = document.getElementById(
  "output_canvas"
) as HTMLCanvasElement;
const canvasCtx = canvasElement.getContext("2d");
const drawingUtils = new DrawingUtils(canvasCtx);

// Check if webcam access is supported.
const hasGetUserMedia = () => !!navigator.mediaDevices?.getUserMedia;

// If webcam supported, add event listener to button for when user
// wants to activate it.
if (hasGetUserMedia()) {
  enableWebcamButton = document.getElementById("webcamButton");
  enableWebcamButton.addEventListener("click", enableCam);
} else {
  console.warn("getUserMedia() is not supported by your browser");
}

// Enable the live webcam view and start detection.
function enableCam(event) {
  if (!poseLandmarker) {
    console.log("Wait! poseLandmaker not loaded yet.");
    return;
  }

  if (webcamRunning === true) {
    webcamRunning = false;
    enableWebcamButton.innerText = "ENABLE PREDICTIONS";
  } else {
    webcamRunning = true;
    enableWebcamButton.innerText = "DISABLE PREDICTIONS";
  }

  // getUsermedia parameters.
  const constraints = {
    video: true
  };

  // Activate the webcam stream.
  navigator.mediaDevices.getUserMedia(constraints).then((stream) => {
    video.srcObject = stream;
    video.addEventListener("loadeddata", predictWebcam);
  });
}

let lastVideoTime = -1;
async function predictWebcam() {
  canvasElement.style.height = videoHeight;
  video.style.height = videoHeight;
  canvasElement.style.width = videoWidth;
  video.style.width = videoWidth;
  // Now let's start detecting the stream.
  if (runningMode === "IMAGE") {
    runningMode = "VIDEO";
    await poseLandmarker.setOptions({ runningMode: "VIDEO" });
  }
  let startTimeMs = performance.now();
  if (lastVideoTime !== video.currentTime) {
    lastVideoTime = video.currentTime;
    poseLandmarker.detectForVideo(video, startTimeMs, (result) => {
      canvasCtx.save();
      canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
      for (const landmark of result.landmarks) {
        drawingUtils.drawLandmarks(landmark, {
          radius: (data) => DrawingUtils.lerp(data.from!.z, -0.15, 0.1, 5, 1)
        });
        drawingUtils.drawConnectors(landmark, PoseLandmarker.POSE_CONNECTIONS);
      }
      canvasCtx.restore();
    });
  }

  // Call this function again to keep predicting when the browser is ready.
  if (webcamRunning === true) {
    window.requestAnimationFrame(predictWebcam);
  }
}


##

##

---
layout: forward
target: https://developers.google.com/mediapipe/solutions/vision/pose_landmarker/
title: Pose
parent: MediaPipe Legacy Solutions
has_children: true
has_toc: false
nav_order: 5
---

# MediaPipe Pose
{: .no_toc }

<details close markdown="block">
  <summary>
    Table of contents
  </summary>
  {: .text-delta }
1. TOC
{:toc}
</details>
---

**Attention:** *Thank you for your interest in MediaPipe Solutions.
As of May 10, 2023, this solution was upgraded to a new MediaPipe
Solution. For more information, see the
[MediaPipe Solutions](https://developers.google.com/mediapipe/solutions/vision/pose_landmarker)
site.*

----

## Overview

Human pose estimation from video plays a critical role in various applications
such as [quantifying physical exercises](./pose_classification.md), sign
language recognition, and full-body gesture control. For example, it can form
the basis for yoga, dance, and fitness applications. It can also enable the
overlay of digital content and information on top of the physical world in
augmented reality.

MediaPipe Pose is a ML solution for high-fidelity body pose tracking, inferring
33 3D landmarks and background segmentation mask on the whole body from RGB
video frames utilizing our
[BlazePose](https://ai.googleblog.com/2020/08/on-device-real-time-body-pose-tracking.html)
research that also powers the
[ML Kit Pose Detection API](https://developers.google.com/ml-kit/vision/pose-detection).
Current state-of-the-art approaches rely primarily on powerful desktop
environments for inference, whereas our method achieves real-time performance on
most modern [mobile phones](#mobile), [desktops/laptops](#desktop), in
[python](#python-solution-api) and even on the [web](#javascript-solution-api).

![pose_tracking_example.gif](https://mediapipe.dev/images/mobile/pose_tracking_example.gif) |
:----------------------------------------------------------------------: |
*Fig 1. Example of MediaPipe Pose for pose tracking.*                    |

## ML Pipeline

The solution utilizes a two-step detector-tracker ML pipeline, proven to be
effective in our [MediaPipe Hands](./hands.md) and
[MediaPipe Face Mesh](./face_mesh.md) solutions. Using a detector, the pipeline
first locates the person/pose region-of-interest (ROI) within the frame. The
tracker subsequently predicts the pose landmarks and segmentation mask within
the ROI using the ROI-cropped frame as input. Note that for video use cases the
detector is invoked only as needed, i.e., for the very first frame and when the
tracker could no longer identify body pose presence in the previous frame. For
other frames the pipeline simply derives the ROI from the previous frame’s pose
landmarks.

The pipeline is implemented as a MediaPipe
[graph](https://github.com/google-ai-edge/mediapipe/tree/master/mediapipe/graphs/pose_tracking/pose_tracking_gpu.pbtxt)
that uses a
[pose landmark subgraph](https://github.com/google-ai-edge/mediapipe/tree/master/mediapipe/modules/pose_landmark/pose_landmark_gpu.pbtxt)
from the
[pose landmark module](https://github.com/google-ai-edge/mediapipe/tree/master/mediapipe/modules/pose_landmark)
and renders using a dedicated
[pose renderer subgraph](https://github.com/google-ai-edge/mediapipe/tree/master/mediapipe/graphs/pose_tracking/subgraphs/pose_renderer_gpu.pbtxt).
The
[pose landmark subgraph](https://github.com/google-ai-edge/mediapipe/tree/master/mediapipe/modules/pose_landmark/pose_landmark_gpu.pbtxt)
internally uses a
[pose detection subgraph](https://github.com/google-ai-edge/mediapipe/tree/master/mediapipe/modules/pose_detection/pose_detection_gpu.pbtxt)
from the
[pose detection module](https://github.com/google-ai-edge/mediapipe/tree/master/mediapipe/modules/pose_detection).

Note: To visualize a graph, copy the graph and paste it into
[MediaPipe Visualizer](https://viz.mediapipe.dev/). For more information on how
to visualize its associated subgraphs, please see
[visualizer documentation](../tools/visualizer.md).

## Pose Estimation Quality

To evaluate the quality of our [models](./models.md#pose) against other
well-performing publicly available solutions, we use three different validation
datasets, representing different verticals: Yoga, Dance and HIIT. Each image
contains only a single person located 2-4 meters from the camera. To be
consistent with other solutions, we perform evaluation only for 17 keypoints
from [COCO topology](https://cocodataset.org/#keypoints-2020).

Method                                                                                                | Yoga <br/> [`mAP`] | Yoga <br/> [`PCK@0.2`] | Dance <br/> [`mAP`] | Dance <br/> [`PCK@0.2`] | HIIT <br/> [`mAP`] | HIIT <br/> [`PCK@0.2`]
----------------------------------------------------------------------------------------------------- | -----------------: | ---------------------: | ------------------: | ----------------------: | -----------------: | ---------------------:
BlazePose GHUM Heavy                                                                                  | 68.1               | **96.4**               | 73.0                | **97.2**                | 74.0               | **97.5**
BlazePose GHUM Full                                                                                   | 62.6               | **95.5**               | 67.4                | **96.3**                | 68.0               | **95.7**
BlazePose GHUM Lite                                                                                   | 45.0               | **90.2**               | 53.6                | **92.5**                | 53.8               | **93.5**
[AlphaPose ResNet50](https://github.com/MVIG-SJTU/AlphaPose)                                          | 63.4               | **96.0**               | 57.8                | **95.5**                | 63.4               | **96.0**
[Apple Vision](https://developer.apple.com/documentation/vision/detecting_human_body_poses_in_images) | 32.8               | **82.7**               | 36.4                | **91.4**                | 44.5               | **88.6**

![pose_tracking_pck_chart.png](https://mediapipe.dev/images/mobile/pose_tracking_pck_chart.png) |
:--------------------------------------------------------------------------: |
*Fig 2. Quality evaluation in [`PCK@0.2`].*                                  |

We designed our models specifically for live perception use cases, so all of
them work in real-time on the majority of modern devices.

Method               | Latency <br/> Pixel 3 [TFLite GPU](https://www.tensorflow.org/lite/performance/gpu_advanced) | Latency <br/> MacBook Pro (15-inch 2017)
-------------------- | -------------------------------------------------------------------------------------------: | ---------------------------------------:
BlazePose GHUM Heavy | 53 ms                                                                                        | 38 ms
BlazePose GHUM Full  | 25 ms                                                                                        | 27 ms
BlazePose GHUM Lite  | 20 ms                                                                                        | 25 ms

## Models

### Person/pose Detection Model (BlazePose Detector)

The detector is inspired by our own lightweight
[BlazeFace](https://arxiv.org/abs/1907.05047) model, used in
[MediaPipe Face Detection](./face_detection.md), as a proxy for a person
detector. It explicitly predicts two additional virtual keypoints that firmly
describe the human body center, rotation and scale as a circle. Inspired by
[Leonardo’s Vitruvian man](https://en.wikipedia.org/wiki/Vitruvian_Man), we
predict the midpoint of a person's hips, the radius of a circle circumscribing
the whole person, and the incline angle of the line connecting the shoulder and
hip midpoints.

![pose_tracking_detector_vitruvian_man.png](https://mediapipe.dev/images/mobile/pose_tracking_detector_vitruvian_man.png) |
:----------------------------------------------------------------------------------------------------: |
*Fig 3. Vitruvian man aligned via two virtual keypoints predicted by BlazePose detector in addition to the face bounding box.* |

### Pose Landmark Model (BlazePose [GHUM](https://github.com/google-research/google-research/tree/master/ghum) 3D)

The landmark model in MediaPipe Pose predicts the location of 33 pose landmarks
(see figure below).

![pose_tracking_full_body_landmarks.png](https://mediapipe.dev/images/mobile/pose_tracking_full_body_landmarks.png) |
:----------------------------------------------------------------------------------------------: |
*Fig 4. 33 pose landmarks.*                                                                      |

Optionally, MediaPipe Pose can predict a full-body
[segmentation mask](#segmentation_mask) represented as a two-class segmentation
(human or background).

Please find more detail in the
[BlazePose Google AI Blog](https://ai.googleblog.com/2020/08/on-device-real-time-body-pose-tracking.html),
this [paper](https://arxiv.org/abs/2006.10204),
[the model card](./models.md#pose) and the [Output](#output) section below.

## Solution APIs

### Cross-platform Configuration Options

Naming style and availability may differ slightly across platforms/languages.

#### static_image_mode

If set to `false`, the solution treats the input images as a video stream. It
will try to detect the most prominent person in the very first images, and upon
a successful detection further localizes the pose landmarks. In subsequent
images, it then simply tracks those landmarks without invoking another detection
until it loses track, on reducing computation and latency. If set to `true`,
person detection runs every input image, ideal for processing a batch of static,
possibly unrelated, images. Default to `false`.

#### model_complexity

Complexity of the pose landmark model: `0`, `1` or `2`. Landmark accuracy as
well as inference latency generally go up with the model complexity. Default to
`1`.

#### smooth_landmarks

If set to `true`, the solution filters pose landmarks across different input
images to reduce jitter, but ignored if [static_image_mode](#static_image_mode)
is also set to `true`. Default to `true`.

#### enable_segmentation

If set to `true`, in addition to the pose landmarks the solution also generates
the segmentation mask. Default to `false`.

#### smooth_segmentation

If set to `true`, the solution filters segmentation masks across different input
images to reduce jitter. Ignored if [enable_segmentation](#enable_segmentation)
is `false` or [static_image_mode](#static_image_mode) is `true`. Default to
`true`.

#### min_detection_confidence

Minimum confidence value (`[0.0, 1.0]`) from the person-detection model for the
detection to be considered successful. Default to `0.5`.

#### min_tracking_confidence

Minimum confidence value (`[0.0, 1.0]`) from the landmark-tracking model for the
pose landmarks to be considered tracked successfully, or otherwise person
detection will be invoked automatically on the next input image. Setting it to a
higher value can increase robustness of the solution, at the expense of a higher
latency. Ignored if [static_image_mode](#static_image_mode) is `true`, where
person detection simply runs on every image. Default to `0.5`.

### Output

Naming style may differ slightly across platforms/languages.

#### pose_landmarks

A list of pose landmarks. Each landmark consists of the following:

*   `x` and `y`: Landmark coordinates normalized to `[0.0, 1.0]` by the image
    width and height respectively.
*   `z`: Represents the landmark depth with the depth at the midpoint of hips
    being the origin, and the smaller the value the closer the landmark is to
    the camera. The magnitude of `z` uses roughly the same scale as `x`.
*   `visibility`: A value in `[0.0, 1.0]` indicating the likelihood of the
    landmark being visible (present and not occluded) in the image.

#### pose_world_landmarks

*Fig 5. Example of MediaPipe Pose real-world 3D coordinates.* |
:-----------------------------------------------------------: |
<video autoplay muted loop preload style="height: auto; width: 480px"><source src="https://mediapipe.dev/images/mobile/pose_world_landmarks.mp4" type="video/mp4"></video> |

Another list of pose landmarks in world coordinates. Each landmark consists of
the following:

*   `x`, `y` and `z`: Real-world 3D coordinates in meters with the origin at the
    center between hips.
*   `visibility`: Identical to that defined in the corresponding
    [pose_landmarks](#pose_landmarks).

#### segmentation_mask

The output segmentation mask, predicted only when
[enable_segmentation](#enable_segmentation) is set to `true`. The mask has the
same width and height as the input image, and contains values in `[0.0, 1.0]`
where `1.0` and `0.0` indicate high certainty of a "human" and "background"
pixel respectively. Please refer to the platform-specific usage examples below
for usage details.

*Fig 6. Example of MediaPipe Pose segmentation mask.* |
:---------------------------------------------------: |
<video autoplay muted loop preload style="height: auto; width: 480px"><source src="https://mediapipe.dev/images/mobile/pose_segmentation.mp4" type="video/mp4"></video> |

### Python Solution API

Please first follow general [instructions](../getting_started/python.md) to
install MediaPipe Python package, then learn more in the companion
[Python Colab](#resources) and the usage example below.

Supported configuration options:

*   [static_image_mode](#static_image_mode)
*   [model_complexity](#model_complexity)
*   [smooth_landmarks](#smooth_landmarks)
*   [enable_segmentation](#enable_segmentation)
*   [smooth_segmentation](#smooth_segmentation)
*   [min_detection_confidence](#min_detection_confidence)
*   [min_tracking_confidence](#min_tracking_confidence)

```python
import cv2
import mediapipe as mp
import numpy as np
mp_drawing = mp.solutions.drawing_utils
mp_drawing_styles = mp.solutions.drawing_styles
mp_pose = mp.solutions.pose

# For static images:
IMAGE_FILES = []
BG_COLOR = (192, 192, 192) # gray
with mp_pose.Pose(
    static_image_mode=True,
    model_complexity=2,
    enable_segmentation=True,
    min_detection_confidence=0.5) as pose:
  for idx, file in enumerate(IMAGE_FILES):
    image = cv2.imread(file)
    image_height, image_width, _ = image.shape
    # Convert the BGR image to RGB before processing.
    results = pose.process(cv2.cvtColor(image, cv2.COLOR_BGR2RGB))

    if not results.pose_landmarks:
      continue
    print(
        f'Nose coordinates: ('
        f'{results.pose_landmarks.landmark[mp_pose.PoseLandmark.NOSE].x * image_width}, '
        f'{results.pose_landmarks.landmark[mp_pose.PoseLandmark.NOSE].y * image_height})'
    )

    annotated_image = image.copy()
    # Draw segmentation on the image.
    # To improve segmentation around boundaries, consider applying a joint
    # bilateral filter to "results.segmentation_mask" with "image".
    condition = np.stack((results.segmentation_mask,) * 3, axis=-1) > 0.1
    bg_image = np.zeros(image.shape, dtype=np.uint8)
    bg_image[:] = BG_COLOR
    annotated_image = np.where(condition, annotated_image, bg_image)
    # Draw pose landmarks on the image.
    mp_drawing.draw_landmarks(
        annotated_image,
        results.pose_landmarks,
        mp_pose.POSE_CONNECTIONS,
        landmark_drawing_spec=mp_drawing_styles.get_default_pose_landmarks_style())
    cv2.imwrite('/tmp/annotated_image' + str(idx) + '.png', annotated_image)
    # Plot pose world landmarks.
    mp_drawing.plot_landmarks(
        results.pose_world_landmarks, mp_pose.POSE_CONNECTIONS)

# For webcam input:
cap = cv2.VideoCapture(0)
with mp_pose.Pose(
    min_detection_confidence=0.5,
    min_tracking_confidence=0.5) as pose:
  while cap.isOpened():
    success, image = cap.read()
    if not success:
      print("Ignoring empty camera frame.")
      # If loading a video, use 'break' instead of 'continue'.
      continue

    # To improve performance, optionally mark the image as not writeable to
    # pass by reference.
    image.flags.writeable = False
    image = cv2.cvtColor(image, cv2.COLOR_BGR2RGB)
    results = pose.process(image)

    # Draw the pose annotation on the image.
    image.flags.writeable = True
    image = cv2.cvtColor(image, cv2.COLOR_RGB2BGR)
    mp_drawing.draw_landmarks(
        image,
        results.pose_landmarks,
        mp_pose.POSE_CONNECTIONS,
        landmark_drawing_spec=mp_drawing_styles.get_default_pose_landmarks_style())
    # Flip the image horizontally for a selfie-view display.
    cv2.imshow('MediaPipe Pose', cv2.flip(image, 1))
    if cv2.waitKey(5) & 0xFF == 27:
      break
cap.release()
```

### JavaScript Solution API

Please first see general [introduction](../getting_started/javascript.md) on
MediaPipe in JavaScript, then learn more in the companion [web demo](#resources)
and the following usage example.

Supported configuration options:

*   [modelComplexity](#model_complexity)
*   [smoothLandmarks](#smooth_landmarks)
*   [enableSegmentation](#enable_segmentation)
*   [smoothSegmentation](#smooth_segmentation)
*   [minDetectionConfidence](#min_detection_confidence)
*   [minTrackingConfidence](#min_tracking_confidence)

```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/camera_utils/camera_utils.js" crossorigin="anonymous"></script>
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/control_utils/control_utils.js" crossorigin="anonymous"></script>
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/control_utils_3d/control_utils_3d.js" crossorigin="anonymous"></script>
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/drawing_utils/drawing_utils.js" crossorigin="anonymous"></script>
  <script src="https://cdn.jsdelivr.net/npm/@mediapipe/pose/pose.js" crossorigin="anonymous"></script>
</head>

<body>
  <div class="container">
    <video class="input_video"></video>
    <canvas class="output_canvas" width="1280px" height="720px"></canvas>
    <div class="landmark-grid-container"></div>
  </div>
</body>
</html>
```

```javascript
<script type="module">
const videoElement = document.getElementsByClassName('input_video')[0];
const canvasElement = document.getElementsByClassName('output_canvas')[0];
const canvasCtx = canvasElement.getContext('2d');
const landmarkContainer = document.getElementsByClassName('landmark-grid-container')[0];
const grid = new LandmarkGrid(landmarkContainer);

function onResults(results) {
  if (!results.poseLandmarks) {
    grid.updateLandmarks([]);
    return;
  }

  canvasCtx.save();
  canvasCtx.clearRect(0, 0, canvasElement.width, canvasElement.height);
  canvasCtx.drawImage(results.segmentationMask, 0, 0,
                      canvasElement.width, canvasElement.height);

  // Only overwrite existing pixels.
  canvasCtx.globalCompositeOperation = 'source-in';
  canvasCtx.fillStyle = '#00FF00';
  canvasCtx.fillRect(0, 0, canvasElement.width, canvasElement.height);

  // Only overwrite missing pixels.
  canvasCtx.globalCompositeOperation = 'destination-atop';
  canvasCtx.drawImage(
      results.image, 0, 0, canvasElement.width, canvasElement.height);

  canvasCtx.globalCompositeOperation = 'source-over';
  drawConnectors(canvasCtx, results.poseLandmarks, POSE_CONNECTIONS,
                 {color: '#00FF00', lineWidth: 4});
  drawLandmarks(canvasCtx, results.poseLandmarks,
                {color: '#FF0000', lineWidth: 2});
  canvasCtx.restore();

  grid.updateLandmarks(results.poseWorldLandmarks);
}

const pose = new Pose({locateFile: (file) => {
  return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
}});
pose.setOptions({
  modelComplexity: 1,
  smoothLandmarks: true,
  enableSegmentation: true,
  smoothSegmentation: true,
  minDetectionConfidence: 0.5,
  minTrackingConfidence: 0.5
});
pose.onResults(onResults);

const camera = new Camera(videoElement, {
  onFrame: async () => {
    await pose.send({image: videoElement});
  },
  width: 1280,
  height: 720
});
camera.start();
</script>
```

## Example Apps

Please first see general instructions for
[Android](../getting_started/android.md), [iOS](../getting_started/ios.md), and
[desktop](../getting_started/cpp.md) on how to build MediaPipe examples.

Note: To visualize a graph, copy the graph and paste it into
[MediaPipe Visualizer](https://viz.mediapipe.dev/). For more information on how
to visualize its associated subgraphs, please see
[visualizer documentation](../tools/visualizer.md).

### Mobile

#### Main Example

*   Graph:
    [`mediapipe/graphs/pose_tracking/pose_tracking_gpu.pbtxt`](https://github.com/google-ai-edge/mediapipe/tree/master/mediapipe/graphs/pose_tracking/pose_tracking_gpu.pbtxt)
*   Android target:
    [(or download prebuilt ARM64 APK)](https://drive.google.com/file/d/17GFIrqEJS6W8UHKXlYevTtSCLxN9pWlY/view?usp=sharing)
    [`mediapipe/examples/android/src/java/com/google/mediapipe/apps/posetrackinggpu:posetrackinggpu`](https://github.com/google-ai-edge/mediapipe/tree/master/mediapipe/examples/android/src/java/com/google/mediapipe/apps/posetrackinggpu/BUILD)
*   iOS target:
    [`mediapipe/examples/ios/posetrackinggpu:PoseTrackingGpuApp`](http:/mediapipe/examples/ios/posetrackinggpu/BUILD)

### Desktop

Please first see general instructions for [desktop](../getting_started/cpp.md)
on how to build MediaPipe examples.

#### Main Example

*   Running on CPU
    *   Graph:
        [`mediapipe/graphs/pose_tracking/pose_tracking_cpu.pbtxt`](https://github.com/google-ai-edge/mediapipe/tree/master/mediapipe/graphs/pose_tracking/pose_tracking_cpu.pbtxt)
    *   Target:
        [`mediapipe/examples/desktop/pose_tracking:pose_tracking_cpu`](https://github.com/google-ai-edge/mediapipe/tree/master/mediapipe/examples/desktop/pose_tracking/BUILD)
*   Running on GPU
    *   Graph:
        [`mediapipe/graphs/pose_tracking/pose_tracking_gpu.pbtxt`](https://github.com/google-ai-edge/mediapipe/tree/master/mediapipe/graphs/pose_tracking/pose_tracking_gpu.pbtxt)
    *   Target:
        [`mediapipe/examples/desktop/pose_tracking:pose_tracking_gpu`](https://github.com/google-ai-edge/mediapipe/tree/master/mediapipe/examples/desktop/pose_tracking/BUILD)

## Resources

*   Google AI Blog:
    [BlazePose - On-device Real-time Body Pose Tracking](https://ai.googleblog.com/2020/08/on-device-real-time-body-pose-tracking.html)
*   Paper:
    [BlazePose: On-device Real-time Body Pose Tracking](https://arxiv.org/abs/2006.10204)
    ([presentation](https://youtu.be/YPpUOTRn5tA))
*   [Models and model cards](./models.md#pose)
*   [GHUM & GHUML: Generative 3D Human Shape and Articulated Pose Models](https://github.com/google-research/google-research/tree/master/ghum)
*   [Web demo](https://code.mediapipe.dev/codepen/pose)
*   [Python Colab](https://mediapipe.page.link/pose_py_colab)

[`mAP`]: https://cocodataset.org/#keypoints-eval
[`PCK@0.2`]: https://github.com/cbsudux/Human-Pose-Estimation-101

##