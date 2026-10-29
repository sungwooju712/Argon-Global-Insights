import React, { useMemo, useState } from 'react';
import { WatchlistItem } from '../types/stock.ts';

interface PerformanceChartProps {
  watchlist: WatchlistItem[];
  chartRange: '1M' | '3M' | '6M' | '1Y' | 'ALL' | 'CUSTOM';
  chartStartDate: string;
  chartEndDate: string;
  chartGranularity: 'daily' | 'monthly' | 'yearly';
  isDarkMode?: boolean;
  onUpdateChartPrefs: (prefs: {
    chartRange?: '1M' | '3M' | '6M' | '1Y' | 'ALL' | 'CUSTOM';
    chartStartDate?: string;
    chartEndDate?: string;
    chartGranularity?: 'daily' | 'monthly' | 'yearly';
  }) => void;
  onSelectStockForAnalysis: (symbol: string) => void;
}

const LINE_COLORS = [
  '#DC2626', // 적색 (사진의 첫 번째 종목 컬러)
  '#2E7D5B', // 에메랄드 그린 (사진의 두 번째 종목 컬러)
  '#D97706', // 앰버 골드 (사진의 세 번째 종목 컬러)
  '#2563EB', // 로얄 블루 (사진의 네 번째 종목 컬러)
  '#7C3AED', // 바이올렛
  '#0891B2', // 시안
  '#DB2777', // 핑크
];

export const PerformanceChart: React.FC<PerformanceChartProps> = ({
  watchlist,
  chartRange,
  chartStartDate,
  chartEndDate,
  chartGranularity,
  isDarkMode = false,
  onUpdateChartPrefs,
  onSelectStockForAnalysis,
}) => {
  const [localStart, setLocalStart] = useState(chartStartDate || '2026-07-23');
  const [localEnd, setLocalEnd] = useState(chartEndDate || '2026-10-29');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const [highlightedSymbol, setHighlightedSymbol] = useState<string | null>(null);

  const handlePresetRange = (range: '1M' | '3M' | '6M' | '1Y' | 'ALL') => {
    const end = '2026-10-29';
    let start = '2026-07-23';
    if (range === '1M') start = '2026-09-29';
    else if (range === '3M') start = '2026-07-23';
    else if (range === '6M') start = '2026-04-29';
    else if (range === '1Y' || range === 'ALL') start = '2025-10-30';

    setLocalStart(start);
    setLocalEnd(end);
    onUpdateChartPrefs({
      chartRange: range,
      chartStartDate: start,
      chartEndDate: end,
    });
  };

  const handleApplyCustomDates = () => {
    if (localStart && localEnd && localStart <= localEnd) {
      onUpdateChartPrefs({
        chartRange: 'CUSTOM',
        chartStartDate: localStart,
        chartEndDate: localEnd,
      });
    }
  };

  // 선택된 기간 및 단위(일간/월간/년간)에 따른 시계열 수익률(%) 계산
  const chartSeriesData = useMemo(() => {
    if (watchlist.length === 0) return { dates: [] as string[], series: [] };

    const rawDates =
      watchlist[0]?.history
        .filter((h) => h.date >= localStart && h.date <= localEnd)
        .map((h) => h.date) || [];

    let sampledDates = rawDates;
    if (chartGranularity === 'monthly' && rawDates.length > 10) {
      const seenMonths = new Set<string>();
      sampledDates = rawDates.filter((d, idx) => {
        const ym = d.slice(0, 7);
        if (idx === 0 || idx === rawDates.length - 1 || !seenMonths.has(ym)) {
          seenMonths.add(ym);
          return true;
        }
        return false;
      });
    } else if (chartGranularity === 'yearly' && rawDates.length > 5) {
      sampledDates = rawDates.filter(
        (_, idx) => idx === 0 || idx === Math.floor(rawDates.length / 2) || idx === rawDates.length - 1
      );
    }

    const series = watchlist.slice(0, 7).map((item, idx) => {
      const dateToClose = new Map(item.history.map((h) => [h.date, h.close]));
      const baseClose = dateToClose.get(sampledDates[0]) || item.history[0]?.close || item.price;

      const points = sampledDates.map((d) => {
        const c = dateToClose.get(d) ?? baseClose;
        const pct = baseClose > 0 ? ((c - baseClose) / baseClose) * 100 : 0;
        return {
          date: d,
          close: c,
          pct: Number(pct.toFixed(2)),
        };
      });

      const lastPct = points.length > 0 ? points[points.length - 1].pct : 0;
      return {
        symbol: item.symbol,
        nameKo: item.nameKo,
        currency: item.currency,
        color: LINE_COLORS[idx % LINE_COLORS.length],
        points,
        lastPct,
      };
    });

    return { dates: sampledDates, series };
  }, [watchlist, localStart, localEnd, chartGranularity]);

  const { minPct, maxPct, yTicks } = useMemo(() => {
    let minVal = -10;
    let maxVal = 10;
    for (const s of chartSeriesData.series) {
      for (const p of s.points) {
        if (p.pct < minVal) minVal = p.pct;
        if (p.pct > maxVal) maxVal = p.pct;
      }
    }
    const floorMin = Math.floor(minVal / 10) * 10 - 5;
    const ceilMax = Math.ceil(maxVal / 10) * 10 + 5;
    const step = Math.max(Math.round((ceilMax - floorMin) / 4 / 5) * 5, 10);
    const ticks: number[] = [];
    for (let v = Math.ceil(floorMin / step) * step; v <= ceilMax; v += step) {
      ticks.push(v);
    }
    if (!ticks.includes(0)) {
      ticks.push(0);
      ticks.sort((a, b) => a - b);
    }
    return {
      minPct: Math.min(floorMin, ticks[0] ?? -20),
      maxPct: Math.max(ceilMax, ticks[ticks.length - 1] ?? 20),
      yTicks: ticks,
    };
  }, [chartSeriesData]);

  const svgWidth = 860;
  const svgHeight = 290;
  const padLeft = 48;
  const padRight = 18;
  const padTop = 18;
  const padBottom = 30;
  const plotW = svgWidth - padLeft - padRight;
  const plotH = svgHeight - padTop - padBottom;

  const getX = (index: number, total: number) => {
    if (total <= 1) return padLeft + plotW / 2;
    return padLeft + (index / (total - 1)) * plotW;
  };

  const getY = (pct: number) => {
    const range = Math.max(maxPct - minPct, 1);
    return padTop + plotH - ((pct - minPct) / range) * plotH;
  };

  const rangeLabelMap: Record<string, string> = {
    '1M': '1개월',
    '3M': '3개월',
    '6M': '6개월',
    '1Y': '1년',
    ALL: '전체',
    CUSTOM: '사용자 지정',
  };

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 flex flex-col justify-between">
      {/* 상단 헤더 및 기간 필터 컨트롤 바 */}
      <div>
        <div className="flex flex-wrap items-start justify-between gap-3 mb-3">
          <div>
            <h2 className="text-[16px] font-bold text-[#0F172A] tracking-tight">관심종목 흐름</h2>
            <p className="text-xs text-[#64748B] mt-0.5 tabular-nums">
              {rangeLabelMap[chartRange] || '3개월'} · {chartSeriesData.dates.length}거래일 수익률 ({localStart}~최신) ·{' '}
              {watchlist.length}개 종목
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* 기간 버튼 (1개월 / 3개월 / 6개월 / 1년 / 전체) */}
            <div className="flex items-center bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-0.5">
              {(['1M', '3M', '6M', '1Y', 'ALL'] as const).map((rk) => {
                const active = chartRange === rk;
                return (
                  <button
                    key={rk}
                    type="button"
                    onClick={() => handlePresetRange(rk)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                      active
                        ? 'bg-white text-[#0F172A] font-semibold border border-[#CBD5E1] shadow-2xs'
                        : 'text-[#64748B] hover:text-[#0F172A]'
                    }`}
                  >
                    {rangeLabelMap[rk]}
                  </button>
                );
              })}
            </div>

            {/* 날짜 범위 직접 선택 */}
            <div className="hidden xl:flex items-center gap-1.5 text-xs">
              <input
                type="date"
                value={localStart}
                onChange={(e) => setLocalStart(e.target.value)}
                className="px-2 py-1 text-xs border border-[#E2E8F0] rounded-md bg-white text-[#334155] tabular-nums focus:outline-none focus:border-[#2E7D5B]"
              />
              <span className="text-[#94A3B8]">~</span>
              <input
                type="date"
                value={localEnd}
                onChange={(e) => setLocalEnd(e.target.value)}
                className="px-2 py-1 text-xs border border-[#E2E8F0] rounded-md bg-white text-[#334155] tabular-nums focus:outline-none focus:border-[#2E7D5B]"
              />
              <button
                type="button"
                onClick={handleApplyCustomDates}
                className="px-2.5 py-1 text-xs font-semibold text-white bg-[#2E7D5B] hover:bg-[#25664A] rounded-md transition-colors whitespace-nowrap shrink-0"
              >
                적용
              </button>
            </div>

            {/* 일간 / 월간 / 년간 토글 */}
            <div className="flex items-center bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-0.5">
              {(
                [
                  { key: 'daily', label: '일간' },
                  { key: 'monthly', label: '월간' },
                  { key: 'yearly', label: '년간' },
                ] as const
              ).map((g) => (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => onUpdateChartPrefs({ chartGranularity: g.key })}
                  className={`px-2 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                    chartGranularity === g.key
                      ? 'bg-white text-[#0F172A] font-semibold border border-[#CBD5E1]'
                      : 'text-[#64748B] hover:text-[#0F172A]'
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>

            {/* 종목 분석 바로가기 버튼 */}
            {watchlist.length > 0 && (
              <button
                type="button"
                onClick={() => onSelectStockForAnalysis(highlightedSymbol || watchlist[0].symbol)}
                className="px-2.5 py-1 text-xs font-semibold text-[#2E7D5B] bg-[#F0FDF4] border border-[#BBF7D0] hover:bg-[#DCFCE7] rounded-md transition-colors whitespace-nowrap shrink-0"
              >
                종목 분석
              </button>
            )}
          </div>
        </div>

        {/* 종목별 수익률 레전드 바 (참고 사진과 동일한 디자인) */}
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mb-2">
          {chartSeriesData.series.map((s) => {
            const isSelected = highlightedSymbol === s.symbol;
            return (
              <button
                key={s.symbol}
                type="button"
                onClick={() => setHighlightedSymbol(isSelected ? null : s.symbol)}
                onDoubleClick={() => onSelectStockForAnalysis(s.symbol)}
                title="클릭하여 강조, 더블클릭하여 재무제표 분석 열기"
                className={`inline-flex items-center gap-1.5 text-xs transition-opacity cursor-pointer ${
                  highlightedSymbol && !isSelected ? 'opacity-40 hover:opacity-80' : 'opacity-100'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full inline-block shrink-0"
                  style={{ backgroundColor: s.color }}
                />
                <span className="font-semibold text-[#1E293B]">{s.nameKo}</span>
                <span
                  className={`tabular-nums font-medium ${
                    s.lastPct > 0 ? 'text-[#E11D48]' : s.lastPct < 0 ? 'text-[#2563EB]' : 'text-[#64748B]'
                  }`}
                >
                  {s.lastPct > 0 ? `+${s.lastPct.toFixed(2)}%` : `${s.lastPct.toFixed(2)}%`}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* SVG 멀티라인 수익률 차트 */}
      {watchlist.length === 0 ? (
        <div className="h-[270px] flex flex-col items-center justify-center bg-[#F8FAFC] rounded-lg border border-dashed border-[#CBD5E1] text-center p-6">
          <p className="text-sm font-medium text-[#475569]">현재 등록된 관심종목이 없습니다.</p>
          <p className="text-xs text-[#64748B] mt-1">
            우측 상단 <span className="font-semibold text-[#2E7D5B]">+ 종목 추가</span> 버튼을 눌러 AAPL, 600519, 00700 등을 추가해 보세요.
          </p>
        </div>
      ) : (
        <div className="relative w-full overflow-hidden">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full h-[280px] select-none overflow-visible"
            onMouseLeave={() => setHoverIndex(null)}
          >
            {/* Y축 그리드 라인 및 레이블 */}
            {yTicks.map((val) => {
              const y = getY(val);
              const isZero = val === 0;
              return (
                <g key={val}>
                  <line
                    x1={padLeft}
                    y1={y}
                    x2={svgWidth - padRight}
                    y2={y}
                    stroke={
                      isZero
                        ? isDarkMode
                          ? '#475569'
                          : '#CBD5E1'
                        : isDarkMode
                        ? '#1E293B'
                        : '#E2E8F0'
                    }
                    strokeWidth={isZero ? 1.2 : 1}
                    strokeDasharray={isZero ? undefined : '3 3'}
                  />
                  <text
                    x={padLeft - 8}
                    y={y + 4}
                    textAnchor="end"
                    className="fill-[#94A3B8] text-[11px] font-mono tabular-nums"
                  >
                    {val > 0 ? `+${val}%` : `${val}%`}
                  </text>
                </g>
              );
            })}

            {/* X축 날짜 레이블 */}
            {chartSeriesData.dates.map((d, idx) => {
              const total = chartSeriesData.dates.length;
              const step = Math.max(Math.floor(total / 7), 1);
              if (idx % step !== 0 && idx !== total - 1) return null;
              const x = getX(idx, total);
              return (
                <text
                  key={d}
                  x={x}
                  y={svgHeight - 6}
                  textAnchor="middle"
                  className="fill-[#94A3B8] text-[11px] font-mono tabular-nums"
                >
                  {d.slice(5)}
                </text>
              );
            })}

            {/* 각 관심종목 수익률 곡선 */}
            {chartSeriesData.series.map((s) => {
              if (s.points.length === 0) return null;
              const pathD = s.points
                .map((p, idx) => {
                  const x = getX(idx, s.points.length);
                  const y = getY(p.pct);
                  return `${idx === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
                })
                .join(' ');

              const isDimmed = highlightedSymbol && highlightedSymbol !== s.symbol;
              const isHighlighted = highlightedSymbol === s.symbol;

              return (
                <g key={s.symbol}>
                  <path
                    d={pathD}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={isHighlighted ? 2.6 : 1.75}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    opacity={isDimmed ? 0.22 : 0.95}
                  />
                  {hoverIndex !== null && s.points[hoverIndex] && !isDimmed && (
                    <circle
                      cx={getX(hoverIndex, s.points.length)}
                      cy={getY(s.points[hoverIndex].pct)}
                      r={4}
                      fill={s.color}
                      stroke="#FFFFFF"
                      strokeWidth={1.5}
                    />
                  )}
                </g>
              );
            })}

            {/* 호버 수직 가이드선 */}
            {hoverIndex !== null && chartSeriesData.dates[hoverIndex] && (
              <line
                x1={getX(hoverIndex, chartSeriesData.dates.length)}
                y1={padTop}
                x2={getX(hoverIndex, chartSeriesData.dates.length)}
                y2={svgHeight - padBottom}
                stroke="#94A3B8"
                strokeWidth={1}
                strokeDasharray="2 2"
              />
            )}

            {/* 마우스 이벤트 감지용 투명 슬라이스 */}
            {chartSeriesData.dates.map((d, idx) => {
              const total = chartSeriesData.dates.length;
              const sliceW = total > 1 ? plotW / total : plotW;
              const x = getX(idx, total) - sliceW / 2;
              return (
                <rect
                  key={d}
                  x={Math.max(padLeft, x)}
                  y={padTop}
                  width={sliceW}
                  height={plotH}
                  fill="transparent"
                  onMouseEnter={() => setHoverIndex(idx)}
                />
              );
            })}
          </svg>

          {/* 호버 시 상세 수익률 툴팁 */}
          {hoverIndex !== null && chartSeriesData.dates[hoverIndex] && (
            <div className="absolute top-2 right-4 bg-[#0F172A]/95 text-white rounded-lg px-3 py-2 text-xs shadow-md pointer-events-none border border-slate-700">
              <div className="font-mono font-semibold text-slate-300 mb-1 border-b border-slate-700 pb-1">
                기준일: {chartSeriesData.dates[hoverIndex]}
              </div>
              <div className="space-y-1">
                {chartSeriesData.series.map((s) => {
                  const pt = s.points[hoverIndex];
                  if (!pt) return null;
                  return (
                    <div key={s.symbol} className="flex items-center justify-between gap-4 tabular-nums">
                      <span className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: s.color }} />
                        <span>{s.nameKo}</span>
                      </span>
                      <span className="font-mono">
                        {pt.close.toLocaleString()} {s.currency} (
                        <span className={pt.pct >= 0 ? 'text-rose-400' : 'text-sky-400'}>
                          {pt.pct >= 0 ? `+${pt.pct.toFixed(2)}%` : `${pt.pct.toFixed(2)}%`}
                        </span>
                        )
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
