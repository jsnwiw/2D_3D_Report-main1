/**
 * ==============================================================================
 * [chart2d.js] Chart.js 2D 보조 차트, 양방향 데이터 테이블 & 미니 상세 카드 뷰어
 * ==============================================================================
 */
import { $, appState } from './state.js';
import { fmt, statRow, getDynamicRecommendations } from './analytics.js';

export const COLORS = [
    'rgba(79, 70, 229, 0.85)', 'rgba(236, 72, 153, 0.85)', 'rgba(16, 185, 129, 0.85)',
    'rgba(245, 158, 11, 0.85)', 'rgba(124, 58, 237, 0.85)', 'rgba(14, 165, 233, 0.85)',
    'rgba(239, 68, 68, 0.85)', 'rgba(34, 197, 94, 0.85)', 'rgba(168, 85, 247, 0.85)'
];

if (window.Chart) {
    Chart.defaults.font.family = "'Pretendard', -apple-system, BlinkMacSystemFont, 'Malgun Gothic', sans-serif";
}

export function updateFilterSummary(displayed, total) {
    const badge = $('filter-summary-badge');
    if (!badge) return;
    const pct = total > 0 ? Math.round((displayed / total) * 100) : 100;
    badge.innerHTML = `📊 표시: <strong>${displayed.toLocaleString()}</strong>개 / 전체 ${total.toLocaleString()}개 (${pct}%)`;
}

export function getFilteredRows() {
    if (!appState.parsedData) return [];
    let rows = [...appState.parsedData.rows];
    const xAxisSelect = $('x-axis-select');
    const yAxisSelect = $('y-axis-select');
    const dataFilter = $('data-filter');
    const rangeMin = $('range-min');
    const rangeMax = $('range-max');
    const sortSelect = $('sort-select');
    const filterKeyword = $('filter-keyword');
    const limitSelect = $('limit-select');

    const xIdx = parseInt(xAxisSelect ? xAxisSelect.value : 0);
    const yIdx = parseInt(yAxisSelect ? yAxisSelect.value : 1);

    // 1. 키워드 검색
    const kw = filterKeyword ? filterKeyword.value.trim().toLowerCase() : '';
    if (kw) {
        rows = rows.filter(r => String(r[xIdx] || '').toLowerCase().includes(kw));
    }

    // 2. 카테고리 필터
    if (dataFilter && dataFilter.value !== 'all') {
        rows = rows.filter(r => r[xIdx] === dataFilter.value);
    }

    // 3. 수치 범위 필터
    const rMin = rangeMin && rangeMin.value !== '' ? parseFloat(rangeMin.value) : -Infinity;
    const rMax = rangeMax && rangeMax.value !== '' ? parseFloat(rangeMax.value) : Infinity;
    if (rMin !== -Infinity || rMax !== Infinity) {
        rows = rows.filter(r => {
            const v = parseFloat(r[yIdx]);
            return !isNaN(v) && v >= rMin && v <= rMax;
        });
    }

    // 4. 정렬
    if (sortSelect) {
        const sort = sortSelect.value;
        if (sort === 'asc') rows.sort((a, b) => (parseFloat(a[yIdx]) || 0) - (parseFloat(b[yIdx]) || 0));
        else if (sort === 'desc') rows.sort((a, b) => (parseFloat(b[yIdx]) || 0) - (parseFloat(a[yIdx]) || 0));
    }

    // 5. 표시 데이터 개수 제한 (Top N)
    const limitVal = limitSelect ? limitSelect.value : 'all';
    if (limitVal !== 'all') {
        const lim = parseInt(limitVal);
        if (!isNaN(lim) && lim > 0) rows = rows.slice(0, lim);
    }

    updateFilterSummary(rows.length, appState.parsedData.rows.length);
    return rows;
}

export function render2DChart() {
    if (!appState.parsedData || !appState.analysisResult) return;
    const xAxisSelect = $('x-axis-select');
    const yAxisSelect = $('y-axis-select');
    const chartTypeSelect = $('chart-type-select');
    const chartPanel = $('chart-panel');
    const chartTitle = $('chart-title');

    const xIdx = parseInt(xAxisSelect.value);
    const yIdx = parseInt(yAxisSelect.value);
    const rows = getFilteredRows();

    const labels = rows.map(r => r[xIdx]);
    const values = rows.map(r => parseFloat(r[yIdx]) || 0);

    const dynamicRecs = getDynamicRecommendations(labels, values, appState.analysisResult);

    let chartType = chartTypeSelect ? chartTypeSelect.value : 'auto';
    if (chartType === 'auto') {
        const valid2DTypes = ['bar', 'horizontalBar', 'line', 'pie', 'doughnut', 'scatter', 'radar', 'polarArea'];
        const matchedRec = dynamicRecs.find(r => {
            const mapped = r.type === 'donut' ? 'doughnut' : r.type;
            return valid2DTypes.includes(mapped);
        });
        chartType = matchedRec ? (matchedRec.type === 'donut' ? 'doughnut' : matchedRec.type) : 'bar';
    }

    if (appState.chart2d) {
        appState.chart2d.destroy();
        appState.chart2d = null;
    }
    if (chartPanel) chartPanel.style.display = '';

    const canvas = $('chart-2d');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const typeLabels = { bar: '막대', horizontalBar: '가로 막대', line: '선', pie: '파이', doughnut: '도넛', scatter: '산점도', radar: '레이더', polarArea: '폴라 에어리어' };
    if (chartTitle) chartTitle.textContent = `${typeLabels[chartType] || chartType} — ${appState.parsedData.headers[yIdx]}`;

    const themePalette = values.map((_, i) => COLORS[i % COLORS.length]);
    const primaryThemeColor = themePalette[0] || '#4f46e5';

    if (chartType === 'scatter' && appState.analysisResult.numericCols.length >= 2) {
        const xN = appState.analysisResult.numericCols[0], yN = appState.analysisResult.numericCols[1];
        appState.chart2d = new Chart(ctx, {
            type: 'scatter',
            data: { datasets: [{ label: `${appState.parsedData.headers[xN]} vs ${appState.parsedData.headers[yN]}`, data: rows.map(r => ({ x: parseFloat(r[xN]) || 0, y: parseFloat(r[yN]) || 0 })), backgroundColor: primaryThemeColor, pointRadius: 6, pointHoverRadius: 10 }] },
            options: chartOptions(chartType, appState.parsedData.headers[xN], appState.parsedData.headers[yN])
        });
    } else {
        const actualType = chartType === 'horizontalBar' ? 'bar' : chartType;
        const isPie = ['pie', 'doughnut', 'polarArea'].includes(chartType);
        const ds = {
            label: appState.parsedData.headers[yIdx],
            data: values,
            backgroundColor: isPie ? themePalette : primaryThemeColor,
            borderColor: isPie ? themePalette : primaryThemeColor,
            borderWidth: 2,
            fill: chartType === 'line' ? 'origin' : undefined,
            tension: chartType === 'line' ? 0.4 : undefined,
            pointRadius: chartType === 'line' ? 4 : undefined,
            borderRadius: chartType === 'bar' || chartType === 'horizontalBar' ? 4 : undefined,
        };
        const cfg = {
            type: actualType,
            data: { labels, datasets: [ds] },
            options: chartOptions(chartType, appState.parsedData.headers[xIdx], appState.parsedData.headers[yIdx])
        };
        if (chartType === 'horizontalBar') cfg.options.indexAxis = 'y';
        appState.chart2d = new Chart(ctx, cfg);
    }

    renderDataTable(appState.parsedData);
    return { labels, values };
}

function chartOptions(type, xLabel, yLabel) {
    const isPie = ['pie', 'doughnut', 'polarArea'].includes(type);
    return {
        responsive: true,
        maintainAspectRatio: false,
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

export function renderDataTable(data, highlightRow = -1) {
    const table = $('data-table');
    const rowCountEl = $('row-count');
    if (!table || !data) return;
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
    if (rowCountEl) rowCountEl.textContent = `(${data.rows.length}행 중 ${Math.min(max, data.rows.length)}행)`;

    table.querySelectorAll('tbody tr').forEach(tr => {
        tr.addEventListener('click', () => {
            const idx = parseInt(tr.dataset.idx);
            if (idx < appState.dataObjects.length && window.__selectObject) {
                window.__selectObject(appState.dataObjects[idx], idx);
            }
        });
    });
}

export function showDetailCard(ud, idx) {
    const detailSection = $('detail-card-section');
    const detailName = $('detail-name');
    const detailStats = $('detail-stats');
    const menuPanel = $('menu-panel');
    const yAxisSelect = $('y-axis-select');

    if (detailSection) detailSection.style.display = '';
    if (window.__openAccordionSection) window.__openAccordionSection('detail-card-section');
    if (menuPanel) menuPanel.classList.add('open');
    if (detailName) detailName.textContent = `📌 ${ud.name}`;

    if (!appState.parsedData || !detailStats) return;
    const row = appState.parsedData.rows[idx];
    let html = `<div class="stat-highlight">${typeof ud.value === 'number' ? ud.value.toLocaleString() : ud.value}</div>`;
    appState.parsedData.headers.forEach((h, ci) => {
        html += statRow(h, row[ci]);
    });

    if (appState.analysisResult && appState.analysisResult.numericCols.length > 0 && yAxisSelect) {
        const yIdx = parseInt(yAxisSelect.value);
        const allVals = appState.parsedData.rows.map(r => parseFloat(r[yIdx]) || 0);
        const sorted = [...allVals].sort((a, b) => b - a);
        const rank = sorted.indexOf(parseFloat(row[yIdx]) || 0) + 1;
        html += statRow('순위', `${rank} / ${allVals.length}`);
        const pct = ((parseFloat(row[yIdx]) || 0) / Math.max(...allVals, 1) * 100).toFixed(1);
        html += statRow('최대값 대비', `${pct}%`);
    }
    detailStats.innerHTML = html;
    renderMiniChart(idx);
}

export function renderMiniChart(highlightIdx) {
    if (appState.miniChart) {
        appState.miniChart.destroy();
        appState.miniChart = null;
    }
    if (!appState.parsedData) return;
    const yAxisSelect = $('y-axis-select');
    const xAxisSelect = $('x-axis-select');
    if (!yAxisSelect || !xAxisSelect) return;

    const yIdx = parseInt(yAxisSelect.value);
    const xIdx = parseInt(xAxisSelect.value);
    const labels = appState.parsedData.rows.map(r => r[xIdx]);
    const values = appState.parsedData.rows.map(r => parseFloat(r[yIdx]) || 0);

    const bgColors = values.map((_, i) =>
        i === highlightIdx ? 'rgba(79, 70, 229, 0.9)' : 'rgba(79, 70, 229, 0.2)'
    );

    const chartEl = $('detail-mini-chart');
    if (!chartEl) return;
    const ctx = chartEl.getContext('2d');
    appState.miniChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels,
            datasets: [{ data: values, backgroundColor: bgColors, borderRadius: 3, borderSkipped: false }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: { legend: { display: false }, tooltip: { enabled: true } },
            scales: {
                x: { display: false },
                y: { display: false, beginAtZero: true }
            }
        }
    });
}

export function bindChartPanelControls() {
    const chartPanel = $('chart-panel');
    const chartMaximizeBtn = $('chart-maximize-btn');
    const chartCloseBtn = $('chart-close-btn');

    chartMaximizeBtn?.addEventListener('click', () => {
        if (!chartPanel) return;
        chartPanel.classList.toggle('maximized');
        chartMaximizeBtn.textContent = chartPanel.classList.contains('maximized') ? '🗗' : '⛶';
    });

    chartCloseBtn?.addEventListener('click', () => {
        if (chartPanel) chartPanel.style.display = 'none';
    });
}
