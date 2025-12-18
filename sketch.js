let video;
let poseNet;
let pose;
let bgImage;

// 1. 짧은 시구들 (한 줄로 떨어짐)
let shortPhrases = [
    "영원히 무너지는", "물방울", "작은 물이 큰 물", "만나는 감격",
    "잠깐 번지는", "감격", "흐르는 물과 내리는 물의", "서로 몸 바꾸기",
    "물 속에 잠든 풀잎", "한번 발 내리며"
];

// 2. 긴 문장 (문단 덩어리로 떨어짐)
let longParagraphs = [
    "그대가 물의 발이라면 나는 물의 발가락\n그대가 물의 종이라면 물의 분자와 분자 사이를\n헤집고 밀치며 살 부비는 나는 물의 종소리\n그대가 물의 입이라면 벌어진 물의 입이라면\n나는 하늘에 땅을 잇는 물의 울음 오, 그대가 물의 일그러진 입이라면\n물 속에 잠든 풀잎 한번 발 내리며 영원히 무너지는 물방울",
    "풀밭에서 잠들었어 내 몸이 물새알처럼 부서지고\n날개 없는 꿈이 기어나왔어 아득히 흐린 하늘을 기어올라갔어 물새의\n발자국을 남기며 풀밭에서 눈떴어 눈 없는 강이 흘러왔어\n 건너마을이 따라갔어 칭얼대며 피마자와 옥수수가 자라나고\n플라스틱 칼이 내 몸에 박혔어 나를 버리고 물이 되었어\n겨울을 생각하며 얼음이 되었어 그 다음엔 녹기만 하면 돼\n 깊이 가라앉아 몸 흔들면 돼, 순대처럼 토막토막 끊어져도"
];

let fallingTexts = [];

function preload() {
    // 배경 이미지 로드 (bg.png 파일 확인 필수)
    bgImage = loadImage('bg2.png');
}

function setup() {
    createCanvas(windowWidth, windowHeight);

    // 비디오 설정
    video = createCapture(VIDEO);
    video.size(640, 480);
    video.hide();

    // PoseNet 초기화
    poseNet = ml5.poseNet(video, modelLoaded);
    poseNet.on('pose', gotPoses);

    // 폰트 설정
    textFont('Nanum Myeongjo');
    textStyle(BOLD);
}

function draw() {
    // 1. 배경 그리기
    if (bgImage) {
        let imgAspect = bgImage.width / bgImage.height;
        let winAspect = width / height;

        if (winAspect > imgAspect) {
            image(bgImage, 0, 0, width, width / imgAspect);
        } else {
            image(bgImage, 0, 0, height * imgAspect, height);
        }
    } else {
        background(240, 235, 225);
    }

    // 2. 텍스트 생성
    if (frameCount % 60 == 0) {
        let type = random() > 0.4 ? 'short' : 'long';
        let content = (type === 'short') ? random(shortPhrases) : random(longParagraphs);

        let startX = random(50, width - 250);
        fallingTexts.push(new TextParticle(startX, -100, content, type));
    }

    // 3. 텍스트 업데이트 및 그리기
    for (let i = fallingTexts.length - 1; i >= 0; i--) {
        let t = fallingTexts[i];

        if (pose) {
            t.checkCollision(pose);
        }

        t.update();
        t.display();

        if (t.isOffScreen()) {
            fallingTexts.splice(i, 1);
        }
    }

    // [추가된 부분] 4. 우측 하단에 내 모습 그리기 (PIP)
    drawPipCamera();
}

// *** 우측 하단 작은 카메라 함수 ***
function drawPipCamera() {
    let pipW = 200; // 작은 화면 너비
    // 비율 유지하며 높이 계산
    let pipH = (pipW * video.height) / video.width;

    let x = width - pipW - 20; // 우측 여백 20
    let y = height - pipH - 20; // 하단 여백 20

    // 테두리 및 배경 (깔끔하게 보이기 위해)
    noStroke();
    fill(0);
    rect(x - 2, y - 2, pipW + 4, pipH + 4);

    // 비디오 그리기 (거울 모드 적용)
    push();
    translate(x + pipW, y); // 우측 상단으로 이동
    scale(-1, 1); // 좌우 반전
    image(video, 0, 0, pipW, pipH);
    pop();

    // (선택사항) 뼈대(스켈레톤)도 같이 보고 싶다면 아래 주석 해제
    /*
    if (pose) {
        push();
        translate(x + pipW, y);
        scale(-1, 1);
        // 좌표 비율 축소
        let scaleS = pipW / video.width;
        scale(scaleS);
        
        stroke(0, 255, 0);
        strokeWeight(2);
        let keypoints = pose.keypoints;
        for (let i = 0; i < keypoints.length; i++) {
            let kp = keypoints[i];
            if(kp.score > 0.5) point(kp.position.x, kp.position.y);
        }
        pop();
    }
    */
}

// *** 텍스트 파티클 클래스 ***
class TextParticle {
    constructor(x, y, word, type) {
        this.x = x;
        this.y = y;
        this.word = word;
        this.type = type; // 'short' or 'long'

        this.velY = random(1.5, 3);
        this.velX = 0;
        this.isStopped = false;

        this.textSize = 14;
        this.lineHeight = 20;

        // 문단 너비 설정
        if (this.type === 'long') {
            this.boxWidth = 220;
        } else {
            this.boxWidth = 600;
        }
    }

    update() {
        this.x += this.velX;
        this.y += this.velY;
        this.velX *= 0.95;
    }

    display() {
        fill(0); // 검은색 글씨
        noStroke();

        if (this.isStopped) {
            fill(100, 20, 20); // 멈추면 붉은색
        }

        textSize(this.textSize);
        textLeading(this.lineHeight);
        textAlign(LEFT, TOP);

        // 문단 그리기
        text(this.word, this.x, this.y, this.boxWidth, 1000);
    }

    checkCollision(pose) {
        if (this.isStopped) return;

        let leftS = pose.leftShoulder;
        let rightS = pose.rightShoulder;

        // 좌표 변환
        let scaleX = width / video.width;
        let scaleY = height / video.height;

        // 거울 모드 인터랙션 좌표 계산
        let lsX = (video.width - leftS.x) * scaleX;
        let rsX = (video.width - rightS.x) * scaleX;
        let sY = rightS.y * scaleY;

        let centerX = this.x + (this.boxWidth / 2);
        if (this.type === 'short') centerX = this.x + (textWidth(this.word) / 2);

        let minX = min(lsX, rsX);
        let maxX = max(lsX, rsX);

        if (centerX > minX - 60 && centerX < maxX + 60) {
            if (this.y > sY - 60 && this.y < sY + 20) {
                this.y = sY - 20;
                this.velY = 0;
                this.isStopped = true;
            }
        }
    }

    isOffScreen() {
        return (this.y > height + 50);
    }
}

function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
}

function modelLoaded() {
    console.log('PoseNet Ready');
}

function gotPoses(poses) {
    if (poses.length > 0) {
        pose = poses[0].pose;
    }
}