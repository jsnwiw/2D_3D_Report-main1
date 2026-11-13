/**
 * ==============================================================================
 * [main.js] 3D & 2D 인터랙티브 데이터 시각화 웹 플랫폼 - 메인 오케스트레이터
 * ==============================================================================
 * 
 * [모듈 구조 (Module Architecture)]
 * - js/state.js       : 전역 공유 상태 및 공통 유틸리티 ($, showToast, sleep)
 * - js/parser.js      : CSV / 엑셀(.xlsx, .xls) 파싱, 다중 인코딩(ANSI/UTF-8) 감지
 * - js/analytics.js   : 8대 기술통계, 1.5×IQR 이상치 감지, 지능형 시각화 추천
 * - js/renderer3d.js  : Three.js WebGPU/Vulkan 씬, 10종 3D 지오메트리, 레이캐스팅, FPS
 * - js/chart2d.js     : Chart.js 2D 보조 차트, 다축 틀고정 테이블, 상세 카드
 * - js/timeline.js    : 시계열 다차원 타임슬라이더 애니메이션 플레이어
 * - js/ai-report.js   : AI 맞춤 분석 보고서 스튜디오 (AI Report Studio) & A4 PDF 인쇄
 * - js/ui.js          : 상단 바, 메뉴 아코디언, 업로드 카드 토글, GPU 사양 모달
 * ==============================================================================
 */

import { $, appState, showToast } from './js/state.js';
import { loadAndParseFile } from './js/parser.js';
import { analyzeData, displayAnalysis, updateAxisSelectors, updateFilter, inferBest3DStyle, getDynamicRecommendations } from './js/analytics.js';
import { initThreeScene, render3DVisualization, bindCameraControls } from './js/renderer3d.js';
import { render2DChart, bindChartPanelControls, getFilteredRows } from './js/chart2d.js';
import { initTimePlayer, bindTimelineEvents, updateTimePlayerUI } from './js/timeline.js';
import { openAiReportStudio, bindAiReportEvents, updateReportRecommendationUI } from './js/ai-report.js';
import {
    setupAccordionUI,
    setupMenuScroll,
    setupUploadCardToggle,
    setupGpuModal,
    setupDragAndDrop,
    setupTopBarActions,
    setupLightingControls,
    openAccordionSection,
    initSystemInfo,
    setupFloating3DToolbar,
    sync3DStyleUI
} from './js/ui.js';

// 전역 훅 등록 (모듈 간 상호 호출용)
window.__openAccordionSection = openAccordionSection;

/**
 * 3D 및 2D 시각화 통합 적용
 */
export function applyVisualization() {
    if (!appState.parsedData) return;
    const res = render2DChart();
    if (res && res.labels && res.values) {
        render3DVisualization(res.labels, res.values);
    }
    if (appState.analysisResult) {
        updateTimePlayerUI();
    }
}
window.__applyVisualization = applyVisualization;

/**
 * 데이터 로드 완료 후 통합 분석 및 시각화 파이프라인 구동
 */
export function processData(sourceName) {
    if (!appState.parsedData) return;

    // 1. 기술통계 및 이상치 분석
    appState.analysisResult = analyzeData(appState.parsedData);
    displayAnalysis(appState.analysisResult);

    // 2. 축 선택자 초기화
    updateAxisSelectors(appState.analysisResult);

    // 3. 타임라인 및 시각화 적용
    initTimePlayer();
    applyVisualization();
    sync3DStyleUI(appState.current3DStyle || 'box');

    // 4. 상태 표시줄 갱신
    const statusIndicator = $('status-indicator');
    if (statusIndicator) {
        statusIndicator.textContent = `● ${sourceName}`;
        statusIndicator.className = 'status online';
    }

    // 5. 업로드 카드 자동 접기 (좌측 2D 차트 및 3D 뷰포트 공간 확보)
    const uploadCard = $('upload-panel');
    if (uploadCard) {
        uploadCard.classList.add('collapsed');
        document.body.classList.add('upload-collapsed');
    }

    // 6. 메뉴 패널 열고 시각화 설정 아코디언 오픈
    const menuPanel = $('menu-panel');
    if (menuPanel) menuPanel.classList.add('open');
    openAccordionSection('viz-section');

    // 7. AI 최적 추천 보고서 유형 배지 갱신
    updateReportRecommendationUI();
}
window.__processData = processData;

/**
 * 시각화 옵션 및 필터 인터랙션 이벤트 바인딩
 */
function bindFilterAndOptionEvents() {
    const csvUpload = $('csv-upload');
    const autoRecommendToggle = $('auto-recommend-toggle');
    const autoRecommendStatusBadge = $('auto-recommend-status-badge');
    const appliedRecommendNotice = $('applied-recommend-notice');
    const btnForceRecommend = $('btn-force-recommend');
    const xAxisSelect = $('x-axis-select');
    const yAxisSelect = $('y-axis-select');
    const barStyleSelect = $('bar-style');
    const quickBarStyle = $('quick-bar-style');
    const chartTypeSelect = $('chart-type-select');
    const applyBtn = $('apply-btn');
    const dataFilter = $('data-filter');
    const btnApplyRange = $('btn-apply-range');
    const sortSelect = $('sort-select');
    const filterKeyword = $('filter-keyword');
    const limitSelect = $('limit-select');
    const btnFilterTop10 = $('btn-filter-top10');
    const btnFilterAboveAvg = $('btn-filter-above-avg');
    const btnFilterTop20pct = $('btn-filter-top20pct');
    const btnFilterAll = $('btn-filter-all');
    const colorThemeSelect = $('color-theme-select');
    const customColorGroup = $('custom-color-group');
    const customColorPicker = $('custom-theme-color-picker');
    const customColorCode = $('custom-theme-color-code');
    const rangeMin = $('range-min');
    const rangeMax = $('range-max');

    // 파일 업로드
    csvUpload?.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) loadAndParseFile(file, processData);
    });

    // 추천 토글
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

    // 추천 즉시 적용
    btnForceRecommend?.addEventListener('click', () => {
        if (!appState.parsedData || !appState.analysisResult) return;
        const xIdx = parseInt(xAxisSelect.value);
        const yIdx = parseInt(yAxisSelect.value);
        const rows = getFilteredRows();
        const labels = rows.map(r => r[xIdx]);
        const values = rows.map(r => parseFloat(r[yIdx]) || 0);

        const best3D = inferBest3DStyle(labels, values, appState.analysisResult);
        if (barStyleSelect) barStyleSelect.value = best3D;
        if (quickBarStyle) quickBarStyle.value = best3D;

        const recs = getDynamicRecommendations(labels, values, appState.analysisResult);
        const valid2DTypes = ['bar', 'horizontalBar', 'line', 'pie', 'doughnut', 'scatter', 'radar', 'polarArea'];
        const matched2D = recs.find(r => valid2DTypes.includes(r.type === 'donut' ? 'doughnut' : r.type));
        if (matched2D && chartTypeSelect) {
            chartTypeSelect.value = matched2D.type === 'donut' ? 'doughnut' : matched2D.type;
        }
        applyVisualization();
        showToast('✨ 최적 시각화 추천(3D & 2D)이 즉시 적용되었습니다!');
    });

    // 축 및 시각화 형태 변경
    xAxisSelect?.addEventListener('change', () => {
        if (!appState.parsedData) return;
        updateFilter(parseInt(xAxisSelect.value));
        applyVisualization();
    });
    yAxisSelect?.addEventListener('change', () => {
        if (appState.parsedData) {
            applyVisualization();
            updateReportRecommendationUI();
        }
    });
    quickBarStyle?.addEventListener('change', () => {
        sync3DStyleUI(quickBarStyle.value);
        if (appState.parsedData) applyVisualization();
    });
    barStyleSelect?.addEventListener('change', () => {
        sync3DStyleUI(barStyleSelect.value);
        if (appState.parsedData) applyVisualization();
    });
    chartTypeSelect?.addEventListener('change', () => {
        const ct = chartTypeSelect.value;
        if (ct === 'pie') sync3DStyleUI('pie');
        else if (ct === 'doughnut' || ct === 'polarArea') sync3DStyleUI('donut');
        else if (ct === 'line') sync3DStyleUI('line');
        else if (ct === 'scatter') sync3DStyleUI('scatter');
        if (appState.parsedData) applyVisualization();
    });
    applyBtn?.addEventListener('click', () => {
        if (appState.parsedData) applyVisualization();
    });

    // 필터 & 정렬
    dataFilter?.addEventListener('change', () => { if (appState.parsedData) applyVisualization(); });
    btnApplyRange?.addEventListener('click', () => { if (appState.parsedData) applyVisualization(); });
    sortSelect?.addEventListener('change', () => { if (appState.parsedData) applyVisualization(); });
    filterKeyword?.addEventListener('input', () => { if (appState.parsedData) applyVisualization(); });
    limitSelect?.addEventListener('change', () => { if (appState.parsedData) applyVisualization(); });

    // 퀵 필터 버튼들
    btnFilterTop10?.addEventListener('click', () => {
        if (limitSelect) limitSelect.value = '10';
        if (sortSelect) sortSelect.value = 'desc';
        if (appState.parsedData) applyVisualization();
    });

    btnFilterAboveAvg?.addEventListener('click', () => {
        if (!appState.analysisResult || !appState.parsedData) return;
        const yIdx = parseInt(yAxisSelect.value);
        const colName = appState.parsedData.headers[yIdx];
        const stats = appState.analysisResult.numericStats[colName];
        if (stats && stats.mean !== undefined) {
            if (rangeMin) rangeMin.value = Math.round(stats.mean);
            if (rangeMax) rangeMax.value = '';
            applyVisualization();
        }
    });

    btnFilterTop20pct?.addEventListener('click', () => {
        if (!appState.parsedData) return;
        const yIdx = parseInt(yAxisSelect.value);
        const vals = appState.parsedData.rows.map(r => parseFloat(r[yIdx]) || 0).filter(v => !isNaN(v)).sort((a, b) => a - b);
        if (vals.length) {
            const threshold = vals[Math.floor(vals.length * 0.8)];
            if (rangeMin) rangeMin.value = Math.round(threshold);
            if (rangeMax) rangeMax.value = '';
            applyVisualization();
        }
    });

    btnFilterAll?.addEventListener('click', () => {
        if (rangeMin) rangeMin.value = '';
        if (rangeMax) rangeMax.value = '';
        if (dataFilter) dataFilter.value = 'all';
        if (filterKeyword) filterKeyword.value = '';
        if (limitSelect) limitSelect.value = 'all';
        if (sortSelect) sortSelect.value = 'none';
        if (appState.parsedData) applyVisualization();
    });

    // 컬러 테마
    colorThemeSelect?.addEventListener('change', () => {
        if (customColorGroup) customColorGroup.style.display = colorThemeSelect.value === 'custom' ? '' : 'none';
        if (appState.parsedData) applyVisualization();
    });
    customColorPicker?.addEventListener('input', (e) => {
        if (customColorCode) customColorCode.textContent = e.target.value.toUpperCase();
        if (appState.parsedData) applyVisualization();
    });
}

/**
 * 🚀 애플리케이션 진입점 (Bootstrap)
 */
async function bootstrapApp() {
    try {
        console.log('🚀 3D 데이터 시각화 웹 플랫폼 모듈 로드 시작...');

        // 1. Three.js WebGPU 씬 초기화
        await initThreeScene();

        // 2. 각 서브시스템 이벤트 리스너 바인딩
        bindCameraControls();
        bindChartPanelControls();
        bindTimelineEvents();
        bindAiReportEvents();
        setupAccordionUI();
        setupMenuScroll();
        setupUploadCardToggle();
        setupGpuModal();
        setupDragAndDrop(processData);
        setupTopBarActions();
        setupLightingControls();
        bindFilterAndOptionEvents();
        setupFloating3DToolbar(applyVisualization);

        // 3. 시스템 정보 (CPU, GPU, 엔진) 패널 초기화
        initSystemInfo();

        console.log('✅ 모든 서브시스템 및 모듈 초기화 완료!');
    } catch (err) {
        console.error('애플리케이션 초기화 실패:', err);
        showToast('⚠️ 3D 렌더링 엔진 초기화 중 오류가 발생했습니다.');
    }
}

// 브라우저 DOM 로드 시 실행
bootstrapApp();
