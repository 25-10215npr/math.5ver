window.onload = function () {
  const canvas = document.getElementById("plane");
  const ctx = canvas.getContext("2d");

  let W = canvas.width;
  let H = canvas.height;

  // 1칸 = 몇 픽셀
  const scale = 30;

  // 평면 드래그용 오프셋 (세계 좌표 기준 평면 이동)
  let panX = 0;
  let panY = 0;

  // 점의 세계 좌표 (캐릭터)
  let pointX = 0;
  let pointY = 0;

  // 카메라의 "점 기준" 좌표 (카메라 좌표평면)
  // => 세계 좌표에서는 (pointX + camRelX, pointY + camRelY)
  let camRelX = 5;
  let camRelY = 0;

  // 좌표평면 표시 여부 (초기: 맵만 ON, 카메라 OFF)
  let showMapPlane = true;
  let showCameraPlane = false;

  // 드래그 상태
  let isDragging = false;
  let prevX = 0;
  let prevY = 0;

  // 무지개 색 (빨주노초파남보)
  const rainbowColors = [
    "#ef4444", // 빨강
    "#f97316", // 주황
    "#facc15", // 노랑
    "#22c55e", // 초록
    "#0ea5e9", // 파랑
    "#6366f1", // 남(남색에 가까운 파랑)
    "#a855f7"  // 보라
  ];

  // DOM 요소들
  const xInput = document.getElementById("xInput");
  const yInput = document.getElementById("yInput");
  const moveBtn = document.getElementById("moveBtn");
  const coordLabel = document.getElementById("coordLabel");

  const camXInput = document.getElementById("camXInput");
  const camYInput = document.getElementById("camYInput");
  const moveCamBtn = document.getElementById("moveCamBtn");
  const camCoordLabel = document.getElementById("camCoordLabel");

  const mapPlaneBtn = document.getElementById("mapPlaneBtn");
  const cameraPlaneBtn = document.getElementById("cameraPlaneBtn");

  const joyButtons = document.querySelectorAll(".joy-btn");
  const symButtons = document.querySelectorAll(".sym-btn");

  const lineAInput = document.getElementById("lineA");
  const lineBInput = document.getElementById("lineB");
  const lineCInput = document.getElementById("lineC");
  const customSymBtn = document.getElementById("customSymBtn");

  const step = 1; // 조이스틱으로 한 번에 움직이는 칸 수

  // 수학 좌표 → 캔버스 좌표 (세계 좌표 기준)
  function toCanvasX(x) {
    return W / 2 + panX + x * scale;
  }
  function toCanvasY(y) {
    return H / 2 + panY - y * scale;
  }

  /* ---------- 맵 좌표평면 (세계 기준 0,0) ---------- */
  function drawMapAxes() {
    const grid = "#d1d5db";
    const axis = "#111827";
    const numberColor = "#6b7280";

    const originX = W / 2 + panX;
    const originY = H / 2 + panY;

    ctx.strokeStyle = grid;
    ctx.lineWidth = 1;

    const minX = Math.floor((0 - originX) / scale);
    const maxX = Math.ceil((W - originX) / scale);
    const minY = Math.floor((originY - H) / scale);
    const maxY = Math.ceil(originY / scale);

    // 세로 격자
    for (let x = minX; x <= maxX; x++) {
      const cx = toCanvasX(x);
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, H);
      ctx.stroke();
    }

    // 가로 격자
    for (let y = minY; y <= maxY; y++) {
      const cy = toCanvasY(y);
      ctx.beginPath();
      ctx.moveTo(0, cy);
      ctx.lineTo(W, cy);
      ctx.stroke();
    }

    // x축
    ctx.strokeStyle = axis;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, originY);
    ctx.lineTo(W, originY);
    ctx.stroke();

    // y축
    ctx.beginPath();
    ctx.moveTo(originX, 0);
    ctx.lineTo(originX, H);
    ctx.stroke();

    // 숫자 눈금 (세계 기준 좌표)
    ctx.font = "11px system-ui";
    ctx.fillStyle = numberColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    for (let x = minX; x <= maxX; x++) {
      if (x === 0) continue;
      const cx = toCanvasX(x);
      ctx.fillText(x, cx, originY + 3);
    }

    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let y = minY; y <= maxY; y++) {
      if (y === 0) continue;
      const cy = toCanvasY(y);
      ctx.fillText(y, originX - 4, cy);
    }
  }

  /* ---------- 카메라 좌표평면 (점 기준 0,0) ---------- */
  function drawCameraAxes() {
    const grid = "rgba(37,99,235,0.10)";      // 연한 파란 격자
    const axis = "rgba(37,99,235,0.7)";       // 파란 축
    const numberColor = "rgba(37,99,235,0.8)";

    // 카메라 좌표평면에서 원점 (0,0)는 항상 "점"이다.
    // => 세계 좌표로는 (pointX, pointY)
    const originX = toCanvasX(pointX);
    const originY = toCanvasY(pointY);

    ctx.strokeStyle = grid;
    ctx.lineWidth = 1;

    // 카메라 좌표계에서의 u, v 범위 (점 기준)
    const minU = Math.floor((0 - originX) / scale);
    const maxU = Math.ceil((W - originX) / scale);
    const minV = Math.floor((originY - H) / scale);
    const maxV = Math.ceil(originY / scale);

    // 세로 격자 (u 방향)
    for (let u = minU; u <= maxU; u++) {
      const worldX = pointX + u; // 점 기준 u만큼 떨어진 곳
      const cx = toCanvasX(worldX);
      ctx.beginPath();
      ctx.moveTo(cx, 0);
      ctx.lineTo(cx, H);
      ctx.stroke();
    }

    // 가로 격자 (v 방향)
    for (let v = minV; v <= maxV; v++) {
      const worldY = pointY + v;
      const cy = toCanvasY(worldY);
      ctx.beginPath();
      ctx.moveTo(0, cy);
      ctx.lineTo(W, cy);
      ctx.stroke();
    }

    // x축 (u축): v = 0 -> worldY = pointY
    ctx.strokeStyle = axis;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, originY);
    ctx.lineTo(W, originY);
    ctx.stroke();

    // y축 (v축): u = 0 -> worldX = pointX
    ctx.beginPath();
    ctx.moveTo(originX, 0);
    ctx.lineTo(originX, H);
    ctx.stroke();

    // 숫자 눈금 (카메라 좌표: 점 기준 좌표 u, v)
    ctx.font = "10px system-ui";
    ctx.fillStyle = numberColor;
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    // u 라벨 (점 기준 x)
    for (let u = minU; u <= maxU; u++) {
      if (u === 0) continue; // 원점은 생략
      const worldX = pointX + u;
      const cx = toCanvasX(worldX);
      ctx.fillText(u, cx, originY + 3);
    }

    // v 라벨 (점 기준 y)
    ctx.textAlign = "right";
    ctx.textBaseline = "middle";
    for (let v = minV; v <= maxV; v++) {
      if (v === 0) continue;
      const worldY = pointY + v;
      const cy = toCanvasY(worldY);
      ctx.fillText(v, originX - 4, cy);
    }
  }

  // 🔍 캐릭터에서 카메라로 향하는 방향(각도)에 해당하는 무지개 색 계산
 // 🔍 캐릭터에서 카메라로 향하는 방향(각도)에 해당하는 무지개 색 계산
  function getLinkColor() {
    // 캔버스 기준 방향 벡터를 그대로 사용 (y축이 아래로 증가하는 좌표계)
    const charX = toCanvasX(pointX);
    const charY = toCanvasY(pointY);

    const camWorldX = pointX + camRelX;
    const camWorldY = pointY + camRelY;
    const camX = toCanvasX(camWorldX);
    const camY = toCanvasY(camWorldY);

    const dx = camX - charX;
    const dy = camY - charY;

    if (dx === 0 && dy === 0) {
      // 카메라가 점 위에 있으면 기본색(빨강)
      return rainbowColors[0];
    }

    // ⚠ 여기서는 "캔버스 좌표" 각도 사용
    // canvas의 arc도 이 좌표계를 기준으로 하니까,
    // 이 각도로 칠해야 선이 닿는 부위 색과 딱 맞음
    let theta = Math.atan2(dy, dx); // -π ~ π
    if (theta < 0) theta += 2 * Math.PI; // 0 ~ 2π

    const sector = 2 * Math.PI / rainbowColors.length;
    let idx = Math.floor(theta / sector);
    if (idx < 0) idx = 0;
    if (idx >= rainbowColors.length) idx = rainbowColors.length - 1;

    return rainbowColors[idx];
  }
  
  // 🌈 캐릭터(무지개 원) 그리기
  function drawPoint() {
    const cx = toCanvasX(pointX);
    const cy = toCanvasY(pointY);
    const radius = 9;

    const n = rainbowColors.length;
    const sectorAngle = (2 * Math.PI) / n;

    for (let i = 0; i < n; i++) {
      const start = i * sectorAngle;
      const end = start + sectorAngle;

      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, radius, start, end);
      ctx.closePath();
      ctx.fillStyle = rainbowColors[i];
      ctx.fill();
    }

    // 테두리 살짝
    ctx.strokeStyle = "#111827";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 🔵 카메라(파란색 점) 그리기
  function drawCamera() {
    const camWorldX = pointX + camRelX;
    const camWorldY = pointY + camRelY;

    const cx = toCanvasX(camWorldX);
    const cy = toCanvasY(camWorldY);

    ctx.fillStyle = "#3b82f6";
    ctx.beginPath();
    ctx.arc(cx, cy, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = "#1d4ed8";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(cx, cy, 7, 0, Math.PI * 2);
    ctx.stroke();
  }

  // 🔗 캐릭터점과 카메라점 사이 점선 그리기
  function drawLinkLine() {
    const charX = toCanvasX(pointX);
    const charY = toCanvasY(pointY);

    const camWorldX = pointX + camRelX;
    const camWorldY = pointY + camRelY;
    const camX = toCanvasX(camWorldX);
    const camY = toCanvasY(camWorldY);

    const color = getLinkColor();

    ctx.save();
    ctx.setLineDash([6, 4]); // 점선
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;

    ctx.beginPath();
    ctx.moveTo(charX, charY);
    ctx.lineTo(camX, camY);
    ctx.stroke();

    ctx.restore();
  }

  // 전체 장면 그리기
  function drawScene() {
    ctx.clearRect(0, 0, W, H);

    // 카메라 격자를 먼저, 그 다음 맵 격자 (맵이 메인처럼 보이게)
    if (showCameraPlane) {
      drawCameraAxes();
    }
    if (showMapPlane) {
      drawMapAxes();
    }

    // 캐릭터-카메라 연결 점선
    drawLinkLine();

    // 캐릭터와 카메라 점 그리기
    drawPoint();
    drawCamera();
  }

  function updateCoordLabel() {
    coordLabel.textContent = `(${pointX}, ${pointY})`;
  }

  function updateCamLabel() {
    camCoordLabel.textContent = `(${camRelX}, ${camRelY})`;
  }

  // 점을 수학 좌표 입력으로 이동
  function applyInputPosition() {
    const xVal = Number(xInput.value);
    const yVal = Number(yInput.value);
    if (isNaN(xVal) || isNaN(yVal)) return;

    pointX = xVal;
    pointY = yVal;
    updateCoordLabel();
    drawScene();
  }

  // 카메라를 수학 좌표(점 기준)로 이동
  function applyCameraPosition() {
    const xVal = Number(camXInput.value);
    const yVal = Number(camYInput.value);
    if (isNaN(xVal) || isNaN(yVal)) return;

    camRelX = xVal;
    camRelY = yVal;
    updateCamLabel();
    drawScene();
  }

  // 이벤트 연결: 점 좌표 입력
  moveBtn.addEventListener("click", applyInputPosition);
  xInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") applyInputPosition();
  });
  yInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") applyInputPosition();
  });

  // 이벤트 연결: 카메라 좌표 입력
  moveCamBtn.addEventListener("click", applyCameraPosition);
  camXInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") applyCameraPosition();
  });
  camYInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") applyCameraPosition();
  });

  // 세팅값: 맵 / 카메라 좌표평면 ON/OFF
  function refreshPlaneButtons() {
    if (showMapPlane) {
      mapPlaneBtn.classList.add("on");
      mapPlaneBtn.textContent = "맵 좌표평면: ON";
    } else {
      mapPlaneBtn.classList.remove("on");
      mapPlaneBtn.textContent = "맵 좌표평면: OFF";
    }

    if (showCameraPlane) {
      cameraPlaneBtn.classList.add("on");
      cameraPlaneBtn.textContent = "카메라 좌표평면: ON";
    } else {
      cameraPlaneBtn.classList.remove("on");
      cameraPlaneBtn.textContent = "카메라 좌표평면: OFF";
    }
  }

  mapPlaneBtn.addEventListener("click", () => {
    showMapPlane = !showMapPlane;
    refreshPlaneButtons();
    drawScene();
  });

  cameraPlaneBtn.addEventListener("click", () => {
    showCameraPlane = !showCameraPlane;
    refreshPlaneButtons();
    drawScene();
  });

  // 조이스틱으로 점 이동
  joyButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const dir = btn.dataset.dir;

      if (dir === "up") pointY += step;
      if (dir === "down") pointY -= step;
      if (dir === "left") pointX -= step;
      if (dir === "right") pointX += step;

      xInput.value = pointX;
      yInput.value = pointY;
      updateCoordLabel();
      drawScene();
    });
  });

  // 기본 대칭 이동 버튼들 (y=x, x축, y축, 원점)
  symButtons.forEach((btn) => {
    btn.addEventListener("click", () => {
      const t = btn.dataset.type;

      if (t === "diag") {
        // y = x 대칭: (x, y) → (y, x)
        [camRelX, camRelY] = [camRelY, camRelX];
      } else if (t === "yaxis") {
        // y축 대칭: (x, y) → (-x, y)
        camRelX = -camRelX;
      } else if (t === "xaxis") {
        // x축 대칭: (x, y) → (x, -y)
        camRelY = -camRelY;
      } else if (t === "origin") {
        // 원점 대칭: (x, y) → (-x, -y)
        camRelX = -camRelX;
        camRelY = -camRelY;
      }

      camXInput.value = camRelX;
      camYInput.value = camRelY;
      updateCamLabel();
      drawScene();
    });
  });

  // 사용자 정의 직선 ax + by + c = 0 에 대한 대칭
  if (customSymBtn && lineAInput && lineBInput && lineCInput) {
    customSymBtn.addEventListener("click", () => {
      let a = Number(lineAInput.value);
      let b = Number(lineBInput.value);
      let c = Number(lineCInput.value);

      // a, b 둘 다 0이면 직선이 아님
      if (a === 0 && b === 0) {
        alert("a와 b 중 적어도 하나는 0이 아니어야 해요!");
        return;
      }

      const x0 = camRelX;
      const y0 = camRelY;

      // d = (ax0 + by0 + c) / (a^2 + b^2)
      const denom = a * a + b * b;
      const d = (a * x0 + b * y0 + c) / denom;

      const xRef = x0 - 2 * a * d;
      const yRef = y0 - 2 * b * d;

      camRelX = xRef;
      camRelY = yRef;

      camXInput.value = camRelX;
      camYInput.value = camRelY;
      updateCamLabel();
      drawScene();
    });
  }

  // 마우스 드래그로 평면 이동
  canvas.addEventListener("mousedown", (e) => {
    isDragging = true;
    prevX = e.clientX;
    prevY = e.clientY;
  });

  window.addEventListener("mousemove", (e) => {
    if (!isDragging) return;
    const dx = e.clientX - prevX;
    const dy = e.clientY - prevY;
    prevX = e.clientX;
    prevY = e.clientY;
    panX += dx;
    panY += dy;
    drawScene();
  });

  window.addEventListener("mouseup", () => {
    isDragging = false;
  });

  // 터치 드래그로 평면 이동
  canvas.addEventListener("touchstart", (e) => {
    e.preventDefault();
    isDragging = true;
    prevX = e.touches[0].clientX;
    prevY = e.touches[0].clientY;
  });

  canvas.addEventListener("touchmove", (e) => {
    e.preventDefault();
    if (!isDragging) return;
    const x = e.touches[0].clientX;
    const y = e.touches[0].clientY;
    const dx = x - prevX;
    const dy = y - prevY;
    prevX = x;
    prevY = y;
    panX += dx;
    panY += dy;
    drawScene();
  });

  canvas.addEventListener("touchend", () => {
    isDragging = false;
  });

  // 초기 상태
  updateCoordLabel();
  updateCamLabel();
  refreshPlaneButtons();
  drawScene();
};
