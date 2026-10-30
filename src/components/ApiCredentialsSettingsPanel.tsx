import React, { useState } from 'react';
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  Key,
  Play,
  RefreshCw,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  XCircle,
} from 'lucide-react';
import { ApiCredentialsConfig, ApiTestProbeResult } from '../types/stock.ts';

interface ApiCredentialsSettingsPanelProps {
  apiCredentials: ApiCredentialsConfig;
  onUpdateApiCredentials: (creds: Partial<ApiCredentialsConfig>) => Promise<void>;
  isDarkMode?: boolean;
}

export const ApiCredentialsSettingsPanel: React.FC<ApiCredentialsSettingsPanelProps> = ({
  apiCredentials,
  onUpdateApiCredentials,
}) => {
  // 로컬 폼 입력 상태
  const [formData, setFormData] = useState<ApiCredentialsConfig>({
    finnhubApiKey: apiCredentials.finnhubApiKey || '',
    secUserAgent: apiCredentials.secUserAgent || '',
    alphaVantageApiKey: apiCredentials.alphaVantageApiKey || '',
    fmpApiKey: apiCredentials.fmpApiKey || '',
    tushareToken: apiCredentials.tushareToken || '',
    updatedAt: apiCredentials.updatedAt,
  });

  // 비밀번호 마스킹 가시성 토글 상태
  const [showKey, setShowKey] = useState<Record<string, boolean>>({
    finnhub: false,
    alphaVantage: false,
    fmp: false,
    tushare: false,
  });

  // 복사 피드백 상태
  const [copiedField, setCopiedField] = useState<string | null>(null);

  // 저장 중 상태
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // 개별 및 전체 API 테스트 결과 상태
  const [testingApi, setTestingApi] = useState<string | null>(null);
  const [probeResults, setProbeResults] = useState<Record<string, ApiTestProbeResult>>({});

  // 폼 변경 여부 확인
  const isDirty =
    formData.finnhubApiKey !== (apiCredentials.finnhubApiKey || '') ||
    formData.secUserAgent !== (apiCredentials.secUserAgent || '') ||
    formData.alphaVantageApiKey !== (apiCredentials.alphaVantageApiKey || '') ||
    formData.fmpApiKey !== (apiCredentials.fmpApiKey || '') ||
    formData.tushareToken !== (apiCredentials.tushareToken || '');

  const toggleVisibility = (key: string) => {
    setShowKey((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  const handleCopy = async (field: string, value: string) => {
    if (!value) return;
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      setTimeout(() => setCopiedField((prev) => (prev === field ? null : prev)), 2000);
    } catch {
      // fallback
    }
  };

  const handleSaveAll = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSaving(true);
    setSaveSuccessMessage(null);
    try {
      await onUpdateApiCredentials(formData);
      setSaveSuccessMessage('모든 API 설정 및 인증키가 SQLite에 안전하게 저장되었습니다.');
      setTimeout(() => setSaveSuccessMessage(null), 4000);
    } catch {
      // error handled in parent
    } finally {
      setIsSaving(false);
    }
  };

  const handleRunTest = async (apiType: 'finnhub' | 'sec' | 'alpha_vantage' | 'fmp' | 'tushare') => {
    setTestingApi(apiType);
    try {
      const resp = await fetch('/api/test-api-credential', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiType, creds: formData }),
      });
      const data = await resp.json();
      if (data.result) {
        setProbeResults((prev) => ({ ...prev, [apiType]: data.result }));
      }
    } catch {
      setProbeResults((prev) => ({
        ...prev,
        [apiType]: {
          apiType,
          nameKo: apiType.toUpperCase(),
          status: 'error',
          latencyMs: 0,
          messageKo: '서버와 통신할 수 없습니다.',
          testedAt: new Date().toISOString(),
          endpointUrl: '',
        },
      }));
    } finally {
      setTestingApi(null);
    }
  };

  const handleTestAll = async () => {
    setTestingApi('all');
    try {
      const resp = await fetch('/api/test-api-credential', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiType: 'all', creds: formData }),
      });
      const data = await resp.json();
      if (Array.isArray(data.results)) {
        const next: Record<string, ApiTestProbeResult> = {};
        for (const r of data.results) {
          next[r.apiType] = r;
        }
        setProbeResults(next);
      }
    } catch {
      // error
    } finally {
      setTestingApi(null);
    }
  };

  const handleDownloadEnvFile = () => {
    const lines = [
      '# 글로벌 인사이트 (Global Stock Insight) API 환경변수 설정 파일 (.env)',
      '# 웹 UI 데이터·설정에서 내보낸 설정입니다.',
      '',
      `FINNHUB_API_KEY=${formData.finnhubApiKey}`,
      `SEC_USER_AGENT="${formData.secUserAgent || 'GlobalStockInsight sungwoo.ju@gmail.com'}"`,
      `ALPHA_VANTAGE_API_KEY=${formData.alphaVantageApiKey}`,
      `FMP_API_KEY=${formData.fmpApiKey}`,
      `TUSHARE_TOKEN=${formData.tushareToken}`,
      '',
      `# 내보낸 시각: ${new Date().toLocaleString('ko-KR')}`,
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '.env';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleResetToDefaults = () => {
    setFormData({
      finnhubApiKey: '',
      secUserAgent: 'GlobalStockInsight sungwoo.ju@gmail.com',
      alphaVantageApiKey: '',
      fmpApiKey: '',
      tushareToken: '',
      updatedAt: undefined,
    });
    setProbeResults({});
  };

  // 연동 활성 카운트 계산
  const activeCount = [
    Boolean(formData.finnhubApiKey.trim()),
    Boolean(formData.secUserAgent.trim()),
    Boolean(formData.alphaVantageApiKey.trim()),
    Boolean(formData.fmpApiKey.trim()),
    Boolean(formData.tushareToken.trim()),
  ].filter(Boolean).length;

  return (
    <div className="space-y-6">
      {/* 1. 상단 안내 및 요약 대시보드 카드 */}
      <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="space-y-1.5 max-w-2xl">
            <div className="flex items-center gap-2">
              <div className="p-2 bg-[#F0FDF4] dark:bg-emerald-950/60 text-[#2E7D5B] dark:text-emerald-400 rounded-xl">
                <Key className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-bold text-[#0F172A] dark:text-white">
                데이터 수집 API 연동 및 환경설정 (.env / SQLite)
              </h3>
            </div>
            <p className="text-xs text-[#64748B] dark:text-slate-400 leading-relaxed">
              미국(Finnhub 실시간 시세, SEC EDGAR 재무공시), 중국 A주/홍콩(Tushare, AKShare), 글로벌 보조 데이터(Alpha Vantage, FMP)의
              인증 키를 설정합니다. 저장 즉시 백엔드 서버에 반영되며, 키가 없거나 호출 제한에 도달해도{' '}
              <strong className="text-[#0F172A] dark:text-slate-200">내장 로컬 SQLite 캐시 폴백</strong>으로 안전하게 작동합니다.
            </p>
          </div>

          {/* 활성 상태 칩 & 일괄 동작 버튼 */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="px-3 py-1.5 bg-[#F8FAFC] dark:bg-slate-800/80 border border-[#E2E8F0] dark:border-slate-700 rounded-xl text-xs flex items-center gap-2">
              <span className="text-[#64748B] dark:text-slate-400 font-medium">연동 활성화:</span>
              <span className="font-bold text-[#2E7D5B] dark:text-emerald-400 font-mono">
                {activeCount} / 5개
              </span>
            </div>

            <button
              type="button"
              onClick={handleTestAll}
              disabled={testingApi !== null}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#0F172A] dark:text-white bg-white dark:bg-slate-800 border border-[#CBD5E1] dark:border-slate-700 hover:bg-[#F1F5F9] dark:hover:bg-slate-700 rounded-xl transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-[#2E7D5B] ${testingApi === 'all' ? 'animate-spin' : ''}`} />
              <span>전체 API 연결 진단</span>
            </button>

            <button
              type="button"
              onClick={handleDownloadEnvFile}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-[#2E7D5B] dark:text-emerald-400 bg-[#F0FDF4] dark:bg-emerald-950/40 border border-[#BBF7D0] dark:border-emerald-800/60 hover:bg-[#DCFCE7] dark:hover:bg-emerald-900/60 rounded-xl transition-colors cursor-pointer"
              title="설정된 키가 채워진 .env 파일을 다운로드합니다."
            >
              <Download className="w-3.5 h-3.5" />
              <span>.env 내보내기</span>
            </button>
          </div>
        </div>

        {/* 저장 알림 또는 미저장 변경사항 배너 */}
        {saveSuccessMessage && (
          <div className="mt-4 p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 rounded-xl flex items-center gap-2 text-xs text-emerald-800 dark:text-emerald-300">
            <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600 dark:text-emerald-400" />
            <span>{saveSuccessMessage}</span>
          </div>
        )}

        {isDirty && !saveSuccessMessage && (
          <div className="mt-4 p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 rounded-xl flex items-center justify-between gap-2 text-xs text-amber-800 dark:text-amber-300">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-amber-600" />
              <span>수정된 API 설정이 있습니다. 우측 하단의 [모든 API 설정 저장] 버튼을 눌러 적용해 주세요.</span>
            </div>
            <button
              type="button"
              onClick={() => handleSaveAll()}
              className="px-2.5 py-1 text-[11px] font-bold bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
            >
              지금 저장
            </button>
          </div>
        )}
      </div>

      {/* 2. 각 API별 상세 입력 카드 그리드 */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* API 1: Finnhub (미국 실시간 시세) */}
        <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400 flex items-center justify-center font-bold text-sm">
                  FH
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-[#0F172A] dark:text-white">
                      Finnhub Stock API
                    </h4>
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 rounded-md">
                      미국 실시간 시세
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64748B] dark:text-slate-400">
                    미국 종목(AAPL, NVDA, TSLA 등) 실시간 현재가·등락률 수집 (무료 분당 60회)
                  </p>
                </div>
              </div>

              <a
                href="https://finnhub.io/register"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2E7D5B] dark:text-emerald-400 hover:underline shrink-0"
              >
                <span>무료 키 발급</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#475569] dark:text-slate-300 flex items-center justify-between">
                <span>FINNHUB_API_KEY</span>
                {formData.finnhubApiKey ? (
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-normal">
                    입력 완료 ({formData.finnhubApiKey.length}자)
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400 font-normal">미입력 (로컬 캐시 폴백)</span>
                )}
              </label>

              <div className="relative flex items-center">
                <input
                  type={showKey.finnhub ? 'text' : 'password'}
                  value={formData.finnhubApiKey}
                  onChange={(e) => setFormData((prev) => ({ ...prev, finnhubApiKey: e.target.value }))}
                  placeholder="예: c1234567890abcdef (finnhub.io 대시보드 API 키)"
                  className="w-full pr-20 pl-3 py-2 text-xs font-mono bg-white dark:bg-slate-800 border border-[#CBD5E1] dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#2E7D5B] dark:focus:border-emerald-500 text-[#0F172A] dark:text-white"
                />
                <div className="absolute right-1.5 flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => toggleVisibility('finnhub')}
                    title={showKey.finnhub ? '숨기기' : '표시'}
                    className="p-1.5 text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white rounded-lg transition-colors"
                  >
                    {showKey.finnhub ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy('finnhub', formData.finnhubApiKey)}
                    title="복사"
                    className="p-1.5 text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white rounded-lg transition-colors"
                  >
                    {copiedField === 'finnhub' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* 개별 테스트 결과 박스 */}
            {probeResults.finnhub && (
              <div
                className={`p-2.5 rounded-xl text-xs space-y-1 ${
                  probeResults.finnhub.status === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
                    : probeResults.finnhub.status === 'warning'
                    ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200'
                    : probeResults.finnhub.status === 'unconfigured'
                    ? 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    : 'bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200'
                }`}
              >
                <div className="flex items-center justify-between font-semibold">
                  <span className="flex items-center gap-1.5">
                    {probeResults.finnhub.status === 'success' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <XCircle className="w-3.5 h-3.5 text-rose-600" />
                    )}
                    <span>{probeResults.finnhub.messageKo}</span>
                  </span>
                  {probeResults.finnhub.latencyMs > 0 && (
                    <span className="font-mono text-[11px] tabular-nums">
                      {probeResults.finnhub.latencyMs}ms
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-[#F1F5F9] dark:border-slate-800">
            <span className="text-[11px] text-[#94A3B8] dark:text-slate-400">
              호출 제한: 분당 60회 엄격 준수 보호
            </span>
            <button
              type="button"
              onClick={() => handleRunTest('finnhub')}
              disabled={testingApi !== null}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0F172A] dark:text-white bg-[#F8FAFC] dark:bg-slate-800 border border-[#CBD5E1] dark:border-slate-700 hover:bg-[#F1F5F9] dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              <Play className={`w-3 h-3 text-[#2E7D5B] ${testingApi === 'finnhub' ? 'animate-spin' : ''}`} />
              <span>연결 테스트 (AAPL 시세)</span>
            </button>
          </div>
        </div>

        {/* API 2: SEC EDGAR (미국 5개년 재무제표) */}
        <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-50 dark:bg-purple-950/50 text-purple-600 dark:text-purple-400 flex items-center justify-center font-bold text-sm">
                  SEC
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-[#0F172A] dark:text-white">
                      미국 SEC EDGAR 공시 헤더
                    </h4>
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-purple-100 dark:bg-purple-950 text-purple-700 dark:text-purple-300 rounded-md">
                      10-K / 10-Q 재무공시
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64748B] dark:text-slate-400">
                    미국 증권거래위원회 XBRL 재무제표 호출용 필수 User-Agent 헤더 (초당 10회 제한)
                  </p>
                </div>
              </div>

              <a
                href="https://www.sec.gov/os/accessing-edgar-data"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2E7D5B] dark:text-emerald-400 hover:underline shrink-0"
              >
                <span>SEC 규정</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-[#475569] dark:text-slate-300">
                  SEC_USER_AGENT
                </label>
                <button
                  type="button"
                  onClick={() =>
                    setFormData((prev) => ({
                      ...prev,
                      secUserAgent: 'GlobalStockInsight sungwoo.ju@gmail.com',
                    }))
                  }
                  className="text-[11px] text-[#2E7D5B] dark:text-emerald-400 hover:underline"
                >
                  기본 권장값 채우기
                </button>
              </div>

              <div className="relative flex items-center">
                <input
                  type="text"
                  value={formData.secUserAgent}
                  onChange={(e) => setFormData((prev) => ({ ...prev, secUserAgent: e.target.value }))}
                  placeholder='형식: "애플리케이션명 이메일주소" (예: GlobalStockInsight your_email@example.com)'
                  className="w-full pr-12 pl-3 py-2 text-xs font-mono bg-white dark:bg-slate-800 border border-[#CBD5E1] dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#2E7D5B] dark:focus:border-emerald-500 text-[#0F172A] dark:text-white"
                />
                <button
                  type="button"
                  onClick={() => handleCopy('sec', formData.secUserAgent)}
                  title="복사"
                  className="absolute right-2 p-1.5 text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white rounded-lg transition-colors"
                >
                  {copiedField === 'sec' ? (
                    <Check className="w-3.5 h-3.5 text-emerald-600" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            {/* 테스트 결과 */}
            {probeResults.sec && (
              <div
                className={`p-2.5 rounded-xl text-xs space-y-1 ${
                  probeResults.sec.status === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
                    : probeResults.sec.status === 'warning'
                    ? 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200'
                    : 'bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200'
                }`}
              >
                <div className="flex items-center justify-between font-semibold">
                  <span className="flex items-center gap-1.5">
                    {probeResults.sec.status === 'success' ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                    )}
                    <span>{probeResults.sec.messageKo}</span>
                  </span>
                  {probeResults.sec.latencyMs > 0 && (
                    <span className="font-mono text-[11px] tabular-nums">
                      {probeResults.sec.latencyMs}ms
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-[#F1F5F9] dark:border-slate-800">
            <span className="text-[11px] text-[#94A3B8] dark:text-slate-400">
              초당 10회 이하 속도 제한 준수 자동화
            </span>
            <button
              type="button"
              onClick={() => handleRunTest('sec')}
              disabled={testingApi !== null}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0F172A] dark:text-white bg-[#F8FAFC] dark:bg-slate-800 border border-[#CBD5E1] dark:border-slate-700 hover:bg-[#F1F5F9] dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              <Play className={`w-3 h-3 text-[#2E7D5B] ${testingApi === 'sec' ? 'animate-spin' : ''}`} />
              <span>연결 테스트 (Apple CIK 공시)</span>
            </button>
          </div>
        </div>

        {/* API 3: Tushare Pro (중국 A주 / 홍콩 증시) */}
        <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 flex items-center justify-center font-bold text-sm">
                  TS
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-[#0F172A] dark:text-white">
                      Tushare Pro 토큰
                    </h4>
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-red-100 dark:bg-red-950 text-red-700 dark:text-red-300 rounded-md">
                      중국 A주 · 홍콩
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64748B] dark:text-slate-400">
                    상하이/선전 A주 및 홍콩 상장 종목의 시세·재무제표 데이터 수집 토큰
                  </p>
                </div>
              </div>

              <a
                href="https://tushare.pro/register"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2E7D5B] dark:text-emerald-400 hover:underline shrink-0"
              >
                <span>토큰 발급처</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#475569] dark:text-slate-300 flex items-center justify-between">
                <span>TUSHARE_TOKEN</span>
                {formData.tushareToken ? (
                  <span className="text-[11px] text-emerald-600 dark:text-emerald-400 font-normal">
                    설정됨
                  </span>
                ) : (
                  <span className="text-[11px] text-slate-400 font-normal">선택 사항 (AKShare 자동 대체)</span>
                )}
              </label>

              <div className="relative flex items-center">
                <input
                  type={showKey.tushare ? 'text' : 'password'}
                  value={formData.tushareToken}
                  onChange={(e) => setFormData((prev) => ({ ...prev, tushareToken: e.target.value }))}
                  placeholder="예: 8f9b2d... (tushare.pro 사용자 토큰)"
                  className="w-full pr-20 pl-3 py-2 text-xs font-mono bg-white dark:bg-slate-800 border border-[#CBD5E1] dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#2E7D5B] dark:focus:border-emerald-500 text-[#0F172A] dark:text-white"
                />
                <div className="absolute right-1.5 flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => toggleVisibility('tushare')}
                    className="p-1.5 text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white rounded-lg transition-colors"
                  >
                    {showKey.tushare ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy('tushare', formData.tushareToken)}
                    className="p-1.5 text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white rounded-lg transition-colors"
                  >
                    {copiedField === 'tushare' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {probeResults.tushare && (
              <div
                className={`p-2.5 rounded-xl text-xs space-y-1 ${
                  probeResults.tushare.status === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
                    : probeResults.tushare.status === 'unconfigured'
                    ? 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    : 'bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200'
                }`}
              >
                <div className="flex items-center justify-between font-semibold">
                  <span>{probeResults.tushare.messageKo}</span>
                  {probeResults.tushare.latencyMs > 0 && (
                    <span className="font-mono text-[11px] tabular-nums">
                      {probeResults.tushare.latencyMs}ms
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-[#F1F5F9] dark:border-slate-800">
            <span className="text-[11px] text-[#94A3B8] dark:text-slate-400">
              파이썬 Streamlit 포터블 환경과도 100% 호환
            </span>
            <button
              type="button"
              onClick={() => handleRunTest('tushare')}
              disabled={testingApi !== null}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0F172A] dark:text-white bg-[#F8FAFC] dark:bg-slate-800 border border-[#CBD5E1] dark:border-slate-700 hover:bg-[#F1F5F9] dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              <Play className={`w-3 h-3 text-[#2E7D5B] ${testingApi === 'tushare' ? 'animate-spin' : ''}`} />
              <span>연결 테스트 (A주 마스터)</span>
            </button>
          </div>
        </div>

        {/* API 4: Alpha Vantage (글로벌 시세 / 환율) */}
        <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm flex flex-col justify-between">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-sm">
                  AV
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-[#0F172A] dark:text-white">
                      Alpha Vantage API
                    </h4>
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 rounded-md">
                      글로벌 보조 시세
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64748B] dark:text-slate-400">
                    글로벌 일별 시세, 기술적 보조 지표 및 USD/CNY/HKD 환율 데이터 (무료 25회/일)
                  </p>
                </div>
              </div>

              <a
                href="https://www.alphavantage.co/support/#api-key"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2E7D5B] dark:text-emerald-400 hover:underline shrink-0"
              >
                <span>무료 키 발급</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#475569] dark:text-slate-300 flex items-center justify-between">
                <span>ALPHA_VANTAGE_API_KEY</span>
                <span className="text-[11px] text-slate-400 font-normal">선택 사항</span>
              </label>

              <div className="relative flex items-center">
                <input
                  type={showKey.alphaVantage ? 'text' : 'password'}
                  value={formData.alphaVantageApiKey}
                  onChange={(e) => setFormData((prev) => ({ ...prev, alphaVantageApiKey: e.target.value }))}
                  placeholder="예: ABCD1234EFGH5678 (알파 벤티지 무료 키)"
                  className="w-full pr-20 pl-3 py-2 text-xs font-mono bg-white dark:bg-slate-800 border border-[#CBD5E1] dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#2E7D5B] dark:focus:border-emerald-500 text-[#0F172A] dark:text-white"
                />
                <div className="absolute right-1.5 flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => toggleVisibility('alphaVantage')}
                    className="p-1.5 text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white rounded-lg transition-colors"
                  >
                    {showKey.alphaVantage ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy('alphaVantage', formData.alphaVantageApiKey)}
                    className="p-1.5 text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white rounded-lg transition-colors"
                  >
                    {copiedField === 'alphaVantage' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {probeResults.alpha_vantage && (
              <div
                className={`p-2.5 rounded-xl text-xs space-y-1 ${
                  probeResults.alpha_vantage.status === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
                    : probeResults.alpha_vantage.status === 'unconfigured'
                    ? 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    : 'bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800/60 text-amber-900 dark:text-amber-200'
                }`}
              >
                <div className="flex items-center justify-between font-semibold">
                  <span>{probeResults.alpha_vantage.messageKo}</span>
                  {probeResults.alpha_vantage.latencyMs > 0 && (
                    <span className="font-mono text-[11px] tabular-nums">
                      {probeResults.alpha_vantage.latencyMs}ms
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-[#F1F5F9] dark:border-slate-800">
            <span className="text-[11px] text-[#94A3B8] dark:text-slate-400">
              분당 5회 / 일일 25회 무료 호출
            </span>
            <button
              type="button"
              onClick={() => handleRunTest('alpha_vantage')}
              disabled={testingApi !== null}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0F172A] dark:text-white bg-[#F8FAFC] dark:bg-slate-800 border border-[#CBD5E1] dark:border-slate-700 hover:bg-[#F1F5F9] dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              <Play className={`w-3 h-3 text-[#2E7D5B] ${testingApi === 'alpha_vantage' ? 'animate-spin' : ''}`} />
              <span>연결 테스트</span>
            </button>
          </div>
        </div>

        {/* API 5: FMP (Financial Modeling Prep) */}
        <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-2xl p-5 space-y-4 shadow-sm flex flex-col justify-between lg:col-span-2">
          <div className="space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-teal-50 dark:bg-teal-950/50 text-teal-600 dark:text-teal-400 flex items-center justify-center font-bold text-sm">
                  FMP
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm font-bold text-[#0F172A] dark:text-white">
                      Financial Modeling Prep (FMP)
                    </h4>
                    <span className="px-2 py-0.5 text-[10px] font-bold bg-teal-100 dark:bg-teal-950 text-teal-700 dark:text-teal-300 rounded-md">
                      재무제표 보조 데이터
                    </span>
                  </div>
                  <p className="text-[11px] text-[#64748B] dark:text-slate-400">
                    글로벌 다국적 기업의 5개년 손익계산서/재무상태표/현금흐름표 및 기업 프로필 보조 연동
                  </p>
                </div>
              </div>

              <a
                href="https://site.financialmodelingprep.com/developer/docs"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#2E7D5B] dark:text-emerald-400 hover:underline shrink-0"
              >
                <span>FMP 문서</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-[#475569] dark:text-slate-300 flex items-center justify-between">
                <span>FMP_API_KEY</span>
                <span className="text-[11px] text-slate-400 font-normal">선택 사항</span>
              </label>

              <div className="relative flex items-center">
                <input
                  type={showKey.fmp ? 'text' : 'password'}
                  value={formData.fmpApiKey}
                  onChange={(e) => setFormData((prev) => ({ ...prev, fmpApiKey: e.target.value }))}
                  placeholder="예: fmp_api_key_sample (FMP 개발자 키)"
                  className="w-full pr-20 pl-3 py-2 text-xs font-mono bg-white dark:bg-slate-800 border border-[#CBD5E1] dark:border-slate-700 rounded-xl focus:outline-none focus:border-[#2E7D5B] dark:focus:border-emerald-500 text-[#0F172A] dark:text-white"
                />
                <div className="absolute right-1.5 flex items-center gap-0.5">
                  <button
                    type="button"
                    onClick={() => toggleVisibility('fmp')}
                    className="p-1.5 text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white rounded-lg transition-colors"
                  >
                    {showKey.fmp ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleCopy('fmp', formData.fmpApiKey)}
                    className="p-1.5 text-[#94A3B8] hover:text-[#0F172A] dark:hover:text-white rounded-lg transition-colors"
                  >
                    {copiedField === 'fmp' ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            {probeResults.fmp && (
              <div
                className={`p-2.5 rounded-xl text-xs space-y-1 ${
                  probeResults.fmp.status === 'success'
                    ? 'bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 text-emerald-900 dark:text-emerald-200'
                    : probeResults.fmp.status === 'unconfigured'
                    ? 'bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300'
                    : 'bg-rose-50 dark:bg-rose-950/30 border border-rose-200 dark:border-rose-800/60 text-rose-900 dark:text-rose-200'
                }`}
              >
                <div className="flex items-center justify-between font-semibold">
                  <span>{probeResults.fmp.messageKo}</span>
                  {probeResults.fmp.latencyMs > 0 && (
                    <span className="font-mono text-[11px] tabular-nums">
                      {probeResults.fmp.latencyMs}ms
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          <div className="pt-2 flex items-center justify-between border-t border-[#F1F5F9] dark:border-slate-800">
            <span className="text-[11px] text-[#94A3B8] dark:text-slate-400">
              미국 SEC EDGAR 기본 제공 외 추가 재무제표 보조
            </span>
            <button
              type="button"
              onClick={() => handleRunTest('fmp')}
              disabled={testingApi !== null}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0F172A] dark:text-white bg-[#F8FAFC] dark:bg-slate-800 border border-[#CBD5E1] dark:border-slate-700 hover:bg-[#F1F5F9] dark:hover:bg-slate-700 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              <Play className={`w-3 h-3 text-[#2E7D5B] ${testingApi === 'fmp' ? 'animate-spin' : ''}`} />
              <span>연결 테스트</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. 하단 액션 바: 일괄 저장 및 복원 컨트롤 */}
      <div className="bg-white dark:bg-slate-900 border border-[#E2E8F0] dark:border-slate-800 rounded-2xl p-5 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="text-xs font-semibold text-[#0F172A] dark:text-white flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-[#2E7D5B] dark:text-emerald-400" />
            <span>SQLite 영구 저장 &amp; 파이썬 포터블 자동 동기화</span>
          </div>
          <p className="text-[11px] text-[#64748B] dark:text-slate-400">
            저장 시 SQLite 데이터베이스 `settings` 테이블에 보관되며, 언제든 상단 스냅샷으로 백업·복구할 수 있습니다.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleResetToDefaults}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#64748B] dark:text-slate-400 hover:text-[#0F172A] dark:hover:text-white bg-[#F8FAFC] dark:bg-slate-800 border border-[#CBD5E1] dark:border-slate-700 rounded-xl transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>기본값으로 되돌리기</span>
          </button>

          <button
            type="button"
            onClick={() => handleSaveAll()}
            disabled={isSaving}
            className="inline-flex items-center gap-2 px-5 py-2.5 text-xs font-bold text-white bg-[#2E7D5B] hover:bg-[#25664A] rounded-xl shadow-sm transition-all cursor-pointer disabled:opacity-50"
          >
            {isSaving ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <Save className="w-4 h-4" />
            )}
            <span>모든 API 설정 저장</span>
          </button>
        </div>
      </div>
    </div>
  );
};
