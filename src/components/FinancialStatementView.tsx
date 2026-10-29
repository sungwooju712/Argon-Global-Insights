import React, { useEffect, useMemo, useState } from 'react';
import {
  Download,
  Edit3,
  FileSpreadsheet,
  Info,
  Plus,
  RefreshCw,
  Search,
} from 'lucide-react';
import {
  FinancialStatementRow,
  PeriodType,
  StatementType,
  StockFinancials,
  WatchlistItem,
} from '../types/stock.ts';

interface FinancialStatementViewProps {
  selectedSymbol: string;
  watchlist: WatchlistItem[];
  namesKo: Record<string, string>;
  onSelectSymbol: (symbol: string) => void;
  onAddWatchlist: (symbol: string) => Promise<void>;
  onUpdateMapping: (rawKey: string, labelKo: string) => Promise<void>;
  onUpdateNameKo: (symbol: string, nameKo: string) => Promise<void>;
}

const CHART_COLORS = ['#2E7D5B', '#2563EB', '#D97706', '#E11D48'];

function formatFinancialNumber(val: number | null | undefined, rawKey: string): string {
  if (val === null || val === undefined || Number.isNaN(val)) return '-';
  // EPS(주당순이익)는 소수점 2자리까지 표시
  if (
    rawKey.toLowerCase().includes('pershare') ||
    rawKey.includes('每股收益')
  ) {
    return val.toLocaleString('ko-KR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
  }
  return Math.round(val).toLocaleString('ko-KR');
}

export const FinancialStatementView: React.FC<FinancialStatementViewProps> = ({
  selectedSymbol,
  watchlist,
  namesKo,
  onSelectSymbol,
  onAddWatchlist,
  onUpdateMapping,
  onUpdateNameKo,
}) => {
  const [periodType, setPeriodType] = useState<PeriodType>('annual');
  const [statementType, setStatementType] = useState<StatementType>('IS');
  const [financials, setFinancials] = useState<StockFinancials | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [showRawKeys, setShowRawKeys] = useState<boolean>(true);
  const [symbolInput, setSymbolInput] = useState<string>(selectedSymbol);

  // 인라인 한글 매핑/종목명 편집 상태
  const [editingRowKey, setEditingRowKey] = useState<string | null>(null);
  const [editingRowLabel, setEditingRowLabel] = useState<string>('');
  const [editingStockName, setEditingStockName] = useState<boolean>(false);
  const [stockNameDraft, setStockNameDraft] = useState<string>('');

  // 그래프에 표시할 선택된 항목 키 목록
  const [selectedChartKeys, setSelectedChartKeys] = useState<string[]>([]);

  const loadFinancialData = async (sym: string, pType: PeriodType, force = false) => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const resp = await fetch(
        `/api/financials/${encodeURIComponent(sym)}?periodType=${pType}&force=${force ? 'true' : 'false'}`
      );
      if (!resp.ok) {
        throw new Error('재무제표 데이터를 불러오지 못했습니다.');
      }
      const data = (await resp.json()) as StockFinancials;
      setFinancials(data);
    } catch (err) {
      setErrorMsg(
        err instanceof Error
          ? err.message
          : '재무제표 호출에 실패했습니다. 잠시 후 다시 시도해 주세요.'
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setSymbolInput(selectedSymbol);
    loadFinancialData(selectedSymbol, periodType, false);
  }, [selectedSymbol, periodType]);

  const activeRows: FinancialStatementRow[] = useMemo(() => {
    if (!financials) return [];
    if (statementType === 'IS') return financials.incomeStatement;
    if (statementType === 'BS') return financials.balanceSheet;
    return financials.cashFlow;
  }, [financials, statementType]);

  // 탭 전환 시 기본 주요 항목(Key Metric) 3개를 자동 선택
  useEffect(() => {
    if (activeRows.length === 0) return;
    const keyRows = activeRows.filter((r) => r.isKeyMetric).slice(0, 3);
    if (keyRows.length > 0) {
      setSelectedChartKeys(keyRows.map((r) => r.rawKey));
    } else {
      setSelectedChartKeys(activeRows.slice(0, 3).map((r) => r.rawKey));
    }
  }, [activeRows, statementType]);

  const toggleChartKey = (rawKey: string) => {
    setSelectedChartKeys((prev) => {
      if (prev.includes(rawKey)) {
        return prev.length > 1 ? prev.filter((k) => k !== rawKey) : prev;
      }
      if (prev.length >= 4) {
        return [...prev.slice(1), rawKey];
      }
      return [...prev, rawKey];
    });
  };

  const handleSaveRowMapping = async (rawKey: string) => {
    if (!editingRowLabel.trim()) return;
    await onUpdateMapping(rawKey, editingRowLabel.trim());
    setEditingRowKey(null);
    await loadFinancialData(selectedSymbol, periodType, false);
  };

  const handleSaveStockName = async () => {
    if (!financials || !stockNameDraft.trim()) return;
    await onUpdateNameKo(financials.symbol, stockNameDraft.trim());
    setEditingStockName(false);
    await loadFinancialData(selectedSymbol, periodType, false);
  };

  const handleExportCsv = () => {
    if (!financials) return;
    const headers = ['항목명(한글)', '원문계정명', ...financials.periods];
    const lines = [headers.join(',')];
    for (const row of activeRows) {
      const vals = financials.periods.map((p) => {
        const v = row.values[p];
        return v === null || v === undefined ? '' : String(v);
      });
      lines.push([`"${row.labelKo}"`, `"${row.rawKey}"`, ...vals].join(','));
    }
    const blob = new Blob(['\uFEFF' + lines.join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${financials.symbol}_${statementType}_${periodType}_${financials.periods[financials.periods.length - 1]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const isInWatchlist = watchlist.some(
    (w) => w.symbol.toUpperCase() === selectedSymbol.toUpperCase()
  );

  // 주요 항목 그래프 렌더링 데이터 계산
  const chartData = useMemo(() => {
    if (!financials || activeRows.length === 0) return { periods: [] as string[], metrics: [] };
    const chosenRows = activeRows.filter((r) => selectedChartKeys.includes(r.rawKey));
    return {
      periods: financials.periods,
      metrics: chosenRows.map((row, idx) => ({
        rawKey: row.rawKey,
        labelKo: row.labelKo,
        color: CHART_COLORS[idx % CHART_COLORS.length],
        values: financials.periods.map((p) => row.values[p] ?? 0),
      })),
    };
  }, [financials, activeRows, selectedChartKeys]);

  const maxAbsValue = useMemo(() => {
    let m = 100;
    for (const metric of chartData.metrics) {
      for (const v of metric.values) {
        if (Math.abs(v) > m) m = Math.abs(v);
      }
    }
    return m * 1.15;
  }, [chartData]);

  const hasNegativeValues = useMemo(() => {
    return chartData.metrics.some((m) => m.values.some((v) => v < 0));
  }, [chartData]);

  const marketLabelMap: Record<string, string> = {
    US: '미국 (SEC EDGAR)',
    CN: '중국 A주 (AKShare)',
    HK: '홍콩 (AKShare)',
  };

  return (
    <div className="space-y-5">
      {/* 상단 종목 선택 및 빠른 이동 바 */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-4">
          {/* 현재 선택된 종목 정보 */}
          <div className="flex flex-wrap items-center gap-3">
            {editingStockName && financials ? (
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={stockNameDraft}
                  onChange={(e) => setStockNameDraft(e.target.value)}
                  className="px-2.5 py-1 text-base font-bold border border-[#2E7D5B] rounded-md focus:outline-none"
                  placeholder="종목 한글명 입력"
                />
                <button
                  type="button"
                  onClick={handleSaveStockName}
                  className="px-2.5 py-1 text-xs font-semibold text-white bg-[#2E7D5B] rounded-md"
                >
                  저장
                </button>
                <button
                  type="button"
                  onClick={() => setEditingStockName(false)}
                  className="px-2 py-1 text-xs text-[#64748B] hover:text-[#0F172A]"
                >
                  취소
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-[#0F172A] tracking-tight">
                  {financials ? namesKo[financials.symbol] || financials.nameKo : selectedSymbol}
                </h2>
                <span className="text-sm font-mono font-semibold text-[#475569]">
                  {financials?.symbol || selectedSymbol}
                </span>
                {financials && (
                  <button
                    type="button"
                    onClick={() => {
                      setStockNameDraft(namesKo[financials.symbol] || financials.nameKo);
                      setEditingStockName(true);
                    }}
                    title="종목 한글명 사전(names_ko.json) 직접 수정"
                    className="p-1 text-[#64748B] hover:text-[#0F172A] rounded transition-colors"
                  >
                    <Edit3 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            )}

            {financials && (
              <div className="flex flex-wrap items-center gap-2 text-xs text-[#64748B]">
                <span>·</span>
                <span>{marketLabelMap[financials.market] || financials.market}</span>
                <span>·</span>
                <span>원문명: {financials.nameOriginal}</span>
                <span>·</span>
                <span className="font-semibold text-[#0F172A]">
                  통화: {financials.currency} (단위: {financials.unit})
                </span>
              </div>
            )}
          </div>

          {/* 우측 검색 및 관심종목 빠른 전환 */}
          <div className="flex flex-wrap items-center gap-2">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (symbolInput.trim()) {
                  onSelectSymbol(symbolInput.trim().toUpperCase());
                }
              }}
              className="flex items-center gap-1.5"
            >
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={symbolInput}
                  onChange={(e) => setSymbolInput(e.target.value)}
                  placeholder="종목코드 입력 (AAPL, 600519, 00700)"
                  className="pl-8 pr-3 py-1.5 text-xs border border-[#E2E8F0] rounded-lg bg-[#F8FAFC] focus:bg-white focus:outline-none focus:border-[#2E7D5B] w-56"
                />
              </div>
              <button
                type="submit"
                className="px-3 py-1.5 text-xs font-semibold text-white bg-[#0F172A] hover:bg-[#1E293B] rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                재무 조회
              </button>
            </form>

            {!isInWatchlist && (
              <button
                type="button"
                onClick={() => onAddWatchlist(selectedSymbol)}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#2E7D5B] hover:bg-[#25664A] rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Plus className="w-3.5 h-3.5" />
                관심종목 추가
              </button>
            )}

            <button
              type="button"
              onClick={() => loadFinancialData(selectedSymbol, periodType, true)}
              disabled={loading}
              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-medium text-[#334155] bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              강제 갱신
            </button>
          </div>
        </div>

        {/* 관심종목 및 대표 3대 종목(AAPL, 600519, 00700) 빠른 선택 탭 */}
        <div className="flex flex-wrap items-center gap-1.5 mt-4 pt-3 border-t border-[#F1F5F9]">
          <span className="text-xs font-medium text-[#64748B] mr-1">빠른 종목 전환:</span>
          {Array.from(
            new Set(['AAPL', '600519', '00700', ...watchlist.map((w) => w.symbol)])
          ).map((sym) => {
            const active = sym.toUpperCase() === selectedSymbol.toUpperCase();
            const koLabel = namesKo[sym] || sym;
            return (
              <button
                key={sym}
                type="button"
                onClick={() => onSelectSymbol(sym)}
                className={`px-2.5 py-1 text-xs rounded-md transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-[#2E7D5B] text-white font-semibold'
                    : 'bg-[#F8FAFC] text-[#475569] border border-[#E2E8F0] hover:bg-[#F1F5F9]'
                }`}
              >
                {koLabel} ({sym})
              </button>
            );
          })}
        </div>

        {/* 출처 및 마지막 수신 시각, 오류/폴백 한글 안내 */}
        {financials && (
          <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-[#64748B] bg-[#F8FAFC] px-3 py-2 rounded-lg border border-[#E2E8F0]">
            <div className="flex flex-wrap items-center gap-2">
              <span>데이터 출처: {financials.source}</span>
              <span>·</span>
              <span className="tabular-nums">마지막 수신 시각: {financials.fetchedAt}</span>
              <span>·</span>
              <span>캐시 정책: 재무제표 1일(24시간) 로컬 SQLite 재사용</span>
            </div>
            {financials.warningKo && (
              <div className="text-amber-700 font-medium flex items-center gap-1">
                <Info className="w-3.5 h-3.5 shrink-0" />
                <span>{financials.warningKo}</span>
              </div>
            )}
          </div>
        )}
      </div>

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-200 rounded-xl p-4 text-xs text-rose-800">
          <strong>호출 안내:</strong> {errorMsg} (마지막 저장된 로컬 캐시 값이 있으면 아래에 표시됩니다.)
        </div>
      )}

      {/* 재무제표 종류(손익계산서 / 재무상태표 / 현금흐름표) 및 기간(연간 5년 / 분기 8개) 컨트롤 바 */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          {/* 손익계산서 / 재무상태표 / 현금흐름표 탭 */}
          <div className="flex items-center bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-1">
            {(
              [
                { key: 'IS', label: '손익계산서' },
                { key: 'BS', label: '재무상태표' },
                { key: 'CF', label: '현금흐름표' },
              ] as const
            ).map((tab) => {
              const active = statementType === tab.key;
              return (
                <button
                  key={tab.key}
                  type="button"
                  onClick={() => setStatementType(tab.key)}
                  className={`px-4 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    active
                      ? 'bg-[#0F172A] text-white'
                      : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  {tab.label}
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* 연간 (최근 5년) / 분기 (최근 8개) 전환 */}
            <div className="flex items-center bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-1">
              {(
                [
                  { key: 'annual', label: '연간 (최근 5년)' },
                  { key: 'quarterly', label: '분기 (최근 8개)' },
                ] as const
              ).map((pt) => {
                const active = periodType === pt.key;
                return (
                  <button
                    key={pt.key}
                    type="button"
                    onClick={() => setPeriodType(pt.key)}
                    className={`px-3.5 py-1.5 text-xs font-semibold rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-[#2E7D5B] text-white'
                        : 'text-[#64748B] hover:text-[#0F172A]'
                    }`}
                  >
                    {pt.label}
                  </button>
                );
              })}
            </div>

            <button
              type="button"
              onClick={() => setShowRawKeys((v) => !v)}
              className="px-3 py-1.5 text-xs font-medium text-[#475569] bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              {showRawKeys ? '원문 계정코드 숨기기' : '원문 계정코드 함께 보기'}
            </button>

            <button
              type="button"
              onClick={handleExportCsv}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#334155] bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              CSV 내보내기
            </button>
          </div>
        </div>

        {/* 주요 항목 그래프 (막대 시계열 비교 차트) */}
        {financials && chartData.periods.length > 0 && (
          <div className="border border-[#E2E8F0] rounded-xl p-4 bg-[#FAFCFF]">
            <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-sm font-bold text-[#0F172A]">
                  주요 재무 항목 추이 그래프 ({periodType === 'annual' ? '최근 5년 연간' : '최근 8개 분기'})
                </h3>
                <p className="text-xs text-[#64748B]">
                  아래 재무제표 표에서 원하는 항목 행을 클릭하면 그래프에 추가하거나 제외할 수 있습니다 (최대 4개 비교 · 단위: 백만{' '}
                  {financials.currency})
                </p>
              </div>
              <div className="flex flex-wrap items-center gap-3">
                {chartData.metrics.map((m) => (
                  <span key={m.rawKey} className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#1E293B]">
                    <span className="w-2.5 h-2.5 rounded-xs" style={{ backgroundColor: m.color }} />
                    <span>{m.labelKo}</span>
                  </span>
                ))}
              </div>
            </div>

            {/* 그룹형 막대그래프 SVG */}
            <div className="w-full overflow-x-auto">
              <svg viewBox="0 0 840 210" className="w-full h-[200px] min-w-[560px]">
                {(() => {
                  const padL = 70;
                  const padR = 20;
                  const padT = 18;
                  const padB = 30;
                  const pW = 840 - padL - padR;
                  const pH = 210 - padT - padB;
                  const zeroY = hasNegativeValues ? padT + pH * 0.62 : padT + pH;
                  const posHeight = zeroY - padT;
                  const negHeight = padT + pH - zeroY;

                  const getBarYAndH = (val: number) => {
                    if (val >= 0) {
                      const h = (val / maxAbsValue) * posHeight;
                      return { y: zeroY - h, h: Math.max(h, 2) };
                    } else {
                      const h = (Math.abs(val) / maxAbsValue) * (hasNegativeValues ? negHeight : posHeight * 0.3);
                      return { y: zeroY, h: Math.max(h, 2) };
                    }
                  };

                  return (
                    <>
                      {/* 가이드라인 */}
                      {[1, 0.5, 0].map((ratio) => {
                        const y = zeroY - posHeight * ratio;
                        const labelVal = Math.round(maxAbsValue * ratio);
                        return (
                          <g key={ratio}>
                            <line
                              x1={padL}
                              y1={y}
                              x2={840 - padR}
                              y2={y}
                              stroke={ratio === 0 ? '#94A3B8' : '#E2E8F0'}
                              strokeWidth={ratio === 0 ? 1.2 : 1}
                              strokeDasharray={ratio === 0 ? undefined : '3 3'}
                            />
                            <text
                              x={padL - 8}
                              y={y + 4}
                              textAnchor="end"
                              className="fill-[#64748B] text-[10px] font-mono tabular-nums"
                            >
                              {labelVal.toLocaleString()}
                            </text>
                          </g>
                        );
                      })}

                      {/* 기간별 막대 그룹 */}
                      {chartData.periods.map((period, pIdx) => {
                        const groupWidth = pW / chartData.periods.length;
                        const groupX = padL + pIdx * groupWidth;
                        const mCount = Math.max(chartData.metrics.length, 1);
                        const barWidth = Math.min((groupWidth * 0.68) / mCount, 26);
                        const totalBarsW = barWidth * mCount + (mCount - 1) * 3;
                        const startX = groupX + (groupWidth - totalBarsW) / 2;

                        return (
                          <g key={period}>
                            {chartData.metrics.map((m, mIdx) => {
                              const val = m.values[pIdx] ?? 0;
                              const { y, h } = getBarYAndH(val);
                              const bx = startX + mIdx * (barWidth + 3);
                              return (
                                <g key={m.rawKey}>
                                  <rect
                                    x={bx}
                                    y={y}
                                    width={barWidth}
                                    height={h}
                                    rx={2.5}
                                    fill={m.color}
                                    opacity={0.9}
                                  >
                                    <title>{`${period} · ${m.labelKo}: ${Math.round(val).toLocaleString()} 백만 ${financials.currency}`}</title>
                                  </rect>
                                </g>
                              );
                            })}
                            <text
                              x={groupX + groupWidth / 2}
                              y={210 - 8}
                              textAnchor="middle"
                              className="fill-[#475569] text-[11px] font-mono tabular-nums font-medium"
                            >
                              {period}
                            </text>
                          </g>
                        );
                      })}
                    </>
                  );
                })()}
              </svg>
            </div>
          </div>
        )}

        {/* 한글 재무제표 표 (단위: 백만, 천 단위 쉼표, 날짜 YYYY-MM-DD) */}
        {financials && (
          <div className="overflow-x-auto border border-[#E2E8F0] rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-xs font-semibold text-[#475569]">
                  <th className="py-3 px-4 min-w-[240px]">
                    재무 항목명 (단위: 백만 {financials.currency})
                  </th>
                  {financials.periods.map((period) => (
                    <th
                      key={period}
                      className="py-3 px-3.5 text-right font-mono tabular-nums whitespace-nowrap"
                    >
                      {period}
                    </th>
                  ))}
                  <th className="py-3 px-3 text-center whitespace-nowrap w-24">한글명 편집</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] text-[13px]">
                {activeRows.map((row) => {
                  const isPlotted = selectedChartKeys.includes(row.rawKey);
                  const isEditing = editingRowKey === row.rawKey;

                  return (
                    <tr
                      key={row.rawKey}
                      onClick={() => {
                        if (!isEditing) toggleChartKey(row.rawKey);
                      }}
                      className={`transition-colors cursor-pointer ${
                        isPlotted
                          ? 'bg-[#F0FDF4]/65 hover:bg-[#DCFCE7]/60'
                          : row.isKeyMetric
                          ? 'bg-[#FAFCFF] hover:bg-[#F8FAFC]'
                          : 'hover:bg-[#F8FAFC]'
                      }`}
                    >
                      <td className="py-2.5 px-4">
                        {isEditing ? (
                          <div
                            className="flex items-center gap-1.5"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <input
                              type="text"
                              value={editingRowLabel}
                              onChange={(e) => setEditingRowLabel(e.target.value)}
                              className="px-2 py-1 text-xs border border-[#2E7D5B] rounded bg-white focus:outline-none w-44"
                            />
                            <button
                              type="button"
                              onClick={() => handleSaveRowMapping(row.rawKey)}
                              className="px-2 py-1 text-xs font-semibold text-white bg-[#2E7D5B] rounded"
                            >
                              저장
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingRowKey(null)}
                              className="px-1.5 py-1 text-xs text-[#64748B]"
                            >
                              취소
                            </button>
                          </div>
                        ) : (
                          <div className="flex flex-col">
                            <div className="flex items-center gap-2">
                              <span
                                className={`${
                                  row.isKeyMetric
                                    ? 'font-bold text-[#0F172A]'
                                    : 'font-medium text-[#1E293B]'
                                }`}
                              >
                                {row.labelKo}
                              </span>
                              {isPlotted && (
                                <span className="text-[11px] font-semibold text-[#2E7D5B]">
                                  · 그래프 표시 중
                                </span>
                              )}
                            </div>
                            {showRawKeys && (
                              <span className="text-[11px] font-mono text-[#94A3B8]">
                                {row.rawKey}
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {financials.periods.map((period) => {
                        const val = row.values[period];
                        const isNeg = typeof val === 'number' && val < 0;
                        return (
                          <td
                            key={period}
                            className={`py-2.5 px-3.5 text-right font-mono tabular-nums whitespace-nowrap ${
                              row.isKeyMetric ? 'font-semibold' : 'font-normal'
                            } ${isNeg ? 'text-[#2563EB]' : 'text-[#0F172A]'}`}
                          >
                            {formatFinancialNumber(val, row.rawKey)}
                          </td>
                        );
                      })}

                      <td
                        className="py-2.5 px-3 text-center"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <button
                          type="button"
                          onClick={() => {
                            setEditingRowKey(row.rawKey);
                            setEditingRowLabel(row.labelKo);
                          }}
                          title="mapping.json 한글 항목명 수정"
                          className="p-1 text-[#64748B] hover:text-[#0F172A] rounded hover:bg-[#E2E8F0]/50 transition-colors"
                        >
                          <Edit3 className="w-3.5 h-3.5 inline" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#64748B] pt-1">
          <div className="flex items-center gap-1.5">
            <FileSpreadsheet className="w-3.5 h-3.5 text-[#2E7D5B]" />
            <span>
              모든 재무 수치는 원래 통화({financials?.currency || 'USD/CNY/HKD'}) 기준{' '}
              <strong className="text-[#0F172A]">백만 단위</strong>로 표시되며(주당순이익 EPS 제외), 천 단위마다 쉼표(,)가 표기됩니다.
            </span>
          </div>
          <span>날짜 형식: YYYY-MM-DD</span>
        </div>
      </div>
    </div>
  );
};
