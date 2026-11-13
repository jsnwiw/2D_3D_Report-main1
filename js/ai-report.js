/**
 * ==============================================================================
 * [ai-report.js] AI 맞춤 분석 보고서 스튜디오 (AI Report Studio) & A4 PDF 인쇄 엔진
 * ==============================================================================
 */
import { $, appState, showToast, sleep } from './state.js';
import { fmt, inferBestReportType, inferBestReportTone } from './analytics.js';
import { render2DChart } from './chart2d.js';

/**
 * 선택된 분석 어조(Tone)에 따라 본문 텍스트 문체 및 종결어미 변환
 */
export function applyToneToText(text, tone = 'formal') {
    if (!text || typeof text !== 'string') return text;
    if (tone === 'formal') return text;

    let res = text;
    switch (tone) {
        case 'academic': // 한다체 (학술 연구 분석가)
            res = res
                .replace(/집계되었습니다\./g, '집계되었다.')
                .replace(/형성하고 있습니다\./g, '형성하고 있다.')
                .replace(/기록하고 있습니다\./g, '기록하고 있다.')
                .replace(/포착하였습니다\./g, '포착하였다.')
                .replace(/제언합니다\./g, '제언함.')
                .replace(/차지하고 있습니다\./g, '차지한다.')
                .replace(/주효합니다\./g, '주효하다.')
                .replace(/구조입니다\./g, '구조이다.')
                .replace(/필요합니다\./g, '필요하다.')
                .replace(/낮습니다\./g, '낮다.')
                .replace(/보입니다\./g, '보인다.')
                .replace(/상태입니다\./g, '상태이다.')
                .replace(/두드러집니다\./g, '두드러진다.')
                .replace(/유도하십시오\./g, '유도할 것을 권고함.')
                .replace(/얻을 수 있습니다\./g, '얻을 수 있음.')
                .replace(/실행하십시오\./g, '실행할 필요가 있음.')
                .replace(/완화하십시오\./g, '완화할 것을 요함.')
                .replace(/가동하십시오\./g, '가동함이 타당함.')
                .replace(/정립하십시오\./g, '정립할 필요가 있음.')
                .replace(/투입하십시오\./g, '투입할 것을 제언함.')
                .replace(/의무화하십시오\./g, '의무화할 것을 권고함.')
                .replace(/전파하십시오\./g, '전파할 필요가 있음.')
                .replace(/부여하십시오\./g, '부여할 것을 제언함.')
                .replace(/끌어올리십시오\./g, '끌어올려야 함.')
                .replace(/삼으십시오\./g, '삼아야 함.')
                .replace(/모니터링하십시오\./g, '모니터링해야 함.')
                .replace(/포착하십시오\./g, '포착할 것을 권고함.')
                .replace(/확대하십시오\./g, '확대해야 함.')
                .replace(/구축하십시오\./g, '구축할 것을 제언함.')
                .replace(/마련하십시오\./g, '마련해야 함.')
                .replace(/극대화하십시오\./g, '극대화할 것을 요함.')
                .replace(/절감하십시오\./g, '절감해야 함.')
                .replace(/정착시키십시오\./g, '정착시킬 것을 권고함.')
                .replace(/단행하십시오\./g, '단행해야 함.')
                .replace(/점검하십시오\./g, '점검할 것을 요함.')
                .replace(/가속화하십시오\./g, '가속화할 필요가 있음.')
                .replace(/감지되었습니다\./g, '감지되었다.')
                .replace(/발견되지 않았습니다\./g, '발견되지 않았다.')
                .replace(/입증했습니다\./g, '입증하였다.')
                .replace(/수립하였습니다\./g, '수립하였다.')
                .replace(/정의하였습니다\./g, '정의하였다.');
            break;

        case 'practical': // 해요체 (친절한 실무 협업)
            res = res
                .replace(/집계되었습니다\./g, '집계되었어요.')
                .replace(/형성하고 있습니다\./g, '형성하고 있어요.')
                .replace(/기록하고 있습니다\./g, '기록하고 있어요.')
                .replace(/포착하였습니다\./g, '포착했어요.')
                .replace(/제언합니다\./g, '제안드려요.')
                .replace(/차지하고 있습니다\./g, '차지하고 있어요.')
                .replace(/주효합니다\./g, '효과적이에요.')
                .replace(/구조입니다\./g, '구조예요.')
                .replace(/필요합니다\./g, '필요해요.')
                .replace(/낮습니다\./g, '낮아요.')
                .replace(/보입니다\./g, '보여줘요.')
                .replace(/상태입니다\./g, '상태예요.')
                .replace(/두드러집니다\./g, '두드러져요.')
                .replace(/하십시오\./g, '해보시는 것을 추천드려요.')
                .replace(/얻을 수 있습니다\./g, '얻으실 수 있어요.')
                .replace(/감지되었습니다\./g, '감지되었어요.')
                .replace(/발견되지 않았습니다\./g, '발견되지 않았어요.')
                .replace(/입증했습니다\./g, '입증했어요.')
                .replace(/수립하였습니다\./g, '수립했어요.')
                .replace(/정의하였습니다\./g, '정의했어요.');
            break;

        case 'consulting': // 전략 컨설팅체 (맥킨지 스타일)
            res = res
                .replace(/집계되었습니다\./g, '도출되었습니다.')
                .replace(/제언합니다\./g, '전략적으로 제언드립니다.')
                .replace(/하십시오\./g, '할 것을 강력히 권고드립니다.')
                .replace(/구조입니다\./g, '구조로 분석됩니다.')
                .replace(/두드러집니다\./g, '핵심 레버리지 포인트로 사료됩니다.')
                .replace(/필요합니다\./g, '필수적인 전략 과제로 판단됩니다.');
            break;

        case 'audit': // 엄격한 감사체 (컴플라이언스 리스크)
            res = res
                .replace(/집계되었습니다\./g, '확인·검증되었습니다.')
                .replace(/제언합니다\./g, '즉시 조치 권고안을 송부합니다.')
                .replace(/하십시오\./g, '에 대해 즉시 시정 조치 요망합니다.')
                .replace(/두드러집니다\./g, '집중 위험 요소로 지적됩니다.')
                .replace(/필요합니다\./g, '긴급 감사가 요구됩니다.');
            break;

        case 'inspirational': // 스타트업 그로스 해킹체
            res = res
                .replace(/집계되었습니다\./g, '달성해냈습니다!')
                .replace(/기록하고 있습니다\./g, '폭발적으로 질주하고 있습니다!')
                .replace(/제언합니다\./g, '공격적인 성장 액션을 제안합니다!')
                .replace(/하십시오\./g, '하여 성장 모멘텀을 한계 돌파하십시오!')
                .replace(/두드러집니다\./g, '압도적인 초격차를 만들어내고 있습니다!');
            break;

        case 'briefing': // 초단축 개조식 브리핑체
            res = res
                .replace(/집계되었습니다\./g, '집계됨.')
                .replace(/형성하고 있습니다\./g, '형성 중.')
                .replace(/기록하고 있습니다\./g, '기록 중.')
                .replace(/포착하였습니다\./g, '포착 완료.')
                .replace(/제언합니다\./g, '제언.')
                .replace(/차지하고 있습니다\./g, '점유.')
                .replace(/구조입니다\./g, '구조.')
                .replace(/필요합니다\./g, '필요.')
                .replace(/두드러집니다\./g, '현저.')
                .replace(/하십시오\./g, '조치 요망.')
                .replace(/얻을 수 있습니다\./g, '달성 가능.')
                .replace(/감지되었습니다\./g, '감지됨.')
                .replace(/발견되지 않았습니다\./g, '이상 없음.');
            break;
    }
    return res;
}

/**
 * 데이터 특성에 따른 AI 추천 보고서 유형 및 어조 배지 UI 갱신
 */
export function updateReportRecommendationUI() {
    if (!appState.parsedData || !appState.analysisResult) return null;
    const yAxisSelect = $('y-axis-select');
    const xAxisSelect = $('x-axis-select');
    const yIdx = parseInt(yAxisSelect ? yAxisSelect.value : (appState.analysisResult.numericCols[0] || 0));
    const xIdx = parseInt(xAxisSelect ? xAxisSelect.value : 0);
    const yColName = appState.parsedData.headers[yIdx] || '값';
    const numStat = appState.analysisResult.numericStats?.[yColName];
    if (!numStat) return null;

    const count = numStat.count || appState.parsedData.rows.length;
    const mean = numStat.mean || 0;
    const median = numStat.median || mean;
    const stddev = numStat.stddev || 0;
    const cv = mean > 0 ? (stddev / mean) * 100 : 0;
    const q1 = numStat.q1 || (mean * 0.7);
    const q3 = numStat.q3 || (mean * 1.3);
    const iqr = Math.max(q3 - q1, 0.001);
    const upperLimit = q3 + 1.5 * iqr;
    const lowerLimit = q1 - 1.5 * iqr;

    const values = appState.parsedData.rows.map(r => parseFloat(r[yIdx])).filter(v => !isNaN(v)).sort((a, b) => b - a);
    const outliers = values.filter(v => v > upperLimit || v < lowerLimit);
    const sum = numStat.sum || values.reduce((a, b) => a + b, 0);
    const top20Count = Math.max(1, Math.round(count * 0.2));
    const top20Sum = values.slice(0, top20Count).reduce((a, b) => a + b, 0);
    const top20Share = sum > 0 ? ((top20Sum / sum) * 100).toFixed(1) : '0';
    const topBottomRatio = values.length > 1 && values[values.length - 1] > 0
        ? (values[0] / values[values.length - 1]).toFixed(1)
        : '1.0';

    const rec = inferBestReportType({
        yColName, count, mean, median, cv, outliers, top20Share, topBottomRatio,
        isDate: appState.analysisResult.dateCols?.includes(xIdx)
    });

    const toneRec = inferBestReportTone(rec.type, { yColName, cv, outliers });

    // 사이드바 배지 업데이트
    const sidebarBadge = $('ai-recommended-report-badge');
    const sidebarName = $('recommended-report-type-name');
    const sidebarReason = $('recommended-report-type-reason');
    if (sidebarBadge && sidebarName) {
        sidebarName.textContent = rec.name;
        if (sidebarReason) sidebarReason.textContent = `${rec.reason} (어조: ${toneRec.name.split(' ')[1] || '맞춤'})`;
        sidebarBadge.style.display = 'block';
    }

    // 모달 내 통합 추천 알림 바 업데이트
    const recommendRow = $('ai-toolbar-recommend-row');
    const detectedReason = $('ai-report-detected-reason');
    const toneReasonBox = $('ai-tone-detected-reason');
    if (detectedReason) {
        detectedReason.innerHTML = `<strong>[유형]</strong> ${rec.name}`;
    }
    if (toneReasonBox) {
        toneReasonBox.innerHTML = `&nbsp;•&nbsp; <strong>[어조]</strong> ${toneRec.name}`;
    }
    if (recommendRow) {
        recommendRow.style.display = 'flex';
    }

    return { typeRec: rec, toneRec };
}

/**
 * AI 리포트 스튜디오 모달 열기 및 자동 작성
 */
export async function openAiReportStudio(options = {}) {
    if (!appState.parsedData || !appState.analysisResult) {
        showToast('⚠️ <strong>데이터 필요:</strong> 먼저 CSV 또는 엑셀 파일을 업로드해 주세요.');
        return;
    }
    const aiReportModal = $('ai-report-modal');
    if (aiReportModal) {
        aiReportModal.style.display = 'flex';
        updateReportRecommendationUI();
        await generateAIReport(options);
    }
}

/**
 * 프로그레스 바 상태 갱신
 */
function setReportProgress(percent, text) {
    const aiProgressBarFill = $('ai-progress-bar-fill');
    const aiProgressText = $('ai-progress-text');
    if (aiProgressBarFill) aiProgressBarFill.style.width = `${percent}%`;
    if (aiProgressText) aiProgressText.textContent = text;
}

/**
 * 🖨️ A4 인쇄 및 PDF 저장
 */
export function printCurrentReport() {
    const aiReportContent = $('ai-report-content');
    const reportContainer = $('print-report-container');
    if (!aiReportContent || !aiReportContent.innerHTML.trim()) {
        showToast('⚠️ 인쇄할 보고서가 없습니다. 먼저 보고서를 작성해 주세요.');
        return;
    }
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

/**
 *  ✨ AI 보고서 자동 작성 메인 컨트롤러
 */
export async function generateAIReport(options = {}) {
    const aiReportType = $('ai-report-type');
    const aiReportTone = $('ai-report-tone');
    const aiReportEngine = $('ai-report-engine');
    const aiGenerationProgress = $('ai-generation-progress');
    const aiReportContent = $('ai-report-content');
    const xAxisSelect = $('x-axis-select');
    const yAxisSelect = $('y-axis-select');
    const fileNameDisplay = $('file-name');

    try {
        if (!appState.parsedData || !appState.analysisResult) {
            showToast('⚠️ 분석할 데이터가 없습니다.');
            return;
        }

        const type = aiReportType ? aiReportType.value : 'business';
        const typeLabel = aiReportType?.selectedOptions?.[0]?.textContent || '종합 경영·비즈니스 전략 보고서';
        const tone = aiReportTone ? aiReportTone.value : 'formal';
        const engine = aiReportEngine ? aiReportEngine.value : 'builtin';

        if (aiGenerationProgress) aiGenerationProgress.style.display = 'block';
        setReportProgress(20, '1단계: 데이터셋 구조 및 8대 기술통계 지표 산출 중...');


        const yIdx = parseInt(yAxisSelect ? yAxisSelect.value : 1);
        const xIdx = parseInt(xAxisSelect ? xAxisSelect.value : 0);
        const yColName = appState.parsedData.headers[yIdx] || '값';
        const xColName = appState.parsedData.headers[xIdx] || '항목';

        const rows = appState.parsedData.rows;
        const items = rows.map((r, i) => ({
            label: String(r[xIdx] || `항목 #${i + 1}`),
            value: parseFloat(r[yIdx]) || 0,
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
        const cv = mean > 0 ? ((stddev / mean) * 100) : 0;

        const q1 = values[Math.floor(count * 0.25)];
        const q3 = values[Math.floor(count * 0.75)];
        const iqr = Math.max(q3 - q1, 0.0001);
        const upperLimit = q3 + 1.5 * iqr;
        const lowerLimit = q1 - 1.5 * iqr;
        const highOutliers = items.filter(d => d.value > upperLimit);
        const lowOutliers = items.filter(d => d.value < lowerLimit);
        const outliers = [...highOutliers, ...lowOutliers];

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

        //  데이터 특성 기반 AI 최적 보고서 유형 자동 추론
        const recommendedReport = inferBestReportType({
            yColName, count, mean, median, cv, outliers,
            top20Share, topBottomRatio,
            isDate: appState.analysisResult?.dateCols?.includes(xIdx)
        });

        let resolvedType = type;
        let resolvedTypeLabel = typeLabel;

        if (type === 'auto') {
            resolvedType = recommendedReport.type;
            resolvedTypeLabel = recommendedReport.name;
            const autoBadge = $('ai-report-auto-badge');
            if (autoBadge) autoBadge.textContent = `AI 추천 적용`;
            const reasonBox = $('ai-report-detected-reason');
            if (reasonBox) {
                reasonBox.innerHTML = `<strong>[유형]</strong> ${recommendedReport.name}`;
            }
        }

        // 👔 데이터 및 보고서 유형 기반 AI 최적 어조 자동 추론
        const recommendedTone = inferBestReportTone(resolvedType, { yColName, cv, outliers });

        let resolvedTone = tone;
        let resolvedToneLabel = aiReportTone?.selectedOptions?.[0]?.textContent || '전문 비즈니스 격식체';

        if (tone === 'auto') {
            resolvedTone = recommendedTone.tone;
            resolvedToneLabel = recommendedTone.name;
            const toneBadge = $('ai-tone-auto-badge');
            if (toneBadge) toneBadge.textContent = `AI 어조 적용`;
            const toneReasonBox = $('ai-tone-detected-reason');
            if (toneReasonBox) {
                toneReasonBox.innerHTML = `&nbsp;•&nbsp; <strong>[어조]</strong> ${recommendedTone.name}`;
            }
        }

        const recommendRow = $('ai-toolbar-recommend-row');
        if (recommendRow && (type === 'auto' || tone === 'auto')) {
            recommendRow.style.display = 'flex';
        }

        let multiColAnalysis = null;
        const otherNumCols = appState.analysisResult.numericCols ? appState.analysisResult.numericCols.filter(ci => ci !== yIdx && ci !== xIdx) : [];
        if (otherNumCols.length > 0) {
            const otherColNames = otherNumCols.map(ci => appState.parsedData.headers[ci]);
            multiColAnalysis = {
                names: otherColNames,
                info: otherColNames.map(name => {
                    const s = appState.analysisResult.numericStats[name];
                    return s ? `${name}(총합: ${fmt(s.sum || 0)}, 평균: ${fmt(Math.round(s.mean || 0))})` : name;
                }).join(', ')
            };
        }

        await sleep(100);
        setReportProgress(75, '3단계: 3D 공간 시각화 융합 및 비즈니스 전략 인사이트 추론 중...');

        let aiGeneratedSections = null;
        let usedEngineLabel = '⚡ 내장 고성능 AI 엔진 (Built-in Data Intelligence)';

        if (engine === 'gemini') {
            const geminiKey = localStorage.getItem('agy_gemini_api_key');
            if (geminiKey) {
                try {
                    setReportProgress(85, 'Google Gemini LLM에 데이터를 전송하여 보고서를 생성하는 중...');
                    aiGeneratedSections = await callGeminiReportAPI(geminiKey, {
                        type: resolvedType, typeLabel: resolvedTypeLabel, tone: resolvedTone, toneLabel: resolvedToneLabel, xColName, yColName, count, sum, mean, median, min, max, stddev, cv,
                        top1, top20Count, top20Share, outliers, bottom1, topBottomRatio,
                        fileName: appState.currentUploadedFile ? appState.currentUploadedFile.name : '데이터세트'
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
                        type: resolvedType, typeLabel: resolvedTypeLabel, tone: resolvedTone, toneLabel: resolvedToneLabel, xColName, yColName, count, sum, mean, median, min, max, stddev, cv,
                        top1, top20Count, top20Share, outliers, bottom1, topBottomRatio,
                        fileName: appState.currentUploadedFile ? appState.currentUploadedFile.name : '데이터세트'
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

        if (!aiGeneratedSections) {
            aiGeneratedSections = buildBuiltinAIReport({
                type: resolvedType, typeLabel: resolvedTypeLabel, tone: resolvedTone, toneLabel: resolvedToneLabel, xColName, yColName, count, sum, mean, median, min, max, range, stddev, cv,
                top1, top2, top3, bottom1, bottom2, top20Count, top20Sum, top20Share, top1Share, top3Share, topBottomRatio,
                outliers, highOutliers, lowOutliers, q1, q3, iqr, upperLimit, lowerLimit, sortedDesc, multiColAnalysis,
                fileName: appState.currentUploadedFile ? appState.currentUploadedFile.name : (fileNameDisplay?.textContent || '데이터 세트')
            });
        }

        await sleep(80);
        setReportProgress(100, '✨ AI 맞춤형 분석 보고서 작성 완료!');

        // 2D 데이터 시각화 차트 스냅샷 캡처 (보고서 삽입용)
        let snap2D = '';
        try {
            if (!appState.chart2d) {
                render2DChart();
            }
            if (appState.chart2d) {
                snap2D = appState.chart2d.toBase64Image('image/png', 1);
            }
            if (!snap2D) {
                const chartCanvas = $('chart-2d');
                if (chartCanvas) {
                    snap2D = chartCanvas.toDataURL('image/png');
                }
            }
        } catch (e) {
            console.warn('2D 차트 스냅샷 추출 실패:', e);
        }

        const now = new Date();
        const dateStr = `${now.getFullYear()}.${String(now.getMonth() + 1).padStart(2, '0')}.${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
        const docId = `DOC-${now.getFullYear()}-${Math.random().toString(36).substring(2, 7).toUpperCase()}`;
        const fileNameStr = appState.currentUploadedFile ? appState.currentUploadedFile.name : (fileNameDisplay?.textContent || '데이터 세트');

        let tableRowsHtml = '';
        const previewRows = appState.parsedData.rows.slice(0, 12);
        previewRows.forEach(r => {
            tableRowsHtml += '<tr>';
            appState.parsedData.headers.slice(0, 6).forEach((_, ci) => {
                tableRowsHtml += `<td>${r[ci]}</td>`;
            });
            tableRowsHtml += '</tr>';
        });

        const finalReportHtml = `
            <div class="report-doc-top">
                <span class="report-doc-confidential">● CONFIDENTIAL / 내부 경영 분석용</span>
                <span class="report-doc-num">문서번호: ${docId}</span>
            </div>

            <div class="report-doc-header">
                <div class="report-title-area">
                    <h2 class="report-main-title report-editable" contenteditable="${appState.isReportEditMode}">${aiGeneratedSections.title}</h2>
                    <p class="report-sub-title report-editable" contenteditable="${appState.isReportEditMode}">${aiGeneratedSections.subtitle}</p>
                </div>
                <div class="report-doc-meta">
                    <div><strong>출력 일시:</strong> ${dateStr}</div>
                    <div><strong>분석 파일:</strong> ${fileNameStr}</div>
                    <div><strong>분석 대상:</strong> [X: ${xColName}] × [Y: ${yColName}]</div>
                    <div class="report-meta-tag">${usedEngineLabel}</div>
                </div>
            </div>

            ${appState.isReportEditMode ? `
            <div class="report-edit-banner">
                <span>✏️ <strong>직접 편집 모드 활성화됨:</strong> 보고서 제목, 요약문, 분석 내용, 제언을 클릭하여 직접 수정할 수 있습니다.</span>
                <span style="font-size:11px; color:#3b82f6;">편집 완료 후 [🖨️ 인쇄 / PDF 저장]을 누르면 수정된 내용 그대로 출력됩니다.</span>
            </div>
            ` : ''}

            <!-- 섹션 1: 경영진 핵심 요약 -->
            <div class="report-section">
                <div class="report-section-title">💡 1. 핵심 경영진 브리핑 (Executive Summary)</div>
                <div class="report-exec-box report-editable" contenteditable="${appState.isReportEditMode}">
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

            <!-- 섹션 3: 2D 데이터 시각화 분석 차트 -->
            <div class="report-section">
                <div class="report-section-title">📈 3. 2D 데이터 시각화 분석 차트 (Data Visualization)</div>
                <div class="report-visual-card single-2d">
                    <div class="report-visual-card-header">
                        <h5>📊 [${xColName}] 기준 [${yColName}] 다변량 2D 분석 차트</h5>
                        <span class="report-visual-badge">2D 고해상도 시각화</span>
                    </div>
                    ${snap2D ? `
                        <div class="report-chart-img-wrap">
                            <img src="${snap2D}" alt="2D 데이터 시각화 차트" class="report-2d-chart-img">
                        </div>
                    ` : `
                        <div class="report-chart-empty">차트 이미지를 생성할 수 없습니다.</div>
                    `}
                    <div class="report-visual-caption">▲ ${xColName} 항목별 ${yColName} 지표 분포 및 수치 비교 (Chart.js 2D 시각화)</div>
                </div>
            </div>

            <!-- 섹션 4: AI 데이터 심층 진단 & 패턴 분석 -->
            <div class="report-section">
                <div class="report-section-title">🔍 4. AI 데이터 심층 진단 & 패턴 분석 (Deep Diagnostics)</div>
                <div class="report-deep-grid">
                    <div class="report-deep-card info report-editable" contenteditable="${appState.isReportEditMode}">
                        <div class="report-deep-title">📊 파레토(Pareto 80/20) 집중도 분석</div>
                        <div>${aiGeneratedSections.paretoDiagnostic}</div>
                    </div>
                    <div class="report-deep-card ${outliers.length > 0 ? 'warning' : 'success'} report-editable" contenteditable="${appState.isReportEditMode}">
                        <div class="report-deep-title">${outliers.length > 0 ? '⚠️ 1.5×IQR 이상치(Outlier) 정밀 진단' : '✅ 통계적 이상치 검증 완료'}</div>
                        <div>${aiGeneratedSections.outlierDiagnostic}</div>
                    </div>
                    <div class="report-deep-card report-editable" contenteditable="${appState.isReportEditMode}">
                        <div class="report-deep-title">🌊 분포 균일도 및 변동 위험도 (CV 분석)</div>
                        <div>${aiGeneratedSections.cvDiagnostic}</div>
                    </div>
                    <div class="report-deep-card report-editable" contenteditable="${appState.isReportEditMode}">
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
                        <div class="report-recom-content report-editable" contenteditable="${appState.isReportEditMode}">
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
                        <tr>${appState.parsedData.headers.slice(0, 6).map(h => `<th>${h}</th>`).join('')}</tr>
                    </thead>
                    <tbody>${tableRowsHtml}</tbody>
                </table>
            </div>

            <!-- 섹션 6: 공문서 승인 및 결재란 -->
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

        // 실시간 AI 텍스트 스트리밍 타이핑 연출
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
                    if (cur) execBox.insertBefore(p, cur);
                    else execBox.appendChild(p);
                }
                const cur = execBox.querySelector('.ai-typing-cursor');
                if (cur) cur.remove();
            }
        }

        showToast('🎉 <strong>AI 자동 보고서 작성 완료!</strong> [🖨️ 인쇄 / PDF 저장] 버튼을 누르면 A4 규격으로 출력 및 보관하실 수 있습니다.');
    } catch (err) {
        console.error('AI 보고서 작성 실패:', err);
        showToast('⚠️ AI 보고서 작성 중 예외가 발생했습니다: ' + (err.message || err));
    } finally {
        setTimeout(() => {
            if (aiGenerationProgress) aiGenerationProgress.style.display = 'none';
        }, 1200);
    }
}

/**
 * 내장 고성능 AI 분석 보고서 생성 엔진
 */
export function buildBuiltinAIReport(ctx = {}) {
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

    let title = `[AI 정밀 진단] ${xColName}별 ${yColName} 종합 분석 및 전략 인사이트 보고서`;
    let subtitle = `데이터 기반 의사결정 지원을 위한 ${count}개 개체 실적 평가 및 이상치 검증 요약`;

    let executiveSummary = '';
    let recommendations = [];

    const calcTop3Ratio = (sum > 0 && top3Share !== '0') ? top3Share : (sortedDesc && sortedDesc.length >= 3 && sum > 0 ? ((sortedDesc.slice(0, 3).reduce((a, b) => a + b.value, 0) / sum) * 100).toFixed(1) : '0');

    if (type === 'statistical') {
        title = `[통계 심층 분석] ${yColName}의 공간적 분포 및 통계적 유의성 검정 보고서`;
        subtitle = `1.5×IQR 이상치 진단, 파레토 집중도, 정규성 및 변동계수(CV) 정량 평가`;
        executiveSummary = `
            <p>본 통계 심층 분석서는 <strong>${fileName}</strong> 데이터셋(${count}개 ${xColName})의 <strong>${yColName}</strong> 지표에 대해 기술통계량과 사분위수(IQR) 분포를 정밀 분석한 결과입니다. 표본 전체 합계는 <strong>${fmt(sum)}</strong>, 산술평균은 <strong>${fmt(Math.round(mean))}</strong>, 중앙값(Median)은 <strong>${fmt(Math.round(median))}</strong>이며, 평균과 중앙값 간의 편차는 <strong>${fmt(Math.abs(Math.round(mean - median)))}</strong> 수준으로 데이터의 비대칭도(Skewness)를 보여줍니다.</p>
            <p>산포도 지표에서는 표준편차 <strong>${fmt(Math.round(stddev))}</strong>, 변동계수(CV) <strong>${cv.toFixed(1)}%</strong>로 산출되었으며, 1사분위수(Q1: ${fmt(Math.round(q1))})와 3사분위수(Q3: ${fmt(Math.round(q3))}) 간의 사분위범위(IQR)는 <strong>${fmt(Math.round(iqr))}</strong>입니다. 중간 50%의 개체들이 비교적 집중되어 있으나, 상위 극단 개체로 인한 우측 꼬리 분포(Right-skewed) 경향이 관찰됩니다.</p>
            <p>통계적 유의성 검정 관점에서 1.5×IQR 신뢰구간([${fmt(Math.round(lowerLimit))} ~ ${fmt(Math.round(upperLimit))}])을 이탈한 이상치는 총 <strong>${outliers.length}건</strong>으로 집계되었습니다. 데이터의 왜곡 가능성을 통제한 상태에서 핵심 모수를 신뢰할 수 있도록 3단계 통계 관리 기준을 권고합니다.</p>
        `;
        recommendations = [
            {
                title: `통계적 관리 한계선(UCL/LCL) 기반 3σ 이상 징후 자동 탐지`,
                desc: `사분위수 신뢰구간([${fmt(Math.round(lowerLimit))} ~ ${fmt(Math.round(upperLimit))}])을 상시 모니터링 한계선으로 고정하여 임계치 초과 개체를 실시간 탐지하십시오.`
            },
            {
                title: `평균-중앙값 괴리에 따른 편향 보정 알고리즘 적용`,
                desc: `산술평균(${fmt(Math.round(mean))}) 대비 중앙값(${fmt(Math.round(median))})의 차이가 유의미하므로, 극단치 가중치를 완화하는 절사평균(Trimmed Mean) 지표를 보조 지표로 병행 활용하십시오.`
            },
            {
                title: `정기적 표본 분산 및 변동계수(CV ${cv.toFixed(1)}%) 추세 추적`,
                desc: `시계열 누적 데이터가 축적됨에 따라 변동계수의 시간적 추이를 추적하여 공정/실적의 안정성 지수(Stability Index)를 정기 산출하십시오.`
            }
        ];
    } else if (type === 'risk') {
        title = `[리스크 정밀 진단] ${yColName} 편차 및 변동 위험 관리 전략 브리핑`;
        subtitle = `상·하위 실적 격차(${topBottomRatio}배) 완화 및 극단치 개체 집중 리스크 모니터링`;
        executiveSummary = `
            <p>본 위험 진단 보고서는 <strong>${fileName}</strong> 내 <strong>${yColName}</strong>의 변동성 및 극단치 편차로 인해 발생할 수 있는 잠재적 비즈니스 리스크를 정밀 평가한 문서입니다. 최상위 1위 개체 <strong>[${top1.label}](${fmt(top1.value)})</strong>와 최하위 개체 간 스프레드 배율이 <strong>${topBottomRatio}배</strong>에 달하여 심각한 실적 편중 위험이 존재합니다.</p>
            <p>특히 1.5×IQR 기준을 초과하는 이상치 개체 <strong>${outliers.length}건</strong>이 포착되었으며, 변동계수(CV)는 <strong>${cv.toFixed(1)}%</strong>를 기록하고 있습니다. 이는 특정 외부 변수나 주요 거래처 1~2곳의 급격한 변동 시 전체 성과가 크게 흔들릴 수 있는 구조적 취약성을 내포합니다.</p>
            <p>따라서 상위 집중도를 다변화하고, 부진 개체의 위험성을 사전에 차단하기 위한 위기 대응 시나리오와 안전망 구축이 시급합니다.</p>
        `;
        recommendations = [
            {
                title: `최상위 항목 [${top1.label}]에 대한 의존도 분산 및 포트폴리오 다변화`,
                desc: `단일 항목이 전체의 ${top1Share}%를 점유하고 있으므로, 2~5위 중위권 개체에 대한 마케팅 및 지원을 강화하여 편중 리스크를 선제 완화하십시오.`
            },
            {
                title: `하위권 한계 개체 조기 경보(EWS: Early Warning System) 가동`,
                desc: `하위 실적군([${bottom1.label}] 등)의 부진 원인을 즉시 실사하고, 손익분기 한계선 미달 시 긴급 개선 또는 사업 재검토 프로세스를 가동하십시오.`
            },
            {
                title: `변동성 완화를 위한 완충(Buffer) 자원 및 리스크 관리 기준 수립`,
                desc: `CV ${cv.toFixed(1)}% 수준의 불확실성에 대비하여 분기별 완충 예산과 위기 대응 표준 매뉴얼을 공식 정립하십시오.`
            }
        ];
    } else if (type === 'summary') {
        title = `[C-Level 핵심 브리핑] ${xColName} × ${yColName} 3대 핵심 경영 지표 요약`;
        subtitle = `최고경영진의 신속한 의사결정을 위한 3줄 핵심 요약 및 전략 방향`;
        executiveSummary = `
            <p><strong>[1. 전체 규모]</strong> 분석 대상 ${count}개 ${xColName}의 ${yColName} 총 실적은 <strong>${fmt(sum)}</strong>이며, 개체당 평균 실적은 <strong>${fmt(Math.round(mean))}</strong>을 기록하였습니다.</p>
            <p><strong>[2. 핵심 축 및 편중도]</strong> 상위 20% 핵심 개체가 전체 실적의 <strong>${top20Share}%</strong>를 주도하고 있으며, 1위 <strong>[${top1.label}](${fmt(top1.value)})</strong>과 최하위의 격차는 <strong>${topBottomRatio}배</strong>입니다.</p>
            <p><strong>[3. 경영 판단 제언]</strong> 최상위 성공 DNA를 중위권으로 신속히 복제 전파하고, 통계적 이상치(${outliers.length}건)를 면밀히 점검하여 성장의 질적 안정성을 확보하십시오.</p>
        `;
        recommendations = [
            {
                title: `상위 핵심 동력 집중 투자 및 자원 우선 배분`,
                desc: `매출/성과 견인력이 검증된 Top 3 항목([${top1.label}] 등 합계 비중 ${calcTop3Ratio}%)에 전사 핵심 역량을 최우선 투입하십시오.`
            },
            {
                title: `중위권 개체의 전략적 육성을 통한 차세대 캐시카우 육성`,
                desc: `평균 부근의 중위권 항목 성과를 10% 개선할 경우 전체 총합 대비 약 2~3배의 레버리지 효과가 창출됩니다.`
            },
            {
                title: `주간/월간 3D 대시보드 기반 원클릭 경영 현황 브리핑 정례화`,
                desc: `데이터 업데이트 시마다 AI 요약 브리핑을 이사회 및 임원 회의의 표준 리포트로 활용하십시오.`
            }
        ];
    } else if (type === 'performance') {
        title = `[성과 평가 & 랭킹] ${xColName}별 ${yColName} 벤치마킹 및 기여도 평가 보고서`;
        subtitle = `상위 챔피언 식별 및 전체 ${count}개 개체 상대 성과(Relative Rank) 평가`;
        executiveSummary = `
            <p>본 성과 평가 보고서는 전체 <strong>${count}개</strong> ${xColName}의 <strong>${yColName}</strong> 달성 실적을 다각도로 벤치마킹하고 상대 순위를 매긴 분석서입니다. 총 성과 규모는 <strong>${fmt(sum)}</strong>이며, 개체별 평균 성과는 <strong>${fmt(Math.round(mean))}</strong>입니다.</p>
            <p>영예의 1위 챔피언은 <strong>[${top1.label}]</strong> 항목으로 실적 <strong>${fmt(top1.value)}</strong>(점유율 ${top1Share}%)을 달성하여 압도적인 기여도를 입증했습니다. 이어 2위 [${top2.label}](${fmt(top2.value)}), 3위 [${top3.label}](${fmt(top3.value)})까지 상위 3개 항목이 전체의 <strong>${calcTop3Ratio}%</strong>를 견인하고 있습니다.</p>
            <p>반면 하위권은 <strong>[${bottom1.label}](${fmt(bottom1.value)})</strong> 등으로 상위권 대비 <strong>${topBottomRatio}배</strong>의 현격한 실적 스프레드를 보이고 있어, 부진 요인 개선 및 벤치마킹 도입이 절실합니다.</p>
        `;
        recommendations = [
            {
                title: `챔피언 [${top1.label}]의 핵심 역량 분석 및 성공 팩터 사내 공유`,
                desc: `압도적 성과를 낸 상위권의 성공 요인(영업 방식, 제품 강점 등)을 정례 워크숍을 통해 전사에 적극 전파하십시오.`
            },
            {
                title: `중위권 그룹(Rank 20~50%) 대상 단계별 도약(Tier-Up) 인센티브 신설`,
                desc: `평균치 이상으로 성장 가능한 잠재 항목에 대해 타겟 달성형 보상 체계를 적용하여 자발적 성장 동기를 부여하십시오.`
            },
            {
                title: `부진 하위 10% 개체 맞춤형 역량 보강 및 컨설팅 지원`,
                desc: `최하위 그룹의 병목 요인을 진단하고, 개선 계획 수립(PIP)을 통해 하방 실적을 끌어올리십시오.`
            }
        ];
    } else if (type === 'distribution') {
        title = `[데이터 분포 구조] ${yColName} 공간 분포 및 사분위수(IQR) 정밀 진단서`;
        subtitle = `Q1~Q3 중위 밀집 구간 분석, 왜곡도 평가 및 통계적 안정성 검증`;
        executiveSummary = `
            <p>본 구조 분석서는 <strong>${fileName}</strong> 내 <strong>${yColName}</strong>의 분포 밀도와 분산 형태를 정밀 진단한 리포트입니다. 중앙값(Median) <strong>${fmt(Math.round(median))}</strong>을 기점으로 25% 지점(Q1)은 <strong>${fmt(Math.round(q1))}</strong>, 75% 지점(Q3)은 <strong>${fmt(Math.round(q3))}</strong>으로 측정되었습니다.</p>
            <p>핵심 50% 구간의 너비를 나타내는 사분위범위(IQR)는 <strong>${fmt(Math.round(iqr))}</strong>이며, 이는 개체들의 과반수가 이 구간에 밀집되어 있음을 증명합니다. 산술평균(${fmt(Math.round(mean))})과 중앙값 간의 위치 관계는 데이터가 어느 한쪽으로 치우쳐 있는지를 직관적으로 보여줍니다.</p>
            <p>1.5×IQR 판정 기준에 따른 정상 신뢰구간([${fmt(Math.round(lowerLimit))} ~ ${fmt(Math.round(upperLimit))}]) 밖의 이상치는 총 <strong>${outliers.length}건</strong>으로, 전반적인 분포의 안정성과 왜곡 요인을 종합 판정한 전략을 권고합니다.</p>
        `;
        recommendations = [
            {
                title: `중간 50%(Q1~Q3) 핵심 분포 밀집군의 표준 벤치마크화`,
                desc: `대다수 개체가 위치한 [${fmt(Math.round(q1))} ~ ${fmt(Math.round(q3))}] 구간을 실무 기본 표준 구간으로 설정하여 목표 산정 기준으로 삼으십시오.`
            },
            {
                title: `정상 범위를 벗어난 이상치(${outliers.length}건)의 구간별 분리 관리`,
                desc: `상위 극단치와 하위 극단치를 일반 데이터셋과 분리하여 특수 케이스로 별도 추적·모니터링하십시오.`
            },
            {
                title: `데이터 수집 주기 단축 및 시계열 분포 변화 모니터링`,
                desc: `주기적인 데이터 리프레시를 통해 사분위수 구간의 이동(Shift) 여부를 감지하고 시장 트렌드 변화를 선제 포착하십시오.`
            }
        ];
    } else if (type === 'forecast') {
        title = `[성장 시나리오] ${yColName} 기반 미래 성장 모멘텀 및 확장 잠재력 예측서`;
        subtitle = `추세 추정 및 낙관·기준·보수 시나리오 기반 중장기 기대 효과 분석`;
        executiveSummary = `
            <p>본 성장 시나리오 보고서는 현 데이터셋의 실적 합계 <strong>${fmt(sum)}</strong> 및 상위 집중 모멘텀을 기초로 향후 비즈니스 성장 잠재력을 3가지 시나리오로 투영한 미래 예측서입니다.</p>
            <p>현재 상위 20% 개체가 전체의 <strong>${top20Share}%</strong>를 주도하고 있으므로, 이 성장 견인축이 유지될 경우 차기 주기 실적은 최소 +15%~+30%의 추가 성장 레버리지를 실현할 수 있을 것으로 전망됩니다.</p>
            <p>반면 하위 개체와의 격차(${topBottomRatio}배)가 방치될 경우 성장 한계에 봉착할 위험이 존재하므로, 시장 지배력 극대화와 리스크 헷지를 병행하는 시나리오별 대응 전략을 수립하였습니다.</p>
        `;
        recommendations = [
            {
                title: `[낙관 시나리오] 최상위 [${top1.label}] 모멘텀 극대화로 +25% 추가 성장 견인`,
                desc: `1위 품목/조직에 대한 신규 마케팅과 인프라를 전폭 지원하여 전체 시장 점유율을 비약적으로 확대하십시오.`
            },
            {
                title: `[기준 시나리오] 중위권 개체의 상향 평준화를 통한 건전한 +12% 성장 달성`,
                desc: `중위권 그룹의 평균 달성률을 현행보다 10% 개선하여 하방 변동성에 흔들리지 않는 튼튼한 허리 라인을 구축하십시오.`
            },
            {
                title: `[보수 시나리오] 하위권 리스크 사전 헤징 및 한계 손실 -5% 이하 억제`,
                desc: `시장 급변 시 부진 개체에 투입되는 가변 비용을 즉시 축소할 수 있는 단계별 비상 플랜을 선제 마련하십시오.`
            }
        ];
    } else if (type === 'efficiency') {
        title = `[자원 최적화 감사] ${xColName}별 ${yColName} 투입 대비 산출 효율성 극대화 보고서`;
        subtitle = `롱테일(Long Tail) 비효율 제거 및 고수익·고효율 포트폴리오 재배치 방안`;
        executiveSummary = `
            <p>본 자원 최적화 감사 보고서는 한정된 경영 자원의 투입 대비 성과 창출 효율성을 정밀 점검한 감사 리포트입니다. 총 <strong>${count}개</strong> 개체 중 상위 <strong>${top20Count}개</strong>가 전체 성과의 <strong>${top20Share}%</strong>를 만들어내고 있는 반면, 하위 50% 개체의 성과 기여도는 극히 미미한 전형적인 롱테일 구조를 보입니다.</p>
            <p>최하위 개체 <strong>[${bottom1.label}](${fmt(bottom1.value)})</strong> 등 성과 부진군에 유지비, 운영 인력, 마케팅 자원이 지속 투입되고 있다면 이는 전사 ROI를 갉아먹는 주요 원인이 됩니다.</p>
            <p>본 감사를 통해 저효율 부문을 과감히 조정하고 고성과 핵심 개체로 자원을 재배치함으로써 전사 영업이익률 및 자원 회수율을 극대화할 수 있는 3대 실행안을 제시합니다.</p>
        `;
        recommendations = [
            {
                title: `고성과 개체군([${top1.label}] 등)으로의 전략적 자원 재배치(Reallocation)`,
                desc: `투자 대비 성과가 확실한 상위 핵심 개체군에 예산과 인력을 집중 재투자하여 한계 생산성을 극대화하십시오.`
            },
            {
                title: `하위 저효율 개체 통폐합 및 고정 운영 비용 절감`,
                desc: `기여도가 낮은 하위 20% 개체에 대해 서비스 통폐합, 생산 축소, 아웃소싱 등을 검토하여 연간 고정비를 절감하십시오.`
            },
            {
                title: `3D 공간 분석 기반 데이터 기반 자원 할당 지침(Resource Rule) 공식화`,
                desc: `주관적 판단이 아닌 3D 및 2D 통계 지표에 근거하여 분기별 자원 배분을 객관적으로 결정하는 시스템을 정착시키십시오.`
            }
        ];
    } else if (type === 'action_plan') {
        title = `[실무 액션 플랜] ${xColName} × ${yColName} 실행 과제 및 단계별 KPI 로드맵`;
        subtitle = `즉시 착수 과제(Quick Wins)부터 중장기 체질 개선까지 3단계 실행 가이드`;
        executiveSummary = `
            <p>본 실무 액션 플랜은 <strong>${fileName}</strong>의 분석 결과를 실제 업무 현장에 즉각 적용하기 위한 실천형 실행 로드맵입니다. 분석 지표 <strong>${yColName}</strong>의 전체 규모 <strong>${fmt(sum)}</strong>를 바탕으로 부서별/개체별 즉각적인 조치 과제를 정의하였습니다.</p>
            <p>상위 핵심 개체인 <strong>[${top1.label}]</strong>의 성공 노하우 확산과 이상치 <strong>${outliers.length}건</strong>에 대한 원인 규명은 30일 이내에 즉시 추진 가능한 Quick-Win 과제입니다.</p>
            <p>이후 60일~90일 중기 과제를 통해 중위권 성과 도약과 리스크 헤징을 체계적으로 완수할 수 있도록 구체적인 일정표와 KPI를 제안합니다.</p>
        `;
        recommendations = [
            {
                title: `[Phase 1: 1~30일] Quick-Wins — 최상위 성공 사례 벤치마킹 및 공유`,
                desc: `[${top1.label}]의 성과 요인을 매뉴얼화하고, 하위 부진 개체에 대한 긴급 현장 인터뷰를 실시하여 즉시 개선 가능한 단기 조치를 단행하십시오.`
            },
            {
                title: `[Phase 2: 30~90일] 중위권 전담 지원 TF 구성 및 타겟 KPI 부여`,
                desc: `성장 잠재력이 높은 중간 순위 개체들을 선별하여 전담 멘토링과 마케팅 예산을 우선 지원하고 달성률을 매주 점검하십시오.`
            },
            {
                title: `[Phase 3: 90일 이후] 본 시스템을 통한 실시간 데이터 거버넌스 완성`,
                desc: `CSV/엑셀 데이터 업데이트와 3D 시각화 보고서 자동 출력을 정기 주간 회의 프로세스로 제도화하여 경영 판단 속도를 3배 가속화하십시오.`
            }
        ];
    } else {
        // 기본 종합 경영 보고서 (business)
        executiveSummary = `
            <p>본 보고서는 <strong>${fileName}</strong> 데이터셋의 총 <strong>${count.toLocaleString()}개</strong> ${xColName} 항목을 대상으로, <strong>${yColName}</strong> 지표를 3D 공간 모델링 및 다변량 통계 기법으로 정밀 교차 검증한 종합 인텔리전스 분석서입니다. 전체 실적 합계는 <strong>${fmt(sum)}</strong>이며, 개체당 평균값은 <strong>${fmt(Math.round(mean))}</strong>, 중앙값(Median)은 <strong>${fmt(Math.round(median))}</strong>으로 집계되었습니다.</p>
            <p>파레토 집중도 분석 결과, 상위 <strong>${top20Count}개(20%)</strong> 핵심 항목이 전체 성과의 <strong>${top20Share}%</strong>를 견인하고 있어 강력한 성장 모멘텀을 형성하고 있습니다. 특히 1위 항목인 <strong>[${top1.label}]</strong>의 단독 점유율은 <strong>${top1Share}%</strong>에 달하며, 최하위 개체 대비 <strong>${topBottomRatio}배</strong>의 유의미한 실적 스프레드를 기록하고 있습니다.</p>
            <p>이상치 검증 단계에서는 1.5×IQR 통계 신뢰구간을 적용하여 극단치 <strong>${outliers.length}건</strong>을 선별하였으며, 변동계수(CV) <strong>${cv.toFixed(1)}%</strong> 수준의 동적 변동성을 포착하였습니다. 이를 토대로 상위 핵심 동력 육성과 하위 개체 정상화를 위한 3대 전략적 실행 권고안을 제언합니다.</p>
        `;

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
                desc: `본 시스템의 3D 공간 시각화와 2D 차트 대시보드를 주간/월간 경영 회의의 표준 분석 도구로 채택하여 신속하고 직관적인 경영 판단을 실행하십시오.`
            }
        ];
    }

    // 2. 파레토 진단
    const paretoDiagnostic = `
        상위 <strong>${top20Count}개(${Math.round(top20Count / count * 100)}%)</strong> 항목이 전체 ${yColName} 합계의 <strong>${top20Share}%</strong>를 차지하고 있습니다.
        ${parseFloat(top20Share) >= 60 
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

    const spreadDiagnostic = `
        최고 실적 [<strong>${top1 ? top1.label : '최고'}</strong>](${fmt(top1 ? top1.value : 0)})과 최저 실적 [<strong>${bottom1 ? bottom1.label : '최저'}</strong>](${fmt(bottom1 ? bottom1.value : 0)})의 스프레드 배율은 <strong>${topBottomRatio}배</strong>(격차: ${fmt(calcRange)})입니다.
        상위 3개 항목([${top1 ? top1.label : ''}], [${top2 ? top2.label : ''}], [${top3 ? top3.label : ''}])의 합계 비중이 총합의 <strong>${top3Ratio}%</strong>를 형성하고 있어, 핵심 성장축의 전략적 레버리지 효과가 두드러집니다.
    `;

    return {
        title,
        subtitle,
        executiveSummary: applyToneToText(executiveSummary, tone),
        paretoDiagnostic: applyToneToText(paretoDiagnostic, tone),
        outlierDiagnostic: applyToneToText(outlierDiagnostic, tone),
        cvDiagnostic: applyToneToText(cvDiagnostic, tone),
        spreadDiagnostic: applyToneToText(spreadDiagnostic, tone),
        recommendations: recommendations.map(r => ({
            title: r.title,
            desc: applyToneToText(r.desc, tone)
        }))
    };
}

/**
 * Gemini LLM API 호출
 */
async function callGeminiReportAPI(apiKey, data) {
    const prompt = `
당신은 최고의 데이터 분석가이자 수석 경영 컨설턴트입니다. 다음 데이터 통계 요약치를 바탕으로 전문적인 한국어 분석 보고서 콘텐츠를 JSON 형식으로 작성해 주세요.

[데이터 통계 정보]
- 보고서 유형: ${data.typeLabel || data.type} (유형 코드: ${data.type})
- 작성 지침: 선택된 보고서 유형의 핵심 목적과 관점(통계적 유의성, 리스크, 랭킹 벤치마킹, 데이터 분포, 성장 시나리오, 자원 효율성, 실무 액션플랜 등)에 최적화된 심층적인 전문 비즈니스 분석 내용을 작성하세요.
- 문체 어조: ${data.toneLabel || data.tone} (어조 코드: ${data.tone})
- 문체 지침: 지정된 어조의 문체 특성(격식체, 분석가체, 실무보고체, 전략컨설팅체, 리스크감사체, 그로스해킹체, 개조식브리핑체 등)을 본문 전체와 실행 권고 문장에 일관되게 적용하세요.
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

    if (!response.ok) throw new Error(`Gemini API 오류 (${response.status})`);
    const resJson = await response.json();
    const candidateText = resJson.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) throw new Error('Gemini 응답 텍스트 없음');
    const cleanJson = candidateText.replace(/^```json\s*/, '').replace(/```\s*$/, '').trim();
    return JSON.parse(cleanJson);
}

/**
 * OpenAI GPT API 호출
 */
async function callOpenAIReportAPI(apiKey, data) {
    const prompt = `
당신은 최고의 데이터 분석가이자 수석 경영 컨설턴트입니다. 다음 데이터 통계 요약치를 바탕으로 전문적인 한국어 분석 보고서 콘텐츠를 JSON 형식으로 작성해 주세요.

[데이터 통계 정보]
- 보고서 유형: ${data.typeLabel || data.type} (유형 코드: ${data.type})
- 작성 지침: 선택된 보고서 유형의 핵심 목적과 관점(통계적 유의성, 리스크, 랭킹 벤치마킹, 데이터 분포, 성장 시나리오, 자원 효율성, 실무 액션플랜 등)에 최적화된 심층적인 전문 비즈니스 분석 내용을 작성하세요.
- 문체 어조: ${data.toneLabel || data.tone} (어조 코드: ${data.tone})
- 문체 지침: 지정된 어조의 문체 특성(격식체, 분석가체, 실무보고체, 전략컨설팅체, 리스크감사체, 그로스해킹체, 개조식브리핑체 등)을 본문 전체와 실행 권고 문장에 일관되게 적용하세요.
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

반드시 아래 JSON 포맷만을 반환하세요 (마크다운 코드블록 없이 순수 JSON만 반환):
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

    const url = 'https://api.openai.com/v1/chat/completions';
    const response = await fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [{ role: 'user', content: prompt }],
            response_format: { type: 'json_object' },
            temperature: 0.3
        })
    });

    if (!response.ok) throw new Error(`OpenAI API 오류 (${response.status})`);
    const resJson = await response.json();
    const content = resJson.choices?.[0]?.message?.content;
    if (!content) throw new Error('OpenAI 응답 텍스트 없음');
    return JSON.parse(content);
}

/**
 * AI 보고서 모달 및 툴바 이벤트 바인딩
 */
export function bindAiReportEvents() {
    const aiReportModal = $('ai-report-modal');
    const btnCloseReportModal = $('btn-close-report-modal');
    const btnGenerateAiReport = $('btn-generate-ai-report');
    const btnReportEditMode = $('btn-report-edit-mode');
    const reportEditLabel = $('report-edit-label');
    const btnReportCopy = $('btn-report-copy');
    const btnReportPrint = $('btn-report-print');
    const aiReportPaper = $('ai-report-paper');
    const aiReportContent = $('ai-report-content');
    const aiApiModal = $('ai-api-modal');
    const btnAiApiSettings = $('btn-ai-api-settings');
    const btnCloseApiModal = $('btn-close-api-modal');
    const inputGeminiKey = $('input-gemini-key');
    const inputOpenaiKey = $('input-openai-key');
    const btnSaveApiKeys = $('btn-save-api-keys');
    const btnClearApiKeys = $('btn-clear-api-keys');

    // 모달 열기 버튼들
    $('btn-print-report')?.addEventListener('click', () => openAiReportStudio());
    $('btn-open-report-from-analysis')?.addEventListener('click', () => openAiReportStudio());
    $('btn-auto-report-quick')?.addEventListener('click', () => openAiReportStudio({ stream: true }));

    // 사이드바 AI 추천 보고서 배지 클릭 시 자동 추천 모드로 모달 오픈
    const sidebarRecBadge = $('ai-recommended-report-badge');
    sidebarRecBadge?.addEventListener('click', () => {
        const aiReportType = $('ai-report-type');
        if (aiReportType) aiReportType.value = 'auto';
        openAiReportStudio({ stream: true });
    });

    // 보고서 유형 셀렉트박스 변경 시 UI 상태 업데이트
    const aiReportType = $('ai-report-type');
    const autoBadge = $('ai-report-auto-badge');
    const reasonBox = $('ai-report-detected-reason');
    const aiReportTone = $('ai-report-tone');
    const toneAutoBadge = $('ai-tone-auto-badge');
    const toneReasonBox = $('ai-tone-detected-reason');

    aiReportType?.addEventListener('change', () => {
        if (aiReportType.value === 'auto') {
            if (autoBadge) {
                autoBadge.textContent = 'AI 추천 ON';
                autoBadge.style.background = 'linear-gradient(135deg, #4f46e5, #7c3aed)';
            }
            updateReportRecommendationUI();
        } else {
            if (autoBadge) {
                autoBadge.textContent = '수동 선택';
                autoBadge.style.background = '#475569';
            }
            if (reasonBox) {
                reasonBox.innerHTML = `<strong>[유형 수동]</strong> ${aiReportType.selectedOptions[0]?.textContent.split(' ')[1] || '선택됨'}`;
            }
            // 어조가 auto일 때 선택된 보고서 유형에 맞춰 추천 어조 실시간 갱신
            if (aiReportTone && aiReportTone.value === 'auto') {
                const recTone = inferBestReportTone(aiReportType.value);
                if (toneReasonBox) {
                    toneReasonBox.innerHTML = `&nbsp;•&nbsp; <strong>[어조 추천]</strong> ${recTone.name}`;
                }
            }
        }
    });

    // 어조 셀렉트박스 변경 시 상태 업데이트
    aiReportTone?.addEventListener('change', () => {
        if (aiReportTone.value === 'auto') {
            if (toneAutoBadge) {
                toneAutoBadge.textContent = 'AI 어조 ON';
                toneAutoBadge.style.background = 'linear-gradient(135deg, #4f46e5, #7c3aed)';
            }
            updateReportRecommendationUI();
        } else {
            if (toneAutoBadge) {
                toneAutoBadge.textContent = '수동 선택';
                toneAutoBadge.style.background = '#475569';
            }
            if (toneReasonBox) {
                toneReasonBox.innerHTML = `&nbsp;•&nbsp; <strong>[어조 수동]</strong> ${aiReportTone.selectedOptions[0]?.textContent.split(' ')[1] || '선택됨'}`;
            }
        }
    });

    // 모달 상단 배지 클릭 시 언제든 AI 자동 추천으로 재설정
    autoBadge?.addEventListener('click', () => {
        if (aiReportType) {
            aiReportType.value = 'auto';
            aiReportType.dispatchEvent(new Event('change'));
            generateAIReport();
        }
    });

    toneAutoBadge?.addEventListener('click', () => {
        if (aiReportTone) {
            aiReportTone.value = 'auto';
            aiReportTone.dispatchEvent(new Event('change'));
            generateAIReport();
        }
    });
    btnGenerateAiReport?.addEventListener('click', () => generateAIReport({ stream: true }));

    // 닫기 핸들러
    btnCloseReportModal?.addEventListener('click', () => {
        if (aiReportModal) aiReportModal.style.display = 'none';
    });
    aiReportModal?.addEventListener('click', (e) => {
        if (e.target === aiReportModal) aiReportModal.style.display = 'none';
    });

    // 직접 편집 모드 토글
    btnReportEditMode?.addEventListener('click', () => {
        appState.isReportEditMode = !appState.isReportEditMode;
        if (aiReportPaper) aiReportPaper.classList.toggle('editing', appState.isReportEditMode);
        if (aiReportContent) {
            aiReportContent.querySelectorAll('.report-editable').forEach(el => {
                el.contentEditable = appState.isReportEditMode ? 'true' : 'false';
            });
        }
        if (btnReportEditMode) btnReportEditMode.classList.toggle('active', appState.isReportEditMode);
        if (reportEditLabel) reportEditLabel.textContent = appState.isReportEditMode ? '편집 완료' : '직접 편집';
        showToast(appState.isReportEditMode ? '✏️ <strong>직접 편집 모드가 켜졌습니다:</strong> 보고서 텍스트를 클릭하여 자유롭게 수정한 후 인쇄할 수 있습니다.' : '💾 <strong>편집 완료:</strong> 수정된 내용이 저장되었습니다.');
    });

    // 클립보드 복사
    btnReportCopy?.addEventListener('click', async () => {
        if (!aiReportContent || !aiReportContent.innerText.trim()) {
            showToast('⚠️ 복사할 보고서 내용이 없습니다.');
            return;
        }
        try {
            await navigator.clipboard.writeText(aiReportContent.innerText);
            showToast('📋 <strong>보고서 복사 완료!</strong> 워드, 노션, 슬랙 등에 바로 붙여넣기(Ctrl+V)하실 수 있습니다.');
        } catch (err) {
            console.error('클립보드 복사 에러:', err);
            showToast('⚠️ 클립보드 복사에 실패했습니다.');
        }
    });

    // 인쇄
    btnReportPrint?.addEventListener('click', printCurrentReport);

    // API 설정 모달
    btnAiApiSettings?.addEventListener('click', () => {
        if (inputGeminiKey) inputGeminiKey.value = localStorage.getItem('agy_gemini_api_key') || '';
        if (inputOpenaiKey) inputOpenaiKey.value = localStorage.getItem('agy_openai_api_key') || '';
        if (aiApiModal) aiApiModal.style.display = 'flex';
    });
    btnCloseApiModal?.addEventListener('click', () => {
        if (aiApiModal) aiApiModal.style.display = 'none';
    });
    aiApiModal?.addEventListener('click', (e) => {
        if (e.target === aiApiModal) aiApiModal.style.display = 'none';
    });

    btnSaveApiKeys?.addEventListener('click', () => {
        if (inputGeminiKey) localStorage.setItem('agy_gemini_api_key', inputGeminiKey.value.trim());
        if (inputOpenaiKey) localStorage.setItem('agy_openai_api_key', inputOpenaiKey.value.trim());
        showToast('🔑 <strong>API 키 저장 완료:</strong> 브라우저 로컬 저장소에 안전하게 보관되었습니다.');
        if (aiApiModal) aiApiModal.style.display = 'none';
    });

    btnClearApiKeys?.addEventListener('click', () => {
        localStorage.removeItem('agy_gemini_api_key');
        localStorage.removeItem('agy_openai_api_key');
        if (inputGeminiKey) inputGeminiKey.value = '';
        if (inputOpenaiKey) inputOpenaiKey.value = '';
        showToast('🗑️ 저장된 API 키가 모두 삭제되었습니다.');
    });

    window.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            if (aiApiModal && aiApiModal.style.display !== 'none') aiApiModal.style.display = 'none';
            else if (aiReportModal && aiReportModal.style.display !== 'none') aiReportModal.style.display = 'none';
        }
    });
}
