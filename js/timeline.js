/**
 * ==============================================================================
 * [timeline.js] 시계열 다차원 타임슬라이더 애니메이션 플레이어
 * ==============================================================================
 */
import { $, appState, showToast } from './state.js';

let timePlayerTimer = null;
let currentTimeStep = 0;

export function initTimePlayer() {
    const timePlayerBar = $('time-player-bar');
    const timeSliderRange = $('time-slider-range');
    const btnToggleTimeline = $('btn-toggle-timeline');
    const yAxisSelect = $('y-axis-select');

    if (!appState.analysisResult || !appState.analysisResult.numericCols || appState.analysisResult.numericCols.length === 0) {
        if (timePlayerBar) timePlayerBar.style.display = 'none';
        return;
    }

    const numCols = appState.analysisResult.numericCols;
    const curY = yAxisSelect ? parseInt(yAxisSelect.value) : 0;
    let curStep = numCols.indexOf(curY);
    if (curStep === -1) curStep = 0;
    currentTimeStep = curStep;

    if (timeSliderRange) {
        timeSliderRange.min = 0;
        timeSliderRange.max = numCols.length - 1;
        timeSliderRange.value = curStep;
    }
    updateTimePlayerUI();

    if (numCols.length > 1 && btnToggleTimeline) {
        btnToggleTimeline.style.display = '';
    }
}

export function updateTimePlayerUI() {
    if (!appState.analysisResult || !appState.analysisResult.numericCols || !appState.parsedData) return;
    const numCols = appState.analysisResult.numericCols;
    if (currentTimeStep < 0 || currentTimeStep >= numCols.length) currentTimeStep = 0;

    const colIdx = numCols[currentTimeStep];
    const colName = appState.parsedData.headers[colIdx] || `컬럼 #${colIdx}`;

    const timeStepBadge = $('time-step-badge');
    const timeColName = $('time-col-name');
    const timeSliderRange = $('time-slider-range');

    if (timeStepBadge) timeStepBadge.textContent = `${currentTimeStep + 1} / ${numCols.length}`;
    if (timeColName) timeColName.textContent = colName;
    if (timeSliderRange) timeSliderRange.value = currentTimeStep;
}

export function openTimePlayer() {
    const timePlayerBar = $('time-player-bar');
    if (!timePlayerBar) return;
    initTimePlayer();
    timePlayerBar.style.display = 'flex';
    showToast('⏳ <strong>타임라인 플레이어</strong>가 활성화되었습니다. 재생(▶) 버튼을 누르면 컬럼별 변화를 3D 애니메이션으로 감상할 수 있습니다.');
}

export function closeTimePlayer() {
    const timePlayerBar = $('time-player-bar');
    stopTimePlay();
    if (timePlayerBar) timePlayerBar.style.display = 'none';
}

export function setTimeStep(step) {
    if (!appState.analysisResult || !appState.analysisResult.numericCols) return;
    const numCols = appState.analysisResult.numericCols;
    if (step < 0) step = numCols.length - 1;
    if (step >= numCols.length) step = 0;
    currentTimeStep = step;
    updateTimePlayerUI();

    const yAxisSelect = $('y-axis-select');
    if (yAxisSelect) {
        yAxisSelect.value = numCols[currentTimeStep];
        if (window.__applyVisualization) window.__applyVisualization();
    }
}

export function toggleTimePlay() {
    if (timePlayerTimer) {
        stopTimePlay();
    } else {
        startTimePlay();
    }
}

export function startTimePlay() {
    stopTimePlay();
    const btnTimePlay = $('btn-time-play');
    const timeSpeedSelect = $('time-speed-select');
    const speed = parseInt(timeSpeedSelect ? timeSpeedSelect.value : 900);

    if (btnTimePlay) {
        btnTimePlay.textContent = '⏸ 정지';
        btnTimePlay.classList.add('playing');
    }

    timePlayerTimer = setInterval(() => {
        if (!appState.analysisResult || !appState.analysisResult.numericCols) return;
        const nextStep = (currentTimeStep + 1) % appState.analysisResult.numericCols.length;
        setTimeStep(nextStep);
    }, speed);
}

export function stopTimePlay() {
    if (timePlayerTimer) {
        clearInterval(timePlayerTimer);
        timePlayerTimer = null;
    }
    const btnTimePlay = $('btn-time-play');
    if (btnTimePlay) {
        btnTimePlay.textContent = '▶ 재생';
        btnTimePlay.classList.remove('playing');
    }
}

// 이벤트 바인딩
export function bindTimelineEvents() {
    $('btn-time-play')?.addEventListener('click', toggleTimePlay);
    $('btn-time-prev')?.addEventListener('click', () => {
        stopTimePlay();
        setTimeStep(currentTimeStep - 1);
    });
    $('btn-time-next')?.addEventListener('click', () => {
        stopTimePlay();
        setTimeStep(currentTimeStep + 1);
    });
    $('time-slider-range')?.addEventListener('input', (e) => {
        stopTimePlay();
        setTimeStep(parseInt(e.target.value));
    });
    $('time-speed-select')?.addEventListener('change', () => {
        if (timePlayerTimer) startTimePlay();
    });
    $('btn-close-time-player')?.addEventListener('click', closeTimePlayer);
    $('btn-toggle-timeline')?.addEventListener('click', () => {
        const timePlayerBar = $('time-player-bar');
        if (timePlayerBar && timePlayerBar.style.display !== 'none') {
            closeTimePlayer();
        } else {
            openTimePlayer();
        }
    });
}
