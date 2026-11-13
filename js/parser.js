/**
 * ==============================================================================
 * [parser.js] CSV 및 엑셀(.xlsx, .xls) 데이터 파서 & 다중 인코딩 디코더
 * ==============================================================================
 */
import { $, appState, showToast } from './state.js';

/**
 * 바이너리 ArrayBuffer를 문자열로 디코딩 (한국어 엑셀 ANSI/CP949/EUC-KR 및 UTF-8 자동 감지)
 */
export function decodeCSVBuffer(buffer, mode = 'auto') {
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

    // strict utf-8로 시도 후 예외 발생 시 euc-kr 디코딩
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
 * CSV 텍스트 문자열을 2차원 행렬 객체로 파싱 (따옴표 이스케이프 및 개행 처리)
 */
export function parseCSV(text) {
    if (!text) return null;
    text = text.replace(/^\uFEFF/, '').trim();
    const lines = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n').split('\n');
    if (lines.length < 2) return null;

    const parseRow = (line) => {
        const result = [];
        let cur = '';
        let inQ = false;
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

/**
 * 로컬 파일(CSV 또는 엑셀)을 읽고 파싱하여 콜백(onSuccess) 실행
 */
export function loadAndParseFile(file, onSuccess) {
    if (!file) return;
    appState.currentUploadedFile = file;
    const isExcel = file.name.endsWith('.xlsx') || file.name.endsWith('.xls');

    const fileNameDisplay = $('file-name');
    const statusIndicator = $('status-indicator');
    const csvEncodingSelect = $('csv-encoding-select');

    if (fileNameDisplay) {
        fileNameDisplay.textContent = `📄 ${file.name} (${isExcel ? '엑셀 / Excel' : 'CSV'} - ${(file.size / 1024).toFixed(1)} KB)`;
    }
    if (statusIndicator) {
        statusIndicator.textContent = '● 로딩 중... / Loading...';
        statusIndicator.className = 'status loading';
    }

    const encodingMode = csvEncodingSelect ? csvEncodingSelect.value : 'auto';
    const reader = new FileReader();

    reader.onload = evt => {
        try {
            const buffer = evt.target.result;
            let text = '';
            let sheetInfo = '';

            if (isExcel && window.XLSX) {
                const workbook = window.XLSX.read(buffer, { type: 'array' });
                const sheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[sheetName];
                text = window.XLSX.utils.sheet_to_csv(worksheet);
                sheetInfo = ` [시트: ${sheetName}]`;
                showToast(`📊 엑셀 파일 로드 완료: <strong>${file.name}</strong> (${sheetName} 시트)`);
            } else {
                text = decodeCSVBuffer(buffer, encodingMode);
            }

            const data = parseCSV(text);
            if (!data) {
                if (statusIndicator) {
                    statusIndicator.textContent = '● 파싱 실패 / Parsing Failed';
                    statusIndicator.className = 'status offline';
                }
                showToast('⚠️ 파일 데이터 파싱에 실패했습니다.');
                return;
            }

            appState.parsedData = data;
            if (fileNameDisplay) {
                fileNameDisplay.textContent = `📄 ${file.name}${sheetInfo} (${isExcel ? '엑셀' : 'CSV'} - ${(file.size / 1024).toFixed(1)} KB)`;
            }
            if (onSuccess) onSuccess(`📄 ${file.name}${sheetInfo}`);
        } catch (err) {
            console.error('파일 읽기/파싱 에러:', err);
            if (statusIndicator) {
                statusIndicator.textContent = '● 파일 읽기 에러';
                statusIndicator.className = 'status offline';
            }
            showToast('⚠️ 파일을 읽는 중 오류가 발생했습니다.');
        }
    };

    reader.onerror = () => {
        if (statusIndicator) {
            statusIndicator.textContent = '● 파일 읽기 실패';
            statusIndicator.className = 'status offline';
        }
    };

    reader.readAsArrayBuffer(file);
}
