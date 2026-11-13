/**
 * ==============================================================================
 * [renderer3d.js] Three.js WebGPU / Vulkan 차세대 3D 시각화 엔진 & 10종 지오메트리
 * ==============================================================================
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import WebGPURenderer from 'three/addons/renderers/webgpu/WebGPURenderer.js';
import { $, appState, showToast } from './state.js';
import { inferBest3DStyle } from './analytics.js';
import { showDetailCard } from './chart2d.js';

let extraVisuals = [];
let selectedObject = null;
let hoveredObject = null;
let originalColor = null;
let cameraAnim = null;
let pointLight = null;

const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const tempVec = new THREE.Vector3();
const clock = new THREE.Clock();

let lastFpsUpdateTime = performance.now();
let frameCount = 0;

/**
 * 3D 씬 및 WebGPURenderer 초기화
 */
export async function initThreeScene() {
    const container = $('canvas-container');
    if (!container) return;

    appState.scene = new THREE.Scene();
    appState.scene.background = new THREE.Color(0xf1f5f9);
    appState.scene.fog = new THREE.FogExp2(0xf1f5f9, 0.015);

    appState.camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 500);
    appState.camera.position.set(0, 10, 20);

    appState.renderer = new WebGPURenderer({ antialias: true, alpha: false, forceWebGL: false });
    await appState.renderer.init();

    // 실제 어댑터 정보 조회
    if ('gpu' in navigator) {
        try {
            const adapter = await navigator.gpu.requestAdapter();
            if (adapter) {
                const info = await adapter.requestAdapterInfo?.();
                if (info) {
                    if (info.device) appState.gpuEngineState.gpuName = info.device;
                    if (info.description) appState.gpuEngineState.gpuName = info.description;
                    if (info.vendor) appState.gpuEngineState.vendor = info.vendor;
                    if (info.architecture) appState.gpuEngineState.architecture = info.architecture;
                }
                appState.gpuEngineState.featuresCount = adapter.features?.size || 0;
                appState.gpuEngineState.isWebGPU = true;
                appState.gpuEngineState.backendName = 'WebGPU (Vulkan / Direct3D 12 Low-level)';
                const badge = $('gpu-engine-text');
                if (badge) badge.textContent = '⚡ Vulkan / WebGPU';
            }
        } catch (e) {
            console.warn('WebGPU 어댑터 정보 조회 실패:', e);
        }
    }

    // WebGL fallback으로 실제 GPU 렌더러/벤더 보강 (WebGPU adapter info가 빈 문자열일 때)
    try {
        const glCanvas = document.createElement('canvas');
        const gl = glCanvas.getContext('webgl') || glCanvas.getContext('experimental-webgl');
        if (gl) {
            const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
            if (debugInfo) {
                const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
                const vendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
                if (renderer && (!appState.gpuEngineState.gpuName || appState.gpuEngineState.gpuName === '하드웨어 감지 중...')) {
                    appState.gpuEngineState.gpuName = renderer;
                }
                if (vendor && (!appState.gpuEngineState.vendor || appState.gpuEngineState.vendor === '감지 중...')) {
                    appState.gpuEngineState.vendor = vendor;
                }
            }
        }
    } catch (e) { /* ignore */ }

    // 아키텍처 자동 판별
    if (!appState.gpuEngineState.architecture || appState.gpuEngineState.architecture === '감지 중...') {
        appState.gpuEngineState.architecture = appState.gpuEngineState.isWebGPU ? 'WGSL Low-level Pipeline' : 'GLSL Standard Pipeline';
    }

    // 감지 완료 후 GPU 모달 요소 즉시 갱신
    const _mp = $('modal-system-platform');
    const _mc = $('modal-system-cpu');
    const _ma = $('modal-gpu-api');
    const _md = $('modal-gpu-device');
    const _mv = $('modal-gpu-vendor');
    const _mar = $('modal-gpu-architecture');
    const _mf = $('modal-gpu-features');
    if (_mp) _mp.textContent = navigator.platform || 'Unknown';
    if (_mc) _mc.textContent = `${navigator.hardwareConcurrency || '?'}코어`;
    if (_ma) _ma.textContent = appState.gpuEngineState.backendName;
    if (_md) _md.textContent = appState.gpuEngineState.gpuName;
    if (_mv) _mv.textContent = appState.gpuEngineState.vendor;
    if (_mar) _mar.textContent = appState.gpuEngineState.architecture;
    if (_mf) _mf.textContent = appState.gpuEngineState.featuresCount > 0
        ? `${appState.gpuEngineState.featuresCount}개 하드웨어 기능 활성화됨`
        : '감지 불가';

    appState.renderer.setSize(window.innerWidth, window.innerHeight);
    appState.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    appState.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    appState.renderer.toneMappingExposure = 1.1;
    container.appendChild(appState.renderer.domElement);

    // OrbitControls
    appState.controls = new OrbitControls(appState.camera, appState.renderer.domElement);
    appState.controls.enableDamping = true;
    appState.controls.dampingFactor = 0.08;
    appState.controls.maxPolarAngle = Math.PI / 2 - 0.02;
    appState.controls.minDistance = 3;
    appState.controls.maxDistance = 120;
    appState.controls.target.set(0, 2, 0);

    // 조명
    appState.ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    appState.scene.add(appState.ambientLight);

    appState.dirLight = new THREE.DirectionalLight(0xffffff, 0.9);
    appState.dirLight.position.set(15, 25, 15);
    appState.scene.add(appState.dirLight);

    pointLight = new THREE.PointLight(0x818cf8, 0.5, 50);
    pointLight.position.set(0, 10, 0);
    appState.scene.add(pointLight);

    // 그리드
    appState.gridHelper = new THREE.GridHelper(30, 30, 0x94a3b8, 0xe2e8f0);
    appState.gridHelper.position.y = 0;
    appState.scene.add(appState.gridHelper);

    // 태블릿/모니터 화면 크기 자동 맞춤 엔진 리스너 등록
    window.addEventListener('resize', handleAdaptiveResize);
    window.addEventListener('orientationchange', () => {
        setTimeout(handleAdaptiveResize, 200);
    });

    // 레이캐스팅 이벤트
    setupRaycasting();

    // 초기 화면 크기 자동 최적화
    handleAdaptiveResize();

    // 렌더 루프 가동
    animateLoop();

    // 전역 바인딩(상세 선택 시 호출용)
    window.__selectObject = selectObject;
}

/**
 * 태블릿 / 모니터 화면 크기 지능형 자동 적응 엔진 (Auto-Adaptive Engine)
 */
export function handleAdaptiveResize() {
    if (!appState.camera || !appState.renderer) return;

    const width = window.innerWidth;
    const height = window.innerHeight;
    const aspect = width / Math.max(height, 1);

    // 1. 카메라 종횡비 및 기기별 최적 FOV(화각) 동적 보정
    appState.camera.aspect = aspect;
    if (aspect < 1.0) {
        // 태블릿/모바일 세로 모드 (화면 폭이 좁으므로 시야각을 넓혀 잘림 방지)
        appState.camera.fov = 58;
    } else if (aspect < 1.4) {
        // 태블릿 가로 / 컴팩트 모니터
        appState.camera.fov = 52;
    } else {
        // 와이드 모니터 / 대형 디스플레이 (왜곡 없는 표준 원근감)
        appState.camera.fov = 48;
    }
    appState.camera.updateProjectionMatrix();

    // 2. 모니터 해상도 및 고주사율/고밀도 DPR 자동 최적화
    const maxDpr = width > 2000 ? 1.5 : (width > 1200 ? 2 : Math.min(window.devicePixelRatio || 1, 2));
    appState.renderer.setPixelRatio(maxDpr);
    appState.renderer.setSize(width, height);

    // 3. 2D Chart.js 및 미니 차트 캔버스 즉각 동기화 리사이즈
    if (appState.chart2d) {
        appState.chart2d.resize();
    }
    if (appState.miniChart) {
        appState.miniChart.resize();
    }

    // 4. 3D 월드 라벨 좌표 업데이트
    updateLabels();

    // 5. 기기 및 방향 감지 CSS 클래스 자동 부여
    updateDeviceLayoutClass(width, height, aspect);
}

function updateDeviceLayoutClass(w, h, aspect) {
    const b = document.body;
    b.classList.remove('device-mobile', 'device-tablet', 'device-desktop', 'device-ultrawide', 'screen-portrait', 'screen-landscape');

    if (aspect < 1.1) {
        b.classList.add('screen-portrait');
    } else {
        b.classList.add('screen-landscape');
    }

    if (w < 600) {
        b.classList.add('device-mobile');
    } else if (w <= 1024) {
        b.classList.add('device-tablet');
    } else if (w <= 1920) {
        b.classList.add('device-desktop');
    } else {
        b.classList.add('device-ultrawide');
    }
}

/**
 * 씬 클리어 (메모리 해제)
 */
export function clearScene() {
    appState.dataObjects.forEach(obj => {
        appState.scene.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) {
            if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
            else obj.material.dispose();
        }
    });
    appState.dataObjects = [];

    extraVisuals.forEach(obj => {
        appState.scene.remove(obj);
        if (obj.geometry) obj.geometry.dispose();
        if (obj.material) obj.material.dispose();
    });
    extraVisuals = [];

    appState.domLabels.forEach(l => l.el.remove());
    appState.domLabels = [];
    selectedObject = null;
    hoveredObject = null;
}

/**
 * 테마 컬러 산출
 */
export function getThemeColor(idx, total) {
    const theme = $('color-theme-select') ? $('color-theme-select').value : 'indigo';
    const t = total > 1 ? idx / (total - 1) : 0.5;

    if (theme === 'custom') {
        const hex = $('custom-theme-color-picker') ? $('custom-theme-color-picker').value : '#6366f1';
        const base = new THREE.Color(hex);
        const hsl = {};
        base.getHSL(hsl);
        const lAdj = (t - 0.5) * 0.35;
        const sAdj = (1 - t) * 0.2;
        return new THREE.Color().setHSL(hsl.h, Math.min(1, Math.max(0.2, hsl.s + sAdj)), Math.min(0.85, Math.max(0.25, hsl.l + lAdj)));
    }
    if (theme === 'rainbow') return new THREE.Color().setHSL(t * 0.8, 0.85, 0.55);
    if (theme === 'emerald') return new THREE.Color().lerpColors(new THREE.Color(0x34d399), new THREE.Color(0x047857), t);
    if (theme === 'sunset') return new THREE.Color().lerpColors(new THREE.Color(0xf59e0b), new THREE.Color(0xec4899), t);
    if (theme === 'ocean') return new THREE.Color().lerpColors(new THREE.Color(0x38bdf8), new THREE.Color(0x1d4ed8), t);
    if (theme === 'monochrome') {
        const v = 0.25 + t * 0.55;
        return new THREE.Color(v, v, v + 0.05);
    }
    return new THREE.Color().lerpColors(new THREE.Color(0x818cf8), new THREE.Color(0x4338ca), t);
}

/**
 * 10종 3D 지오메트리 메인 렌더러
 */
export function render3DVisualization(labels, values) {
    clearScene();
    if (!labels || !labels.length) return;

    const count = labels.length;
    let maxVal = 0.001;
    let minVal = Infinity;
    for (const value of values) {
        if (value > maxVal) maxVal = value;
        if (value < minVal) minVal = value;
    }
    const maxH = 8;
    const barStyleSelect = $('bar-style');
    const quickBarStyle = $('quick-bar-style');

    let style = appState.current3DStyle;
    if (!style || style === 'auto') {
        style = (quickBarStyle && quickBarStyle.value !== 'auto')
            ? quickBarStyle.value
            : (barStyleSelect ? barStyleSelect.value : 'auto');
    }

    if (style === 'auto' || !style) {
        style = inferBest3DStyle(labels, values, appState.analysisResult);
    }
    appState.current3DStyle = style;

    const isDonut = style === 'donut';
    const isPie = style === 'pie' || isDonut;

    if (isPie) {
        renderPieOrDonut(labels, values, maxVal, isDonut);
    } else if (style === 'scatter') {
        renderScatter(labels, values, maxVal, maxH);
    } else if (style === 'line') {
        renderTubeLine(labels, values, maxVal, maxH);
    } else if (style === 'area') {
        renderAreaSurface(labels, values, maxVal, maxH);
    } else if (style === 'surface') {
        renderSurfaceGrid(labels, values, maxVal, maxH);
    } else {
        renderColumns(labels, values, maxVal, minVal, maxH, style);
    }

    fitCameraToObjectBounds(count, style);
}

function renderColumns(labels, values, maxVal, minVal, maxH, style) {
    const count = labels.length;
    const cols = Math.min(count, Math.ceil(Math.sqrt(count * 1.6)));
    const rows = Math.ceil(count / cols);
    const spacing = Math.max(1.5, Math.min(3.0, 20 / Math.max(cols, rows)));

    labels.forEach((label, idx) => {
        const val = values[idx];
        const h = Math.max(0.15, (val / maxVal) * maxH);
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const x = (col - (cols - 1) / 2) * spacing;
        const z = (row - (rows - 1) / 2) * spacing;
        const color = getThemeColor(idx, count);

        let geo;
        if (style === 'cylinder') geo = new THREE.CylinderGeometry(0.45, 0.45, h, 24);
        else if (style === 'pyramid') geo = new THREE.ConeGeometry(0.65, h, 4);
        else geo = new THREE.BoxGeometry(0.75, h, 0.75);

        const mat = new THREE.MeshStandardMaterial({
            color,
            roughness: 0.35,
            metalness: 0.15
        });

        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, h / 2, z);
        mesh.userData = { name: label, value: val, idx, color: color.clone() };

        appState.scene.add(mesh);
        appState.dataObjects.push(mesh);
        createDomLabel(label, val, mesh, h);
    });
}

function renderPieOrDonut(labels, values, maxVal, isDonut) {
    const count = labels.length;
    const sum = values.reduce((a, b) => a + Math.max(0, b), 0) || 1;
    let currentAngle = 0;
    const outerR = 6;
    const innerR = isDonut ? 2.5 : 0;

    labels.forEach((label, idx) => {
        const val = Math.max(0, values[idx]);
        const angle = (val / sum) * Math.PI * 2;
        if (angle <= 0.005) return;

        const h = 0.8 + (val / maxVal) * 1.5;
        const shape = new THREE.Shape();

        if (isDonut) {
            shape.absarc(0, 0, outerR, currentAngle, currentAngle + angle, false);
            shape.absarc(0, 0, innerR, currentAngle + angle, currentAngle, true);
        } else {
            shape.moveTo(0, 0);
            shape.arc(0, 0, outerR, currentAngle, currentAngle + angle, false);
            shape.lineTo(0, 0);
        }

        const extrudeSettings = { depth: h, bevelEnabled: true, bevelSegments: 3, steps: 1, bevelSize: 0.08, bevelThickness: 0.08 };
        const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
        geo.rotateX(Math.PI / 2);

        const color = getThemeColor(idx, count);
        const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.35, metalness: 0.2 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(0, h, 0);
        mesh.userData = { name: label, value: val, idx, color: color.clone() };

        appState.scene.add(mesh);
        appState.dataObjects.push(mesh);

        const midAngle = currentAngle + angle / 2;
        const labelR = (outerR + innerR) / 2;
        const lx = Math.cos(midAngle) * labelR;
        const lz = -Math.sin(midAngle) * labelR;
        createDomLabel(label, val, mesh, h + 0.5, lx, lz);

        currentAngle += angle;
    });
}

function renderScatter(labels, values, maxVal, maxH) {
    const count = labels.length;
    labels.forEach((label, idx) => {
        const val = values[idx];
        const h = Math.max(0.5, (val / maxVal) * maxH);
        const angle = (idx / count) * Math.PI * 2;
        const r = 2 + (idx % 4) * 2;
        const x = Math.cos(angle) * r;
        const z = Math.sin(angle) * r;
        const color = getThemeColor(idx, count);

        const geo = new THREE.SphereGeometry(0.4, 20, 20);
        const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.2 });
        const mesh = new THREE.Mesh(geo, mat);
        mesh.position.set(x, h, z);
        mesh.userData = { name: label, value: val, idx, color: color.clone() };

        appState.scene.add(mesh);
        appState.dataObjects.push(mesh);

        // 바닥 연결 가이드 라인
        const lineGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(x, 0, z), new THREE.Vector3(x, h, z)]);
        const lineMat = new THREE.LineBasicMaterial({ color: 0x94a3b8, transparent: true, opacity: 0.5 });
        const line = new THREE.Line(lineGeo, lineMat);
        appState.scene.add(line);
        extraVisuals.push(line);

        createDomLabel(label, val, mesh, 0.6);
    });
}

function renderTubeLine(labels, values, maxVal, maxH) {
    const count = labels.length;
    const points = [];
    const spacing = 1.2;

    labels.forEach((label, idx) => {
        const val = values[idx];
        const h = Math.max(0.2, (val / maxVal) * maxH);
        const x = (idx - (count - 1) / 2) * spacing;
        points.push(new THREE.Vector3(x, h, 0));

        // 데이터 노드 스피어
        const color = getThemeColor(idx, count);
        const nodeGeo = new THREE.SphereGeometry(0.35, 16, 16);
        const nodeMat = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.2 });
        const node = new THREE.Mesh(nodeGeo, nodeMat);
        node.position.set(x, h, 0);
        node.userData = { name: label, value: val, idx, color: color.clone() };

        appState.scene.add(node);
        appState.dataObjects.push(node);
        createDomLabel(label, val, node, 0.5);
    });

    if (points.length >= 2) {
        const curve = new THREE.CatmullRomCurve3(points);
        const tubeGeo = new THREE.TubeGeometry(curve, points.length * 8, 0.15, 12, false);
        const tubeMat = new THREE.MeshStandardMaterial({ color: 0x6366f1, roughness: 0.3, metalness: 0.3 });
        const tubeMesh = new THREE.Mesh(tubeGeo, tubeMat);
        appState.scene.add(tubeMesh);
        extraVisuals.push(tubeMesh);
    }
}

function renderAreaSurface(labels, values, maxVal, maxH) {
    const count = labels.length;
    const spacing = 1.3;
    const shape = new THREE.Shape();
    const halfW = ((count - 1) * spacing) / 2;

    shape.moveTo(-halfW, 0);
    labels.forEach((label, idx) => {
        const val = values[idx];
        const h = Math.max(0.2, (val / maxVal) * maxH);
        const x = idx * spacing - halfW;
        shape.lineTo(x, h);
    });
    shape.lineTo(halfW, 0);
    shape.closePath();

    const extrudeSettings = { depth: 1.0, bevelEnabled: true, bevelSegments: 2, steps: 1, bevelSize: 0.05, bevelThickness: 0.05 };
    const geo = new THREE.ExtrudeGeometry(shape, extrudeSettings);
    const mat = new THREE.MeshStandardMaterial({
        color: 0x6366f1,
        roughness: 0.35,
        metalness: 0.25,
        side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(0, 0, -0.5);
    appState.scene.add(mesh);
    extraVisuals.push(mesh);

    labels.forEach((label, idx) => {
        const val = values[idx];
        const h = Math.max(0.2, (val / maxVal) * maxH);
        const x = idx * spacing - halfW;
        const color = getThemeColor(idx, count);
        const nodeGeo = new THREE.SphereGeometry(0.3, 16, 16);
        const nodeMat = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.2 });
        const node = new THREE.Mesh(nodeGeo, nodeMat);
        node.position.set(x, h, 0);
        node.userData = { name: label, value: val, idx, color: color.clone() };
        appState.scene.add(node);
        appState.dataObjects.push(node);
        createDomLabel(label, val, node, 0.4);
    });
}

function renderSurfaceGrid(labels, values, maxVal, maxH) {
    const count = labels.length;
    const cols = Math.min(count, Math.ceil(Math.sqrt(count * 1.5)));
    const rows = Math.ceil(count / cols);
    const spacing = 1.8;

    const planeW = Math.max(2, (cols - 1) * spacing);
    const planeH = Math.max(2, (rows - 1) * spacing);
    const geo = new THREE.PlaneGeometry(planeW, planeH, Math.max(1, cols - 1), Math.max(1, rows - 1));
    geo.rotateX(-Math.PI / 2);

    const pos = geo.attributes.position;
    for (let i = 0; i < pos.count; i++) {
        const val = values[i % count] || 0;
        const h = Math.max(0.1, (val / maxVal) * maxH);
        pos.setY(i, h);
    }
    geo.computeVertexNormals();

    const mat = new THREE.MeshStandardMaterial({
        color: 0x4f46e5,
        roughness: 0.35,
        metalness: 0.25,
        side: THREE.DoubleSide
    });
    const mesh = new THREE.Mesh(geo, mat);
    appState.scene.add(mesh);
    extraVisuals.push(mesh);

    const wireMat = new THREE.MeshBasicMaterial({ color: 0x818cf8, wireframe: true, transparent: true, opacity: 0.4 });
    const wireMesh = new THREE.Mesh(geo, wireMat);
    appState.scene.add(wireMesh);
    extraVisuals.push(wireMesh);

    labels.forEach((label, idx) => {
        const val = values[idx];
        const h = Math.max(0.1, (val / maxVal) * maxH);
        const col = idx % cols;
        const row = Math.floor(idx / cols);
        const x = (col - (cols - 1) / 2) * spacing;
        const z = (row - (rows - 1) / 2) * spacing;
        const color = getThemeColor(idx, count);

        const nodeGeo = new THREE.SphereGeometry(0.3, 16, 16);
        const nodeMat = new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.2 });
        const node = new THREE.Mesh(nodeGeo, nodeMat);
        node.position.set(x, h, z);
        node.userData = { name: label, value: val, idx, color: color.clone() };

        appState.scene.add(node);
        appState.dataObjects.push(node);
        createDomLabel(label, val, node, 0.4);
    });
}

function fitCameraToObjectBounds(count, style) {
    const aspect = window.innerWidth / Math.max(window.innerHeight, 1);
    const aspectMultiplier = aspect < 1.0 ? 1.55 : (aspect < 1.3 ? 1.25 : 1.0);
    const spread = Math.max(count * 1.3, 10) * aspectMultiplier;
    if (cameraAnim) return;
    animateCamera([0, spread * 0.5 + 5, spread * 0.7 + 8], [0, 2, 0], 800);
}

/**
 * 2D 텍스트 라벨 DOM 생성
 */
function createDomLabel(name, val, mesh, hOffset = 0, customX = null, customZ = null) {
    const layer = $('label-layer');
    if (!layer) return;

    const div = document.createElement('div');
    div.className = 'label-3d';
    div.textContent = `${name}: ${typeof val === 'number' ? Math.round(val).toLocaleString() : val}`;
    if (!appState.showLabels) div.style.display = 'none';

    layer.appendChild(div);
    appState.domLabels.push({
        el: div,
        mesh,
        hOffset,
        customX,
        customZ
    });
}

export function updateLabels() {
    if (!appState.camera || !appState.renderer || !appState.domLabels.length) return;
    const w = window.innerWidth;
    const h = window.innerHeight;

    appState.domLabels.forEach(l => {
        if (!l.mesh) return;
        tempVec.copy(l.mesh.position);
        tempVec.y += l.hOffset || 0;
        if (l.customX !== null) tempVec.x = l.customX;
        if (l.customZ !== null) tempVec.z = l.customZ;

        tempVec.project(appState.camera);
        if (tempVec.z > 1) {
            l.el.style.opacity = '0';
            return;
        }
        const x = (tempVec.x * 0.5 + 0.5) * w;
        const y = (-tempVec.y * 0.5 + 0.5) * h;
        l.el.style.left = `${x}px`;
        l.el.style.top = `${y}px`;
        l.el.style.opacity = '1';
    });
}

export function toggleLabels() {
    appState.showLabels = !appState.showLabels;
    appState.domLabels.forEach(l => {
        l.el.style.display = appState.showLabels ? '' : 'none';
    });
}

export function toggleGrid() {
    if (appState.gridHelper) {
        appState.gridHelper.visible = !appState.gridHelper.visible;
    }
}

/**
 * 레이캐스팅 광선 추적 (Hover 발광 & Click 카메라 포커싱)
 */
function setupRaycasting() {
    const container = $('canvas-container');
    const tooltip = $('hover-tooltip');
    const tooltipName = $('tooltip-name');
    const tooltipValue = $('tooltip-value');

    if (!container) return;

    container.addEventListener('mousemove', (e) => {
        mouse.x = (e.clientX / window.innerWidth) * 2 - 1;
        mouse.y = -(e.clientY / window.innerHeight) * 2 + 1;

        if (tooltip && tooltip.style.display !== 'none') {
            tooltip.style.left = `${e.clientX + 14}px`;
            tooltip.style.top = `${e.clientY + 14}px`;
        }

        if (!appState.dataObjects.length || !appState.camera) return;
        raycaster.setFromCamera(mouse, appState.camera);
        const hits = raycaster.intersectObjects(appState.dataObjects, false);

        if (hits.length > 0) {
            const hit = hits[0].object;
            if (hoveredObject !== hit) {
                if (hoveredObject && hoveredObject !== selectedObject) {
                    hoveredObject.material.emissive?.setHex(0x000000);
                }
                hoveredObject = hit;
                if (hoveredObject !== selectedObject) {
                    hoveredObject.material.emissive?.setHex(0x312e81);
                }
            }
            if (tooltip && tooltipName && tooltipValue) {
                tooltip.style.display = 'block';
                tooltipName.textContent = hit.userData.name || '데이터';
                tooltipValue.textContent = typeof hit.userData.value === 'number'
                    ? hit.userData.value.toLocaleString()
                    : hit.userData.value;
            }
            container.style.cursor = 'pointer';
        } else {
            if (hoveredObject && hoveredObject !== selectedObject) {
                hoveredObject.material.emissive?.setHex(0x000000);
            }
            hoveredObject = null;
            if (tooltip) tooltip.style.display = 'none';
            container.style.cursor = 'grab';
        }
    });

    container.addEventListener('click', (e) => {
        if (!appState.dataObjects.length || !appState.camera) return;
        raycaster.setFromCamera(mouse, appState.camera);
        const hits = raycaster.intersectObjects(appState.dataObjects, false);
        if (hits.length > 0) {
            const hit = hits[0].object;
            selectObject(hit, hit.userData.idx);
        }
    });
}

export function selectObject(mesh, idx) {
    if (selectedObject && selectedObject.material) {
        selectedObject.material.emissive?.setHex(0x000000);
    }
    selectedObject = mesh;
    if (selectedObject && selectedObject.material) {
        selectedObject.material.emissive?.setHex(0x4338ca);
    }
    showDetailCard(mesh.userData, idx);

    // 카메라 포커싱
    const targetPos = mesh.position.clone();
    animateCamera(
        [targetPos.x, targetPos.y + 4, targetPos.z + 8],
        [targetPos.x, targetPos.y, targetPos.z],
        600
    );
}

/**
 * 카메라 부드러운 전환 보간 애니메이션
 */
export function animateCamera(targetPos, targetLookAt, duration = 800) {
    if (!appState.camera || !appState.controls) return;
    const startPos = appState.camera.position.clone();
    const startTarget = appState.controls.target.clone();
    const endPos = new THREE.Vector3(...targetPos);
    const endTarget = new THREE.Vector3(...targetLookAt);
    const startTime = performance.now();
    cameraAnim = { startPos, startTarget, endPos, endTarget, startTime, duration };
}

function updateCameraAnim() {
    if (!cameraAnim || !appState.camera || !appState.controls) return;
    const now = performance.now();
    const elapsed = now - cameraAnim.startTime;
    const t = Math.min(1, elapsed / cameraAnim.duration);
    const ease = t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t;

    appState.camera.position.lerpVectors(cameraAnim.startPos, cameraAnim.endPos, ease);
    appState.controls.target.lerpVectors(cameraAnim.startTarget, cameraAnim.endTarget, ease);
    if (t >= 1) cameraAnim = null;
}

/**
 * 렌더 루프 및 실시간 FPS 성능 측정 엔진
 */
function animateLoop() {
    requestAnimationFrame(animateLoop);

    const delta = clock.getDelta();
    frameCount++;

    // 실시간 FPS 측정 (250ms 주기)
    const now = performance.now();
    if (now - lastFpsUpdateTime >= 250) {
        const measuredFps = Math.round((frameCount * 1000) / (now - lastFpsUpdateTime));
        frameCount = 0;
        lastFpsUpdateTime = now;

        appState.gpuEngineState.fps = measuredFps;
        appState.gpuEngineState.frameTimeMs = (1000 / Math.max(measuredFps, 1)).toFixed(1);

        if (measuredFps > 0 && measuredFps < appState.gpuEngineState.minFps) appState.gpuEngineState.minFps = measuredFps;
        if (measuredFps > appState.gpuEngineState.maxFps) appState.gpuEngineState.maxFps = measuredFps;

        appState.gpuEngineState.fpsHistory.push(measuredFps);
        if (appState.gpuEngineState.fpsHistory.length > 40) appState.gpuEngineState.fpsHistory.shift();

        const sum = appState.gpuEngineState.fpsHistory.reduce((a, b) => a + b, 0);
        appState.gpuEngineState.avgFps = Math.round(sum / appState.gpuEngineState.fpsHistory.length);

        const badgeFps = $('gpu-badge-fps');
        if (badgeFps) badgeFps.textContent = `${measuredFps} FPS`;

        if (window.__updateGpuModalLive) window.__updateGpuModalLive();
    }

    updateCameraAnim();

    if (appState.controls) appState.controls.update();
    if (appState.renderer && appState.scene && appState.camera) {
        appState.renderer.render(appState.scene, appState.camera);
    }
    updateLabels();
}

/**
 * 카메라 프리셋 버튼 바인딩
 */
export function bindCameraControls() {
    $('btn-reset-camera')?.addEventListener('click', () => {
        handleAdaptiveResize();
        const aspect = window.innerWidth / Math.max(window.innerHeight, 1);
        const aspectMultiplier = aspect < 1.0 ? 1.55 : (aspect < 1.3 ? 1.25 : 1.0);
        const spread = Math.max(appState.dataObjects.length * 1.3, 10) * aspectMultiplier;
        animateCamera([0, spread * 0.5 + 5, spread * 0.7 + 8], [0, 2, 0]);
        showToast('📐 <strong>화면 자동 맞춤 완료!</strong> 현재 화면 크기 및 해상도에 최적화되었습니다.');
    });
    $('btn-iso-view')?.addEventListener('click', () => {
        const spread = Math.max(appState.dataObjects.length * 1.3, 10);
        animateCamera([spread * 0.7, spread * 0.6 + 6, spread * 0.7], [0, 1.5, 0]);
    });
    $('btn-top-view')?.addEventListener('click', () => {
        const spread = Math.max(appState.dataObjects.length * 1.3, 10);
        animateCamera([0, spread + 10, 0.1], [0, 0, 0]);
    });
    $('btn-front-view')?.addEventListener('click', () => {
        const spread = Math.max(appState.dataObjects.length * 1.3, 10);
        animateCamera([0, 4, spread * 0.8 + 10], [0, 3, 0]);
    });
    $('btn-auto-rotate')?.addEventListener('click', () => {
        if (!appState.controls) return;
        appState.controls.autoRotate = !appState.controls.autoRotate;
        appState.controls.autoRotateSpeed = 2.0;
        const btn = $('btn-auto-rotate');
        if (btn) {
            btn.style.background = appState.controls.autoRotate ? '#e0e7ff' : '';
            btn.style.color = appState.controls.autoRotate ? '#4338ca' : '';
        }
    });
    $('btn-toggle-grid')?.addEventListener('click', toggleGrid);
    $('btn-toggle-labels')?.addEventListener('click', toggleLabels);
}
