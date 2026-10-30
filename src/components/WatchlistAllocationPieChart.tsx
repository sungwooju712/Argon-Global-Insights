import React, { useMemo, useState } from 'react';
import { PieChart as PieChartIcon, Plus } from 'lucide-react';
import { WatchlistItem } from '../types/stock.ts';

interface WatchlistAllocationPieChartProps {
  watchlist: WatchlistItem[];
  namesKo: Record<string, string>;
  isDarkMode?: boolean;
  onSelectStockForAnalysis: (symbol: string) => void;
  onOpenAddModal: () => void;
}

type DimensionMode = 'market' | 'sector' | 'group';
type WeightMode = 'count' | 'marketCap';

interface PieSliceData {
  key: string;
  label: string;
  rawValue: number;
  count: number;
  marketCapUsdMillions: number;
  percentage: number;
  color: string;
  stocks: { symbol: string; nameKo: string }[];
  startAngle: number;
  endAngle: number;
}

const MARKET_COLORS: Record<string, string> = {
  US: '#2563EB', // 미국 - 로얄 블루
  CN: '#E11D48', // 중국 A주 - 크림슨 레드
  HK: '#2E7D5B', // 홍콩 - 에메랄드 그린
};

const GROUP_COLORS: Record<string, string> = {
  '성장주': '#10B981', // 에메랄드
  '배당주': '#3B82F6', // 블루
  '가치주': '#F59E0B', // 앰버
  'ETF/원자재': '#8B5CF6', // 퍼플
  '관찰대상': '#06B6D4', // 시안
  '기본': '#64748B', // 슬레이트
};

const SECTOR_PALETTE = [
  '#2E7D5B', // 에메랄드
  '#2563EB', // 블루
  '#D97706', // 앰버
  '#E11D48', // 로즈
  '#7C3AED', // 바이올렛
  '#0891B2', // 시안
  '#4F46E5', // 인디고
  '#EA580C', // 오렌지
];

const FX_TO_USD: Record<string, number> = {
  USD: 1,
  CNY: 0.14,
  HKD: 0.128,
};

function polarToCartesian(cx: number, cy: number, r: number, angleInDegrees: number) {
  const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
  return {
    x: cx + r * Math.cos(angleInRadians),
    y: cy + r * Math.sin(angleInRadians),
  };
}

function createDonutSlicePath(
  cx: number,
  cy: number,
  outerR: number,
  innerR: number,
  startAngle: number,
  endAngle: number
): string {
  // 단일 항목이 100%(360도)인 경우 전체 원호 처리
  const clampedEnd = endAngle - startAngle >= 359.99 ? startAngle + 359.99 : endAngle;
  const startOuter = polarToCartesian(cx, cy, outerR, clampedEnd);
  const endOuter = polarToCartesian(cx, cy, outerR, startAngle);
  const startInner = polarToCartesian(cx, cy, innerR, clampedEnd);
  const endInner = polarToCartesian(cx, cy, innerR, startAngle);
  const largeArcFlag = clampedEnd - startAngle <= 180 ? '0' : '1';

  return [
    'M',
    startOuter.x.toFixed(2),
    startOuter.y.toFixed(2),
    'A',
    outerR,
    outerR,
    0,
    largeArcFlag,
    0,
    endOuter.x.toFixed(2),
    endOuter.y.toFixed(2),
    'L',
    endInner.x.toFixed(2),
    endInner.y.toFixed(2),
    'A',
    innerR,
    innerR,
    0,
    largeArcFlag,
    1,
    startInner.x.toFixed(2),
    startInner.y.toFixed(2),
    'Z',
  ].join(' ');
}

export const WatchlistAllocationPieChart: React.FC<WatchlistAllocationPieChartProps> = ({
  watchlist,
  namesKo,
  isDarkMode = false,
  onSelectStockForAnalysis,
  onOpenAddModal,
}) => {
  const [dimension, setDimension] = useState<DimensionMode>('market');
  const [weightMode, setWeightMode] = useState<WeightMode>('count');
  const [hoveredKey, setHoveredKey] = useState<string | null>(null);

  const slices: PieSliceData[] = useMemo(() => {
    if (watchlist.length === 0) return [];

    const groups = new Map<
      string,
      {
        key: string;
        label: string;
        count: number;
        marketCapUsdMillions: number;
        stocks: { symbol: string; nameKo: string }[];
      }
    >();

    for (const item of watchlist) {
      const groupKey =
        dimension === 'market'
          ? item.market
          : dimension === 'sector'
          ? item.sectorKo || '기타 섹터'
          : item.group || '기본';
      const groupLabel =
        dimension === 'market'
          ? item.market === 'US'
            ? '미국 (US)'
            : item.market === 'CN'
            ? '중국 A주 (CN)'
            : '홍콩 (HK)'
          : dimension === 'sector'
          ? item.sectorKo || '기타 섹터'
          : `${item.group || '기본'}`;

      const capUsd = Math.round(
        item.marketCapMillions * (FX_TO_USD[item.currency] || 1)
      );
      const dispName = namesKo[item.symbol] || item.nameKo;

      const existing = groups.get(groupKey);
      if (existing) {
        existing.count += 1;
        existing.marketCapUsdMillions += capUsd;
        existing.stocks.push({ symbol: item.symbol, nameKo: dispName });
      } else {
        groups.set(groupKey, {
          key: groupKey,
          label: groupLabel,
          count: 1,
          marketCapUsdMillions: capUsd,
          stocks: [{ symbol: item.symbol, nameKo: dispName }],
        });
      }
    }

    const list = Array.from(groups.values()).map((g) => ({
      ...g,
      rawValue: weightMode === 'count' ? g.count : g.marketCapUsdMillions,
    }));

    // 내림차순 정렬
    list.sort((a, b) => b.rawValue - a.rawValue);

    const total = list.reduce((acc, cur) => acc + cur.rawValue, 0);
    let currentAngle = 0;

    return list.map((g, idx) => {
      const pct = total > 0 ? (g.rawValue / total) * 100 : 0;
      const sweep = (pct / 100) * 360;
      const startAngle = currentAngle;
      const endAngle = currentAngle + sweep;
      currentAngle = endAngle;

      const color =
        dimension === 'market'
          ? MARKET_COLORS[g.key] || SECTOR_PALETTE[idx % SECTOR_PALETTE.length]
          : dimension === 'group'
          ? GROUP_COLORS[g.key] || SECTOR_PALETTE[idx % SECTOR_PALETTE.length]
          : SECTOR_PALETTE[idx % SECTOR_PALETTE.length];

      return {
        ...g,
        percentage: Number(pct.toFixed(1)),
        color,
        startAngle,
        endAngle,
      };
    });
  }, [watchlist, namesKo, dimension, weightMode]);

  const activeSlice = useMemo(() => {
    if (!hoveredKey) return null;
    return slices.find((s) => s.key === hoveredKey) || null;
  }, [slices, hoveredKey]);

  const totalMarketCapUsd = useMemo(
    () => slices.reduce((acc, s) => acc + s.marketCapUsdMillions, 0),
    [slices]
  );

  return (
    <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 flex flex-col justify-between">
      {/* 상단 헤더 및 기준 전환 탭 */}
      <div className="flex flex-wrap items-start justify-between gap-3 mb-4">
        <div>
          <div className="flex items-center gap-2">
            <PieChartIcon className="w-4 h-4 text-[#2E7D5B]" />
            <h2 className="text-[16px] font-bold text-[#0F172A] tracking-tight">
              관심종목 포트폴리오 비중 ({dimension === 'market' ? '시장별' : dimension === 'sector' ? '섹터별' : '그룹별 (성장주·배당주)'})
            </h2>
          </div>
          <p className="text-xs text-[#64748B] mt-0.5 tabular-nums">
            현재 관심종목({watchlist.length}개) 기준{' '}
            {dimension === 'market'
              ? '미국 · 중국 A주 · 홍콩 시장'
              : dimension === 'sector'
              ? '산업 섹터'
              : '사용자 지정 그룹(성장주·배당주 등)'} 구성 비율
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* 시장별 / 섹터별 / 그룹별 전환 */}
          <div className="flex items-center bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setDimension('market')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                dimension === 'market'
                  ? 'bg-white text-[#0F172A] font-semibold border border-[#CBD5E1]'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              시장별 (미·중·홍)
            </button>
            <button
              type="button"
              onClick={() => setDimension('sector')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                dimension === 'sector'
                  ? 'bg-white text-[#0F172A] font-semibold border border-[#CBD5E1]'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              섹터별
            </button>
            <button
              type="button"
              onClick={() => setDimension('group')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                dimension === 'group'
                  ? 'bg-white text-[#0F172A] font-semibold border border-[#CBD5E1]'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              그룹별 (성장주·배당주)
            </button>
          </div>

          {/* 종목 수 기준 / 시가총액 기준 전환 */}
          <div className="flex items-center bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-0.5">
            <button
              type="button"
              onClick={() => setWeightMode('count')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                weightMode === 'count'
                  ? 'bg-white text-[#0F172A] font-semibold border border-[#CBD5E1]'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              종목 수 기준
            </button>
            <button
              type="button"
              onClick={() => setWeightMode('marketCap')}
              className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 ${
                weightMode === 'marketCap'
                  ? 'bg-white text-[#0F172A] font-semibold border border-[#CBD5E1]'
                  : 'text-[#64748B] hover:text-[#0F172A]'
              }`}
            >
              시가총액 비중
            </button>
          </div>
        </div>
      </div>

      {/* 본문: 파이 차트 + 우측 상세 비중 리스트 */}
      {watchlist.length === 0 ? (
        <div className="py-10 flex flex-col items-center justify-center bg-[#F8FAFC] rounded-lg border border-dashed border-[#CBD5E1] text-center p-6">
          <p className="text-sm font-medium text-[#475569]">
            현재 등록된 관심종목이 없어 비중 차트를 계산할 수 없습니다.
          </p>
          <button
            type="button"
            onClick={onOpenAddModal}
            className="mt-3 inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#2E7D5B] hover:bg-[#25664A] rounded-lg transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>종목 추가하기 (AAPL, 600519, 00700)</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
          {/* 좌측 5컬럼: SVG 파이/도넛 차트 */}
          <div className="md:col-span-5 flex flex-col items-center justify-center">
            <div className="relative w-[220px] h-[220px]">
              <svg viewBox="0 0 220 220" className="w-full h-full overflow-visible">
                {slices.map((slice) => {
                  const isHovered = hoveredKey === slice.key;
                  const outerRadius = isHovered ? 96 : 90;
                  const innerRadius = 54;
                  const pathD = createDonutSlicePath(
                    110,
                    110,
                    outerRadius,
                    innerRadius,
                    slice.startAngle,
                    slice.endAngle
                  );
                  return (
                    <path
                      key={slice.key}
                      d={pathD}
                      fill={slice.color}
                      stroke={isDarkMode ? '#131E31' : '#FFFFFF'}
                      strokeWidth={2.5}
                      onMouseEnter={() => setHoveredKey(slice.key)}
                      onMouseLeave={() => setHoveredKey(null)}
                      className="cursor-pointer transition-opacity"
                      opacity={hoveredKey && !isHovered ? 0.45 : 0.95}
                    >
                      <title>
                        {`${slice.label}: ${slice.percentage}% (${slice.count}종목)`}
                      </title>
                    </path>
                  );
                })}
              </svg>

              {/* 도넛 중앙 요약 텍스트 */}
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
                {activeSlice ? (
                  <>
                    <span className="text-[11px] font-semibold text-[#64748B] truncate max-w-[96px]">
                      {activeSlice.label}
                    </span>
                    <span className="text-lg font-bold font-mono tabular-nums text-[#0F172A] mt-0.5">
                      {activeSlice.percentage.toFixed(1)}%
                    </span>
                    <span className="text-[10px] font-mono tabular-nums text-[#64748B]">
                      {activeSlice.count}종목
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[11px] font-medium text-[#64748B]">
                      {dimension === 'market' ? '시장 수' : '섹터 수'}
                    </span>
                    <span className="text-lg font-bold font-mono tabular-nums text-[#0F172A] mt-0.5">
                      {slices.length}개
                    </span>
                    <span className="text-[10px] font-mono tabular-nums text-[#64748B]">
                      총 {watchlist.length}종목
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* 우측 7컬럼: 항목별 비중 막대 및 포함 종목 목록 */}
          <div className="md:col-span-7 space-y-2.5">
            {slices.map((slice) => {
              const isHovered = hoveredKey === slice.key;
              return (
                <div
                  key={slice.key}
                  onMouseEnter={() => setHoveredKey(slice.key)}
                  onMouseLeave={() => setHoveredKey(null)}
                  className={`p-3 rounded-xl border transition-colors ${
                    isHovered
                      ? 'bg-[#F8FAFC] border-[#2E7D5B]'
                      : 'bg-[#F8FAFC]/60 border-[#E2E8F0]'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <span
                        className="w-3 h-3 rounded-xs shrink-0"
                        style={{ backgroundColor: slice.color }}
                      />
                      <span className="font-bold text-[#0F172A] truncate">
                        {slice.label}
                      </span>
                      <span className="text-[#64748B] font-mono tabular-nums">
                        ({slice.count}종목)
                      </span>
                    </div>

                    <div className="flex items-center gap-3 shrink-0 font-mono tabular-nums">
                      <span className="text-[11px] text-[#64748B]">
                        {weightMode === 'count'
                          ? `${slice.count} / ${watchlist.length}개`
                          : `${slice.marketCapUsdMillions.toLocaleString()} 백만 USD`}
                      </span>
                      <span className="font-bold text-[#0F172A] w-12 text-right">
                        {slice.percentage.toFixed(1)}%
                      </span>
                    </div>
                  </div>

                  {/* 비율 진행 바 */}
                  <div className="w-full h-1.5 bg-[#E2E8F0] rounded-full overflow-hidden mt-2">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${Math.max(slice.percentage, 2)}%`,
                        backgroundColor: slice.color,
                      }}
                    />
                  </div>

                  {/* 소속 관심종목 빠른 링크 */}
                  <div className="flex flex-wrap items-center gap-1.5 mt-2">
                    {slice.stocks.map((st) => (
                      <button
                        key={st.symbol}
                        type="button"
                        onClick={() => onSelectStockForAnalysis(st.symbol)}
                        title={`${st.nameKo} (${st.symbol}) 한글 재무제표 열기`}
                        className="px-2 py-0.5 text-[11px] font-medium bg-white border border-[#E2E8F0] hover:border-[#2E7D5B] text-[#334155] rounded transition-colors cursor-pointer"
                      >
                        {st.nameKo}{' '}
                        <span className="font-mono text-[10px] text-[#64748B]">
                          {st.symbol}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}

            <div className="flex items-center justify-between text-[11px] text-[#64748B] pt-1 px-1 tabular-nums">
              <span>
                산출 기준: 현재 로컬 SQLite 관심종목({watchlist.length}개) 실시간 상태 반영
              </span>
              <span>
                합산 시총: {totalMarketCapUsd.toLocaleString()} 백만 USD
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
