/**
 * ==============================================================================
 * [main.js] 3D & 2D 인터랙티브 데이터 시각화 웹 플랫폼 메인 스크립트
 * ==============================================================================
 * 
 * [시스템 개요]
 * - WebGPU (Vulkan / Direct3D 12) 및 WebGL 2.0 하드웨어 가속 기반 실시간 3D 렌더링
 * - 엑셀(.xlsx, .xls) 및 CSV 무변환 고속 파싱 (SheetJS & TextDecoder 바이너리 스니퍼)
 * - 한국어 ANSI(EUC-KR / CP949) 및 표준 UTF-8 자동 감지 엔진 탑재
 * - 1.5 × IQR(사분위수 범위) 기반 AI 통계 분석 및 이상치(Outlier) 자동 브리핑
 * - 시계열 타임슬라이더 플레이어 (0~100세, 연도별 타임랩스 애니메이션)
 * - 10종 3D 지오메트리 & 8종 2D Chart.js 양방향 레이캐스팅 동기화
 * - 스튜디오급 정밀 3D 조명/환경 제어 및 A4 분석 보고서 인쇄 시스템
 * 
 * [아키텍처 목차 (Architecture Index)]
 * 1. 차세대 그래픽스 엔진 (Vulkan / WebGPU) & Three.js 씬 초기화
 * 2. 전역 상태 관리 (Global States)
 * 3. DOM 엘리먼트 참조 캐싱
 * 4. 카메라 제어 (부드러운 시점 보간 애니메이션 & 앵글 프리셋)
 * 5. 대시보드 메뉴 & 아코디언 인터페이스
 * 6. 메뉴 패널 스크롤 엔진 (마우스 휠 + 모바일 터치 제스처 + 키보드)
 * 7. 3D 환경 및 조명 실시간 제어 (Ambient, Sunlight, Exposure, Fog, Shadow)
 * 8. CSV/엑셀 파싱 및 다중 인코딩 디코더 (UTF-8, EUC-KR 자동 감지)
 * 9. 스마트 통계 분석 및 AI 이상치 탐지 엔진
 * 10. 지능형 추천 시각화 자동 적용 엔진
 * 11. 인터랙티브 데이터 테이블 렌더링 & 양방향 선택 연동
 * 12. 10종 3D 지오메트리 스타일 렌더러 (Cylinder, Pie, Tube, Scatter, Surface 등)
 * 13. 3D 월드 좌표 ↔ 2D 화면 DOM 투영 동기화 (Vector3.project)
 * 14. 3D 레이캐스팅 광선 추적 (Hover 발광 & Click 카메라 포커싱)
 * 15. 선택 항목 상세 카드 & 비교 미니 차트 표출
 * 16. Chart.js 2D 보조 차트 렌더러 & 다축 데이터 필터링/정렬 엔진
 * 17. 이벤트 리스너, 파일 로더, 타임라인 플레이어 & A4 보고서 출력
 * 18. 차세대 렌더 루프 및 실시간 60FPS 성능 모니터링
 * ==============================================================================
 */

import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import WebGPURenderer from 'three/addons/renderers/webgpu/WebGPURenderer.js';

// ════════════════════════════════════════════════════════════
// 1. 차세대 그래픽스 엔진 (Vulkan / WebGPU) & Three.js 씬 초기화
// ════════════════════════════════════════════════════════════
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xf1f5f9);
scene.fog = new THREE.FogExp2(0xf1f5f9, 0.015);

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 500);
camera.position.set(0, 10, 20);

// GPU 하드웨어 정보 및 실시간 실측 엔진 상태
const gpuEngineState = {
    isWebGPU: true,
    backendName: 'WebGPU (Vulkan / Direct3D 12 Low-level)',
    gpuName: 'Vulkan 가속 하드웨어 GPU',
    vendor: 'Native Hardware',
    architecture: 'WGSL Low-level Pipeline',
    featuresCount: 0,
    fps: 0,
    frameTimeMs: '0.0',
    minFps: 999,
    maxFps: 0,
    avgFps: 0,
    fpsHistory: [] // 최근 실측 프레임레이트 기록 (스파크라인 그래프 렌더링용)
};

// ── WebGPURenderer 전용 초기화 ──
// WebGPURenderer는 내부적으로 WebGPU 미지원 환경에서 자동으로 WebGL2 백엔드로 폴백합니다.
const renderer = new WebGPURenderer({ antialias: true, alpha: false, forceWebGL: false });
await renderer.init();

// 실제 어댑터 정보 비동기 조회 (UI 뱃지 갱신)
(async () => {
    if ('gpu' in navigator) {
        try {
            const adapter = await navigator.gpu.requestAdapter();
            if (adapter) {
                const info = await adapter.requestAdapterInfo?.();
                if (info) {
                    gpuEngineState.gpuName = info.device || info.description || 'Vulkan 가속 하드웨어 GPU';
                    gpuEngineState.vendor = info.vendor || 'Native Hardware';
                    gpuEngineState.architecture = info.architecture || 'WGSL Low-level Pipeline';
                }
                gpuEngineState.featuresCount = adapter.features?.size || 0;
                const badge = document.getElementById('gpu-engine-text');
                if (badge) badge.textContent = '⚡ Vulkan / WebGPU';
                console.log('⚡ Vulkan / WebGPU 엔진 활성화:', gpuEngineState);
            }
        } catch (e) {
            console.warn('WebGPU 어댑터 정보 조회 실패:', e);
        }
    }
})();

renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;
container.appendChild(renderer.domElement);

// ── OrbitControls ──
const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.06;
controls.minDistance = 3;
controls.maxDistance = 80;
controls.maxPolarAngle = Math.PI * 0.85;
controls.touches = { ONE: THREE.TOUCH.ROTATE, TWO: THREE.TOUCH.DOLLY_PAN };
controls.target.set(0, 2, 0);

// ── 조명 (라이트 모드에 최적화된 밝은 환경) ──
const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
scene.add(ambientLight);

const dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
dirLight.position.set(12, 20, 10);
dirLight.castShadow = true;
dirLight.shadow.mapSize.set(2048, 2048);
dirLight.shadow.camera.near = 0.5;
dirLight.shadow.camera.far = 60;
dirLight.shadow.camera.left = -20;
dirLight.shadow.camera.right = 20;
dirLight.shadow.camera.top = 20;
dirLight.shadow.camera.bottom = -20;
dirLight.shadow.bias = -0.00005;
dirLight.shadow.normalBias = 0.02;
scene.add(dirLight);

const pointLight = new THREE.PointLight(0x818cf8, 0.8, 50);
pointLight.position.set(-8, 12, -5);
scene.add(pointLight);

// ── 바닥 및 그리드 (부드러운 슬레이트 그레이) ──
const gridHelper = new THREE.GridHelper(40, 40, 0xcbd5e1, 0xe2e8f0);
scene.add(gridHelper);

const floorGeo = new THREE.PlaneGeometry(40, 40);
const floorMat = new THREE.MeshStandardMaterial({
    color: 0xf8fafc, roughness: 0.9, metalness: 0.1
});
const floor = new THREE.Mesh(floorGeo, floorMat);
floor.rotation.x = -Math.PI / 2;
floor.position.y = -0.01;
floor.receiveShadow = true;
scene.add(floor);

// ════════════════════════════════════════════════════════════
// 2. 전역 상태
// ════════════════════════════════════════════════════════════
let parsedData = null;
let analysisResult = null;
let chart2d = null;
let miniChart = null;
let dataObjects = [];
let extraVisuals = [];
let domLabels = [];
let showLabels = true;
let selectedObject = null;
let hoveredObject = null;
let cameraAnim = null;

// ════════════════════════════════════════════════════════════
// 3. DOM 참조
// ════════════════════════════════════════════════════════════
const $ = id => document.getElementById(id);
const csvUpload = $('csv-upload');
const csvEncodingSelect = $('csv-encoding-select');
let currentUploadedFile = null;
const fileNameDisplay = $('file-name');
const statusIndicator = $('status-indicator');
const detailSection = $('detail-card-section');
const detailName = $('detail-name');
const detailStats = $('detail-stats');
const analysisSection = $('analysis-section');
const analysisResultEl = $('analysis-result');
const vizSection = $('viz-section');
const chartTypeSelect = $('chart-type-select');
const xAxisSelect = $('x-axis-select');
const yAxisSelect = $('y-axis-select');
const applyBtn = $('apply-btn');
const filterSection = $('filter-section');
const dataFilter = $('data-filter');
const rangeMin = $('range-min');
const rangeMax = $('range-max');
const btnApplyRange = $('btn-apply-range');
const sortSelect = $('sort-select');
const chartPanel = $('chart-panel');
const chartTitle = $('chart-title');
const chartCloseBtn = $('chart-close-btn');
const chartMaxBtn = $('chart-maximize-btn');
const hoverTooltip = $('hover-tooltip');
const tooltipName = $('tooltip-name');
const tooltipValue = $('tooltip-value');
const labelLayer = $('label-layer');
const barStyleSelect = $('bar-style');
const menuPanel = $('menu-panel');
const btnToggleMenu = $('btn-toggle-menu');
const btnCloseMenu = $('btn-close-menu');
const autoRecommendToggle = $('auto-recommend-toggle');
const autoRecommendStatusBadge = $('auto-recommend-status-badge');
const appliedRecommendNotice = $('applied-recommend-notice');
const btnForceRecommend = $('btn-force-recommend');
const colorThemeSelect = $('color-theme-select');
const customColorGroup = $('custom-color-group');
const customColorPicker = $('custom-theme-color-picker');
const customColorCode = $('custom-theme-color-code');
const filterKeyword = $('filter-keyword');
const limitSelect = $('limit-select');
const filterSummaryBadge = $('filter-summary-badge');
const btnFilterTop10 = $('btn-filter-top10');
const btnFilterAboveAvg = $('btn-filter-above-avg');
const btnFilterTop20pct = $('btn-filter-top20pct');
const btnFilterAll = $('btn-filter-all');

// GPU 뱃지 및 모달 DOM 참조
const gpuEngineBadge = $('gpu-engine-badge');
const gpuEngineText = $('gpu-engine-text');
const gpuBadgeFps = $('gpu-badge-fps');
const gpuInfoModal = $('gpu-info-modal');
const btnCloseGpuModal = $('btn-close-gpu-modal');
const modalGpuApi = $('modal-gpu-api');
const modalGpuDevice = $('modal-gpu-device');
const modalGpuVendor = $('modal-gpu-vendor');
const modalGpuArchitecture = $('modal-gpu-architecture');
const modalGpuFeatures = $('modal-gpu-features');
const modalGpuFps = $('modal-gpu-fps');
const modalGpuFpsBadge = $('modal-gpu-fps-badge');
const modalGpuFpsStats = $('modal-gpu-fps-stats');
const modalGpuFrameCount = $('modal-gpu-frame-count');
const fpsSparklineCanvas = $('fps-sparkline-canvas');

// 타임라인 플레이어 & 토스트 DOM 참조
const btnToggleTimeline = $('btn-toggle-timeline');
const timePlayerBar = $('time-player-bar');
const btnTimePlay = $('btn-time-play');
const btnTimePrev = $('btn-time-prev');
const btnTimeNext = $('btn-time-next');
const timeSliderRange = $('time-slider-range');
const timeSpeedSelect = $('time-speed-select');
const timeStepBadge = $('time-step-badge');
const timeColName = $('time-col-name');
const btnCloseTimePlayer = $('btn-close-time-player');
const toastNotification = $('toast-notification');

function showToast(message, duration = 3200) {
    if (!toastNotification) return;
    toastNotification.innerHTML = message;
    toastNotification.style.display = 'flex';
    clearTimeout(toastNotification._timer);
    toastNotification._timer = setTimeout(() => {
        toastNotification.style.display = 'none';
    }, duration);
}

// GPU 엔진 뱃지 UI 갱신 함수
function updateGpuBadgeUI() {
    if (!gpuEngineBadge || !gpuEngineText) return;
    if (gpuEngineState.isWebGPU) {
        gpuEngineBadge.className = 'gpu-badge';
        gpuEngineText.textContent = '⚡ Vulkan / WebGPU';
        gpuEngineBadge.title = `차세대 WebGPU(Vulkan Low-level 백엔드) 활성화: ${gpuEngineState.gpuName}`;
    } else {
        gpuEngineBadge.className = 'gpu-badge fallback';
        gpuEngineText.textContent = '🌐 WebGL 2.0 (호환)';
        gpuEngineBadge.title = 'WebGL 2.0 세이프 모드로 실행 중 (WebGPU 미지원 환경)';
    }
}
updateGpuBadgeUI();

// ⚡ 실시간 GPU 렌더링 성능 및 FPS 측정 UI 갱신 함수
function updateGpuModalLivePerformance() {
    if (!modalGpuFps) return;

    // 1. 실시간 실측 FPS 및 프레임 레이턴시(ms) 갱신
    modalGpuFps.textContent = `${gpuEngineState.fps} FPS (${gpuEngineState.frameTimeMs} ms)`;

    // 2. 실시간 성능 평가 상태 뱃지 (60+ 🟢 쾌적, 30+ 🟡 보통, 30미만 🔴 부하)
    if (modalGpuFpsBadge) {
        if (gpuEngineState.fps >= 55) {
            modalGpuFpsBadge.className = 'fps-status-badge smooth';
            modalGpuFpsBadge.textContent = '🟢 쾌적 (Ultra Smooth)';
        } else if (gpuEngineState.fps >= 30) {
            modalGpuFpsBadge.className = 'fps-status-badge good';
            modalGpuFpsBadge.textContent = '🟡 보통 (Smooth)';
        } else {
            modalGpuFpsBadge.className = 'fps-status-badge heavy';
            modalGpuFpsBadge.textContent = '🔴 부하 발생 (Lagging)';
        }
    }

    // 3. 최저 / 평균 / 최고 FPS 통계 지표
    if (modalGpuFpsStats) {
        const minStr = gpuEngineState.minFps === 999 ? '-' : `${gpuEngineState.minFps} FPS`;
        const avgStr = gpuEngineState.avgFps > 0 ? `${gpuEngineState.avgFps} FPS` : '-';
        const maxStr = gpuEngineState.maxFps > 0 ? `${gpuEngineState.maxFps} FPS` : '-';
        modalGpuFpsStats.textContent = `최저: ${minStr} | 평균: ${avgStr} | 최고: ${maxStr}`;
    }

    // 4. 누적 렌더링 프레임 수
    if (modalGpuFrameCount) {
        modalGpuFrameCount.textContent = `누적 렌더링: ${totalRenderFrames.toLocaleString()} frames`;
    }

    // 5. 실시간 FPS 스파크라인 그래프 캔버스 렌더링
    drawFpsSparkline();
}

// 📈 실시간 FPS 스파크라인 미니 차트 드로잉
function drawFpsSparkline() {
    if (!fpsSparklineCanvas) return;
    const ctx = fpsSparklineCanvas.getContext('2d');
    if (!ctx) return;

    const w = fpsSparklineCanvas.width;
    const h = fpsSparklineCanvas.height;
    ctx.clearRect(0, 0, w, h);

    const history = gpuEngineState.fpsHistory;
    if (history.length < 2) return;

    const maxVal = Math.max(75, ...history, gpuEngineState.maxFps || 60);

    // 60 FPS 기준 가이드라인 (초록색 점선)
    const y60 = h - (60 / maxVal) * (h - 10) - 4;
    ctx.strokeStyle = 'rgba(52, 211, 153, 0.25)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(0, y60);
    ctx.lineTo(w, y60);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.fillStyle = 'rgba(52, 211, 153, 0.5)';
    ctx.font = '9px monospace';
    ctx.fillText('60 FPS 기준선', 6, Math.max(10, y60 - 2));

    // FPS 트렌드 라인 그리기
    const stepX = w / (history.length - 1);
    ctx.beginPath();
    history.forEach((fps, i) => {
        const x = i * stepX;
        const y = h - (fps / maxVal) * (h - 10) - 4;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
    });

    ctx.strokeStyle = '#818cf8';
    ctx.lineWidth = 2;
    ctx.stroke();

    // 부드러운 그라데이션 채우기
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(129, 140, 248, 0.35)');
    grad.addColorStop(1, 'rgba(129, 140, 248, 0.0)');
    ctx.fillStyle = grad;
    ctx.fill();

    // 현재 최신 FPS 지점 발광 포인트
    const lastX = (history.length - 1) * stepX;
    const lastY = h - (history[history.length - 1] / maxVal) * (h - 10) - 4;
    ctx.beginPath();
    ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#34d399';
    ctx.shadowColor = '#34d399';
    ctx.shadowBlur = 6;
    ctx.fill();
    ctx.shadowBlur = 0;
}

// GPU 모달 창 열기/닫기 이벤트
if (gpuEngineBadge) {
    gpuEngineBadge.addEventListener('click', () => {
        if (!gpuInfoModal) return;
        if (modalGpuApi) modalGpuApi.textContent = gpuEngineState.backendName;
        if (modalGpuDevice) modalGpuDevice.textContent = gpuEngineState.gpuName;
        if (modalGpuVendor) modalGpuVendor.textContent = gpuEngineState.vendor;
        if (modalGpuArchitecture) modalGpuArchitecture.textContent = gpuEngineState.architecture;
        if (modalGpuFeatures) modalGpuFeatures.textContent = `${gpuEngineState.featuresCount}개 하드웨어 기능 활성화됨`;
        updateGpuModalLivePerformance();
        gpuInfoModal.style.display = 'flex';
    });
}
if (btnCloseGpuModal) {
    btnCloseGpuModal.addEventListener('click', () => {
        if (gpuInfoModal) gpuInfoModal.style.display = 'none';
    });
}
if (gpuInfoModal) {
    gpuInfoModal.addEventListener('click', e => {
        if (e.target === gpuInfoModal) gpuInfoModal.style.display = 'none';
    });
}

// ════════════════════════════════════════════════════════════
// 4. 카메라 제어 (부드러운 전환 & 프리셋 뷰)
// ════════════════════════════════════════════════════════════
function animateCamera(targetPos, targetLookAt, duration = 800) {
    const startPos = camera.position.clone();
    const startTarget = controls.target.clone();
    const endPos = new THREE.Vector3(...targetPos);
    const endTarget = new THREE.Vector3(...targetLookAt);
    const startTime = performance.now();
    cameraAnim = { startPos, startTarget, endPos, endTarget, startTime, duration };
}

function updateCameraAnim() {
    if (!cameraAnim) return;
    const { startPos, startTarget, endPos, endTarget, startTime, duration } = cameraAnim;
    const elapsed = performance.now() - startTime;
    const t = Math.min(elapsed / duration, 1);
    const ease = t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

    camera.position.lerpVectors(startPos, endPos, ease);
    controls.target.lerpVectors(startTarget, endTarget, ease);
    if (t >= 1) cameraAnim = null;
}

$('btn-reset-camera').addEventListener('click', () => {
    const spread = Math.max(dataObjects.length * 1.3, 10);
    animateCamera([0, spread * 0.5 + 5, spread * 0.7 + 8], [0, 2, 0]);
});
$('btn-iso-view').addEventListener('click', () => {
    const spread = Math.max(dataObjects.length * 1.3, 10);
    animateCamera([spread * 0.7, spread * 0.6 + 6, spread * 0.7], [0, 1.5, 0]);
});
$('btn-top-view').addEventListener('click', () => {
    const spread = Math.max(dataObjects.length * 1.3, 10);
    animateCamera([0, spread + 10, 0.1], [0, 0, 0]);
});
$('btn-front-view').addEventListener('click', () => {
    const spread = Math.max(dataObjects.length * 1.3, 10);
    animateCamera([0, 4, spread * 0.8 + 10], [0, 3, 0]);
});
$('btn-auto-rotate').addEventListener('click', () => {
    controls.autoRotate = !controls.autoRotate;
    controls.autoRotateSpeed = 2.0;
    $('btn-auto-rotate').style.background = controls.autoRotate ? '#e0e7ff' : '';
    $('btn-auto-rotate').style.color = controls.autoRotate ? '#4338ca' : '';
});
$('btn-toggle-grid').addEventListener('click', () => {
    gridHelper.visible = !gridHelper.visible;
});
$('btn-toggle-labels').addEventListener('click', () => {
    showLabels = !showLabels;
    domLabels.forEach(l => l.el.style.display = showLabels ? '' : 'none');
});
$('btn-fullscreen').addEventListener('click', () => {
    if (!document.fullscreenElement) document.documentElement.requestFullscreen();
    else document.exitFullscreen();
});

// 📸 3D 씬 고화질 스크린샷 캡처 다운로드 (고해상도 PNG 출력)
$('btn-screenshot')?.addEventListener('click', () => {
    hideTooltip();
    renderer.render(scene, camera);
    const canvas = renderer.domElement;
    const link = document.createElement('a');
    const now = new Date();
    const pad = n => String(n).padStart(2, '0');
    const timeStr = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}_${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`;
    const filename = `3D_시각화_${timeStr}.png`;
    link.download = filename;
    link.href = canvas.toDataURL('image/png');
    link.click();
    showToast(`📸 <strong>3D 고해상도 이미지</strong>가 저장되었습니다! (<code>${filename}</code>)`);
});

// ⏳ 시계열/다차원 타임라인 플레이어 토글
btnToggleTimeline?.addEventListener('click', () => {
    if (!parsedData || !analysisResult || analysisResult.numericCols.length === 0) {
        showToast('⚠️ 재생할 수치 컬럼 데이터가 없습니다. 먼저 CSV를 업로드해 주세요.');
        return;
    }
    if (timePlayerBar.style.display === 'none') {
        openTimePlayer();
    } else {
        closeTimePlayer();
    }
});

// ════════════════════════════════════════════════════════════
// 📑 AI 자동 분석 보고서 스튜디오 (AI Report Studio) & A4 PDF 인쇄
// ════════════════════════════════════════════════════════════
const aiReportModal = $('ai-report-modal');
const btnCloseReportModal = $('btn-close-report-modal');
const aiReportType = $('ai-report-type');
const aiReportTone = $('ai-report-tone');
const aiReportEngine = $('ai-report-engine');
const btnGenerateAiReport = $('btn-generate-ai-report');
const btnReportEditMode = $('btn-report-edit-mode');
const reportEditLabel = $('report-edit-label');
const btnReportCopy = $('btn-report-copy');
const btnReportPrint = $('btn-report-print');
const aiReportPaper = $('ai-report-paper');
const aiReportContent = $('ai-report-content');
const aiGenerationProgress = $('ai-generation-progress');
const aiProgressBarFill = $('ai-progress-bar-fill');
const aiProgressText = $('ai-progress-text');

// API 키 모달 DOM
const aiApiModal = $('ai-api-modal');
const btnAiApiSettings = $('btn-ai-api-settings');
const btnCloseApiModal = $('btn-close-api-modal');
const inputGeminiKey = $('input-gemini-key');
const inputOpenaiKey = $('input-openai-key');
const btnSaveApiKeys = $('btn-save-api-keys');
const btnClearApiKeys = $('btn-clear-api-keys');

// 사이드바 AI 보고서 바로가기 및 샘플 로드 버튼, 원클릭 AI 버튼
const btnOpenReportFromAnalysis = $('btn-open-report-from-analysis');
const btnLoadSample = $('btn-load-sample');
const btnAutoReportQuick = $('btn-auto-report-quick');
const uploadPanel = $('upload-panel');
const btnToggleUploadCard = $('btn-toggle-upload-card');

// 업로드 카드 접기/펼치기 토글 (화면 공간 및 3D 뷰포트 확보)
btnToggleUploadCard?.addEventListener('click', (e) => {
    e.stopPropagation();
    if (!uploadPanel) return;
    const isCollapsed = uploadPanel.classList.toggle('collapsed');
    document.body.classList.toggle('upload-collapsed', isCollapsed);
});

let isReportEditMode = false;
let currentReportDataCache = null;

// ⚡ 기본 샘플 데이터셋 즉시 로드 함수
async function loadSampleData() {
    try {
        statusIndicator.textContent = '● 샘플 로딩 중...';
        statusIndicator.className = 'status loading';
        const res = await fetch('./sample_data.csv');
        if (!res.ok) throw new Error('sample_data.csv 파일을 불러올 수 없습니다.');
        const text = await res.text();
        parsedData = parseCSV(text);
        if (!parsedData) throw new Error('CSV 파싱 실패');
        currentUploadedFile = { name: 'sample_data.csv', size: text.length };
        fileNameDisplay.textContent = '📄 sample_data.csv (기본 제공 샘플 - 10개 지역 실적 데이터)';
        processData('sample_data.csv');
        showToast('🎉 <strong>샘플 데이터 로드 완료!</strong> 3D 인터랙션과 AI 자동 분석 보고서를 바로 체험해보세요.');
    } catch (err) {
        console.error('샘플 데이터 로드 실패:', err);
        statusIndicator.textContent = '● 샘플 로드 실패';
        statusIndicator.className = 'status offline';
        showToast('⚠️ 샘플 데이터를 불러오는 중 오류가 발생했습니다.');
    }
}
btnLoadSample?.addEventListener('click', loadSampleData);

// 📑 AI 리포트 스튜디오 모달 열기 및 자동 작성
async function openAiReportStudio(options = {}) {
    // 만약 아직 업로드된 데이터가 없다면 샘플 데이터를 자동으로 즉시 로드
    if (!parsedData || !analysisResult) {
        showToast('<strong>데이터 자동 로드 중:</strong> 기본 샘플 데이터를 불러와 AI 보고서를 즉시 자동 작성합니다...');
        await loadSampleData();
        await sleep(150);
    }
    if (aiReportModal) {
        aiReportModal.style.display = 'flex';
        // AI 보고서 자동 작성 실행
        await generateAIReport(options);
    }
}

// 상단 바 [AI 자동 보고서], 사이드바 [✨ AI 맞춤 분석 보고서], 원클릭 [1-Click Auto Write] 버튼 이벤트 바인딩
$('btn-print-report')?.addEventListener('click', () => openAiReportStudio());
btnOpenReportFromAnalysis?.addEventListener('click', () => openAiReportStudio());
btnAutoReportQuick?.addEventListener('click', () => openAiReportStudio({ stream: true }));

// 모달 닫기 이벤트 핸들러
btnCloseReportModal?.addEventListener('click', () => {
    if (aiReportModal) aiReportModal.style.display = 'none';
});

aiReportModal?.addEventListener('click', (e) => {
    if (e.target === aiReportModal) {
        aiReportModal.style.display = 'none';
    }
});

// ESC 키로 모달 닫기 지원
window.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        if (aiApiModal && aiApiModal.style.display !== 'none') {
            aiApiModal.style.display = 'none';
        } else if (aiReportModal && aiReportModal.style.display !== 'none') {
            aiReportModal.style.display = 'none';
        }
    }
});

// AI API 키 설정 모달 핸들러
btnAiApiSettings?.addEventListener('click', () => {
    if (inputGeminiKey) inputGeminiKey.value = localStorage.getItem('agy_gemini_api_key') || '';
    if (inputOpenaiKey) inputOpenaiKey.value = localStorage.getItem('agy_openai_api_key') || '';
    if (aiApiModal) aiApiModal.style.display = 'flex';
});

btnCloseApiModal?.addEventListener('click', () => {
    if (aiApiModal) aiApiModal.style.display = 'none';
});

aiApiModal?.addEventListener('click', (e) => {
    if (e.target === aiApiModal) {
        aiApiModal.style.display = 'none';
    }
});

btnSaveApiKeys?.addEventListener('click', () => {
    const geminiVal = inputGeminiKey?.value.trim() || '';
    const openaiVal = inputOpenaiKey?.value.trim() || '';
    if (geminiVal) localStorage.setItem('agy_gemini_api_key', geminiVal);
    else localStorage.removeItem('agy_gemini_api_key');
    if (openaiVal) localStorage.setItem('agy_openai_api_key', openaiVal);
    else localStorage.removeItem('agy_openai_api_key');
    if (aiApiModal) aiApiModal.style.display = 'none';
    showToast('🔑 <strong>AI API 설정 완료:</strong> 입력하신 API 키가 브라우저에 안전하게 보관되었습니다.');
});

btnClearApiKeys?.addEventListener('click', () => {
    localStorage.removeItem('agy_gemini_api_key');
    localStorage.removeItem('agy_openai_api_key');
    if (inputGeminiKey) inputGeminiKey.value = '';
    if (inputOpenaiKey) inputOpenaiKey.value = '';
    if (aiApiModal) aiApiModal.style.display = 'none';
    showToast('🗑️ 저장된 API 키가 모두 삭제되었습니다. 내장 AI 분석 엔진이 기본 적용됩니다.');
});

// ✏️ 보고서 직접 편집 모드 토글
btnReportEditMode?.addEventListener('click', () => {
    isReportEditMode = !isReportEditMode;
    if (aiReportPaper) {
        aiReportPaper.classList.toggle('editing', isReportEditMode);
    }
    const editables = aiReportContent ? aiReportContent.querySelectorAll('.report-editable') : [];
    editables.forEach(el => {
        el.setAttribute('contenteditable', isReportEditMode ? 'true' : 'false');
    });
    if (btnReportEditMode) {
        btnReportEditMode.classList.toggle('active', isReportEditMode);
    }
    if (reportEditLabel) {
        reportEditLabel.textContent = isReportEditMode ? '편집 완료' : '직접 편집';
    }
    if (isReportEditMode) {
        showToast('✏️ <strong>직접 편집 모드가 켜졌습니다:</strong> 보고서 텍스트를 클릭하여 자유롭게 내용을 수정한 후 인쇄할 수 있습니다.');
    } else {
        showToast('💾 <strong>편집 완료:</strong> 수정된 내용이 보고서에 저장되었습니다.');
    }
});

// 📋 클립보드 복사
btnReportCopy?.addEventListener('click', async () => {
    if (!aiReportContent || !aiReportContent.innerText.trim()) {
        showToast('⚠️ 복사할 보고서 내용이 없습니다.');
        return;
    }
    try {
        const textToCopy = aiReportContent.innerText;
        await navigator.clipboard.writeText(textToCopy);
        showToast('📋 <strong>보고서 복사 완료!</strong> 워드, 노션, 슬랙 등에 바로 붙여넣기(Ctrl+V)하실 수 있습니다.');
    } catch (err) {
        console.error('클립보드 복사 에러:', err);
        showToast('⚠️ 클립보드 복사에 실패했습니다. 브라우저 권한을 확인해 주세요.');
    }
});

// 🖨️ A4 인쇄 및 PDF 저장 핸들러
btnReportPrint?.addEventListener('click', printCurrentReport);

function printCurrentReport() {
    if (!aiReportContent || !aiReportContent.innerHTML.trim()) {
        showToast('⚠️ 인쇄할 보고서가 없습니다. 먼저 보고서를 작성해 주세요.');
        return;
    }
    const reportContainer = $('print-report-container');
    if (!reportContainer) return;

    reportContainer.innerHTML = aiReportContent.innerHTML;
    reportContainer.style.display = 'block';

    showToast('📑 <strong>A4 인쇄 창</strong>이 열렸습니다. [대상: PDF로 저장]을 선택하시면 PDF 파일로 보관하실 수 있습니다!');

    setTimeout(() => {
        window.print();
    }, 250);

    window.onafterprint = () => {
        reportContainer.style.display = 'none';
    };
}

// 이전 호환성 함수
function generateAndPrintReport() {
    openAiReportStudio();
}

// 프로그레스 바 상태 갱신 헬퍼
function setReportProgress(percent, text) {
    if (aiProgressBarFill) aiProgressBarFill.style.width = `${percent}%`;
    if (aiProgressText) aiProgressText.textContent = text;
}
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// ✨ AI 보고서 자동 작성 메인 컨트롤러
btnGenerateAiReport?.addEventListener('click', () => generateAIReport({ stream: true }));

async function generateAIReport(options = {}) {
    try {
        if (!parsedData || !analysisResult) {
            showToast('⚠️ 분석할 데이터가 없습니다.');
            return;
        }

        const type = aiReportType ? aiReportType.value : 'business';
        const tone = aiReportTone ? aiReportTone.value : 'formal';
        const engine = aiReportEngine ? aiReportEngine.value : 'builtin';

        // 1. 프로그레스 바 표시 및 단계별 진행
        if (aiGenerationProgress) aiGenerationProgress.style.display = 'block';
        setReportProgress(20, '1단계: 데이터셋 구조 및 8대 기술통계 지표 산출 중...');

        // 2. 3D & 2D 스냅샷 캡처
        hideTooltip();
        renderer.render(scene, camera);
        const snap3D = renderer.domElement.toDataURL('image/png');
        const snap2D = chart2d ? chart2d.toBase64Image() : '';

        const yIdx = parseInt(yAxisSelect.value);
        const xIdx = parseInt(xAxisSelect.value);
        const yColName = parsedData.headers[yIdx] || '값';
        const xColName = parsedData.headers[xIdx] || '항목';

        // 3. 통계 데이터 상세 산출
        const rows = parsedData.rows;
        const items = rows.map((r, i) => ({
            label: String(r[xIdx] || `항목 #${i + 1}`),
            value: parseFloat(r[yIdx]) || 0,
            raw: r,
            idx: i
        })).filter(item => !isNaN(item.value));

        if (items.length === 0) {
            showToast('⚠️ 선택된 지표에 유효한 수치 데이터가 없습니다.');
            if (aiGenerationProgress) aiGenerationProgress.style.display = 'none';
            return;
        }

        await sleep(100);
        setReportProgress(45, '2단계: 1.5×IQR 이상치 탐지 및 파레토 80/20 집중도 진단 중...');

        const values = items.map(d => d.value).sort((a, b) => a - b);
        const count = values.length;
        const sum = values.reduce((a, b) => a + b, 0);
        const mean = sum / count;
        const median = count % 2 === 0 ? (values[count / 2 - 1] + values[count / 2]) / 2 : values[Math.floor(count / 2)];
        const min = values[0];
        const max = values[values.length - 1];
        const range = max - min;
        const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / count;
        const stddev = Math.sqrt(variance);
        const cv = mean > 0 ? ((stddev / mean) * 100) : 0; // 변동계수 (%)

        // IQR 이상치
        const q1 = values[Math.floor(count * 0.25)];
        const q3 = values[Math.floor(count * 0.75)];
        const iqr = Math.max(q3 - q1, 0.0001);
        const upperLimit = q3 + 1.5 * iqr;
        const lowerLimit = q1 - 1.5 * iqr;
        const highOutliers = items.filter(d => d.value > upperLimit);
        const lowOutliers = items.filter(d => d.value < lowerLimit);
        const outliers = [...highOutliers, ...lowOutliers];

        // 파레토 80/20
        const sortedDesc = [...items].sort((a, b) => b.value - a.value);
        const top1 = sortedDesc[0] || { label: '항목 1', value: 0 };
        const top2 = sortedDesc[1] || top1;
        const top3 = sortedDesc[2] || top2;
        const bottom1 = sortedDesc[sortedDesc.length - 1] || top1;
        const bottom2 = sortedDesc[sortedDesc.length - 2] || bottom1;
        const top20Count = Math.max(1, Math.round(count * 0.2));
        const top20Sum = sortedDesc.slice(0, top20Count).reduce((acc, cur) => acc + cur.value, 0);
        const top20Share = sum > 0 ? ((top20Sum / sum) * 100).toFixed(1) : '0';
        const top1Share = sum > 0 ? ((top1.value / sum) * 100).toFixed(1) : '0';
        const topBottomRatio = (bottom1 && bottom1.value > 0) ? (top1.value / bottom1.value).toFixed(1) : '∞';
        const top3Sum = sortedDesc.slice(0, 3).reduce((acc, cur) => acc + cur.value, 0);
        const top3Share = sum > 0 ? ((top3Sum / sum) * 100).toFixed(1) : '0';

        // 다변량 연계 분석 (다른 수치 컬럼이 있을 경우)
        let multiColAnalysis = null;
        const otherNumCols = analysisResult.numericCols ? analysisResult.numericCols.filter(ci => ci !== yIdx && ci !== xIdx) : [];
        if (otherNumCols.length > 0) {
            const otherColNames = otherNumCols.map(ci => parsedData.headers[ci]);
            multiColAnalysis = {
                names: otherColNames,
                info: otherColNames.map(name => {
                    const s = analysisResult.numericStats[name];
                    return s ? `${name}(총합: ${fmt(s.sum || 0)}, 평균: ${fmt(Math.round(s.mean || 0))})` : name;
                }).join(', ')
            };
        }

        await sleep(100);
        setReportProgress(75, '3단계: 3D 공간 시각화 융합 및 비즈니스 전략 인사이트 추론 중...');

        // LLM API 호출 또는 내장 AI 엔진 실행
        let aiGeneratedSections = null;
        let usedEngineLabel = '⚡ 내장 고성능 AI 엔진 (Built-in Data Intelligence)';

        if (engine === 'gemini') {
            const geminiKey = localStorage.getItem('agy_gemini_api_key');
            if (geminiKey) {
                try {
                    setReportProgress(85, 'Google Gemini LLM에 데이터를 전송하여 보고서를 생성하는 중...');
                    aiGeneratedSections = await callGeminiReportAPI(geminiKey, {
                        type, tone, xColName, yColName, count, sum, mean, median, min, max, stddev, cv,
                        top1, top20Count, top20Share, outliers, bottom1, topBottomRatio,
                        fileName: currentUploadedFile ? currentUploadedFile.name : '데이터세트'
                    });
                    usedEngineLabel = '🌐 Google Gemini 1.5 Flash (LLM)';
                } catch (err) {
                    console.warn('Gemini API 호출 실패, 내장 AI 엔진으로 폴백:', err);
                    showToast('⚠️ Gemini API 연결 실패로 내장 스마트 AI 엔진으로 자동 전환되었습니다.');
                }
            } else {
                showToast('💡 Gemini API 키가 설정되지 않아 내장 고성능 AI 엔진으로 작성합니다.');
            }
        } else if (engine === 'openai') {
            const openaiKey = localStorage.getItem('agy_openai_api_key');
            if (openaiKey) {
                try {
                    setReportProgress(85, 'OpenAI GPT에 데이터를 전송하여 보고서를 생성하는 중...');
                    aiGeneratedSections = await callOpenAIReportAPI(openaiKey, {
                        type, tone, xColName, yColName, count, sum, mean, median, min, max, stddev, cv,
                        top1, top20Count, top20Share, outliers, bottom1, topBottomRatio,
                        fileName: currentUploadedFile ? currentUploadedFile.name : '데이터세트'
                    });
                    usedEngineLabel = '🌐 OpenAI GPT-4o-mini (LLM)';
                } catch (err) {
                    console.warn('OpenAI API 호출 실패, 내장 AI 엔진으로 폴백:', err);
                    showToast('⚠️ OpenAI API 연결 실패로 내장 스마트 AI 엔진으로 자동 전환되었습니다.');
                }
            } else {
                showToast('💡 OpenAI API 키가 설정되지 않아 내장 고성능 AI 엔진으로 작성합니다.');
            }
        }

        // 만약 LLM 미사용이거나 실패 시 내장 AI 엔진이 작성
        if (!aiGeneratedSections) {
            aiGeneratedSections = buildBuiltinAIReport({
                type, tone, xColName, yColName, count, sum, mean, median, min, max, range, stddev, cv,
                top1, top2, top3, bottom1, bottom2, top20Count, top20Sum, top20Share, top1Share, top3Share, topBottomRatio,
                outliers, highOutliers, lowOutliers, q1, q3, iqr, upperLimit, lowerLimit, sortedDesc, multiColAnalysis,
                fileName: currentUploadedFile ? currentUploadedFile.name : (fileNameDisplay?.textContent || '데이터 세트')
            });
        }

        await sleep(80);
        setReportProgress(100, '✨ AI 맞춤형 분석 보고서 작성 완료!');

        // 메타데이터 정보 구성
        const now = new Date();
        const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const docId = `DOC-${now.getFullYear()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
        const fileNameStr = currentUploadedFile ? currentUploadedFile.name : (fileNameDisplay?.textContent || '데이터 세트');

        // 테이블 미리보기 행
        let tableRowsHtml = '';
        const previewRows = parsedData.rows.slice(0, 12);
        previewRows.forEach(r => {
            tableRowsHtml += '<tr>';
            parsedData.headers.slice(0, 6).forEach((_, ci) => {
                tableRowsHtml += `<td>${r[ci]}</td>`;
            });
            tableRowsHtml += '</tr>';
        });

        // 최종 보고서 렌더링
        const finalReportHtml = `
            <!-- 보고서 공문서 헤더 -->
            <div class="report-doc-top">
                <span class="report-doc-confidential">● CONFIDENTIAL / 내부 경영 분석용</span>
                <span class="report-doc-num">문서번호: ${docId}</span>
            </div>

            <div class="report-doc-header">
                <div class="report-title-area">
                    <h2 class="report-main-title report-editable" contenteditable="${isReportEditMode}">${aiGeneratedSections.title}</h2>
                    <p class="report-sub-title report-editable" contenteditable="${isReportEditMode}">${aiGeneratedSections.subtitle}</p>
                </div>
                <div class="report-doc-meta">
                    <div><strong>출력 일시:</strong> ${dateStr}</div>
                    <div><strong>분석 파일:</strong> ${fileNameStr}</div>
                    <div><strong>분석 대상:</strong> [X: ${xColName}] × [Y: ${yColName}]</div>
                    <div class="report-meta-tag">${usedEngineLabel}</div>
                </div>
            </div>

            ${isReportEditMode ? `
            <div class="report-edit-banner">
                <span>✏️ <strong>직접 편집 모드 활성화됨:</strong> 보고서 제목, 요약문, 분석 내용, 제언을 클릭하여 직접 수정할 수 있습니다.</span>
                <span style="font-size:11px; color:#3b82f6;">편집 완료 후 [🖨️ 인쇄 / PDF 저장]을 누르면 수정된 내용 그대로 출력됩니다.</span>
            </div>
            ` : ''}

            <!-- 섹션 1: 경영진 핵심 요약 -->
            <div class="report-section">
                <div class="report-section-title">💡 1. 핵심 경영진 브리핑 (Executive Summary)</div>
                <div class="report-exec-box report-editable" contenteditable="${isReportEditMode}">
                    ${aiGeneratedSections.executiveSummary}
                </div>
            </div>

            <!-- 섹션 2: 8대 핵심 KPI 통계 대시보드 -->
            <div class="report-section">
                <div class="report-section-title">📊 2. 주요 핵심 통계 지표 (Key Performance Indicators)</div>
                <div class="report-stats-grid-8">
                    <div class="report-kpi-card">
                        <div class="report-kpi-label">총 데이터 건수</div>
                        <div class="report-kpi-val">${count.toLocaleString()}건</div>
                    </div>
                    <div class="report-kpi-card">
                        <div class="report-kpi-label">합계 (Total Sum)</div>
                        <div class="report-kpi-val">${fmt(sum)}</div>
                    </div>
                    <div class="report-kpi-card">
                        <div class="report-kpi-label">평균값 (Mean)</div>
                        <div class="report-kpi-val">${fmt(Math.round(mean))}</div>
                    </div>
                    <div class="report-kpi-card">
                        <div class="report-kpi-label">중앙값 (Median)</div>
                        <div class="report-kpi-val">${fmt(Math.round(median))}</div>
                    </div>
                    <div class="report-kpi-card">
                        <div class="report-kpi-label">최대 실적치 (Max)</div>
                        <div class="report-kpi-val" style="color:#10b981;">${fmt(max)}</div>
                    </div>
                    <div class="report-kpi-card">
                        <div class="report-kpi-label">최저치 (Min)</div>
                        <div class="report-kpi-val" style="color:#ef4444;">${fmt(min)}</div>
                    </div>
                    <div class="report-kpi-card">
                        <div class="report-kpi-label">표준편차 (StdDev)</div>
                        <div class="report-kpi-val">${fmt(Math.round(stddev))}</div>
                    </div>
                    <div class="report-kpi-card">
                        <div class="report-kpi-label">변동계수 (CV)</div>
                        <div class="report-kpi-val" style="color:${cv > 50 ? '#f59e0b' : '#3b82f6'};">${cv.toFixed(1)}%</div>
                    </div>
                </div>
            </div>

            <!-- 섹션 3: 3D 입체 및 2D 시각화 증거 자료 -->
            <div class="report-section">
                <div class="report-section-title">🧊 3. 3D 입체 모델링 & 2D 인터랙티브 시각화 스냅샷</div>
                <div class="report-visual-grid">
                    <div class="report-visual-card">
                        <h5>🌐 Three.js WebGPU 3D 공간 시각화</h5>
                        <img src="${snap3D}" alt="3D Visualization Snapshot">
                        <div class="report-visual-caption">3D 공간 모델링 기반 공간 분포 및 입체 높낮이 식별</div>
                    </div>
                    <div class="report-visual-card">
                        <h5>📈 Chart.js 2D 다변량 분석 그래프</h5>
                        ${snap2D ? `<img src="${snap2D}" alt="2D Chart Snapshot">` : '<div style="height:180px; display:flex; align-items:center; justify-content:center; color:#94a3b8; background:#0f172a; border-radius:6px;">차트 데이터 없음</div>'}
                        <div class="report-visual-caption">항목 간 수치 비교 및 이상치/트렌드 2차원 투영</div>
                    </div>
                </div>
            </div>

            <!-- 섹션 4: AI 데이터 심층 진단 & 패턴 분석 -->
            <div class="report-section">
                <div class="report-section-title">🔍 4. AI 데이터 심층 진단 & 패턴 분석 (Deep Diagnostics)</div>
                <div class="report-deep-grid">
                    <div class="report-deep-card info report-editable" contenteditable="${isReportEditMode}">
                        <div class="report-deep-title">📊 파레토(Pareto 80/20) 집중도 분석</div>
                        <div>${aiGeneratedSections.paretoDiagnostic}</div>
                    </div>
                    <div class="report-deep-card ${outliers.length > 0 ? 'warning' : 'success'} report-editable" contenteditable="${isReportEditMode}">
                        <div class="report-deep-title">${outliers.length > 0 ? '⚠️ 1.5×IQR 이상치(Outlier) 정밀 진단' : '✅ 통계적 이상치 검증 완료'}</div>
                        <div>${aiGeneratedSections.outlierDiagnostic}</div>
                    </div>
                    <div class="report-deep-card report-editable" contenteditable="${isReportEditMode}">
                        <div class="report-deep-title">🌊 분포 균일도 및 변동 위험도 (CV 분석)</div>
                        <div>${aiGeneratedSections.cvDiagnostic}</div>
                    </div>
                    <div class="report-deep-card report-editable" contenteditable="${isReportEditMode}">
                        <div class="report-deep-title">⚖️ 상·하위 격차 및 스프레드 진단</div>
                        <div>${aiGeneratedSections.spreadDiagnostic}</div>
                    </div>
                </div>
            </div>

            <!-- 섹션 5: AI 전략적 제언 및 실행 권고사항 -->
            <div class="report-section">
                <div class="report-section-title">🎯 5. AI 전략적 제언 및 비즈니스 실행 권고 (Action Items)</div>
                <div class="report-recom-list">
                    ${aiGeneratedSections.recommendations.map((rec, idx) => `
                    <div class="report-recom-item">
                        <span class="report-recom-badge">${idx + 1}</span>
                        <div class="report-recom-content report-editable" contenteditable="${isReportEditMode}">
                            <strong>${rec.title}:</strong> ${rec.desc}
                        </div>
                    </div>
                    `).join('')}
                </div>
            </div>

            <!-- 섹션 6: 로우 데이터 표 미리보기 -->
            <div class="report-section" style="margin-bottom: 10px;">
                <div class="report-section-title">📄 6. 분석 대상 데이터 표 미리보기 (상위 ${previewRows.length}행)</div>
                <table class="report-table">
                    <thead>
                        <tr>${parsedData.headers.slice(0, 6).map(h => `<th>${h}</th>`).join('')}</tr>
                    </thead>
                    <tbody>${tableRowsHtml}</tbody>
                </table>
            </div>

            <!-- 섹션 7: 공문서 승인 및 결재란 -->
            <div class="report-approval-block">
                <table class="report-approval-table">
                    <thead>
                        <tr>
                            <th>작성자</th>
                            <th>데이터 검토</th>
                            <th>최종 승인</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr>
                            <td class="sign-cell">${usedEngineLabel.split(' ')[1] || 'AI Engine'}</td>
                            <td class="sign-cell">담당 분석관</td>
                            <td class="sign-cell">(인 / 서명)</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        `;

        if (aiReportContent) {
            aiReportContent.innerHTML = finalReportHtml;
        }

        // ✍️ 실시간 AI 텍스트 스트리밍 타이핑 연출
        if (options.stream !== false) {
            const execBox = aiReportContent?.querySelector('.report-exec-box');
            if (execBox && aiGeneratedSections.executiveSummary) {
                const rawHtml = aiGeneratedSections.executiveSummary;
                const paragraphs = rawHtml.match(/<p[\s\S]*?<\/p>/g) || [rawHtml];
                execBox.innerHTML = '<span class="ai-typing-cursor">▌ AI가 데이터를 분석하여 요약 문장을 작성하고 있습니다...</span>';
                for (let i = 0; i < paragraphs.length; i++) {
                    await sleep(100);
                    const p = document.createElement('div');
                    p.className = 'ai-streamed-p';
                    p.innerHTML = paragraphs[i];
                    const cur = execBox.querySelector('.ai-typing-cursor');
                    if (cur) {
                        execBox.insertBefore(p, cur);
                    } else {
                        execBox.appendChild(p);
                    }
                }
                const cursor = execBox.querySelector('.ai-typing-cursor');
                if (cursor) cursor.remove();
            }
        }

        currentReportDataCache = {
            data: parsedData,
            type,
            tone,
            engine,
            html: finalReportHtml
        };

        setTimeout(() => {
            if (aiGenerationProgress) aiGenerationProgress.style.display = 'none';
        }, 400);

        showToast('✨ <strong>AI 맞춤 분석 보고서 작성이 완료되었습니다!</strong> 내용을 확인하시고 직접 편집하거나 [인쇄/PDF 저장]을 실행하세요.');
    } catch (err) {
        console.error('AI 보고서 자동 작성 에러 발생:', err);
        showToast(`⚠️ AI 보고서 생성 중 오류가 발생했습니다: ${err.message}`);
        setReportProgress(100, '⚠️ 처리 완료');
        setTimeout(() => {
            if (aiGenerationProgress) aiGenerationProgress.style.display = 'none';
        }, 500);
    }
}

// 🧠 내장 고성능 AI 분석 보고서 생성 엔진
function buildBuiltinAIReport(ctx = {}) {
    const {
        type = 'business',
        tone = 'formal',
        xColName = '항목',
        yColName = '값',
        count = 1,
        sum = 0,
        mean = 0,
        median = 0,
        min = 0,
        max = 0,
        range = (max - min),
        stddev = 0,
        cv = 0,
        top1 = { label: '우수 항목', value: 0 },
        top2 = { label: '상위 항목 2', value: 0 },
        top3 = { label: '상위 항목 3', value: 0 },
        bottom1 = { label: '하위 항목', value: 0 },
        bottom2 = { label: '하위 항목 2', value: 0 },
        top20Count = 1,
        top20Sum = 0,
        top20Share = '0',
        top1Share = '0',
        top3Share = '0',
        topBottomRatio = '1.0',
        outliers = [],
        highOutliers = [],
        lowOutliers = [],
        q1 = 0,
        q3 = 0,
        iqr = 1,
        upperLimit = (q3 + 1.5 * iqr),
        lowerLimit = (q1 - 1.5 * iqr),
        sortedDesc = [],
        multiColAnalysis = null,
        fileName = '데이터 세트'
    } = ctx;

    // 도메인 감지 (매출/비용/이익/점수/수량/일반)
    const isSales = /매출|수익|판매|수주|금액|sales|revenue|income/i.test(yColName);
    const isCost = /비용|원가|지출|cost|expense|spending/i.test(yColName);
    const isProfit = /이익|순익|영업이익|마진|profit|margin/i.test(yColName);
    const isScore = /점수|평가|만족도|score|rate|grade/i.test(yColName);
    const isVolume = /수량|건수|인원|트래픽|방문|traffic|volume|count/i.test(yColName);

    let domainDesc = '수치 성과';
    if (isSales) domainDesc = '매출 실적';
    else if (isCost) domainDesc = '비용 및 원가 지출';
    else if (isProfit) domainDesc = '수익성 및 영업이익';
    else if (isScore) domainDesc = '품질 및 만족도 평가 지수';
    else if (isVolume) domainDesc = '물동량 및 유입 규모';

    // 어조 설정
    const ending = {
        formal: {
            statement: '으로 분석되었습니다.',
            confirm: '으로 확인되었습니다.',
            suggest: '을 적극 권고합니다.',
            require: '이 요구됩니다.',
            assess: '으로 평가됩니다.',
            safe: '안정적인 수준을 유지하고 있습니다.'
        },
        academic: {
            statement: '으로 실증된다.',
            confirm: '임이 확인된다.',
            suggest: '할 필요성이 대두된다.',
            require: '가 긴요하다.',
            assess: '으로 사료된다.',
            safe: '통계적 유의 범위 내에서 관리되고 있다.'
        },
        practical: {
            statement: '으로 나타났어요.',
            confirm: '으로 확인되었어요.',
            suggest: '을 추천해 드려요.',
            require: '이 꼭 필요해요.',
            assess: '으로 볼 수 있어요.',
            safe: '안정적으로 잘 관리되고 있어요.'
        }
    }[tone] || {
        statement: '으로 분석되었습니다.',
        confirm: '으로 확인되었습니다.',
        suggest: '을 적극 권고합니다.',
        require: '이 요구됩니다.',
        assess: '으로 평가됩니다.',
        safe: '안정적인 수준을 유지하고 있습니다.'
    };

    // 보고서 제목 및 부제목
    let title = `📊 ${yColName} 지표 기반 비즈니스 성과 종합 분석 보고서`;
    let subtitle = `3D 공간 모델링 및 다차원 통계 지능 엔진(AI Analytics Engine) 자동 생성 분석서`;

    if (type === 'statistical') {
        title = `📈 ${yColName} 지표 통계적 분포 및 이상치(IQR) 심층 분석 보고서`;
        subtitle = `정규성, 변동계수(CV), 사분위수(IQR) 및 3D 공간 데이터 분포 검증 보고서`;
    } else if (type === 'risk') {
        title = `🚨 ${yColName} 지표 리스크 진단 및 이상치 대응 전략 보고서`;
        subtitle = `통계적 극단치, 쏠림 편중도 및 취약 세그먼트 위험 방어 가이드`;
    } else if (type === 'summary') {
        title = `⚡ [Executive Brief] ${yColName} 핵심 현황 3줄 요약 보고서`;
        subtitle = `C-Level 의사결정자를 위한 핵심 KPI 및 전략적 시사점 속보`;
    }

    // 1. Executive Summary 생성
    let executiveSummary = '';
    if (type === 'summary') {
        executiveSummary = `
            <p>• <strong>핵심 성과:</strong> 대상 데이터 총 <strong>${count}개 항목</strong>의 [${yColName}] 합계는 <strong>${fmt(sum)}</strong>이며, 항목당 평균은 <strong>${fmt(Math.round(mean))}</strong>(중앙값 ${fmt(Math.round(median))})${ending.confirm}</p>
            <p>• <strong>점유 집중도:</strong> 최상위 항목 [<strong>${top1.label}</strong>]이(가) 단독으로 <strong>${fmt(top1.value)}</strong>(${top1Share}%)를 차지하며, 상위 ${top20Count}개 항목이 전체의 <strong>${top20Share}%</strong>를 견인하고 있습니다.</p>
            <p>• <strong>리스크 및 권고:</strong> 최상위와 최하위([${bottom1.label}], ${fmt(bottom1.value)}) 간 <strong>${topBottomRatio}배</strong>의 격차가 발생하고 있어 하위 항목 정상화와 상위 항목 의존도 분산${ending.suggest}</p>
        `;
    } else {
        executiveSummary = `
            <p>본 보고서는 <strong>${fileName}</strong> 데이터셋의 <strong>[${xColName}]</strong> 축에 따른 <strong>[${yColName}]</strong> ${domainDesc}를 종합 진단하기 위해 Three.js WebGPU 3D 공간 모델링과 AI 통계 분석 엔진을 결합하여 자동 작성되었습니다.</p>
            <p>분석 대상 총 <strong>${count}개</strong> 개체의 총합계는 <strong>${fmt(sum)}</strong>에 달하며, 산술 평균은 <strong>${fmt(Math.round(mean))}</strong>, 중앙값(Median)은 <strong>${fmt(Math.round(median))}</strong>${ending.statement} ${
                Math.abs(mean - median) / (mean || 1) > 0.15 
                    ? `평균값과 중앙값 간의 편차가 발생하고 있어 상위 극단치에 의한 왜도(Skewness) 영향이 존재하는 것으로 진단됩니다.` 
                    : `평균값과 중앙값이 유사한 궤적을 그리며 고른 중심 경향성을 유지하고 있습니다.`
            }</p>
            <p>특히 최우수 실적을 기록한 <strong>[${top1.label}]</strong> 항목은 <strong>${fmt(top1.value)}</strong>로 전체 총합의 <strong>${top1Share}%</strong>를 단독 견인하고 있는 반면, 최하위 <strong>[${bottom1.label}]</strong> 항목(${fmt(bottom1.value)})과의 실적 편차는 <strong>${topBottomRatio}배</strong>에 달해 자원 배분의 전략적 재조정${ending.require}</p>
            ${multiColAnalysis ? `<p style="font-size:11.5px; color:#475569; margin-top:4px;">💡 <em>연계 수치 지표 현황:</em> ${multiColAnalysis.info}</p>` : ''}
        `;
    }

    // 2. 파레토 진단
    let paretoDiagnostic = `
        상위 <strong>${top20Count}개(${Math.round(top20Count / count * 100)}%)</strong> 항목이 전체 ${yColName} 합계의 <strong>${top20Share}%</strong>를 차지하고 있습니다.
        ${top20Share >= 60 
            ? `소수 우량 항목([${top1.label}], [${top2.label}])에 실적이 집중된 전형적인 파레토 쏠림 현상이 확인되며, 이들 핵심 항목의 지속적인 방어와 관리가 조직 전체 성과를 좌우할 것으로 판단됩니다.` 
            : `실적이 특정 상위권에 독점되지 않고 각 항목 간 비교적 균등하게 분산되어 있어, 특정 거래선 및 개체 이탈에 따른 충격 흡수력이 우수한 구조입니다.`
        }
    `;

    // 3. 이상치(IQR) 진단
    let outlierDiagnostic = '';
    const calcLower = lowerLimit !== undefined ? lowerLimit : (q1 - 1.5 * iqr);
    const calcUpper = upperLimit !== undefined ? upperLimit : (q3 + 1.5 * iqr);

    if (outliers && outliers.length > 0) {
        const topOutlier = (highOutliers && highOutliers[0]) ? highOutliers[0] : (outliers[0] || { label: '이상치', value: 0 });
        const outlierRatio = mean > 0 ? (topOutlier.value / mean).toFixed(1) : '1.0';
        outlierDiagnostic = `
            1.5×IQR 판정 기준을 초과하는 <strong>이상치(Anomaly) ${outliers.length}건</strong>이 탐지되었습니다.<br>
            • 대표 극단값: <strong>[${topOutlier.label}]</strong> 항목 (${fmt(topOutlier.value)}, 평균의 ${outlierRatio}배)<br>
            이러한 극단치는 전체 통계 평균을 인위적으로 상승시킬 수 있으므로, 단순 평균보다는 중앙값 기준의 모니터링 체계를 병행할 것을 권고합니다.
        `;
    } else {
        outlierDiagnostic = `
            1.5×IQR(사분위수 범위) 기준을 이탈하는 통계적 극단 이상치가 발견되지 않았습니다. 모든 데이터 포인트가 정상 신뢰구간([${fmt(Math.max(0, Math.round(calcLower)))} ~ ${fmt(Math.round(calcUpper))}]) 내에 안정적으로 포진하여 왜곡 위험이 매우 낮습니다.
        `;
    }

    // 4. CV 안정성 진단
    let cvDiagnostic = '';
    if (cv < 25) {
        cvDiagnostic = `
            변동계수(CV)는 <strong>${cv.toFixed(1)}%</strong>로 매우 안정적이고 균일한 분포를 나타냅니다. 항목 간 편차가 적어 예측 가능성이 매우 높고 운영 프로세스가 표준화되어 있음을 시사합니다.
        `;
    } else if (cv <= 60) {
        cvDiagnostic = `
            변동계수(CV)는 <strong>${cv.toFixed(1)}%</strong>로 중간 수준의 변동성을 보입니다. 항목별 고유 역량 및 시장 환경에 따른 실적 차이가 적절히 반영되어 있는 건강한 경쟁 분포 상태입니다.
        `;
    } else {
        cvDiagnostic = `
            변동계수(CV)가 <strong>${cv.toFixed(1)}%</strong>에 달해 항목 간 편차가 매우 심각한 수준입니다. 상위권과 하위권 간의 양극화가 뚜렷하므로, 하위권의 실적 부진 요인을 정밀 진단하여 최소 보증 수준을 확보해야 합니다.
        `;
    }

    // 5. 상하위 스프레드 진단
    const calcRange = range !== undefined ? range : (max - min);
    const top3Ratio = (sortedDesc && sortedDesc.length >= 3)
        ? ((sortedDesc.slice(0, 3).reduce((a, b) => a + b.value, 0) / (sum || 1)) * 100).toFixed(1)
        : (top1Share || '0');

    let spreadDiagnostic = `
        최고 실적 [<strong>${top1 ? top1.label : '최고'}</strong>](${fmt(top1 ? top1.value : 0)})과 최저 실적 [<strong>${bottom1 ? bottom1.label : '최저'}</strong>](${fmt(bottom1 ? bottom1.value : 0)})의 스프레드 배율은 <strong>${topBottomRatio}배</strong>(격차: ${fmt(calcRange)})입니다.
        상위 3개 항목([${top1 ? top1.label : ''}], [${top2 ? top2.label : ''}], [${top3 ? top3.label : ''}])의 합계 비중이 총합의 <strong>${top3Ratio}%</strong>를 형성하고 있어, 핵심 성장축의 전략적 레버리지 효과가 두드러집니다.
    `;

    // 6. 전략적 제언 리스트
    let recommendations = [];
    if (type === 'risk') {
        recommendations = [
            {
                title: '핵심 집중 항목 의존도 리스크 완화',
                desc: `[${top1.label}]에 대한 의존도(${top1Share}%)가 높아 해당 개체 변동 시 전체 성과가 크게 흔들릴 수 있습니다. 대체 성장 동력을 발굴하여 포트폴리오를 다변화해야 합니다.`
            },
            {
                title: '하위 취약 세그먼트 정상화 및 한계 개체 관리',
                desc: `최하위권([${bottom1.label}], [${bottom2.label}])은 평균(${fmt(Math.round(mean))})의 절반에도 미치지 못하고 있습니다. 원인 규명(비용 누수, 시장 규모, 자원 부족 등)을 위한 집중 실사가 요구됩니다.`
            },
            {
                title: '이상치 실시간 탐지 및 통계적 모니터링 가드레일 수립',
                desc: `1.5×IQR 임계치를 상시 추적하여 급격한 데이터 변동이나 비정상적 수치 발생 시 즉각 경보를 발령하는 조기경보체계(Early Warning System)를 운영하십시오.`
            }
        ];
    } else if (type === 'statistical') {
        recommendations = [
            {
                title: '표준편차 및 사분위수 기반의 목표 지표 재설계',
                desc: `산술 평균(${fmt(Math.round(mean))}) 대신 중앙값(${fmt(Math.round(median))})과 IQR 범위([${fmt(Math.round(q1))} ~ ${fmt(Math.round(q3))}])를 KPI 기준선으로 설정하여 편차에 왜곡되지 않는 합리적 목표를 수립하십시오.`
            },
            {
                title: '3D 공간 클러스터링 기반 세부 그룹별 차별화 분석',
                desc: `3D 시각화에서 나타난 높낮이 패턴을 바탕으로 고성과 그룹(상위 20%), 중위 그룹(IQR 내), 저성과 그룹(하위 20%)의 3단계 세그먼트로 분할 관리하십시오.`
            },
            {
                title: '다변량 상관관계 지표의 주기적 트래킹',
                desc: `단일 [${yColName}] 수치뿐만 아니라 관련 지표 간의 상관성을 정기적으로 재측정하여 데이터 모델의 신뢰성을 지속적으로 고도화하십시오.`
            }
        ];
    } else {
        recommendations = [
            {
                title: `고성과 우수 항목 [${top1.label}]의 모범 사례(Best Practice) 확산`,
                desc: `전체 실적의 ${top1Share}%를 달성한 최상위 항목의 핵심 성공 요인을 규명하고, 이를 중위권 항목에 벤치마킹하여 전반적인 실적 상향 평준화를 유도하십시오.`
            },
            {
                title: `중위권 잠재 항목 집중 육성을 통한 제2의 성장 엔진 확보`,
                desc: `평균 수준에 머물러 있는 중간 그룹 항목들에 선별적 자원과 마케팅/운영 지원을 투입할 경우 최소 비용으로 최대의 전체 실적 증대 레버리지를 얻을 수 있습니다.`
            },
            {
                title: `데이터 기반의 실시간 의사결정 체계 및 3D 모니터링 정착`,
                desc: `본 시스템의 3D 공간 시각화와 2D 차트 대시보드를 주간/월간 경영 회의에 표준 분석 도구로 채택하여 신속하고 직관적인 경영 판단을 실행하십시오.`
            }
        ];
    }

    return {
        title,
        subtitle,
        executiveSummary,
        paretoDiagnostic,
        outlierDiagnostic,
        cvDiagnostic,
        spreadDiagnostic,
        recommendations
    };
}

// 🌐 Google Gemini API 보고서 생성 연동 함수
async function callGeminiReportAPI(apiKey, data) {
    const prompt = `
당신은 최고의 데이터 분석가이자 수석 경영 컨설턴트입니다. 다음 데이터 통계 요약치를 바탕으로 전문적인 한국어 분석 보고서 콘텐츠를 JSON 형식으로 작성해 주세요.

[데이터 통계 정보]
- 보고서 유형: ${data.type}
- 문체 어조: ${data.tone}
- 파일명: ${data.fileName}
- 분석 지표: [X: ${data.xColName}] × [Y: ${data.yColName}]
- 건수: ${data.count}
- 합계: ${data.sum}
- 평균: ${data.mean}
- 중앙값: ${data.median}
- 최소: ${data.min}, 최대: ${data.max}
- 표준편차: ${data.stddev}, 변동계수(CV): ${data.cv}%
- 최상위: ${data.top1.label} (${data.top1.value})
- 상위 20% 점유율: ${data.top20Share}%
- 최하위: ${data.bottom1.label} (${data.bottom1.value})
- 격차 배율: ${data.topBottomRatio}배
- 이상치 건수: ${data.outliers.length}건

반드시 아래 JSON 포맷만을 반환하세요 (마크다운 코드블록이나 불필요한 서문 없이 오직 순수 JSON 문자열만 반환):
{
  "title": "보고서 제목 문자열",
  "subtitle": "부제목 문자열",
  "executiveSummary": "경영진 핵심 요약 브리핑 HTML 단락 (<p>태그 포함 3단락)",
  "paretoDiagnostic": "파레토 집중도 분석 내용 문자열",
  "outlierDiagnostic": "이상치 분석 내용 문자열",
  "cvDiagnostic": "변동성 및 CV 분석 내용 문자열",
  "spreadDiagnostic": "상하위 격차 분석 내용 문자열",
  "recommendations": [
    { "title": "제언 1 제목", "desc": "제언 1 상세 내용" },
    { "title": "제언 2 제목", "desc": "제언 2 상세 내용" },
    { "title": "제언 3 제목", "desc": "제언 3 상세 내용" }
  ]
}
`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json', temperature: 0.3 }
        })
    });

    if (!response.ok) {
        throw new Error(`Gemini API 오류 (상태코드: ${response.status})`);
    }

    const resJson = await response.json();
    const candidateText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) throw new Error('Gemini 응답에 텍스트가 없습니다.');

    const cleanJson = candidateText.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
    return JSON.parse(cleanJson);
}

// 🌐 OpenAI GPT API 보고서 생성 연동 함수
async function callOpenAIReportAPI(apiKey, data) {
    const prompt = `
당신은 최고의 데이터 분석가이자 수석 경영 컨설턴트입니다. 다음 데이터 통계 요약치를 바탕으로 전문적인 한국어 분석 보고서 콘텐츠를 JSON 형식으로 작성해 주세요.

[데이터 통계 정보]
- 보고서 유형: ${data.type}
- 문체 어조: ${data.tone}
- 파일명: ${data.fileName}
- 분석 지표: [X: ${data.xColName}] × [Y: ${data.yColName}]
- 건수: ${data.count}
- 합계: ${data.sum}
- 평균: ${data.mean}
- 중앙값: ${data.median}
- 최소: ${data.min}, 최대: ${data.max}
- 표준편차: ${data.stddev}, 변동계수(CV): ${data.cv}%
- 최상위: ${data.top1.label} (${data.top1.value})
- 상위 20% 점유율: ${data.top20Share}%
- 최하위: ${data.bottom1.label} (${data.bottom1.value})
- 격차 배율: ${data.topBottomRatio}배
- 이상치 건수: ${data.outliers.length}건

반드시 아래 JSON 포맷만을 반환하세요:
{
  "title": "보고서 제목 문자열",
  "subtitle": "부제목 문자열",
  "executiveSummary": "경영진 핵심 요약 브리핑 HTML 단락 (<p>태그 포함 3단락)",
  "paretoDiagnostic": "파레토 집중도 분석 내용 문자열",
  "outlierDiagnostic": "이상치 분석 내용 문자열",
  "cvDiagnostic": "변동성 및 CV 분석 내용 문자열",
  "spreadDiagnostic": "상하위 격차 분석 내용 문자열",
  "recommendations": [
    { "title": "제언 1 제목", "desc": "제언 1 상세 내용" },
    { "title": "제언 2 제목", "desc": "제언 2 상세 내용" },
    { "title": "제언 3 제목", "desc": "제언 3 상세 내용" }
  ]
}
`;

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
                { role: 'system', content: 'You are a senior data intelligence consultant. Respond with JSON only.' },
                { role: 'user', content: prompt }
            ],
            response_format: { type: 'json_object' },
            temperature: 0.3
        })
    });

    if (!response.ok) {
        throw new Error(`OpenAI API 오류 (상태코드: ${response.status})`);
    }

    const resJson = await response.json();
    const text = resJson.choices?.[0]?.message?.content;
    if (!text) throw new Error('OpenAI 응답에 텍스트가 없습니다.');
    return JSON.parse(text);
}

// 📂 전체화면 드래그 앤 드롭 파일 로더
const dragDropOverlay = $('drag-drop-overlay');
let dragCounter = 0;

window.addEventListener('dragenter', (e) => {
    e.preventDefault();
    dragCounter++;
    if (dragDropOverlay) dragDropOverlay.style.display = 'flex';
});

window.addEventListener('dragover', (e) => {
    e.preventDefault();
});

window.addEventListener('dragleave', (e) => {
    e.preventDefault();
    dragCounter--;
    if (dragCounter <= 0) {
        dragCounter = 0;
        if (dragDropOverlay) dragDropOverlay.style.display = 'none';
    }
});

window.addEventListener('drop', (e) => {
    e.preventDefault();
    dragCounter = 0;
    if (dragDropOverlay) dragDropOverlay.style.display = 'none';
    const files = e.dataTransfer?.files;
    if (files && files.length > 0) {
        loadAndParseCSVFile(files[0]);
    }
});

// 키보드 단축키 지원 (Space: 회전, R: 기본뷰, G: 그리드, L: 라벨, M: 메뉴, ESC: 닫기)
window.addEventListener('keydown', (e) => {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(document.activeElement?.tagName)) return;
    if (e.code === 'Space') {
        e.preventDefault();
        $('btn-auto-rotate')?.click();
    } else if (e.key === 'r' || e.key === 'R' || e.key === 'ㄱ') {
        $('btn-reset-camera')?.click();
    } else if (e.key === 'g' || e.key === 'G' || e.key === 'ㅎ') {
        $('btn-toggle-grid')?.click();
    } else if (e.key === 'l' || e.key === 'L' || e.key === 'ㅣ') {
        $('btn-toggle-labels')?.click();
    } else if (e.key === 'm' || e.key === 'M' || e.key === 'ㅡ') {
        $('btn-toggle-menu')?.click();
    } else if (e.key === 'Escape') {
        if (gpuInfoModal) gpuInfoModal.style.display = 'none';
        if (chartPanel) chartPanel.style.display = 'none';
        if (menuPanel && window.innerWidth <= 768) menuPanel.classList.remove('open');
    }
});

// ════════════════════════════════════════════════════════════
// 5. 대시보드 메뉴 & 아코디언 설정 (단일 패널 오픈)
// ════════════════════════════════════════════════════════════
function openAccordionSection(sectionId) {
    const section = document.getElementById(sectionId);
    if (!section) return;
    const header = section.querySelector('.accordion-header');
    const body = section.querySelector('.accordion-body');
    if (!header || !body) return;

    // 다른 모든 아코디언 닫기
    document.querySelectorAll('.accordion-header').forEach(h => {
        h.classList.remove('active');
        const icon = h.querySelector('.chevron');
        if (icon) icon.textContent = '▾';
    });
    document.querySelectorAll('.accordion-body').forEach(b => {
        b.classList.remove('open');
    });
    document.querySelectorAll('.accordion-item').forEach(it => {
        it.classList.remove('active');
    });

    // 선택된 섹션만 열기
    section.classList.add('active');
    header.classList.add('active');
    body.classList.add('open');
    const icon = header.querySelector('.chevron');
    if (icon) icon.textContent = '▴';

    setTimeout(() => {
        section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 60);
}

function initAccordion() {
    document.querySelectorAll('.accordion-header').forEach(header => {
        header.addEventListener('click', () => {
            const targetId = header.getAttribute('data-target');
            const targetBody = document.getElementById(targetId);
            const item = header.closest('.accordion-item');
            const isAlreadyOpen = targetBody && targetBody.classList.contains('open');

            // 다른 열려있는 모든 패널 닫기
            document.querySelectorAll('.accordion-header').forEach(h => {
                h.classList.remove('active');
                const icon = h.querySelector('.chevron');
                if (icon) icon.textContent = '▾';
            });
            document.querySelectorAll('.accordion-body').forEach(b => {
                b.classList.remove('open');
            });
            document.querySelectorAll('.accordion-item').forEach(it => {
                it.classList.remove('active');
            });

            // 클릭한 패널이 닫혀있었으면 열기 (이미 열려있었다면 닫힌 상태 유지)
            if (!isAlreadyOpen && targetBody) {
                header.classList.add('active');
                targetBody.classList.add('open');
                if (item) item.classList.add('active');
                const icon = header.querySelector('.chevron');
                if (icon) icon.textContent = '▴';

                setTimeout(() => {
                    item.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
                }, 60);
            }
        });
    });
}
initAccordion();

// ════════════════════════════════════════════════════════════
// 메뉴 패널 완벽 스크롤 엔진 (마우스 휠 + 터치 드래그 + 마우스 드래그)
// ════════════════════════════════════════════════════════════
const menuContent = document.querySelector('.menu-content');
const btnScrollTop = $('btn-scroll-top');
const btnScrollBottom = $('btn-scroll-bottom');

if (btnScrollTop && menuContent) {
    btnScrollTop.addEventListener('click', () => {
        menuContent.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

if (btnScrollBottom && menuContent) {
    btnScrollBottom.addEventListener('click', () => {
        menuContent.scrollTo({ top: menuContent.scrollHeight, behavior: 'smooth' });
    });
}

if (menuPanel && menuContent) {
    // 메뉴창 선택(활성화) 상태 관리 함수
    function activateMenuScroll() {
        controls.enabled = false; // 3D 카메라 줌/회전 일시 중단하여 메뉴 스크롤에 100% 집중
        menuPanel.classList.add('menu-active');
    }

    function deactivateMenuScroll() {
        controls.enabled = true;  // 3D 카메라 제어 복원
        menuPanel.classList.remove('menu-active');
    }

    // 메뉴창 클릭, 호버, 터치, 포커스 시 즉각 선택 & 3D 카메라 줌 차단
    menuPanel.addEventListener('mouseenter', activateMenuScroll);
    menuPanel.addEventListener('mousedown', activateMenuScroll);
    menuPanel.addEventListener('touchstart', activateMenuScroll, { passive: true });
    menuPanel.addEventListener('focusin', activateMenuScroll);

    // 메뉴창을 벗어나거나 3D 캔버스를 터치/클릭하면 3D 컨트롤 복원
    menuPanel.addEventListener('mouseleave', deactivateMenuScroll);
    renderer.domElement.addEventListener('mousedown', deactivateMenuScroll);
    renderer.domElement.addEventListener('touchstart', deactivateMenuScroll, { passive: true });

    // 1. 마우스 휠 스크롤 (브라우저 기본 동작 차단 & 메뉴 전용 직접 스크롤)
    menuPanel.addEventListener('wheel', (e) => {
        activateMenuScroll();
        e.stopPropagation();
        e.preventDefault();
        menuContent.scrollTop += e.deltaY;
    }, { passive: false });

    // 2. 터치 제스처 스크롤 (모바일 / 태블릿 손가락 드래그 스크롤 완벽 대응)
    let touchStartY = 0;
    let touchStartScrollTop = 0;
    let isTouchActive = false;

    menuPanel.addEventListener('touchstart', (e) => {
        // 슬라이더, 입력창, 버튼, 셀렉트 등 터치 시 스크롤이 터치를 가로채지 않도록 방어
        const interactiveTags = ['INPUT', 'SELECT', 'BUTTON', 'LABEL', 'TEXTAREA'];
        if (interactiveTags.includes(e.target.tagName) || e.target.closest('button, select, input, label, .control-group, .range-row')) {
            isTouchActive = false;
            return;
        }
        if (e.touches.length === 1) {
            activateMenuScroll();
            isTouchActive = true;
            touchStartY = e.touches[0].clientY;
            touchStartScrollTop = menuContent.scrollTop;
        }
    }, { passive: true });

    menuPanel.addEventListener('touchmove', (e) => {
        if (!isTouchActive || e.touches.length !== 1) return;
        // 터치 대상이 슬라이더라면 메뉴 스크롤 중단
        if (e.target.closest('input[type="range"]')) {
            isTouchActive = false;
            return;
        }
        e.stopPropagation();
        e.preventDefault();
        const currentY = e.touches[0].clientY;
        const diffY = touchStartY - currentY;
        menuContent.scrollTop = touchStartScrollTop + diffY;
    }, { passive: false });

    menuPanel.addEventListener('touchend', () => {
        isTouchActive = false;
    }, { passive: true });

    menuPanel.addEventListener('touchcancel', () => {
        isTouchActive = false;
    }, { passive: true });

    // 3. 마우스 드래그 스크롤 (데스크톱 마우스로 잡고 끌어당기기 지원)
    let isMouseDragging = false;
    let mouseStartY = 0;
    let mouseStartScrollTop = 0;

    menuContent.addEventListener('mousedown', (e) => {
        const interactiveTags = ['INPUT', 'SELECT', 'BUTTON', 'LABEL', 'TEXTAREA'];
        if (interactiveTags.includes(e.target.tagName) || e.target.closest('button, select, input, label')) {
            return;
        }
        activateMenuScroll();
        isMouseDragging = true;
        mouseStartY = e.clientY;
        mouseStartScrollTop = menuContent.scrollTop;
        menuContent.style.cursor = 'grabbing';
    });

    window.addEventListener('mousemove', (e) => {
        if (!isMouseDragging) return;
        const diffY = mouseStartY - e.clientY;
        menuContent.scrollTop = mouseStartScrollTop + diffY;
    });

    window.addEventListener('mouseup', () => {
        if (isMouseDragging) {
            isMouseDragging = false;
            menuContent.style.cursor = '';
        }
    });

    // 4. 키보드 방향키 스크롤 지원 (메뉴창 선택 상태에서 위/아래 방향키 및 PageUp/Down)
    menuPanel.addEventListener('keydown', (e) => {
        if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
        if (e.key === 'ArrowDown') {
            e.preventDefault();
            menuContent.scrollTop += 60;
        } else if (e.key === 'ArrowUp') {
            e.preventDefault();
            menuContent.scrollTop -= 60;
        } else if (e.key === 'PageDown') {
            e.preventDefault();
            menuContent.scrollTop += 220;
        } else if (e.key === 'PageUp') {
            e.preventDefault();
            menuContent.scrollTop -= 220;
        }
    });
}

// ── 3D 환경 및 조명 실시간 제어 ──
if ($('ambient-intensity')) {
    $('ambient-intensity').addEventListener('input', e => {
        ambientLight.intensity = parseFloat(e.target.value);
        if ($('val-ambient')) $('val-ambient').textContent = e.target.value;
    });
}
if ($('dir-intensity')) {
    $('dir-intensity').addEventListener('input', e => {
        dirLight.intensity = parseFloat(e.target.value);
        if ($('val-dir')) $('val-dir').textContent = e.target.value;
    });
}
if ($('point-intensity')) {
    $('point-intensity').addEventListener('input', e => {
        pointLight.intensity = parseFloat(e.target.value);
        if ($('val-point')) $('val-point').textContent = e.target.value;
    });
}
if ($('point-color')) {
    $('point-color').addEventListener('input', e => {
        pointLight.color = new THREE.Color(e.target.value);
    });
}
if ($('exposure-intensity')) {
    $('exposure-intensity').addEventListener('input', e => {
        renderer.toneMappingExposure = parseFloat(e.target.value);
        if ($('val-exposure')) $('val-exposure').textContent = e.target.value;
    });
}
if ($('camera-fov')) {
    $('camera-fov').addEventListener('input', e => {
        camera.fov = parseInt(e.target.value);
        camera.updateProjectionMatrix();
        if ($('val-fov')) $('val-fov').textContent = e.target.value + '°';
    });
}
if ($('fog-density')) {
    $('fog-density').addEventListener('input', e => {
        scene.fog.density = parseFloat(e.target.value);
        if ($('val-fog')) $('val-fog').textContent = e.target.value;
    });
}
if ($('shadow-toggle')) {
    $('shadow-toggle').addEventListener('change', e => {
        dirLight.castShadow = e.target.checked;
        renderer.shadowMap.needsUpdate = true;
    });
}

// 조명 & 환경설정 기본값 복원 버튼
if ($('btn-reset-lighting')) {
    $('btn-reset-lighting').addEventListener('click', () => {
        // 1. 환경광
        ambientLight.intensity = 0.8;
        if ($('ambient-intensity')) $('ambient-intensity').value = 0.8;
        if ($('val-ambient')) $('val-ambient').textContent = '0.8';

        // 2. 직사광
        dirLight.intensity = 0.9;
        if ($('dir-intensity')) $('dir-intensity').value = 0.9;
        if ($('val-dir')) $('val-dir').textContent = '0.9';

        // 3. 포인트 라이트
        pointLight.intensity = 0.8;
        pointLight.color = new THREE.Color(0x818cf8);
        if ($('point-intensity')) $('point-intensity').value = 0.8;
        if ($('val-point')) $('val-point').textContent = '0.8';
        if ($('point-color')) $('point-color').value = '#818cf8';

        // 4. 노출
        renderer.toneMappingExposure = 1.1;
        if ($('exposure-intensity')) $('exposure-intensity').value = 1.1;
        if ($('val-exposure')) $('val-exposure').textContent = '1.1';

        // 5. 카메라 FOV
        camera.fov = 55;
        camera.updateProjectionMatrix();
        if ($('camera-fov')) $('camera-fov').value = 55;
        if ($('val-fov')) $('val-fov').textContent = '55°';

        // 6. 안개
        scene.fog.density = 0.015;
        if ($('fog-density')) $('fog-density').value = 0.015;
        if ($('val-fog')) $('val-fog').textContent = '0.015';

        // 7. 그림자
        dirLight.castShadow = true;
        if ($('shadow-toggle')) $('shadow-toggle').checked = true;

        // 8. 배경색
        const defaultBg = '#f1f5f9';
        scene.background = new THREE.Color(defaultBg);
        scene.fog.color = new THREE.Color(defaultBg);
        if ($('bg-color')) $('bg-color').value = defaultBg;

        showToast('💡 조명 및 환경설정이 기본값으로 초기화되었습니다.');
    });
}

// 모바일 터치 슬라이더 부드러운 조작 (터치 홀드 & 좌우 스와이프 시 부모 스크롤/줌 방지)
['ambient-intensity', 'dir-intensity', 'point-intensity', 'exposure-intensity', 'camera-fov', 'fog-density', 'time-slider-range'].forEach(id => {
    const el = $(id);
    if (el) {
        el.addEventListener('touchstart', (e) => {
            e.stopPropagation();
        }, { passive: true });
        el.addEventListener('touchmove', (e) => {
            e.stopPropagation();
        }, { passive: true });
    }
});
$('bg-color').addEventListener('input', e => {
    const c = e.target.value;
    scene.background = new THREE.Color(c);
    scene.fog.color = new THREE.Color(c);
});
$('bar-style').addEventListener('change', () => {
    if (parsedData && analysisResult) applyVisualization();
});
if (colorThemeSelect) {
    colorThemeSelect.addEventListener('change', () => {
        if (customColorGroup) {
            customColorGroup.style.display = colorThemeSelect.value === 'custom' ? 'block' : 'none';
        }
        if (parsedData && analysisResult) applyVisualization();
    });
}
if (customColorPicker) {
    customColorPicker.addEventListener('input', (e) => {
        if (customColorCode) customColorCode.value = e.target.value.toUpperCase();
        if (colorThemeSelect && colorThemeSelect.value === 'custom') {
            if (parsedData && analysisResult) applyVisualization();
        }
    });
}
if (customColorCode) {
    customColorCode.addEventListener('input', (e) => {
        let val = e.target.value.trim();
        if (!val.startsWith('#') && val.length > 0) val = '#' + val;
        if (/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(val)) {
            if (customColorPicker) customColorPicker.value = val;
            if (colorThemeSelect && colorThemeSelect.value === 'custom') {
                if (parsedData && analysisResult) applyVisualization();
            }
        }
    });
}

// ════════════════════════════════════════════════════════════
// 8. CSV 파싱 및 한글/다중 인코딩 디코더 (UTF-8, EUC-KR / CP949 자동 감지)
// ════════════════════════════════════════════════════════════
/**
 * 바이너리 ArrayBuffer를 문자열로 디코딩 (한국어 엑셀 ANSI 자동 감지)
 * 
 * [동작 원리]
 * 1) mode가 수동 지정인 경우 해당 디코더로 즉시 변환
 * 2) mode가 'auto'인 경우:
 *    - UTF-8 BOM(0xEF, 0xBB, 0xBF) 존재 여부 검사
 *    - TextDecoder('utf-8', { fatal: true })로 strict 파싱 시도
 *    - 한국어 엑셀(CP949/EUC-KR) 바이트가 포함되어 파싱 예외 발생 시 즉시 'euc-kr' 디코더로 폴백
 * @param {ArrayBuffer} buffer - 파일 바이너리 버퍼
 * @param {string} mode - 'auto' | 'euc-kr' | 'utf-8'
 * @returns {string} 디코딩된 텍스트 문자열
 */
function decodeCSVBuffer(buffer, mode = 'auto') {
    const bytes = new Uint8Array(buffer);

    // 1. 수동 강제 지정 (EUC-KR / CP949)
    if (mode === 'euc-kr' || mode === 'cp949') {
        try {
            return new TextDecoder('euc-kr').decode(bytes);
        } catch (e) {
            console.warn('EUC-KR 디코딩 실패, UTF-8 폴백:', e);
            return new TextDecoder('utf-8').decode(bytes);
        }
    }

    // 2. 수동 강제 지정 (UTF-8)
    if (mode === 'utf-8') {
        return new TextDecoder('utf-8').decode(bytes);
    }

    // 3. 자동 감지 (mode === 'auto')
    // UTF-8 BOM (0xEF, 0xBB, 0xBF) 확인 시 UTF-8로 즉시 디코딩
    if (bytes.length >= 3 && bytes[0] === 0xEF && bytes[1] === 0xBB && bytes[2] === 0xBF) {
        return new TextDecoder('utf-8').decode(bytes);
    }

    // 한국 엑셀(ANSI)은 CP949/EUC-KR로 저장되어 한글 바이트가 0x80 이상이며 UTF-8 구조에 부합하지 않음
    // strict utf-8 (fatal: true)로 시도하고, 예외 발생 시 EUC-KR로 디코딩
    try {
        const strictUtf8 = new TextDecoder('utf-8', { fatal: true });
        return strictUtf8.decode(bytes);
    } catch (e) {
        try {
            const eucKrDecoder = new TextDecoder('euc-kr');
            return eucKrDecoder.decode(bytes);
        } catch (err2) {
            console.warn('EUC-KR 디코더 실패, 기본 UTF-8 완화 디코딩 시도:', err2);
            return new TextDecoder('utf-8').decode(bytes);
        }
    }
}

/**
 * CSV 텍스트 문자열을 2차원 행렬 객체로 파싱
 * - 따옴표 안의 쉼표(,) 및 줄바꿈 이스케이프 지원
 * - 빈 줄 제거 및 헤더/데이터 행 정규화
 * @param {string} text - 원본 CSV 텍스트
 * @returns {{ headers: string[], rows: string[][] } | null}
 */
function parseCSV(text) {
    if (!text) return null;
    // UTF-8 BOM(\uFEFF) 제거 및 줄바꿈 통일
    text = text.replace(/^\uFEFF/, '').trim();
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    if (lines.length < 2) return null;
    const parseRow = (line) => {
        const result = []; let cur = ''; let inQ = false;
        for (let i = 0; i < line.length; i++) {
            const ch = line[i];
            if (inQ) {
                if (ch === '"' && line[i + 1] === '"') { cur += '"'; i++; }
                else if (ch === '"') inQ = false;
                else cur += ch;
            } else {
                if (ch === '"') inQ = true;
                else if (ch === ',') { result.push(cur.trim()); cur = ''; }
                else cur += ch;
            }
        }
        result.push(cur.trim());
        return result;
    };
    const headers = parseRow(lines[0]).map(h => h.trim());
    const rows = [];
    for (let i = 1; i < lines.length; i++) {
        const row = parseRow(lines[i]);
        if (row.length === headers.length && row.some(v => v !== '')) rows.push(row);
    }
    return rows.length ? { headers, rows } : null;
}

// ════════════════════════════════════════════════════════════
// 9. 스마트 통계 분석 및 AI 이상치 탐지 엔진
// ════════════════════════════════════════════════════════════
/**
 * 로드된 데이터셋을 다각도로 분석하여 컬럼 속성 분류, 기술 통계량, 추천 차트 도출
 * @param {{ headers: string[], rows: string[][] }} data 
 * @returns {Object} 종합 분석 결과 객체
 */
function analyzeData(data) {
    const { headers, rows } = data;
    const colCount = headers.length, rowCount = rows.length;
    const columnTypes = [], numericCols = [], categoryCols = [], dateCols = [];

    for (let c = 0; c < colCount; c++) {
        const vals = rows.map(r => r[c]).filter(v => v !== '');
        const numRatio = vals.filter(v => !isNaN(parseFloat(v)) && isFinite(v)).length / Math.max(vals.length, 1);
        const datePatterns = [/^\d{4}[-/]\d{1,2}[-/]\d{1,2}$/, /^\d{1,2}[-/]\d{1,2}[-/]\d{4}$/, /^\d{4}년/, /^\d{4}$/];
        const dateRatio = vals.filter(v => datePatterns.some(p => p.test(v))).length / Math.max(vals.length, 1);

        if (numRatio >= 0.8) { columnTypes.push('number'); numericCols.push(c); }
        else if (dateRatio >= 0.6) { columnTypes.push('date'); dateCols.push(c); }
        else { columnTypes.push('category'); categoryCols.push(c); }
    }

    const numericStats = {};
    numericCols.forEach(c => {
        const vals = rows.map(r => parseFloat(r[c])).filter(v => !isNaN(v));
        if (!vals.length) return;
        const sum = vals.reduce((a, b) => a + b, 0);
        const mean = sum / vals.length;
        const sorted = [...vals].sort((a, b) => a - b);
        numericStats[headers[c]] = {
            sum, mean, min: sorted[0], max: sorted[sorted.length - 1],
            median: sorted[Math.floor(sorted.length / 2)], count: vals.length,
            stddev: Math.sqrt(vals.reduce((s, v) => s + (v - mean) ** 2, 0) / vals.length)
        };
    });

    const categoryInfo = {};
    categoryCols.forEach(c => {
        const vals = rows.map(r => r[c]).filter(v => v !== '');
        const unique = [...new Set(vals)];
        categoryInfo[headers[c]] = { uniqueCount: unique.length, topValues: unique.slice(0, 20) };
    });

    const recommendedCharts = getRecommendations(rowCount, numericCols, categoryCols, dateCols, headers, categoryInfo);
    return { rowCount, colCount, columnTypes, numericCols, categoryCols, dateCols, numericStats, categoryInfo, recommendedCharts, headers };
}

function getRecommendations(rowCount, numericCols, categoryCols, dateCols, headers, categoryInfo) {
    const recs = [];
    const hasDate = dateCols.length > 0, hasCat = categoryCols.length > 0, hasNum = numericCols.length > 0;

    if (hasDate && hasNum) recs.push({ type: 'line', reason: '시계열 추세 분석' });
    if (hasCat && hasNum) {
        const uq = categoryInfo[headers[categoryCols[0]]]?.uniqueCount || 0;
        if (uq <= 8) { recs.push({ type: 'pie', reason: `${uq}개 카테고리 비율` }); recs.push({ type: 'doughnut', reason: '도넛 비율' }); }
        if (uq <= 15) { recs.push({ type: 'bar', reason: '카테고리별 비교' }); recs.push({ type: 'radar', reason: '다항목 비교' }); }
        else recs.push({ type: 'horizontalBar', reason: `많은 항목(${uq}개) 가로 비교` });
    }
    if (numericCols.length >= 2) recs.push({ type: 'scatter', reason: '수치 상관관계 분석' });
    if (!hasCat && !hasDate && hasNum) recs.push({ type: 'bar', reason: '수치 비교' });
    if (!recs.length) recs.push({ type: 'bar', reason: '기본 막대' });
    return recs;
}

// ════════════════════════════════════════════════════════════
// 8. 분석 결과 UI 표출
// ════════════════════════════════════════════════════════════
function displayAnalysis(analysis) {
    analysisSection.style.display = '';
    const tl = { number: '숫자', date: '날짜', category: '문자' };
    let html = '';
    html += statRow('행 × 열', `${analysis.rowCount} × ${analysis.colCount}`);
    html += `<div class="stat-row"><span class="stat-label">컬럼</span><span class="stat-value" style="font-size:11px;">`;
    analysis.columnTypes.forEach((t, i) => { html += `${analysis.headers[i]}(${tl[t]}) `; });
    html += `</span></div>`;

    Object.entries(analysis.numericStats).forEach(([col, s]) => {
        html += `<div style="margin-top:8px;"><strong style="color:#4338ca;">${col}</strong></div>`;
        html += statRow('평균', fmt(s.mean));
        html += statRow('범위', `${fmt(s.min)} ~ ${fmt(s.max)}`);
        html += statRow('합계', fmt(s.sum));
        html += statRow('표준편차', fmt(s.stddev));
    });

    html += `<div id="dynamic-recommend-box"></div>`;
    analysisResultEl.innerHTML = html;
    renderAIInsights(analysis);
}

// ════════════════════════════════════════════════════════════
// 8-1. AI 인사이트 & 이상치(Anomaly) 자동 브리핑 엔진
// ════════════════════════════════════════════════════════════
function renderAIInsights(analysis) {
    const box = $('ai-insight-box');
    if (!box || !parsedData || !yAxisSelect) return;

    const yIdx = parseInt(yAxisSelect.value);
    const xIdx = parseInt(xAxisSelect.value);
    if (isNaN(yIdx) || isNaN(xIdx) || !parsedData.headers[yIdx]) return;

    const yColName = parsedData.headers[yIdx];
    const rows = parsedData.rows;
    const items = rows.map((r, i) => ({
        label: String(r[xIdx] || `항목 #${i + 1}`),
        value: parseFloat(r[yIdx]) || 0,
        idx: i
    })).filter(item => !isNaN(item.value));

    if (items.length === 0) {
        box.innerHTML = '';
        return;
    }

    // 1. 기본 통계 지표 산출
    const values = items.map(d => d.value).sort((a, b) => a - b);
    const count = values.length;
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / count;
    const median = count % 2 === 0 ? (values[count / 2 - 1] + values[count / 2]) / 2 : values[Math.floor(count / 2)];

    // 2. IQR 기반 이상치(Outlier) 자동 탐지 (Q1 - 1.5*IQR, Q3 + 1.5*IQR)
    const q1 = values[Math.floor(count * 0.25)];
    const q3 = values[Math.floor(count * 0.75)];
    const iqr = Math.max(q3 - q1, 0.0001);
    const upperLimit = q3 + 1.5 * iqr;
    const lowerLimit = q1 - 1.5 * iqr;

    const outliers = items.filter(d => d.value > upperLimit || d.value < lowerLimit);

    // 3. 파레토 법칙(80/20 법칙) 집중도 계산
    const sortedDesc = [...items].sort((a, b) => b.value - a.value);
    const top20Count = Math.max(1, Math.round(count * 0.2));
    const top20Sum = sortedDesc.slice(0, top20Count).reduce((acc, cur) => acc + cur.value, 0);
    const top20Share = sum > 0 ? ((top20Sum / sum) * 100).toFixed(1) : 0;

    // 4. 변동계수 (CV)
    const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / count;
    const stddev = Math.sqrt(variance);
    const cv = mean > 0 ? (stddev / mean) : 0;

    let cvDesc = '항목 간 편차가 적당하며 안정적인 분포입니다.';
    if (cv < 0.3) cvDesc = '모든 항목이 고르게 평준화되어 차이가 적습니다.';
    else if (cv > 0.8) cvDesc = '항목 간 격차가 극심하여 상위 항목에 쏠려 있습니다.';

    // HTML 구성
    let html = `
    <div class="ai-insight-header">
        <div class="ai-insight-title">
            <span>✨ AI 실시간 데이터 인사이트</span>
        </div>
        <span class="ai-insight-badge">통계 분석 완료</span>
    </div>
    <div class="ai-insight-list">
        <div class="ai-insight-item highlight">
            📌 <strong>지표 요약:</strong> [${yColName}] 총합 <strong>${fmt(sum)}</strong>, 평균 <strong>${fmt(Math.round(mean))}</strong> (중앙값 ${fmt(Math.round(median))})
        </div>
        <div class="ai-insight-item">
            📊 <strong>파레토 집중도:</strong> 상위 <strong>${top20Count}개(${Math.round(top20Count/count*100)}%)</strong> 항목이 전체의 <strong>${top20Share}%</strong>를 차지하고 있습니다. (${cvDesc})
        </div>
    `;

    if (outliers.length > 0) {
        const topOutlier = outliers.sort((a, b) => b.value - a.value)[0];
        const ratio = mean > 0 ? (topOutlier.value / mean).toFixed(1) : '-';
        html += `
        <div class="ai-insight-item outlier">
            ⚠️ <strong>이상치(Anomaly) 감지 (${outliers.length}건):</strong> [${topOutlier.label}] 항목이 <strong>${fmt(topOutlier.value)}</strong>로 평균의 <strong>${ratio}배</strong>에 달하는 통계적 극단값입니다.
            <button type="button" id="btn-highlight-outliers" class="ai-outlier-btn">
                ⚡ 이상치 ${outliers.length}건 3D 집중 하이라이트
            </button>
        </div>
        `;
    } else {
        html += `
        <div class="ai-insight-item">
            ✅ <strong>이상치 검증:</strong> 1.5×IQR 기준을 벗어나는 극단적 이상치가 없으며 안정적입니다.
        </div>
        `;
    }

    html += `</div>`;
    box.innerHTML = html;

    // 이상치 하이라이트 버튼 이벤트
    $('btn-highlight-outliers')?.addEventListener('click', () => {
        if (!outliers.length) return;
        const target = dataObjects[outliers[0].idx];
        if (target) {
            selectObject(target, outliers[0].idx);
            showToast(`🎯 이상치 <strong>[${outliers[0].label}]</strong>에 카메라를 집중했습니다!`);
        }
    });
}

// ════════════════════════════════════════════════════════════
// 8-2. 시계열/다차원 타임슬라이더 애니메이션 플레이어
// ════════════════════════════════════════════════════════════
let timePlayerTimer = null;
let currentTimeStep = 0;

function initTimePlayer() {
    if (!analysisResult || !analysisResult.numericCols || analysisResult.numericCols.length === 0) {
        if (timePlayerBar) timePlayerBar.style.display = 'none';
        return;
    }

    const numCols = analysisResult.numericCols;
    const curY = parseInt(yAxisSelect.value);
    let curStep = numCols.indexOf(curY);
    if (curStep === -1) curStep = 0;
    currentTimeStep = curStep;

    if (timeSliderRange) {
        timeSliderRange.min = 0;
        timeSliderRange.max = numCols.length - 1;
        timeSliderRange.value = curStep;
    }
    updateTimePlayerUI();

    // 여러 개의 수치 열이 있을 경우 타임라인 플레이어 버튼 표시
    if (numCols.length > 1) {
        if (btnToggleTimeline) btnToggleTimeline.style.display = '';
    }
}

function updateTimePlayerUI() {
    if (!analysisResult || !analysisResult.numericCols || !parsedData) return;
    const numCols = analysisResult.numericCols;
    if (currentTimeStep < 0 || currentTimeStep >= numCols.length) currentTimeStep = 0;

    const colIdx = numCols[currentTimeStep];
    const colName = parsedData.headers[colIdx] || `컬럼 #${colIdx}`;

    if (timeStepBadge) timeStepBadge.textContent = `${currentTimeStep + 1} / ${numCols.length}`;
    if (timeColName) timeColName.textContent = colName;
    if (timeSliderRange) timeSliderRange.value = currentTimeStep;
}

function openTimePlayer() {
    if (!timePlayerBar) return;
    initTimePlayer();
    timePlayerBar.style.display = 'flex';
    showToast('⏳ <strong>타임라인 플레이어</strong>가 활성화되었습니다. 재생(▶) 버튼을 눌러보세요!');
}

function closeTimePlayer() {
    if (!timePlayerBar) return;
    stopTimePlay();
    timePlayerBar.style.display = 'none';
}

function setTimeStep(step) {
    if (!analysisResult || !analysisResult.numericCols || !parsedData) return;
    const numCols = analysisResult.numericCols;
    if (step < 0) step = numCols.length - 1;
    if (step >= numCols.length) step = 0;

    currentTimeStep = step;
    const colIdx = numCols[currentTimeStep];
    yAxisSelect.value = colIdx;

    updateTimePlayerUI();
    applyVisualization();
}

function toggleTimePlay() {
    if (timePlayerTimer) {
        stopTimePlay();
    } else {
        startTimePlay();
    }
}

function startTimePlay() {
    if (!analysisResult || !analysisResult.numericCols) return;
    stopTimePlay();
    const speed = parseInt(timeSpeedSelect?.value) || 900;
    if (btnTimePlay) {
        btnTimePlay.textContent = '⏸ 정지';
        btnTimePlay.classList.add('playing');
    }

    timePlayerTimer = setInterval(() => {
        const nextStep = (currentTimeStep + 1) % analysisResult.numericCols.length;
        setTimeStep(nextStep);
    }, speed);
}

function stopTimePlay() {
    if (timePlayerTimer) {
        clearInterval(timePlayerTimer);
        timePlayerTimer = null;
    }
    if (btnTimePlay) {
        btnTimePlay.textContent = '▶ 재생';
        btnTimePlay.classList.remove('playing');
    }
}

// 타임라인 플레이어 이벤트 바인딩
btnTimePlay?.addEventListener('click', toggleTimePlay);
btnTimePrev?.addEventListener('click', () => {
    stopTimePlay();
    setTimeStep(currentTimeStep - 1);
});
btnTimeNext?.addEventListener('click', () => {
    stopTimePlay();
    setTimeStep(currentTimeStep + 1);
});
timeSliderRange?.addEventListener('input', (e) => {
    stopTimePlay();
    setTimeStep(parseInt(e.target.value));
});
timeSpeedSelect?.addEventListener('change', () => {
    if (timePlayerTimer) {
        startTimePlay();
    }
});
btnCloseTimePlayer?.addEventListener('click', closeTimePlayer);

function statRow(label, value) {
    return `<div class="stat-row"><span class="stat-label">${label}</span><span class="stat-value">${value}</span></div>`;
}
function fmt(n) { return typeof n === 'number' ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : n; }

// ════════════════════════════════════════════════════════════
// 9. 축 & 필터 설정
// ════════════════════════════════════════════════════════════
function updateAxisSelectors(analysis) {
    vizSection.style.display = '';
    filterSection.style.display = '';

    xAxisSelect.innerHTML = '';
    yAxisSelect.innerHTML = '';
    analysis.headers.forEach((h, i) => {
        xAxisSelect.appendChild(new Option(h, i));
        yAxisSelect.appendChild(new Option(h, i));
    });

    const defX = [...analysis.categoryCols, ...analysis.dateCols, 0][0];
    const defY = analysis.numericCols.length ? analysis.numericCols[0] : (analysis.headers.length > 1 ? 1 : 0);
    xAxisSelect.value = defX;
    yAxisSelect.value = defY;
    updateFilter(defX);

    // 대용량 데이터 시각화 최적화: 행 수가 30개 초과인 경우 상위 30개로 자동 세팅
    if (parsedData && parsedData.rows.length > 30) {
        if (limitSelect) limitSelect.value = '30';
        if (sortSelect) sortSelect.value = 'desc';
    } else {
        if (limitSelect) limitSelect.value = 'all';
    }
    if (filterKeyword) filterKeyword.value = '';

    // 수치 범위 입력창 플레이스홀더 설정
    const yColName = analysis.headers[defY];
    if (analysis.numericStats[yColName]) {
        rangeMin.placeholder = `최소 (${fmt(analysis.numericStats[yColName].min)})`;
        rangeMax.placeholder = `최대 (${fmt(analysis.numericStats[yColName].max)})`;
    }
}

function updateFilter(colIdx) {
    dataFilter.innerHTML = '<option value="all">전체 보기</option>';
    if (!parsedData) return;
    [...new Set(parsedData.rows.map(r => r[colIdx]))].slice(0, 60).forEach(v => {
        dataFilter.appendChild(new Option(v, v));
    });
}

// ════════════════════════════════════════════════════════════
// 10. 데이터 테이블 연동
// ════════════════════════════════════════════════════════════
function renderDataTable(data, highlightRow = -1) {
    const table = $('data-table');
    const rowCountEl = $('row-count');
    const max = 80;
    let html = '<thead><tr>';
    data.headers.forEach(h => { html += `<th>${h}</th>`; });
    html += '</tr></thead><tbody>';
    data.rows.slice(0, max).forEach((row, idx) => {
        html += `<tr class="${idx === highlightRow ? 'selected' : ''}" data-idx="${idx}">`;
        row.forEach(v => { html += `<td>${v}</td>`; });
        html += '</tr>';
    });
    html += '</tbody>';
    table.innerHTML = html;
    rowCountEl.textContent = `(${data.rows.length}행 중 ${Math.min(max, data.rows.length)}행 / ${Math.min(max, data.rows.length)} of ${data.rows.length} rows)`;

    table.querySelectorAll('tbody tr').forEach(tr => {
        tr.addEventListener('click', () => {
            const idx = parseInt(tr.dataset.idx);
            if (idx < dataObjects.length) selectObject(dataObjects[idx], idx);
        });
    });
}

// ════════════════════════════════════════════════════════════
// 12. 10종 3D 지오메트리 스타일 렌더러 (Cylinder, Pie, Tube, Scatter, Surface 등)
// ════════════════════════════════════════════════════════════
/**
 * 이전 렌더링된 모든 3D 오브젝트, 보조 라인/그리드, 텍스트 라벨을 씬에서 제거하고 GPU 메모리 해제(Dispose)
 * - Three.js WebGL 메모리 누수(Memory Leak) 완전 방지
 */
function clearScene() {
    // 1. 메인 데이터 메쉬 메모리 해제
    dataObjects.forEach(obj => {
        scene.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
            else obj.material.dispose();
        }
    });
    dataObjects = [];

    // 2. 보조 시각화 요소(튜브 라인, 가이드 기둥, 지형 메쉬 등) 메모리 해제
    extraVisuals.forEach(obj => {
        scene.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
    });
    extraVisuals = [];

    // 3. 화면에 투영된 2D 텍스트 DOM 라벨 제거
    domLabels.forEach(l => l.el.remove());
    domLabels = [];
    selectedObject = null;
    hoveredObject = null;
}

/**
 * 데이터의 분포, 시계열 여부, 범주 개수를 기반으로 최적의 3D 형태를 자동 추론
 * - 시계열 데이터: 3D 입체 튜브 라인 (Line)
 * - 소규모 범주(<=8): 3D 파이 슬라이스 (Pie)
 * - 다수 범주(>=10): 3D 원기둥 막대 (Cylinder)
 * - 연속 수치/지형: 3D 곡면 서피스 (Surface)
 * @returns {string} 3D 스타일 식별자
 */
function inferBest3DStyle(labels, values, analysis) {
    if (!analysis) return 'box';

    const xIdx = parseInt(xAxisSelect ? xAxisSelect.value : 0);
    const yIdx = parseInt(yAxisSelect ? yAxisSelect.value : (analysis.numericCols[0] || 0));
    const isXDate = analysis.dateCols.includes(xIdx);
    const count = labels.length;

    // 1) 날짜/시계열 축인 경우 -> 3D 튜브 라인 또는 입체 면적
    if (isXDate) {
        return count >= 10 ? 'area' : 'line';
    }

    // 2) 카테고리 수가 적고(<=8개) 비율/점유율 비교 -> 파이 또는 도넛
    if (count <= 8 && count >= 2) {
        return count <= 5 ? 'pie' : 'donut';
    }

    // 3) 수치형 컬럼이 2개 이상이고 산포도 확인 적합 -> 입체 산점도
    if (analysis.numericCols.length >= 2 && count > 14) {
        return 'scatter';
    }

    // 4) 항목이 16개 이상으로 연속적이거나 광범위 -> 3D 곡면 서피스
    if (count >= 16) {
        return 'surface';
    }

    // 5) 항목이 8~15개 범주 비교 -> 원기둥 타워 또는 피라미드
    if (count >= 8) {
        return 'cylinder';
    }

    return 'box';
}

// 현재 선택된 축/필터 데이터 옵션 기반 실시간 시각화 추천 계산
function getDynamicRecommendations(labels, values, analysis) {
    if (!analysis) return [];

    const xIdx = parseInt(xAxisSelect.value);
    const yIdx = parseInt(yAxisSelect.value);
    const isXDate = analysis.dateCols.includes(xIdx);
    const count = labels.length;
    const recs = [];

    if (isXDate) {
        recs.push({ type: 'line', reason: `X축[${analysis.headers[xIdx]}]이 시계열 데이터이므로 추세선이 가장 적합합니다.` });
        recs.push({ type: 'area', reason: '시간 경과에 따른 누적 볼륨을 3D 입체 면적으로 파악하기 좋습니다.' });
    }

    if (count <= 8 && count >= 2) {
        recs.push({ type: 'pie', reason: `항목 수(${count}개)가 적어 원형 비율 및 점유율 파악에 이상적입니다.` });
        recs.push({ type: 'donut', reason: '중앙 링 구조로 데이터 비율을 현대적으로 표현합니다.' });
    }

    if (analysis.numericCols.length >= 2) {
        recs.push({ type: 'scatter', reason: '다변량 수치 간의 상관관계 및 이상치 분포를 3D 공간에 매핑합니다.' });
    }

    if (count >= 15) {
        recs.push({ type: 'surface', reason: `항목 수(${count}개)가 많아 연속된 3D 곡면 지형으로 전반적 패턴을 조망하기 좋습니다.` });
        recs.push({ type: 'horizontalBar', reason: '많은 라벨을 가로로 배치하여 텍스트 겹침 없이 비교합니다.' });
    } else {
        recs.push({ type: 'bar', reason: '각 항목별 정밀한 수치 크기를 비교하기 가장 명확합니다.' });
        recs.push({ type: 'cylinder', reason: '원기둥 기둥으로 회전 대칭적 시인성을 제공합니다.' });
    }

    return recs;
}

// 데이터 옵션(X축/Y축/필터/정렬) 변경 시 실시간으로 추천 배지 및 가이드 갱신
function updateDynamicRecommendations(labels, values, analysis) {
    if (!analysis) return;

    const best3D = inferBest3DStyle(labels, values, analysis);
    const styleKorean = {
        pie: '🥧 3D 파이 슬라이스',
        donut: '🍩 3D 도넛 링 차트',
        line: '📈 3D 입체 튜브 라인',
        area: '🏔️ 3D 산악형 면적 차트',
        scatter: '🌐 3D 입체 산점도',
        surface: '🌊 3D 곡면 서피스',
        cylinder: '● 3D 원기둥 타워',
        pyramid: '🔺 3D 피라미드 타워',
        box: '📊 3D 직육면체 막대'
    }[best3D] || '📊 3D 막대';

    const recs = getDynamicRecommendations(labels, values, analysis);
    const typeIcons = { bar:'📊 막대', horizontalBar:'📊 가로막대', line:'📈 선', pie:'🥧 파이', doughnut:'🍩 도넛', scatter:'⚬ 산점도', radar:'🕸 레이더', polarArea:'🎯 폴라' };

    // 추천 2D 차트 결정
    const valid2DTypes = ['bar', 'horizontalBar', 'line', 'pie', 'doughnut', 'scatter', 'radar', 'polarArea'];
    const matched2D = recs.find(r => {
        const mapped = r.type === 'donut' ? 'doughnut' : r.type;
        return valid2DTypes.includes(mapped);
    });
    const best2DType = matched2D ? (matched2D.type === 'donut' ? 'doughnut' : matched2D.type) : 'bar';
    const best2DLabel = typeIcons[best2DType] || '📊 막대';

    let html = '';
    html += `<div style="margin-top:10px;"><strong style="color:#4338ca;">✨ 선택 데이터 자동 추천:</strong></div>`;
    html += `<div style="display:flex; flex-wrap:wrap; gap:4px; margin:4px 0;">`;
    html += `<span class="recommend-badge" style="background:#dcfce7; color:#15803d; font-size:11px; font-weight:700;">3D 자동적용: ${styleKorean}</span>`;
    html += `<span class="recommend-badge" style="background:#e0e7ff; color:#4338ca; font-size:11px; font-weight:700;">2D 자동적용: ${best2DLabel}</span>`;
    html += `</div>`;

    if (recs.length > 0) {
        html += `<div style="font-size:11px; color:#4f46e5; margin-top:5px; line-height:1.4; background:#f0fdf4; padding:6px 8px; border-radius:6px; border:1px solid #bbf7d0;">💡 ${recs[0].reason}</div>`;
    }

    const recEl = document.getElementById('dynamic-recommend-box');
    if (recEl) {
        recEl.innerHTML = html;
    }
}

// 색상 테마 팔레트 생성 함수
function getThemeColor(index, count, alpha = 1) {
    const theme = colorThemeSelect ? colorThemeSelect.value : 'vibrant';
    const t = count > 1 ? index / (count - 1) : 0;
    
    switch (theme) {
        case 'ocean': {
            // 깊은 인디고 -> 아쿠아 시안
            const hue = 190 + t * 45;
            return new THREE.Color(`hsl(${hue}, 85%, ${45 + t * 15}%)`);
        }
        case 'neon': {
            // 사이버펑크 핑크 -> 일렉트릭 퍼플 -> 네온 블루
            const hue = (280 + index * 40) % 360;
            return new THREE.Color(`hsl(${hue}, 95%, 60%)`);
        }
        case 'sunset': {
            // 따뜻한 앰버 옐로우 -> 오렌지 -> 핫핑크
            const hue = 35 + t * 310;
            return new THREE.Color(`hsl(${hue % 360}, 90%, 55%)`);
        }
        case 'emerald': {
            // 산뜻한 라임 -> 에메랄드 딥그린 -> 민트
            const hue = 140 + t * 35;
            return new THREE.Color(`hsl(${hue}, 80%, ${40 + t * 15}%)`);
        }
        case 'gold': {
            // 럭셔리 골드 & 앰버 (#D97706 ~ #F59E0B ~ #FCD34D)
            const hue = 38 + t * 14;
            const lum = 46 + t * 20;
            return new THREE.Color(`hsl(${hue}, 92%, ${lum}%)`);
        }
        case 'pastel': {
            // 화사하고 부드러운 파스텔 마카롱 팔레트
            const hue = (index * 65 + 180) % 360;
            return new THREE.Color(`hsl(${hue}, 72%, 72%)`);
        }
        case 'fire': {
            // 딥레드 -> 크림슨 -> 블레이징 오렌지 -> 골든 옐로우
            const hue = 0 + t * 48;
            return new THREE.Color(`hsl(${hue}, 90%, ${48 + t * 14}%)`);
        }
        case 'aurora': {
            // 오로라 보레알리스 (네온 시안 -> 에메랄드 -> 바이올렛)
            const hue = (165 + t * 115) % 360;
            return new THREE.Color(`hsl(${hue}, 88%, ${50 + t * 10}%)`);
        }
        case 'monochrome': {
            // 모던 메탈릭 슬레이트 그레이 스케일
            const lum = 35 + t * 45;
            return new THREE.Color(`hsl(215, 20%, ${lum}%)`);
        }
        case 'custom': {
            // 사용자 지정 HEX 색상 코드 기반 팔레트 생성
            let hex = (customColorCode ? customColorCode.value : (customColorPicker ? customColorPicker.value : '#6366f1')).trim();
            if (!/^#([0-9A-Fa-f]{3}|[0-9A-Fa-f]{6})$/.test(hex)) {
                hex = (customColorPicker && customColorPicker.value) ? customColorPicker.value : '#6366f1';
            }
            const base = new THREE.Color(hex);
            const hsl = {};
            base.getHSL(hsl);
            // 각 항목별 명도와 색상에 부드러운 변주를 주어 입체감과 구별성 부여
            const lightnessShift = count > 1 ? (t - 0.5) * 0.35 : 0;
            const newL = Math.max(0.18, Math.min(0.85, hsl.l + lightnessShift));
            const hueShift = count > 1 ? (t - 0.5) * 0.08 : 0;
            const newH = (hsl.h + hueShift + 1) % 1;
            return new THREE.Color().setHSL(newH, Math.max(hsl.s, 0.4), newL);
        }
        case 'vibrant':
        default: {
            const hue = (index * (360 / Math.max(count, 1))) % 360;
            return new THREE.Color(`hsl(${hue}, 75%, 52%)`);
        }
    }
}

function render3DVisualization(labels, values) {
    clearScene();
    if (!values || !values.length) return;

    let selectedStyle = $('bar-style').value;
    if (selectedStyle === 'auto') {
        selectedStyle = inferBest3DStyle(labels, values, analysisResult);
    }

    switch (selectedStyle) {
        case 'pie': render3DPie(labels, values); break;
        case 'donut': render3DDonut(labels, values); break;
        case 'line': render3DLine(labels, values); break;
        case 'area': render3DArea(labels, values); break;
        case 'scatter': render3DScatter(labels, values); break;
        case 'surface': render3DSurface(labels, values); break;
        case 'pyramid': render3DBarMesh(labels, values, 'pyramid'); break;
        case 'cylinder': render3DBarMesh(labels, values, 'cylinder'); break;
        case 'box':
        default:
            render3DBarMesh(labels, values, 'box'); break;
    }
}

function render3DBarMesh(labels, values, shape = 'box') {
    const maxVal = Math.max(...values, 1);
    const scale = 8 / maxVal;
    const count = labels.length;

    labels.forEach((label, i) => {
        const val = values[i];
        const h = Math.max(val * scale, 0.1);
        const color = getThemeColor(i, count);

        let geometry;
        if (shape === 'cylinder') {
            geometry = new THREE.CylinderGeometry(0.38, 0.38, h, 24);
        } else if (shape === 'pyramid') {
            // 사각뿔 피라미드 타워 (top radius: 0, bottom radius: 0.5, 4 segments)
            geometry = new THREE.CylinderGeometry(0.02, 0.55, h, 4);
        } else {
            geometry = new THREE.BoxGeometry(0.72, h, 0.72);
        }

        const material = new THREE.MeshStandardMaterial({
            color, metalness: 0.25, roughness: 0.35,
            emissive: color.clone().multiplyScalar(0.08)
        });

        const mesh = new THREE.Mesh(geometry, material);
        const xPos = (i - (count - 1) / 2) * 1.35;
        mesh.position.set(xPos, h / 2, 0);
        if (shape === 'pyramid') mesh.rotation.y = Math.PI / 4;
        mesh.castShadow = true;
        mesh.receiveShadow = false;
        mesh.userData = { name: label, value: val, index: i, baseColor: color.clone(), baseY: h / 2 };

        scene.add(mesh);
        dataObjects.push(mesh);
        addDomLabel(label, xPos, -0.3, 0);
    });

    const spread = count * 1.35;
    animateCamera([0, spread * 0.4 + 5, spread * 0.6 + 8], [0, 2, 0]);
}

function render3DPie(labels, values) {
    render3DRing(labels, values, 0);
}

function render3DDonut(labels, values) {
    render3DRing(labels, values, 2.2);
}

function render3DRing(labels, values, innerRadius = 0) {
    const total = values.reduce((sum, v) => sum + Math.max(v, 0), 0) || 1;
    const outerRadius = 5.2;
    const thickness = 1.3;
    let currentAngle = 0;
    const count = labels.length;

    labels.forEach((label, i) => {
        const val = values[i];
        const sliceAngle = (Math.max(val, 0) / total) * Math.PI * 2;
        if (sliceAngle <= 0.001) return;

        const color = getThemeColor(i, count);
        const shape = new THREE.Shape();

        if (innerRadius > 0) {
            // 도넛 링 섹터
            shape.absarc(0, 0, outerRadius, currentAngle, currentAngle + sliceAngle, false);
            shape.absarc(0, 0, innerRadius, currentAngle + sliceAngle, currentAngle, true);
        } else {
            // 파이 부채꼴
            shape.moveTo(0, 0);
            shape.arc(0, 0, outerRadius, currentAngle, currentAngle + sliceAngle, false);
            shape.lineTo(0, 0);
        }

        const extrudeSettings = {
            depth: thickness, bevelEnabled: true, bevelSegments: 3,
            steps: 1, bevelSize: 0.08, bevelThickness: 0.08
        };

        const geometry = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        geometry.rotateX(-Math.PI / 2);

        const material = new THREE.MeshStandardMaterial({
            color, metalness: 0.25, roughness: 0.35,
            emissive: color.clone().multiplyScalar(0.06)
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(0, thickness, 0);
        mesh.castShadow = true;
        mesh.receiveShadow = false;

        const midAngle = currentAngle + sliceAngle / 2;
        const labelRadius = outerRadius + 1.2;
        const labelX = Math.cos(midAngle) * labelRadius;
        const labelZ = -Math.sin(midAngle) * labelRadius;

        mesh.userData = {
            name: `${label} (${((val / total) * 100).toFixed(1)}%)`,
            value: val, index: i, baseColor: color.clone(), midAngle
        };

        scene.add(mesh);
        dataObjects.push(mesh);
        addDomLabel(label, labelX, 0.2, labelZ);
        currentAngle += sliceAngle;
    });

    animateCamera([0, 11, 14], [0, 1, 0]);
}

function render3DArea(labels, values) {
    const maxVal = Math.max(...values, 1);
    const scale = 7 / maxVal;
    const count = labels.length;
    if (count < 2) {
        render3DBarMesh(labels, values, 'box');
        return;
    }

    const depth = 2.0;
    const shape = new THREE.Shape();
    const startX = (0 - (count - 1) / 2) * 1.5;
    shape.moveTo(startX, 0);

    const points = [];
    labels.forEach((label, i) => {
        const val = values[i];
        const y = Math.max(val * scale, 0.2);
        const x = (i - (count - 1) / 2) * 1.5;
        shape.lineTo(x, y);
        points.push({ x, y, val, label, i });
    });

    const endX = ((count - 1) - (count - 1) / 2) * 1.5;
    shape.lineTo(endX, 0);
    shape.lineTo(startX, 0);

    const extrudeSettings = { depth: depth, bevelEnabled: false };
    const areaGeo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const areaMat = new THREE.MeshStandardMaterial({
        color: 0x4f46e5, metalness: 0.2, roughness: 0.35,
        transparent: true, opacity: 0.85, side: THREE.DoubleSide
    });
    const areaMesh = new THREE.Mesh(areaGeo, areaMat);
    areaMesh.position.set(0, 0, -depth / 2);
    areaMesh.receiveShadow = false;
    areaMesh.castShadow = true;
    scene.add(areaMesh);
    extraVisuals.push(areaMesh);

    // 각 정점에 인터랙티브 데이터 노드 구체 배치
    points.forEach(p => {
        const color = getThemeColor(p.i, count);
        const nodeGeo = new THREE.SphereGeometry(0.35, 20, 20);
        const nodeMat = new THREE.MeshStandardMaterial({
            color, metalness: 0.3, roughness: 0.3,
            emissive: color.clone().multiplyScalar(0.2)
        });
        const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
        nodeMesh.position.set(p.x, p.y, 0);
        nodeMesh.castShadow = true;
        nodeMesh.userData = { name: p.label, value: p.val, index: p.i, baseColor: color.clone(), baseY: p.y };

        scene.add(nodeMesh);
        dataObjects.push(nodeMesh);
        addDomLabel(p.label, p.x, -0.3, 0);
    });

    const spread = count * 1.5;
    animateCamera([spread * 0.5, spread * 0.4 + 5, spread * 0.7 + 7], [0, 2, 0]);
}

function render3DLine(labels, values) {
    const maxVal = Math.max(...values, 1);
    const scale = 7 / maxVal;
    const count = labels.length;
    const points = [];

    labels.forEach((label, i) => {
        const val = values[i];
        const y = Math.max(val * scale, 0.2);
        const x = (i - (count - 1) / 2) * 1.5;
        const pt = new THREE.Vector3(x, y, 0);
        points.push(pt);

        const hue = (i * (360 / Math.max(count, 1))) % 360;
        const color = new THREE.Color(`hsl(${hue}, 80%, 50%)`);
        const nodeGeo = new THREE.SphereGeometry(0.35, 20, 20);
        const nodeMat = new THREE.MeshStandardMaterial({
            color, metalness: 0.3, roughness: 0.3,
            emissive: color.clone().multiplyScalar(0.2)
        });
        const nodeMesh = new THREE.Mesh(nodeGeo, nodeMat);
        nodeMesh.position.copy(pt);
        nodeMesh.castShadow = true;
        nodeMesh.userData = { name: label, value: val, index: i, baseColor: color.clone(), baseY: y };

        scene.add(nodeMesh);
        dataObjects.push(nodeMesh);

        const stemGeo = new THREE.CylinderGeometry(0.04, 0.04, y, 8);
        const stemMat = new THREE.MeshBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.6 });
        const stem = new THREE.Mesh(stemGeo, stemMat);
        stem.position.set(x, y / 2, 0);
        scene.add(stem);
        extraVisuals.push(stem);

        addDomLabel(label, x, -0.3, 0);
    });

    if (points.length >= 2) {
        const curve = new THREE.CatmullRomCurve3(points);
        const tubeGeo = new THREE.TubeGeometry(curve, Math.max(count * 6, 40), 0.12, 12, false);
        const tubeMat = new THREE.MeshStandardMaterial({
            color: 0x4f46e5, metalness: 0.4, roughness: 0.2,
            emissive: 0x4338ca, emissiveIntensity: 0.3
        });
        const tube = new THREE.Mesh(tubeGeo, tubeMat);
        tube.castShadow = true;
        scene.add(tube);
        extraVisuals.push(tube);
    }

    const spread = count * 1.5;
    animateCamera([0, spread * 0.4 + 4, spread * 0.7 + 7], [0, 2, 0]);
}

function render3DScatter(labels, values) {
    const maxVal = Math.max(...values, 1);
    const count = labels.length;
    const yIdx = parseInt(yAxisSelect.value);
    const otherNumCols = (analysisResult?.numericCols || []).filter(c => c !== yIdx);
    const zIdx = otherNumCols.length > 0 ? otherNumCols[0] : null;

    let zValues = [];
    if (zIdx !== null && parsedData) {
        zValues = parsedData.rows.map(r => parseFloat(r[zIdx]) || 0);
    }
    const maxZ = zValues.length ? Math.max(...zValues, 1) : 1;

    labels.forEach((label, i) => {
        const val = values[i];
        const y = (val / maxVal) * 7 + 0.5;
        const x = (i - (count - 1) / 2) * 1.2;
        const z = zValues.length ? ((zValues[i] / maxZ) * 8 - 4) : Math.sin(i * 0.8) * 3;

        const sphereRadius = Math.max((val / maxVal) * 0.45 + 0.2, 0.2);
        const hue = (i * (360 / Math.max(count, 1))) % 360;
        const color = new THREE.Color(`hsl(${hue}, 80%, 50%)`);

        const geometry = new THREE.SphereGeometry(sphereRadius, 24, 24);
        const material = new THREE.MeshStandardMaterial({
            color, metalness: 0.3, roughness: 0.3,
            emissive: color.clone().multiplyScalar(0.15)
        });

        const mesh = new THREE.Mesh(geometry, material);
        mesh.position.set(x, y, z);
        mesh.castShadow = true;
        mesh.userData = { name: label, value: val, index: i, baseColor: color.clone(), baseY: y };

        scene.add(mesh);
        dataObjects.push(mesh);

        const lineGeo = new THREE.BufferGeometry().setFromPoints([
            new THREE.Vector3(x, 0, z),
            new THREE.Vector3(x, y, z)
        ]);
        const lineMat = new THREE.LineDashedMaterial({ color: 0x94a3b8, dashSize: 0.3, gapSize: 0.2 });
        const line = new THREE.Line(lineGeo, lineMat);
        line.computeLineDistances();
        scene.add(line);
        extraVisuals.push(line);

        addDomLabel(label, x, -0.3, z);
    });

    animateCamera([0, 9, 16], [0, 2, 0]);
}

function render3DSurface(labels, values) {
    const maxVal = Math.max(...values, 1);
    const count = labels.length;
    const cols = Math.ceil(Math.sqrt(count));
    const rows = Math.ceil(count / cols);

    const width = 12;
    const depth = 12;
    const planeGeo = new THREE.PlaneGeometry(width, depth, cols - 1, rows - 1);
    const pos = planeGeo.attributes.position;

    for (let i = 0; i < pos.count; i++) {
        const val = values[i % count] || 0;
        pos.setZ(i, (val / maxVal) * 6);
    }
    planeGeo.computeVertexNormals();

    const surfaceColor = getThemeColor(0, count);
    const planeMat = new THREE.MeshStandardMaterial({
        color: surfaceColor, metalness: 0.2, roughness: 0.4, side: THREE.DoubleSide
    });

    const surfaceMesh = new THREE.Mesh(planeGeo, planeMat);
    surfaceMesh.rotation.x = -Math.PI / 2;
    surfaceMesh.position.set(0, 0, 0);
    surfaceMesh.receiveShadow = false;
    surfaceMesh.castShadow = true;
    scene.add(surfaceMesh);
    extraVisuals.push(surfaceMesh);

    labels.forEach((label, i) => {
        const val = values[i];
        const c = i % cols;
        const r = Math.floor(i / cols);
        const x = (c / Math.max(cols - 1, 1) - 0.5) * width;
        const z = (r / Math.max(rows - 1, 1) - 0.5) * depth;
        const y = (val / maxVal) * 6 + 0.2;

        const pinGeo = new THREE.CylinderGeometry(0.08, 0.08, y, 8);
        const hue = (i * (360 / Math.max(count, 1))) % 360;
        const color = new THREE.Color(`hsl(${hue}, 80%, 55%)`);
        const pinMat = new THREE.MeshStandardMaterial({ color, emissive: color.clone().multiplyScalar(0.2) });
        const pinMesh = new THREE.Mesh(pinGeo, pinMat);
        pinMesh.position.set(x, y / 2, z);
        pinMesh.userData = { name: label, value: val, index: i, baseColor: color.clone(), baseY: y };

        scene.add(pinMesh);
        dataObjects.push(pinMesh);
        addDomLabel(label, x, -0.3, z);
    });

    animateCamera([10, 10, 15], [0, 2, 0]);
}

function addDomLabel(text, x, y, z) {
    const labelEl = document.createElement('div');
    labelEl.className = 'label-3d';
    labelEl.textContent = text;
    labelEl.style.display = showLabels ? '' : 'none';
    labelLayer.appendChild(labelEl);
    domLabels.push({ el: labelEl, worldPos: new THREE.Vector3(x, y, z) });
}

// ════════════════════════════════════════════════════════════
// 13. 3D ↔ 2D 좌표 투영 동기화 (Vector3.project)
// ════════════════════════════════════════════════════════════
const tempVec = new THREE.Vector3();

/**
 * 3D 월드 공간 좌표(Vector3)를 현재 카메라 시점에 맞춰 2D 화면 DOM 좌표(px)로 실시간 변환
 * - 카메라가 회전하거나 줌인/아웃되어도 텍스트 라벨이 3D 오브젝트 위치를 오차 없이 추적
 */
function syncLabelsToScreen() {
    const hw = window.innerWidth / 2;
    const hh = window.innerHeight / 2;

    domLabels.forEach(({ el, worldPos }) => {
        tempVec.copy(worldPos).project(camera);
        // 카메라 뒤편에 위치한 경우 투명 처리
        if (tempVec.z > 1) { el.style.opacity = '0'; return; }
        el.style.left = (tempVec.x * hw + hw) + 'px';
        el.style.top = (-tempVec.y * hh + hh) + 'px';
        el.style.opacity = '1';
    });
}

/**
 * 마우스 포인터 위치에 3D 메쉬 데이터 툴팁 표출
 */
function showTooltipAt(obj, screenX, screenY) {
    const ud = obj.userData;
    tooltipName.textContent = ud.name;
    tooltipValue.textContent = typeof ud.value === 'number' ? ud.value.toLocaleString() : ud.value;
    hoverTooltip.style.display = '';
    hoverTooltip.style.left = (screenX + 18) + 'px';
    hoverTooltip.style.top = (screenY - 10) + 'px';
}
function hideTooltip() { hoverTooltip.style.display = 'none'; }

// ════════════════════════════════════════════════════════════
// 14. 3D 레이캐스팅 광선 추적 (Hover 발광 & Click 카메라 포커싱)
// ════════════════════════════════════════════════════════════
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();

/**
 * 마우스/터치 포인터 이동 시 3D 공간으로 광선을 투사(Raycasting)하여 호버 개체 감지
 * - 호버된 메쉬: 1.08배 스케일업 확대 및 발광(Emissive) 효과
 */
function onPointerMove(event) {
    if (!dataObjects.length) return;
    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(dataObjects);

    if (hoveredObject && hoveredObject !== selectedObject) {
        resetObjectAppearance(hoveredObject);
    }

    if (hits.length > 0) {
        const obj = hits[0].object;
        hoveredObject = obj;
        if (obj !== selectedObject) {
            obj.material.emissive.copy(obj.userData.baseColor).multiplyScalar(0.3);
        }
        container.style.cursor = 'pointer';
        showTooltipAt(obj, event.clientX, event.clientY);
    } else {
        hoveredObject = null;
        container.style.cursor = 'grab';
        hideTooltip();
    }
}
renderer.domElement.addEventListener('pointermove', onPointerMove);

function onPointerClick(event) {
    if (!dataObjects.length) return;
    if (event.target.closest('#dashboard-panel') || event.target.closest('#chart-panel') || event.target.closest('#top-bar')) return;

    const rect = renderer.domElement.getBoundingClientRect();
    mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const hits = raycaster.intersectObjects(dataObjects);

    if (hits.length > 0) {
        selectObject(hits[0].object, hits[0].object.userData.index);
    } else {
        deselectAll();
    }
}
window.addEventListener('click', onPointerClick);

function selectObject(obj, idx) {
    deselectAll();
    selectedObject = obj;
    obj.material.emissive.set(0x4f46e5);
    obj.material.emissiveIntensity = 0.6;

    showDetailCard(obj.userData, idx);
    highlightTableRow(idx);

    const pos = obj.position;
    animateCamera(
        [pos.x + 3, pos.y + 5, pos.z + 6],
        [pos.x, pos.y, pos.z]
    );
}

function deselectAll() {
    dataObjects.forEach(resetObjectAppearance);
    selectedObject = null;
    detailSection.style.display = 'none';
    document.querySelectorAll('#data-table tr.selected').forEach(tr => tr.classList.remove('selected'));
}

function resetObjectAppearance(obj) {
    if (!obj.userData.baseColor) return;
    obj.material.emissive.copy(obj.userData.baseColor).multiplyScalar(0.05);
    obj.material.emissiveIntensity = 1;
}

function highlightTableRow(idx) {
    document.querySelectorAll('#data-table tbody tr').forEach((tr, i) => {
        tr.classList.toggle('selected', i === idx);
    });
    const row = document.querySelector(`#data-table tbody tr[data-idx="${idx}"]`);
    if (row) row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
}

// ════════════════════════════════════════════════════════════
// 14. 상세 카드 & 미니 차트 (라이트 테마)
// ════════════════════════════════════════════════════════════
function showDetailCard(ud, idx) {
    detailSection.style.display = '';
    openAccordionSection('detail-card-section');
    if (menuPanel) menuPanel.classList.add('open');
    detailName.textContent = `📌 ${ud.name}`;

    if (!parsedData) return;
    const row = parsedData.rows[idx];
    let html = `<div class="stat-highlight">${typeof ud.value === 'number' ? ud.value.toLocaleString() : ud.value}</div>`;
    parsedData.headers.forEach((h, ci) => {
        html += statRow(h, row[ci]);
    });

    if (analysisResult && analysisResult.numericCols.length > 0) {
        const yIdx = parseInt(yAxisSelect.value);
        const allVals = parsedData.rows.map(r => parseFloat(r[yIdx]) || 0);
        const sorted = [...allVals].sort((a, b) => b - a);
        const rank = sorted.indexOf(parseFloat(row[yIdx]) || 0) + 1;
        html += statRow('순위', `${rank} / ${allVals.length}`);
        const pct = ((parseFloat(row[yIdx]) || 0) / Math.max(...allVals, 1) * 100).toFixed(1);
        html += statRow('최대값 대비', `${pct}%`);
    }
    detailStats.innerHTML = html;
    renderMiniChart(idx);
}

function renderMiniChart(highlightIdx) {
    if (miniChart) { miniChart.destroy(); miniChart = null; }
    if (!parsedData) return;

    const yIdx = parseInt(yAxisSelect.value);
    const xIdx = parseInt(xAxisSelect.value);
    const labels = parsedData.rows.map(r => r[xIdx]);
    const values = parsedData.rows.map(r => parseFloat(r[yIdx]) || 0);

    const bgColors = values.map((_, i) =>
        i === highlightIdx ? 'rgba(79, 70, 229, 0.9)' : 'rgba(79, 70, 229, 0.2)'
    );

    const ctx = $('detail-mini-chart').getContext('2d');
    miniChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels, datasets: [{ data: values, backgroundColor: bgColors, borderRadius: 3, borderSkipped: false }]
        },
        options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { enabled: true } },
            scales: {
                x: { display: false },
                y: { display: false, beginAtZero: true }
            }
        }
    });
}

// ════════════════════════════════════════════════════════════
// 15. Chart.js 2D 차트 (라이트 테마 최적화)
// ════════════════════════════════════════════════════════════
const COLORS = [
    'rgba(79, 70, 229, 0.85)', 'rgba(236, 72, 153, 0.85)', 'rgba(16, 185, 129, 0.85)',
    'rgba(245, 158, 11, 0.85)', 'rgba(124, 58, 237, 0.85)', 'rgba(14, 165, 233, 0.85)',
    'rgba(239, 68, 68, 0.85)', 'rgba(34, 197, 94, 0.85)', 'rgba(168, 85, 247, 0.85)'
];
const BORDERS = COLORS.map(c => c.replace('0.85)', '1)'));

if (window.Chart) {
    Chart.defaults.font.family = "'Pretendard', -apple-system, BlinkMacSystemFont, 'Malgun Gothic', '맑은 고딕', 'Segoe UI', Roboto, Helvetica, Arial, sans-serif";
}

function updateFilterSummary(displayed, total) {
    if (!filterSummaryBadge) return;
    const pct = total > 0 ? Math.round((displayed / total) * 100) : 100;
    filterSummaryBadge.innerHTML = `📊 표시: <strong>${displayed.toLocaleString()}</strong>개 / 전체 ${total.toLocaleString()}개 (${pct}%)`;
}

function getFilteredRows() {
    if (!parsedData) return [];
    let rows = [...parsedData.rows];
    const xIdx = parseInt(xAxisSelect.value);
    const yIdx = parseInt(yAxisSelect.value);

    // 1. 키워드 검색 필터
    const kw = filterKeyword ? filterKeyword.value.trim().toLowerCase() : '';
    if (kw) {
        rows = rows.filter(r => {
            const labelText = String(r[xIdx] || '').toLowerCase();
            return labelText.includes(kw);
        });
    }

    // 2. 카테고리 필터
    const fv = dataFilter.value;
    if (fv !== 'all') rows = rows.filter(r => r[xIdx] === fv);

    // 3. 수치 범위 필터
    const rMin = rangeMin.value !== '' ? parseFloat(rangeMin.value) : -Infinity;
    const rMax = rangeMax.value !== '' ? parseFloat(rangeMax.value) : Infinity;
    if (rMin !== -Infinity || rMax !== Infinity) {
        rows = rows.filter(r => {
            const v = parseFloat(r[yIdx]);
            return !isNaN(v) && v >= rMin && v <= rMax;
        });
    }

    // 4. 정렬
    const sort = sortSelect.value;
    if (sort === 'asc') rows.sort((a, b) => (parseFloat(a[yIdx]) || 0) - (parseFloat(b[yIdx]) || 0));
    else if (sort === 'desc') rows.sort((a, b) => (parseFloat(b[yIdx]) || 0) - (parseFloat(a[yIdx]) || 0));

    // 5. 표시 데이터 개수 제한 (Top N / 대용량 데이터 필터)
    const limitVal = limitSelect ? limitSelect.value : 'all';
    if (limitVal !== 'all') {
        const lim = parseInt(limitVal);
        if (!isNaN(lim) && lim > 0) {
            rows = rows.slice(0, lim);
        }
    }

    // 6. 필터 상태 요약 배지 업데이트
    updateFilterSummary(rows.length, parsedData.rows.length);

    return rows;
}

function render2DChart() {
    if (!parsedData || !analysisResult) return;
    const xIdx = parseInt(xAxisSelect.value);
    const yIdx = parseInt(yAxisSelect.value);
    const rows = getFilteredRows();

    const labels = rows.map(r => r[xIdx]);
    const values = rows.map(r => parseFloat(r[yIdx]) || 0);

    // 현재 변경된 데이터 옵션(X축, Y축, 행 개수, 데이터 타입) 기반 동적 추천 산출
    const dynamicRecs = getDynamicRecommendations(labels, values, analysisResult);

    let chartType = chartTypeSelect.value;
    if (chartType === 'auto') {
        // 선택된 데이터의 최적 2D 차트 추천 자동 선택
        const valid2DTypes = ['bar', 'horizontalBar', 'line', 'pie', 'doughnut', 'scatter', 'radar', 'polarArea'];
        const matchedRec = dynamicRecs.find(r => {
            const mapped = r.type === 'donut' ? 'doughnut' : r.type;
            return valid2DTypes.includes(mapped);
        });
        chartType = matchedRec ? (matchedRec.type === 'donut' ? 'doughnut' : matchedRec.type) : 'bar';
    }

    if (chart2d) { chart2d.destroy(); chart2d = null; }
    chartPanel.style.display = '';

    const canvas = $('chart-2d');
    const ctx = canvas.getContext('2d');
    const typeLabels = { bar:'막대', horizontalBar:'가로 막대', line:'선', pie:'파이', doughnut:'도넛', scatter:'산점도', radar:'레이더', polarArea:'폴라 에어리어' };
    chartTitle.textContent = `${typeLabels[chartType] || chartType} — ${parsedData.headers[yIdx]}`;

    const themePalette = values.map((_, i) => '#' + getThemeColor(i, values.length).getHexString());
    const primaryThemeColor = themePalette[0] || '#4f46e5';

    if (chartType === 'scatter' && analysisResult.numericCols.length >= 2) {
        const xN = analysisResult.numericCols[0], yN = analysisResult.numericCols[1];
        chart2d = new Chart(ctx, {
            type: 'scatter',
            data: { datasets: [{ label: `${parsedData.headers[xN]} vs ${parsedData.headers[yN]}`, data: rows.map(r => ({ x: parseFloat(r[xN]) || 0, y: parseFloat(r[yN]) || 0 })), backgroundColor: primaryThemeColor, pointRadius: 6, pointHoverRadius: 10 }] },
            options: chartOptions(chartType, parsedData.headers[xN], parsedData.headers[yN])
        });
    } else {
        const actualType = chartType === 'horizontalBar' ? 'bar' : chartType;
        const isPie = ['pie', 'doughnut', 'polarArea'].includes(chartType);
        const ds = {
            label: parsedData.headers[yIdx], data: values,
            backgroundColor: isPie ? themePalette : primaryThemeColor,
            borderColor: isPie ? themePalette : primaryThemeColor,
            borderWidth: 2, fill: chartType === 'line' ? 'origin' : undefined,
            tension: chartType === 'line' ? 0.4 : undefined,
            pointRadius: chartType === 'line' ? 4 : undefined,
            borderRadius: chartType === 'bar' || chartType === 'horizontalBar' ? 4 : undefined,
        };
        const cfg = { type: actualType, data: { labels, datasets: [ds] }, options: chartOptions(chartType, parsedData.headers[xIdx], parsedData.headers[yIdx]) };
        if (chartType === 'horizontalBar') cfg.options.indexAxis = 'y';
        chart2d = new Chart(ctx, cfg);
    }

    render3DVisualization(labels, values);
    renderDataTable(parsedData);
    updateDynamicRecommendations(labels, values, analysisResult);
}

function chartOptions(type, xLabel, yLabel) {
    const isPie = ['pie', 'doughnut', 'polarArea'].includes(type);
    return {
        responsive: true, maintainAspectRatio: false,
        animation: { duration: 600, easing: 'easeOutQuart' },
        plugins: {
            legend: { display: isPie, position: 'right', labels: { color: '#334155', font: { size: 10 }, padding: 6 } },
            tooltip: { backgroundColor: 'rgba(255, 255, 255, 0.95)', titleColor: '#4338ca', bodyColor: '#1e293b', borderColor: '#cbd5e1', borderWidth: 1, padding: 10, cornerRadius: 8 }
        },
        scales: isPie ? {} : {
            x: { title: { display: true, text: xLabel, color: '#64748b', font: { size: 11 } }, ticks: { color: '#64748b', maxRotation: 45, font: { size: 9 } }, grid: { color: '#f1f5f9' } },
            y: { title: { display: true, text: yLabel, color: '#64748b', font: { size: 11 } }, ticks: { color: '#64748b', font: { size: 9 } }, grid: { color: '#f1f5f9' }, beginAtZero: true }
        }
    };
}

function applyVisualization() {
    render2DChart();
    if (analysisResult) {
        renderAIInsights(analysisResult);
        updateTimePlayerUI();
    }
}

// ════════════════════════════════════════════════════════════
// 17. 이벤트 리스너 & 파일 로더 (CSV 및 엑셀 .xlsx, .xls 완벽 지원)
// ════════════════════════════════════════════════════════════
/**
 * 로컬 파일(CSV 또는 엑셀 .xlsx, .xls)을 ArrayBuffer로 읽어들여 파싱 및 시각화 파이프라인 구동
 * - SheetJS(XLSX) 라이브러리를 통한 첫 번째 시트 자동 변환
 * - CSV의 경우 decodeCSVBuffer(EUC-KR/UTF-8 자동 감지)를 통한 무변환 디코딩
 * @param {File} file - 업로드된 File 객체
 */
function loadAndParseCSVFile(file) {
    if (!file) return;
    currentUploadedFile = file;
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    fileNameDisplay.textContent = `📄 ${file.name} (${isExcel ? '엑셀 / Excel' : 'CSV'} - ${(file.size / 1024).toFixed(1)} KB)`;
    statusIndicator.textContent = '● 로딩 중... / Loading...';
    statusIndicator.className = 'status loading';

    const encodingMode = csvEncodingSelect ? csvEncodingSelect.value : 'auto';
    const reader = new FileReader();
    reader.onload = evt => {
        try {
            const buffer = evt.target.result;
            let text = '';
            let sheetInfo = '';

            // 1. 엑셀 파일인 경우 SheetJS를 사용하여 CSV 문자열로 메모리상 즉시 변환
            if (isExcel && window.XLSX) {
                const workbook = window.XLSX.read(buffer, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                text = window.XLSX.utils.sheet_to_csv(worksheet);
                sheetInfo = ` [시트: ${sheetName}]`;
                showToast(`📊 엑셀 파일 로드 완료: <strong>${file.name}</strong> (${sheetName} 시트)`);
            } else {
                // 2. CSV 파일인 경우 한글 인코딩 자동 감지 디코더 사용
                text = decodeCSVBuffer(buffer, encodingMode);
            }

            parsedData = parseCSV(text);
            if (!parsedData) {
                statusIndicator.textContent = '● 파싱 실패 / Parsing Failed';
                statusIndicator.className = 'status offline';
                return;
            }
            fileNameDisplay.textContent = `📄 ${file.name}${sheetInfo} (${isExcel ? '엑셀 / Excel' : 'CSV'} - ${(file.size / 1024).toFixed(1)} KB)`;
            processData(`📄 ${file.name}${sheetInfo}`);
        } catch (err) {
            console.error('파일 읽기/파싱 에러:', err);
            statusIndicator.textContent = '● 파일 읽기 에러 / Read Error';
            statusIndicator.className = 'status offline';
        }
    };
    reader.onerror = () => {
        statusIndicator.textContent = '● 파일 읽기 실패 / File Read Error';
        statusIndicator.className = 'status offline';
    };
    reader.readAsArrayBuffer(file);
}

csvUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    loadAndParseCSVFile(file);
});

if (csvEncodingSelect) {
    csvEncodingSelect.addEventListener('change', () => {
        if (currentUploadedFile) {
            loadAndParseCSVFile(currentUploadedFile);
        }
    });
}

function processData(sourceName) {
    analysisResult = analyzeData(parsedData);
    displayAnalysis(analysisResult);
    updateAxisSelectors(analysisResult);
    renderDataTable(parsedData);
    initTimePlayer();
    applyVisualization();

    statusIndicator.textContent = `● ${sourceName}`;
    statusIndicator.className = 'status online';

    // 데이터 로드 완료 시 업로드 카드를 슬림하게 접어 좌측 2D 차트 및 3D 뷰포트 공간 확보
    if (uploadPanel) {
        uploadPanel.classList.add('collapsed');
        document.body.classList.add('upload-collapsed');
    }

    // 메뉴 패널 열고 시각화 설정 아코디언 열기
    if (menuPanel) menuPanel.classList.add('open');
    openAccordionSection('viz-section');
}

// 메뉴 드로어 토글
btnToggleMenu?.addEventListener('click', () => {
    if (menuPanel) menuPanel.classList.toggle('open');
});
btnCloseMenu?.addEventListener('click', () => {
    if (menuPanel) menuPanel.classList.remove('open');
});

// 자동 추천 토글 및 즉시 적용 버튼
autoRecommendToggle?.addEventListener('change', () => {
    const isAuto = autoRecommendToggle.checked;
    if (autoRecommendStatusBadge) {
        autoRecommendStatusBadge.textContent = isAuto ? 'ON (자동)' : 'OFF (수동)';
        autoRecommendStatusBadge.className = isAuto ? 'badge-auto-on' : 'badge-auto-off';
    }
    if (appliedRecommendNotice) {
        appliedRecommendNotice.textContent = isAuto
            ? '선택한 데이터에 맞춰 3D 및 2D 시각화가 최적으로 자동 적용됩니다.'
            : '수동 설정 모드입니다. 원하는 3D 형태와 2D 차트를 직접 지정하세요.';
    }
});

btnForceRecommend?.addEventListener('click', () => {
    if (!parsedData || !analysisResult) return;
    const xIdx = parseInt(xAxisSelect.value);
    const yIdx = parseInt(yAxisSelect.value);
    const rows = getFilteredRows();
    const labels = rows.map(r => r[xIdx]);
    const values = rows.map(r => parseFloat(r[yIdx]) || 0);
    const best3D = inferBest3DStyle(labels, values, analysisResult);
    if (barStyleSelect) barStyleSelect.value = best3D;
    const recs = getDynamicRecommendations(labels, values, analysisResult);
    const valid2DTypes = ['bar', 'horizontalBar', 'line', 'pie', 'doughnut', 'scatter', 'radar', 'polarArea'];
    const matched2D = recs.find(r => valid2DTypes.includes(r.type === 'donut' ? 'doughnut' : r.type));
    if (matched2D && chartTypeSelect) {
        chartTypeSelect.value = matched2D.type === 'donut' ? 'doughnut' : matched2D.type;
    }
    applyVisualization();
});

chartTypeSelect.addEventListener('change', () => { if (parsedData) applyVisualization(); });

// X축 또는 Y축 옵션을 변경할 때마다 즉시 실시간 맞춤 시각화 추천 및 화면 갱신
xAxisSelect.addEventListener('change', () => {
    if (!parsedData) return;
    updateFilter(parseInt(xAxisSelect.value));
    applyVisualization();
});
yAxisSelect.addEventListener('change', () => {
    if (!parsedData) return;
    applyVisualization();
});

applyBtn.addEventListener('click', () => {
    if (!parsedData) return;
    updateFilter(parseInt(xAxisSelect.value));
    applyVisualization();
});
dataFilter.addEventListener('change', () => { if (parsedData) applyVisualization(); });
btnApplyRange.addEventListener('click', () => { if (parsedData) applyVisualization(); });
sortSelect.addEventListener('change', () => { if (parsedData) applyVisualization(); });
filterKeyword?.addEventListener('input', () => { if (parsedData) applyVisualization(); });
limitSelect?.addEventListener('change', () => { if (parsedData) applyVisualization(); });

btnFilterTop10?.addEventListener('click', () => {
    if (limitSelect) limitSelect.value = '10';
    if (sortSelect) sortSelect.value = 'desc';
    if (parsedData) applyVisualization();
});

btnFilterAboveAvg?.addEventListener('click', () => {
    if (!analysisResult || !parsedData) return;
    const yIdx = parseInt(yAxisSelect.value);
    const colName = parsedData.headers[yIdx];
    const stats = analysisResult.numericStats[colName];
    if (stats && stats.mean !== undefined) {
        rangeMin.value = Math.round(stats.mean);
        rangeMax.value = '';
        applyVisualization();
    }
});

btnFilterTop20pct?.addEventListener('click', () => {
    if (!parsedData) return;
    const yIdx = parseInt(yAxisSelect.value);
    const vals = parsedData.rows.map(r => parseFloat(r[yIdx]) || 0).filter(v => !isNaN(v)).sort((a, b) => a - b);
    if (vals.length) {
        const p80 = vals[Math.floor(vals.length * 0.8)];
        rangeMin.value = Math.round(p80);
        rangeMax.value = '';
        applyVisualization();
    }
});

btnFilterAll?.addEventListener('click', () => {
    if (filterKeyword) filterKeyword.value = '';
    if (dataFilter) dataFilter.value = 'all';
    if (rangeMin) rangeMin.value = '';
    if (rangeMax) rangeMax.value = '';
    if (limitSelect) limitSelect.value = (parsedData && parsedData.rows.length > 30) ? '30' : 'all';
    if (sortSelect) sortSelect.value = 'none';
    if (parsedData) applyVisualization();
});

chartCloseBtn.addEventListener('click', () => { chartPanel.style.display = 'none'; });
chartMaxBtn.addEventListener('click', () => { chartPanel.classList.toggle('maximized'); if (chart2d) chart2d.resize(); });

// ════════════════════════════════════════════════════════════
// 18. 차세대 렌더 루프 (requestAnimationFrame) 및 실시간 FPS 성능 측정 엔진
// ════════════════════════════════════════════════════════════
const clock = new THREE.Clock();
let frameCount = 0;
let totalRenderFrames = 0;
let lastFpsTime = performance.now();

/**
 * 매 프레임마다 실행되는 Three.js 메인 렌더 루프
 * - 마우스 호버 스케일업 애니메이션 부드러운 보간 (Lerp)
 * - OrbitControls 카메라 감쇠 업데이트
 * - 3D ↔ 2D 라벨 투영 좌표 동기화 (syncLabelsToScreen)
 * - 실시간 FPS 프레임레이트 및 Frame Time(ms) 실측
 */
function animate() {
    requestAnimationFrame(animate);

    const dt = clock.getDelta();

    // 호버된 개체의 부드러운 스케일업 애니메이션 (Lerp 보간)
    dataObjects.forEach(obj => {
        const isHovered = (obj === hoveredObject || obj === selectedObject);
        const targetScale = isHovered ? 1.08 : 1.0;
        obj.scale.x += (targetScale - obj.scale.x) * 5 * dt;
        obj.scale.y += (targetScale - obj.scale.y) * 5 * dt;
        obj.scale.z += (targetScale - obj.scale.z) * 5 * dt;
    });

    updateCameraAnim();
    controls.update();
    syncLabelsToScreen();
    renderer.render(scene, camera);

    // 실시간 실제 측정 FPS 및 프레임 지연시간(ms) 연산 (250ms 간격으로 민첩하고 정확하게 갱신)
    frameCount++;
    totalRenderFrames++;
    const now = performance.now();
    const elapsed = now - lastFpsTime;
    if (elapsed >= 250) {
        // 실제 측정된 실측 초당 프레임 수
        const measuredFps = Math.round((frameCount * 1000) / elapsed);
        const frameTime = (elapsed / frameCount).toFixed(1);

        gpuEngineState.fps = measuredFps;
        gpuEngineState.frameTimeMs = frameTime;

        if (measuredFps > 0) {
            if (measuredFps < gpuEngineState.minFps) gpuEngineState.minFps = measuredFps;
            if (measuredFps > gpuEngineState.maxFps) gpuEngineState.maxFps = measuredFps;
            gpuEngineState.fpsHistory.push(measuredFps);
            if (gpuEngineState.fpsHistory.length > 30) gpuEngineState.fpsHistory.shift();

            const historySum = gpuEngineState.fpsHistory.reduce((a, b) => a + b, 0);
            gpuEngineState.avgFps = Math.round(historySum / gpuEngineState.fpsHistory.length);
        }

        frameCount = 0;
        lastFpsTime = now;

        // 상단 바 뱃지에 실시간 실측 FPS 즉시 반영
        if (gpuBadgeFps) {
            gpuBadgeFps.textContent = `${gpuEngineState.fps} FPS`;
        }

        // 모달창이 열려 있으면 실시간 FPS 지표 및 실시간 그래프 즉시 갱신
        if (gpuInfoModal && gpuInfoModal.style.display !== 'none') {
            updateGpuModalLivePerformance();
        }
    }
}

// 윈도우 창 크기 변경 시 카메라 비율 및 렌더러 해상도 자동 동기화
window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
});

// 모바일 터치 디바이스 레이캐스팅 터치 지원
renderer.domElement.addEventListener('touchstart', e => {
    const t = e.touches[0];
    onPointerMove({ clientX: t.clientX, clientY: t.clientY });
}, { passive: true });

// 렌더링 엔진 루프 최초 시작
animate();


