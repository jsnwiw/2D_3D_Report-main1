/**
 * ==============================================================================
 * [analytics.js] 스마트 데이터 분석, 8대 기술통계, IQR 이상치 탐지 & 시각화 추천 엔진
 * ==============================================================================
 */
import { $, appState, showToast } from './state.js';

export function fmt(n) {
    return typeof n === 'number' ? n.toLocaleString(undefined, { maximumFractionDigits: 2 }) : n;
}

export function statRow(label, value) {
    return `<div class="stat-row"><span class="stat-label">${label}</span><span class="stat-value">${value}</span></div>`;
}

/**
 * 데이터셋 기술통계 및 컬럼 속성 분류
 */
export function analyzeData(data) {
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

/**
 * 분석 결과 UI 표출
 */
export function displayAnalysis(analysis) {
    const analysisSection = $('analysis-section');
    const analysisResultEl = $('analysis-result');
    if (analysisSection) analysisSection.style.display = '';
    if (!analysisResultEl) return;

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

/**
 * AI 인사이트 & 이상치(Anomaly) 자동 브리핑 렌더러
 */
export function renderAIInsights(analysis) {
    const box = $('ai-insight-box');
    const xAxisSelect = $('x-axis-select');
    const yAxisSelect = $('y-axis-select');
    if (!box || !appState.parsedData || !yAxisSelect || !xAxisSelect) return;

    const yIdx = parseInt(yAxisSelect.value);
    const xIdx = parseInt(xAxisSelect.value);
    if (isNaN(yIdx) || isNaN(xIdx) || !appState.parsedData.headers[yIdx]) return;

    const yColName = appState.parsedData.headers[yIdx];
    const rows = appState.parsedData.rows;
    const items = rows.map((r, i) => ({
        label: String(r[xIdx] || `항목 #${i + 1}`),
        value: parseFloat(r[yIdx]) || 0,
        idx: i
    })).filter(item => !isNaN(item.value));

    if (items.length === 0) {
        box.innerHTML = '';
        return;
    }

    const values = items.map(d => d.value).sort((a, b) => a - b);
    const count = values.length;
    const sum = values.reduce((a, b) => a + b, 0);
    const mean = sum / count;
    const median = count % 2 === 0 ? (values[count / 2 - 1] + values[count / 2]) / 2 : values[Math.floor(count / 2)];

    // IQR 기반 이상치 탐지
    const q1 = values[Math.floor(count * 0.25)];
    const q3 = values[Math.floor(count * 0.75)];
    const iqr = Math.max(q3 - q1, 0.0001);
    const upperLimit = q3 + 1.5 * iqr;
    const lowerLimit = q1 - 1.5 * iqr;

    const outliers = items.filter(d => d.value > upperLimit || d.value < lowerLimit);

    // 파레토 80/20 법칙
    const sortedDesc = [...items].sort((a, b) => b.value - a.value);
    const top20Count = Math.max(1, Math.round(count * 0.2));
    const top20Sum = sortedDesc.slice(0, top20Count).reduce((acc, cur) => acc + cur.value, 0);
    const top20Share = sum > 0 ? ((top20Sum / sum) * 100).toFixed(1) : 0;

    // 변동계수 (CV)
    const variance = values.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / count;
    const stddev = Math.sqrt(variance);
    const cv = mean > 0 ? (stddev / mean) : 0;

    let cvDesc = '항목 간 편차가 적당하며 안정적인 분포입니다.';
    if (cv < 0.3) cvDesc = '모든 항목이 고르게 평준화되어 차이가 적습니다.';
    else if (cv > 0.8) cvDesc = '항목 간 격차가 극심하여 상위 항목에 쏠려 있습니다.';

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

    $('btn-highlight-outliers')?.addEventListener('click', () => {
        if (!outliers.length) return;
        const target = appState.dataObjects[outliers[0].idx];
        if (target && window.__selectObject) {
            window.__selectObject(target, outliers[0].idx);
            showToast(`🎯 이상치 <strong>[${outliers[0].label}]</strong>에 카메라를 집중했습니다!`);
        }
    });
}

/**
 * 3D 스타일 자동 추천
 */
export function inferBest3DStyle(labels, values, analysis) {
    if (!analysis) return 'box';

    // 1. 2D 보조 차트 타입이 선택되어 있다면 3D 시각화도 자연스럽게 대응되는 3D 형태로 동기화
    const chartTypeSelect = $('chart-type-select');
    if (chartTypeSelect && chartTypeSelect.value && chartTypeSelect.value !== 'auto') {
        const ct = chartTypeSelect.value;
        if (ct === 'pie') return 'pie';
        if (ct === 'doughnut') return 'donut';
        if (ct === 'line') return 'line';
        if (ct === 'scatter') return 'scatter';
        if (ct === 'polarArea') return 'donut';
    }

    const xAxisSelect = $('x-axis-select');
    const yAxisSelect = $('y-axis-select');
    const xIdx = parseInt(xAxisSelect ? xAxisSelect.value : 0);
    const yIdx = parseInt(yAxisSelect ? yAxisSelect.value : (analysis.numericCols[0] || 0));
    const isXDate = analysis.dateCols.includes(xIdx);
    const count = labels.length;
    const yHeader = (analysis.headers[yIdx] || '').toLowerCase();

    // 2. 시계열/날짜 기준 데이터는 3D 입체 라인 또는 산악 면적
    if (isXDate) return count >= 10 ? 'area' : 'line';

    // 3. 비율, 점유율, 비중 데이터는 3D 도넛 또는 파이
    const sum = values.reduce((a, b) => a + b, 0);
    const isRatio = values.every(v => v >= 0) && (Math.abs(sum - 100) < 2 || values.every(v => v <= 1));
    if (isRatio || yHeader.includes('비율') || yHeader.includes('점유') || yHeader.includes('rate') || yHeader.includes('share') || yHeader.includes('percent') || yHeader.includes('마진')) {
        return count <= 8 ? 'donut' : 'pie';
    }

    // 4. 비용, 손실, 리스크 관련 지표는 피라미드 타워
    if (yHeader.includes('비용') || yHeader.includes('손실') || yHeader.includes('지출') || yHeader.includes('cost') || yHeader.includes('expense') || yHeader.includes('loss')) {
        return 'pyramid';
    }

    // 5. 음수 데이터가 포함되어 있으면 직육면체 박스
    const hasNegative = values.some(v => v < 0);
    if (hasNegative) return 'box';

    // 6. 데이터 개수별 형태
    if (count <= 10) return 'cylinder';
    if (count <= 25) return 'box';
    if (count <= 50) return 'scatter';
    return 'surface';
}

/**
 * 2D 차트 동적 추천
 */
export function getDynamicRecommendations(labels, values, analysis) {
    if (!analysis) return [];
    const xAxisSelect = $('x-axis-select');
    const xIdx = parseInt(xAxisSelect ? xAxisSelect.value : 0);
    const isXDate = analysis.dateCols.includes(xIdx);
    const count = labels.length;
    const recs = [];

    if (isXDate) {
        recs.push({ type: 'line', reason: `X축[${analysis.headers[xIdx]}]이 시계열 데이터이므로 추세선이 적합합니다.` });
    }
    const sum = values.reduce((a, b) => a + b, 0);
    const isRatio = values.every(v => v >= 0) && (Math.abs(sum - 100) < 2 || values.every(v => v <= 1));
    if (isRatio && count <= 8) {
        recs.push({ type: 'doughnut', reason: '비중(구성비) 비교에 도넛 차트가 최적입니다.' });
        recs.push({ type: 'pie', reason: '전체 대비 비율을 한눈에 파악할 수 있습니다.' });
    }
    if (count <= 15) {
        recs.push({ type: 'bar', reason: `${count}개 항목 간 크기 비교에 표준 세로 막대가 가장 직관적입니다.` });
    } else {
        recs.push({ type: 'horizontalBar', reason: `항목 수가 ${count}개로 많아 가로 막대 차트가 시인성이 좋습니다.` });
    }
    return recs;
}

/**
 * X/Y축 셀렉터 및 필터 옵션 초기화
 */
export function updateAxisSelectors(analysis) {
    const vizSection = $('viz-section');
    const filterSection = $('filter-section');
    const xAxisSelect = $('x-axis-select');
    const yAxisSelect = $('y-axis-select');
    const limitSelect = $('limit-select');
    const sortSelect = $('sort-select');
    const filterKeyword = $('filter-keyword');
    const rangeMin = $('range-min');
    const rangeMax = $('range-max');

    if (vizSection) vizSection.style.display = '';
    if (filterSection) filterSection.style.display = '';

    if (xAxisSelect && yAxisSelect) {
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

        if (appState.parsedData && appState.parsedData.rows.length > 30) {
            if (limitSelect) limitSelect.value = '30';
            if (sortSelect) sortSelect.value = 'desc';
        } else {
            if (limitSelect) limitSelect.value = 'all';
        }
        if (filterKeyword) filterKeyword.value = '';

        const yColName = analysis.headers[defY];
        if (analysis.numericStats[yColName]) {
            if (rangeMin) rangeMin.placeholder = `최소 (${fmt(analysis.numericStats[yColName].min)})`;
            if (rangeMax) rangeMax.placeholder = `최대 (${fmt(analysis.numericStats[yColName].max)})`;
        }
    }
}

/**
 * 카테고리 필터 옵션 갱신
 */
export function updateFilter(colIdx) {
    const dataFilter = $('data-filter');
    if (!dataFilter) return;
    dataFilter.innerHTML = '<option value="all">전체 보기</option>';
    if (!appState.parsedData) return;
    [...new Set(appState.parsedData.rows.map(r => r[colIdx]))].slice(0, 60).forEach(v => {
        dataFilter.appendChild(new Option(v, v));
    });
}

/**
 * 데이터 통계 및 컬럼 특성을 기반으로 최적의 AI 보고서 유형 추천
 */
export function inferBestReportType(ctx = {}) {
    const {
        yColName = '',
        count = 0,
        mean = 0,
        median = 0,
        cv = 0,
        outliers = [],
        top20Share = 0,
        topBottomRatio = 1,
        isDate = false
    } = ctx;

    const name = String(yColName).toLowerCase();

    // 1. 리스크/위험 지표 또는 극심한 이상치/고변동성
    if (/리스크|손실|불량|사고|결함|위험|error|loss|risk|defect|delay|fail/i.test(name) || outliers.length >= 3 || cv >= 75) {
        return {
            type: 'risk',
            name: '🚨 이상치 & 리스크 정밀 진단 보고서',
            reason: outliers.length > 0 
                ? `1.5×IQR 이상치 ${outliers.length}건 및 변동계수(${cv.toFixed(1)}%)가 높아 위험도 진단이 필수적입니다.`
                : `변동계수(${cv.toFixed(1)}%)가 높아 실적 편차 관리 및 안전망 수립이 권장됩니다.`
        };
    }

    // 2. 비용/원가/지출 관련 지표 또는 롱테일 구조
    if (/비용|원가|지출|소모|인력|예산|자원|cost|expense|spending|budget/i.test(name) || (parseFloat(top20Share) >= 70 && count >= 20)) {
        return {
            type: 'efficiency',
            name: '💡 자원 최적화 & 효율성 극대화 감사',
            reason: `비용/자원 투입 항목으로 상위 집중도(${top20Share}%)와 하위 롱테일의 효율성 개선이 핵심입니다.`
        };
    }

    // 3. 성과/실적/매출/랭킹 벤치마킹
    if (/매출|실적|판매|수주|점수|성적|달성|평가|score|sales|revenue|rank|target/i.test(name) || topBottomRatio >= 5) {
        return {
            type: 'performance',
            name: '🏆 성과 평가 & 랭킹 벤치마킹 보고서',
            reason: `항목 간 성과 격차(${topBottomRatio}배)가 뚜렷하여 최상위 챔피언 모범사례 벤치마킹에 최적입니다.`
        };
    }

    // 4. 성장/전망/트래픽/시계열
    if (isDate || /성장|전망|예측|트래픽|방문|사용자|회원|신규|growth|forecast|traffic|user|visit/i.test(name)) {
        return {
            type: 'forecast',
            name: '🔮 성장 잠재력 & 미래 예측 시나리오',
            reason: `시간 흐름 또는 성장 잠재력 지표로 단기·중기 예측 시나리오 분석에 적합합니다.`
        };
    }

    // 5. 왜도 및 분포 구조 (평균과 중앙값 괴리)
    const meanMedianDiffRatio = mean > 0 ? (Math.abs(mean - median) / mean) : 0;
    if (meanMedianDiffRatio >= 0.25 || (cv >= 20 && cv <= 50)) {
        return {
            type: 'distribution',
            name: '🌊 데이터 분포 & 사분위(IQR) 구조 분석',
            reason: `평균과 중앙값의 차이가 존재하고 사분위수(Q1~Q3) 중심의 분포 밀집도 진단이 유용합니다.`
        };
    }

    // 6. 다변량 및 대규모 표본
    if (count >= 50) {
        return {
            type: 'statistical',
            name: '📈 데이터 통계 & 트렌드 심층 분석',
            reason: `표본 수(${count}개)가 충분하여 8대 기술통계 및 정규성 유의성 검정에 가장 적합합니다.`
        };
    }

    // 7. 실무 과제/플랜
    if (/과제|프로젝트|계획|이행|목표|plan|task|kpi|action/i.test(name)) {
        return {
            type: 'action_plan',
            name: '🎯 실무 액션 플랜 & KPI 실행 로드맵',
            reason: `실무 액션 아이템과 단계별 실행 로드맵 수립에 최적화된 데이터입니다.`
        };
    }

    // 8. 표본이 매우 적을 때
    if (count <= 5) {
        return {
            type: 'summary',
            name: '⚡ C-Level 핵심 3줄 요약 브리핑',
            reason: `항목 수가 간결하여 경영진을 위한 핵심 3대 지표 압축 브리핑이 효과적입니다.`
        };
    }

    // 9. 기본 종합 경영 보고서
    return {
        type: 'business',
        name: '📊 종합 경영·비즈니스 전략 보고서',
        reason: `전체적인 현황 파악 및 파레토 80/20 전략 수립에 가장 균형 잡힌 보고서입니다.`
    };
}

/**
 * 보고서 유형 및 데이터 특성을 기반으로 최적의 분석 어조 자동 추천
 */
export function inferBestReportTone(reportType = 'business', ctx = {}) {
    switch (reportType) {
        case 'risk':
            return {
                tone: 'audit',
                name: '⚖️ 엄격한 감사·컴플라이언스체',
                reason: '이상치 및 변동 리스크 데이터에는 단호하고 명확한 감사 어조가 가장 효과적입니다.'
            };
        case 'statistical':
        case 'distribution':
            return {
                tone: 'academic',
                name: '🔬 데이터 사이언스 분석가체',
                reason: '기술통계 및 사분위수(IQR) 검증에는 객관적이고 학술적인 분석가 어조가 적합합니다.'
            };
        case 'summary':
            return {
                tone: 'briefing',
                name: '⚡ 초단축 개조식 브리핑체',
                reason: 'C-Level 경영진의 즉각적인 의사결정을 위해 군더더기 없는 개조식 요약이 최적입니다.'
            };
        case 'forecast':
            return {
                tone: 'inspirational',
                name: '🚀 스타트업 그로스 해킹체',
                reason: '미래 성장 시나리오와 잠재력 확장을 위해 진취적인 성장 드라이브 어조가 어울립니다.'
            };
        case 'action_plan':
            return {
                tone: 'practical',
                name: '💡 알기 쉬운 실무 보고체',
                reason: '현업 부서 실무진의 즉각적인 실행을 유도하기 위해 친절하고 명확한 실무 어조가 좋습니다.'
            };
        case 'efficiency':
            return {
                tone: 'consulting',
                name: '🏛️ 전략 컨설팅 자문체',
                reason: '자원 재배치 및 비용 절감 의사결정을 위해 설득력 높은 전략 컨설턴트 어조가 적합합니다.'
            };
        case 'performance':
        case 'business':
        default:
            return {
                tone: 'formal',
                name: '👔 전문 비즈니스 격식체',
                reason: '공문서 및 공식 경영 보고서에 가장 신뢰성 높은 정통 비즈니스 격식체입니다.'
            };
    }
}
