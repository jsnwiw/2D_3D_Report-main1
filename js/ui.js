/**
 * ==============================================================================
 * [ui.js] 글로벌 상단 바, 사이드바 아코디언 메뉴, 업로드 패널, GPU 모달 & FPS 그래프
 * ==============================================================================
 */
import * as THREE from 'three';
import { $, appState, showToast, getSystemInfo } from './state.js';
import { loadAndParseFile } from './parser.js';

let totalRenderFrames = 0;

/**
 * 단일 아코디언 섹션 열기
 */
export function openAccordionSection(sectionId) {
    const section = $(sectionId);
    if (!section) return;

    document.querySelectorAll('.accordion-item').forEach(item => {
        if (item === section) {
            item.classList.add('active');
            const h = item.querySelector('.accordion-header');
            const b = item.querySelector('.accordion-body');
            const c = item.querySelector('.chevron');
            if (h) h.classList.add('active');
            if (b) b.classList.add('open');
            if (c) c.textContent = '▴';
        } else {
            item.classList.remove('active');
            const h = item.querySelector('.accordion-header');
            const b = item.querySelector('.accordion-body');
            const c = item.querySelector('.chevron');
            if (h) h.classList.remove('active');
            if (b) b.classList.remove('open');
            if (c) c.textContent = '▾';
        }
    });

    const menuContent = document.querySelector('.menu-content');
    if (menuContent) {
        setTimeout(() => {
            const rect = section.getBoundingClientRect();
            const containerRect = menuContent.getBoundingClientRect();
            if (rect.top < containerRect.top || rect.bottom > containerRect.bottom) {
                section.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
            }
        }, 80);
    }
}

/**
 * 아코디언 헤더 토글 이벤트
 */
export function setupAccordionUI() {
    document.querySelectorAll('.accordion-header').forEach(header => {
        header.addEventListener('click', (e) => {
            e.stopPropagation();
            const parent = header.closest('.accordion-item');
            if (!parent) return;
            const isOpen = parent.classList.contains('active');
            if (isOpen) {
                parent.classList.remove('active');
                header.classList.remove('active');
                const body = parent.querySelector('.accordion-body');
                const chevron = header.querySelector('.chevron');
                if (body) body.classList.remove('open');
                if (chevron) chevron.textContent = '▾';
            } else {
                openAccordionSection(parent.id);
            }
        });
    });
}

/**
 * 메뉴 패널 스크롤 네비게이션
 */
export function setupMenuScroll() {
    const menuContent = document.querySelector('.menu-content');
    const menuPanel = $('menu-panel');
    const btnScrollTop = $('btn-scroll-top');
    const btnScrollBottom = $('btn-scroll-bottom');

    btnScrollTop?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (menuContent) menuContent.scrollTo({ top: 0, behavior: 'smooth' });
    });
    btnScrollBottom?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (menuContent) menuContent.scrollTo({ top: menuContent.scrollHeight, behavior: 'smooth' });
    });
}

/**
 * 업로드 카드 접기/펼치기 토글
 */
export function setupUploadCardToggle() {
    const uploadPanel = $('upload-panel');
    const btnToggleUploadCard = $('btn-toggle-upload-card');

    btnToggleUploadCard?.addEventListener('click', (e) => {
        e.stopPropagation();
        if (!uploadPanel) return;
        const isCollapsed = uploadPanel.classList.toggle('collapsed');
        document.body.classList.toggle('upload-collapsed', isCollapsed);
    });
}

/**
 * GPU 엔진 정보 모달 및 실시간 FPS 성능 갱신
 */
export function updateGpuModalLivePerformance() {
    totalRenderFrames++;
    const modalGpuFps = $('modal-gpu-fps');
    const modalGpuFpsBadge = $('modal-gpu-fps-badge');
    const modalGpuFpsStats = $('modal-gpu-fps-stats');
    const modalGpuFrameCount = $('modal-gpu-frame-count');
    const gpuState = appState.gpuEngineState;

    if (!modalGpuFps) return;
    modalGpuFps.textContent = `${gpuState.fps} FPS (${gpuState.frameTimeMs} ms)`;

    if (modalGpuFpsBadge) {
        if (gpuState.fps >= 55) {
            modalGpuFpsBadge.className = 'fps-status-badge smooth';
            modalGpuFpsBadge.textContent = '🟢 쾌적 (Ultra Smooth)';
        } else if (gpuState.fps >= 30) {
            modalGpuFpsBadge.className = 'fps-status-badge good';
            modalGpuFpsBadge.textContent = '🟡 보통 (Smooth)';
        } else {
            modalGpuFpsBadge.className = 'fps-status-badge heavy';
            modalGpuFpsBadge.textContent = '🔴 부하 발생 (Lagging)';
        }
    }

    if (modalGpuFpsStats) {
        const minStr = gpuState.minFps === 999 ? '-' : `${gpuState.minFps} FPS`;
        const avgStr = gpuState.avgFps > 0 ? `${gpuState.avgFps} FPS` : '-';
        const maxStr = gpuState.maxFps > 0 ? `${gpuState.maxFps} FPS` : '-';
        modalGpuFpsStats.textContent = `최저: ${minStr} | 평균: ${avgStr} | 최고: ${maxStr}`;
    }

    if (modalGpuFrameCount) {
        modalGpuFrameCount.textContent = `누적 렌더링: ${totalRenderFrames.toLocaleString()} frames`;
    }

    drawFpsSparkline();
}

/**
 * 시스템 정보 (CPU, GPU, 엔진) 패널 초기화
 */
export function initSystemInfo() {
    const info = getSystemInfo();
    const platformEl = $('system-platform');
    const manufacturerEl = $('system-manufacturer');
    const cpuEl = $('system-cpu');
    const gpuEl = $('system-gpu');
    const gpuEngineEl = $('gpu-engine-info');

    // 실시간 감지된 하드웨어 정보를 gpuEngineState에 반영
    if (info.gpuRenderer && info.gpuRenderer !== '감지 중...') {
        appState.gpuEngineState.gpuName = info.gpuRenderer;
    }
    if (info.gpuVendor && info.gpuVendor !== '감지 중...') {
        appState.gpuEngineState.vendor = info.gpuVendor;
    }

    if (platformEl) platformEl.textContent = `🖥 플랫폼: ${info.platform}`;
    if (manufacturerEl) manufacturerEl.textContent = `🏭 GPU 제조사: ${info.gpuVendor}`;
    if (cpuEl) cpuEl.textContent = `⚙️ CPU 코어: ${info.cpuCores}코어`;
    if (gpuEl) gpuEl.textContent = `🎮 GPU 모델: ${info.gpuRenderer}`;
    if (gpuEngineEl) {
        const engine = appState.gpuEngineState;
        gpuEngineEl.textContent = `⚡ 엔진: ${engine.backendName}`;
    }

    // GPU 모달 요소도 실제 감지값으로 즉시 채우기 (모달 열기 전에도 준비)
    const modalPlatform = $('modal-system-platform');
    const modalCpu = $('modal-system-cpu');
    const modalGpuApi = $('modal-gpu-api');
    const modalGpuDevice = $('modal-gpu-device');
    const modalGpuVendor = $('modal-gpu-vendor');
    const modalGpuArchitecture = $('modal-gpu-architecture');
    const modalGpuFeatures = $('modal-gpu-features');

    if (modalPlatform) modalPlatform.textContent = info.platform;
    if (modalCpu) modalCpu.textContent = `${info.cpuCores}코어`;
    if (modalGpuApi) modalGpuApi.textContent = appState.gpuEngineState.backendName;
    if (modalGpuDevice) modalGpuDevice.textContent = appState.gpuEngineState.gpuName;
    if (modalGpuVendor) modalGpuVendor.textContent = appState.gpuEngineState.vendor;
    if (modalGpuArchitecture) modalGpuArchitecture.textContent = appState.gpuEngineState.architecture;
    if (modalGpuFeatures && appState.gpuEngineState.featuresCount > 0) {
        modalGpuFeatures.textContent = `${appState.gpuEngineState.featuresCount}개 하드웨어 기능 활성화됨`;
    }
}

/**
 * FPS 스파크라인 그래프
 */
export function drawFpsSparkline() {
    const canvas = $('fps-sparkline-canvas');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const w = canvas.width;
    const h = canvas.height;
    ctx.clearRect(0, 0, w, h);

    const history = appState.gpuEngineState.fpsHistory;
    if (history.length < 2) return;

    const maxVal = Math.max(75, ...history, appState.gpuEngineState.maxFps || 60);
    const y60 = h - (60 / maxVal) * (h - 10) - 4;

    // 60 FPS 기준 가이드라인
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

    // 트렌드 라인
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

    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, 'rgba(129, 140, 248, 0.35)');
    grad.addColorStop(1, 'rgba(129, 140, 248, 0.0)');
    ctx.fillStyle = grad;
    ctx.fill();

    const lastX = (history.length - 1) * stepX;
    const lastY = h - (history[history.length - 1] / maxVal) * (h - 10) - 4;
    ctx.beginPath();
    ctx.arc(lastX, lastY, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#34d399';
    ctx.fill();
}

export function setupGpuModal() {
    const badge = $('gpu-engine-badge');
    const modal = $('gpu-info-modal');
    const btnClose = $('btn-close-gpu-modal');
    const modalPlatform = $('modal-system-platform');
    const modalCpu = $('modal-system-cpu');
    const modalGpuApi = $('modal-gpu-api');
    const modalGpuDevice = $('modal-gpu-device');
    const modalGpuVendor = $('modal-gpu-vendor');
    const modalGpuArchitecture = $('modal-gpu-architecture');
    const modalGpuFeatures = $('modal-gpu-features');

    badge?.addEventListener('click', () => {
        if (!modal) return;
        const sysInfo = getSystemInfo();
        if (modalPlatform) modalPlatform.textContent = sysInfo.platform || 'Win32';
        if (modalCpu) modalCpu.textContent = `${sysInfo.cpuCores || 4}코어`;
        if (modalGpuApi) modalGpuApi.textContent = appState.gpuEngineState.backendName;
        if (modalGpuDevice) modalGpuDevice.textContent = appState.gpuEngineState.gpuName;
        if (modalGpuVendor) modalGpuVendor.textContent = appState.gpuEngineState.vendor;
        if (modalGpuArchitecture) modalGpuArchitecture.textContent = appState.gpuEngineState.architecture;
        if (modalGpuFeatures) modalGpuFeatures.textContent = `${appState.gpuEngineState.featuresCount}개 하드웨어 기능 활성화됨`;
        updateGpuModalLivePerformance();
        modal.style.display = 'flex';
    });

    btnClose?.addEventListener('click', () => {
        if (modal) modal.style.display = 'none';
    });
    modal?.addEventListener('click', (e) => {
        if (e.target === modal) modal.style.display = 'none';
    });

    window.__updateGpuModalLive = () => {
        if (modal && modal.style.display !== 'none') {
            updateGpuModalLivePerformance();
        }
    };
}

/**
 * 드래그 앤 드롭 파일 로더
 */
export function setupDragAndDrop(onFileLoaded) {
    const overlay = $('drag-drop-overlay');
    let dragCounter = 0;

    window.addEventListener('dragenter', (e) => {
        e.preventDefault();
        dragCounter++;
        if (overlay) overlay.style.display = 'flex';
    });

    window.addEventListener('dragleave', (e) => {
        e.preventDefault();
        dragCounter--;
        if (dragCounter <= 0 && overlay) overlay.style.display = 'none';
    });

    window.addEventListener('dragover', (e) => {
        e.preventDefault();
    });

    window.addEventListener('drop', (e) => {
        e.preventDefault();
        dragCounter = 0;
        if (overlay) overlay.style.display = 'none';

        const file = e.dataTransfer?.files?.[0];
        if (file) {
            loadAndParseFile(file, onFileLoaded);
        }
    });
}

/**
 * 상단 바 메뉴 토글, 전체화면 & 캡처
 */
export function setupTopBarActions() {
    const menuPanel = $('menu-panel');
    const btnToggleMenu = $('btn-toggle-menu');
    const btnCloseMenu = $('btn-close-menu');
    const btnFullscreen = $('btn-fullscreen');
    const btnScreenshot = $('btn-screenshot');

    btnToggleMenu?.addEventListener('click', () => {
        if (menuPanel) menuPanel.classList.toggle('open');
    });
    btnCloseMenu?.addEventListener('click', () => {
        if (menuPanel) menuPanel.classList.remove('open');
    });

    btnFullscreen?.addEventListener('click', () => {
        if (!document.fullscreenElement) {
            document.documentElement.requestFullscreen?.();
            btnFullscreen.textContent = '⛶ 축소';
        } else {
            document.exitFullscreen?.();
            btnFullscreen.textContent = '⛶';
        }
    });

    btnScreenshot?.addEventListener('click', () => {
        if (!appState.renderer || !appState.scene || !appState.camera) return;
        const tooltip = $('hover-tooltip');
        if (tooltip) tooltip.style.display = 'none';
        appState.renderer.render(appState.scene, appState.camera);
        const dataUrl = appState.renderer.domElement.toDataURL('image/png');
        const a = document.createElement('a');
        a.href = dataUrl;
        a.download = `3d-dashboard-capture-${Date.now()}.png`;
        a.click();
        showToast('📸 <strong>3D 화면 캡처 완료!</strong> 고화질 PNG 이미지로 저장되었습니다.');
    });
}

/**
 * 3D 스타일 UI 동기화 (플로팅 툴바, 상단 퀵 셀렉트, 메뉴 셀렉트)
 */
export function sync3DStyleUI(style) {
    if (!style) return;
    appState.current3DStyle = style;
    document.querySelectorAll('.btn-3d-style').forEach(btn => {
        if (btn.dataset.style === style) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
    const quickBar = $('quick-bar-style');
    if (quickBar && quickBar.value !== style) quickBar.value = style;
    const barStyle = $('bar-style');
    if (barStyle && barStyle.value !== style) barStyle.value = style;
}

/**
 * 3D 뷰포트 플로팅 형태 전환 툴바 이벤트 리스너 바인딩
 */
export function setupFloating3DToolbar(onStyleChange) {
    document.querySelectorAll('.btn-3d-style').forEach(btn => {
        btn.addEventListener('click', () => {
            const style = btn.dataset.style;
            if (!style) return;
            sync3DStyleUI(style);
            if (onStyleChange) onStyleChange(style);
        });
    });
}

/**
 * 환경 설정 (배경색, 조명 조절)
 */
export function setupLightingControls() {
    const bgColor = $('bg-color');
    const ambientIntensity = $('ambient-intensity');
    const dirIntensity = $('dir-intensity');
    const exposureIntensity = $('exposure-intensity');
    const btnResetLighting = $('btn-reset-lighting');

    bgColor?.addEventListener('input', (e) => {
        const c = e.target.value;
        if (appState.scene) {
            appState.scene.background = new THREE.Color(c);
            if (appState.scene.fog) appState.scene.fog.color = new THREE.Color(c);
        }
    });

    ambientIntensity?.addEventListener('input', (e) => {
        if (appState.ambientLight) appState.ambientLight.intensity = parseFloat(e.target.value);
        const val = $('val-ambient');
        if (val) val.textContent = e.target.value;
    });

    dirIntensity?.addEventListener('input', (e) => {
        if (appState.dirLight) appState.dirLight.intensity = parseFloat(e.target.value);
        const val = $('val-dir');
        if (val) val.textContent = e.target.value;
    });

    exposureIntensity?.addEventListener('input', (e) => {
        if (appState.renderer) appState.renderer.toneMappingExposure = parseFloat(e.target.value);
        const val = $('val-exposure');
        if (val) val.textContent = e.target.value;
    });

    btnResetLighting?.addEventListener('click', () => {
        const defaultBg = '#f1f5f9';
        if (appState.scene) {
            appState.scene.background = new THREE.Color(defaultBg);
            if (appState.scene.fog) appState.scene.fog.color = new THREE.Color(defaultBg);
        }
        if (appState.ambientLight) appState.ambientLight.intensity = 0.7;
        if (appState.dirLight) appState.dirLight.intensity = 0.9;
        if (appState.renderer) appState.renderer.toneMappingExposure = 1.1;

        if (bgColor) bgColor.value = defaultBg;
        if (ambientIntensity) ambientIntensity.value = '0.7';
        if (dirIntensity) dirIntensity.value = '0.9';
        if (exposureIntensity) exposureIntensity.value = '1.1';

        showToast('💡 조명 및 환경설정이 기본값으로 초기화되었습니다.');
    });
}
