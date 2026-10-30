import { jsPDF } from 'jspdf';
import { WatchlistItem } from '../types/stock.ts';

export interface PdfReportOptions {
  referenceDate: string;
  watchlist: WatchlistItem[];
  namesKo: Record<string, string>;
  chartRangeLabel: string;
  chartStartDate: string;
  chartEndDate: string;
  stats: {
    totalUniverse: number;
    usCount: number;
    cnCount: number;
    hkCount: number;
    upCount: number;
    downCount: number;
    flatCount: number;
    upRatio: string;
    wlCount: number;
    wlAvgChange: string;
    totalWlCapUsdMillions: number;
  };
}

const LINE_COLORS = [
  '#DC2626',
  '#2E7D5B',
  '#D97706',
  '#2563EB',
  '#7C3AED',
  '#0891B2',
  '#DB2777',
];

const MARKET_COLORS: Record<string, string> = {
  US: '#2563EB',
  CN: '#E11D48',
  HK: '#2E7D5B',
};

const SECTOR_COLORS = [
  '#2E7D5B',
  '#2563EB',
  '#D97706',
  '#E11D48',
  '#7C3AED',
  '#0891B2',
];

function drawRoundedRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
  fillStyle?: string,
  strokeStyle?: string
) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
  if (fillStyle) {
    ctx.fillStyle = fillStyle;
    ctx.fill();
  }
  if (strokeStyle) {
    ctx.strokeStyle = strokeStyle;
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
}

export async function exportDashboardPdfReport(options: PdfReportOptions): Promise<void> {
  const {
    referenceDate,
    watchlist,
    namesKo,
    chartRangeLabel,
    chartStartDate,
    chartEndDate,
    stats,
  } = options;

  // A4 크기 (210mm x 297mm) 고해상도 캔버스 (1600 x 2263 px)
  const PAGE_W = 1600;
  const PAGE_H = 2263;
  const PAD = 64;
  const CONTENT_W = PAGE_W - PAD * 2;

  const canvas = document.createElement('canvas');
  canvas.width = PAGE_W;
  canvas.height = PAGE_H;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Canvas 2D context를 생성할 수 없습니다.');
  }

  const fontSans =
    '"Plus Jakarta Sans", -apple-system, BlinkMacSystemFont, "Apple SD Gothic Neo", "Pretendard", "Malgun Gothic", sans-serif';
  const fontMono = '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, Consolas, monospace';

  // 1. 배경 캔버스
  ctx.fillStyle = '#F8FAFC';
  ctx.fillRect(0, 0, PAGE_W, PAGE_H);

  // 2. 상단 다크 네이비 헤더 배너
  drawRoundedRect(ctx, PAD, 48, CONTENT_W, 132, 18, '#111C2D');

  // 브랜드 아이콘 박스
  drawRoundedRect(ctx, PAD + 32, 76, 52, 52, 12, '#2E7D5B');
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold 24px ${fontMono}`;
  ctx.fillText('GI', PAD + 44, 111);

  // 보고서 제목 및 부제목
  ctx.fillStyle = '#FFFFFF';
  ctx.font = `bold 30px ${fontSans}`;
  ctx.fillText('글로벌 인사이트 — 관심종목 통계 및 수익률 분석 보고서', PAD + 104, 104);

  ctx.fillStyle = '#94A3B8';
  ctx.font = `500 18px ${fontSans}`;
  ctx.fillText(
    '미국(US) · 중국 A주(CN) · 홍콩(HK) 3대 시장 관심종목 포트폴리오 요약 리포트',
    PAD + 104,
    138
  );

  // 우측 기준일 및 생성 시각
  const nowStr = new Date().toISOString().slice(0, 19).replace('T', ' ');
  ctx.textAlign = 'right';
  ctx.fillStyle = '#4ADE80';
  ctx.font = `bold 19px ${fontMono}`;
  ctx.fillText(`기준일: ${referenceDate}`, PAGE_W - PAD - 32, 102);
  ctx.fillStyle = '#CBD5E1';
  ctx.font = `400 16px ${fontMono}`;
  ctx.fillText(`생성 시각: ${nowStr}`, PAGE_W - PAD - 32, 136);
  ctx.textAlign = 'left';

  // 3. 상단 4열 KPI 요약 카드
  let curY = 206;
  const cardGap = 20;
  const kpiW = (CONTENT_W - cardGap * 3) / 4;
  const kpiH = 148;

  const kpiCards = [
    {
      title: '글로벌 유니버스 (US·CN·HK)',
      mainValue: `${stats.totalUniverse}종목`,
      subText: `미국 ${stats.usCount} · 중국A주 ${stats.cnCount} · 홍콩 ${stats.hkCount}`,
      accentColor: '#0F172A',
    },
    {
      title: '시장 상승 / 하락 분포',
      mainValue: `${stats.upCount} / ${stats.downCount}`,
      subText: `보합 ${stats.flatCount}개 · 상승 비율 ${stats.upRatio}%`,
      accentColor: '#E11D48',
    },
    {
      title: '내 관심종목 (로컬 SQLite)',
      mainValue: `${stats.wlCount}종목`,
      subText: `평균 당일 등락률 ${Number(stats.wlAvgChange) >= 0 ? `+${stats.wlAvgChange}%` : `${stats.wlAvgChange}%`}`,
      accentColor: '#2E7D5B',
    },
    {
      title: '관심종목 시가총액 합산',
      mainValue: `${stats.totalWlCapUsdMillions.toLocaleString()}`,
      subText: '단위: 백만 USD (원래 통화 환산 합계)',
      accentColor: '#2563EB',
    },
  ];

  kpiCards.forEach((kpi, idx) => {
    const x = PAD + idx * (kpiW + cardGap);
    drawRoundedRect(ctx, x, curY, kpiW, kpiH, 16, '#FFFFFF', '#E2E8F0');
    ctx.fillStyle = '#64748B';
    ctx.font = `600 17px ${fontSans}`;
    ctx.fillText(kpi.title, x + 24, curY + 40);

    ctx.fillStyle = kpi.accentColor;
    ctx.font = `bold 34px ${fontMono}`;
    ctx.fillText(kpi.mainValue, x + 24, curY + 90);

    ctx.fillStyle = '#64748B';
    ctx.font = `500 15px ${fontSans}`;
    ctx.fillText(kpi.subText, x + 24, curY + 124);
  });

  curY += kpiH + 26;

  // 4. 관심종목 기간별 수익률 흐름 멀티라인 차트 섹션
  const perfCardH = 490;
  drawRoundedRect(ctx, PAD, curY, CONTENT_W, perfCardH, 18, '#FFFFFF', '#E2E8F0');

  ctx.fillStyle = '#0F172A';
  ctx.font = `bold 24px ${fontSans}`;
  ctx.fillText('1. 관심종목 기간별 수익률 흐름 차트', PAD + 32, curY + 46);

  ctx.fillStyle = '#64748B';
  ctx.font = `500 16px ${fontSans}`;
  ctx.fillText(
    `조회 기간: ${chartRangeLabel} (${chartStartDate} ~ ${chartEndDate}) · 비교 대상: ${watchlist.length}개 관심종목`,
    PAD + 32,
    curY + 76
  );

  // 시계열 데이터 계산
  const rawDates =
    watchlist[0]?.history
      .filter((h) => h.date >= chartStartDate && h.date <= chartEndDate)
      .map((h) => h.date) || [];

  const chartSeries = watchlist.slice(0, 7).map((item, idx) => {
    const map = new Map(item.history.map((h) => [h.date, h.close]));
    const baseClose = map.get(rawDates[0]) || item.history[0]?.close || item.price;
    const points = rawDates.map((d) => {
      const c = map.get(d) ?? baseClose;
      const pct = baseClose > 0 ? ((c - baseClose) / baseClose) * 100 : 0;
      return { date: d, pct: Number(pct.toFixed(2)) };
    });
    const lastPct = points.length > 0 ? points[points.length - 1].pct : 0;
    return {
      symbol: item.symbol,
      nameKo: namesKo[item.symbol] || item.nameKo,
      color: LINE_COLORS[idx % LINE_COLORS.length],
      points,
      lastPct,
    };
  });

  // 종목별 레전드 출력
  let legendX = PAD + 32;
  const legendY = curY + 114;
  chartSeries.forEach((s) => {
    ctx.fillStyle = s.color;
    ctx.beginPath();
    ctx.arc(legendX + 7, legendY - 6, 7, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#0F172A';
    ctx.font = `bold 16px ${fontSans}`;
    const nameText = `${s.nameKo}`;
    ctx.fillText(nameText, legendX + 20, legendY);
    const nameW = ctx.measureText(nameText).width;

    const pctText = s.lastPct >= 0 ? ` +${s.lastPct.toFixed(2)}%` : ` ${s.lastPct.toFixed(2)}%`;
    ctx.fillStyle = s.lastPct >= 0 ? '#E11D48' : '#2563EB';
    ctx.font = `bold 16px ${fontMono}`;
    ctx.fillText(pctText, legendX + 20 + nameW + 4, legendY);
    const pctW = ctx.measureText(pctText).width;

    legendX += 28 + nameW + pctW + 24;
  });

  // 차트 플롯 영역
  const plotLeft = PAD + 92;
  const plotRight = PAGE_W - PAD - 40;
  const plotTop = curY + 148;
  const plotBottom = curY + perfCardH - 48;
  const plotW = plotRight - plotLeft;
  const plotH = plotBottom - plotTop;

  if (chartSeries.length > 0 && rawDates.length > 1) {
    let minVal = -10;
    let maxVal = 10;
    chartSeries.forEach((s) =>
      s.points.forEach((p) => {
        if (p.pct < minVal) minVal = p.pct;
        if (p.pct > maxVal) maxVal = p.pct;
      })
    );
    const floorMin = Math.floor(minVal / 10) * 10 - 5;
    const ceilMax = Math.ceil(maxVal / 10) * 10 + 5;
    const yRange = Math.max(ceilMax - floorMin, 1);

    const getX = (i: number, total: number) => plotLeft + (i / Math.max(total - 1, 1)) * plotW;
    const getY = (pct: number) => plotTop + plotH - ((pct - floorMin) / yRange) * plotH;

    // Y축 눈금선
    const step = Math.max(Math.round(yRange / 4 / 5) * 5, 10);
    const yTicks: number[] = [];
    for (let v = Math.ceil(floorMin / step) * step; v <= ceilMax; v += step) {
      yTicks.push(v);
    }
    if (!yTicks.includes(0)) yTicks.push(0);

    yTicks.forEach((val) => {
      const y = getY(val);
      ctx.beginPath();
      ctx.moveTo(plotLeft, y);
      ctx.lineTo(plotRight, y);
      ctx.strokeStyle = val === 0 ? '#94A3B8' : '#E2E8F0';
      ctx.lineWidth = val === 0 ? 2 : 1.2;
      if (val !== 0) ctx.setLineDash([5, 5]);
      else ctx.setLineDash([]);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.textAlign = 'right';
      ctx.fillStyle = '#64748B';
      ctx.font = `500 15px ${fontMono}`;
      ctx.fillText(val > 0 ? `+${val}%` : `${val}%`, plotLeft - 14, y + 5);
    });
    ctx.textAlign = 'left';

    // X축 날짜 레이블
    const xStep = Math.max(Math.floor(rawDates.length / 6), 1);
    rawDates.forEach((d, idx) => {
      if (idx % xStep !== 0 && idx !== rawDates.length - 1) return;
      const x = getX(idx, rawDates.length);
      ctx.textAlign = 'center';
      ctx.fillStyle = '#64748B';
      ctx.font = `500 14px ${fontMono}`;
      ctx.fillText(d.slice(5), x, plotBottom + 28);
    });
    ctx.textAlign = 'left';

    // 각 종목 곡선 그리기
    chartSeries.forEach((s) => {
      ctx.beginPath();
      s.points.forEach((pt, idx) => {
        const x = getX(idx, s.points.length);
        const y = getY(pt.pct);
        if (idx === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 3.2;
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      ctx.stroke();
    });
  } else {
    ctx.fillStyle = '#94A3B8';
    ctx.font = `500 18px ${fontSans}`;
    ctx.fillText('표시할 관심종목 시계열 데이터가 없습니다.', plotLeft, plotTop + plotH / 2);
  }

  curY += perfCardH + 26;

  // 5. 시장별 & 섹터별 비중 파이(도넛) 차트 섹션
  const allocCardH = 410;
  const halfW = (CONTENT_W - 24) / 2;

  // 5-A. 좌측 카드: 시장별(미국/중국A주/홍콩) 비중 파이 차트
  drawRoundedRect(ctx, PAD, curY, halfW, allocCardH, 18, '#FFFFFF', '#E2E8F0');
  ctx.fillStyle = '#0F172A';
  ctx.font = `bold 22px ${fontSans}`;
  ctx.fillText('2. 관심종목 시장별 비중 (미국·중국·홍콩)', PAD + 28, curY + 44);
  ctx.fillStyle = '#64748B';
  ctx.font = `500 15px ${fontSans}`;
  ctx.fillText(`현재 관심종목(${watchlist.length}개)의 상장 시장 분포`, PAD + 28, curY + 70);

  const marketMap = new Map<string, { label: string; count: number; color: string; names: string[] }>();
  watchlist.forEach((w) => {
    const label = w.market === 'US' ? '미국 (US)' : w.market === 'CN' ? '중국 A주 (CN)' : '홍콩 (HK)';
    const cur = marketMap.get(w.market);
    const ko = namesKo[w.symbol] || w.nameKo;
    if (cur) {
      cur.count += 1;
      cur.names.push(ko);
    } else {
      marketMap.set(w.market, {
        label,
        count: 1,
        color: MARKET_COLORS[w.market] || '#2E7D5B',
        names: [ko],
      });
    }
  });

  const marketSlices = Array.from(marketMap.values());
  const dCx1 = PAD + 145;
  const dCy1 = curY + 235;
  const outerR = 96;
  const innerR = 54;

  let angleCursor = -Math.PI / 2;
  marketSlices.forEach((ms) => {
    const sweep = (ms.count / Math.max(watchlist.length, 1)) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(dCx1, dCy1, outerR, angleCursor, angleCursor + sweep);
    ctx.arc(dCx1, dCy1, innerR, angleCursor + sweep, angleCursor, true);
    ctx.closePath();
    ctx.fillStyle = ms.color;
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.stroke();
    angleCursor += sweep;
  });

  ctx.textAlign = 'center';
  ctx.fillStyle = '#64748B';
  ctx.font = `600 14px ${fontSans}`;
  ctx.fillText('총 관심종목', dCx1, dCy1 - 6);
  ctx.fillStyle = '#0F172A';
  ctx.font = `bold 24px ${fontMono}`;
  ctx.fillText(`${watchlist.length}종목`, dCx1, dCy1 + 22);
  ctx.textAlign = 'left';

  // 우측 시장별 레전드
  let mLegY = curY + 135;
  marketSlices.forEach((ms) => {
    const pct = ((ms.count / Math.max(watchlist.length, 1)) * 100).toFixed(1);
    drawRoundedRect(ctx, PAD + 275, mLegY, halfW - 303, 72, 12, '#F8FAFC', '#E2E8F0');
    ctx.fillStyle = ms.color;
    ctx.fillRect(PAD + 291, mLegY + 18, 14, 14);

    ctx.fillStyle = '#0F172A';
    ctx.font = `bold 17px ${fontSans}`;
    ctx.fillText(`${ms.label} — ${ms.count}종목 (${pct}%)`, PAD + 316, mLegY + 31);

    ctx.fillStyle = '#64748B';
    ctx.font = `500 14px ${fontSans}`;
    ctx.fillText(ms.names.join(', ').slice(0, 28), PAD + 291, mLegY + 56);
    mLegY += 84;
  });

  // 5-B. 우측 카드: 섹터별 비중 파이 차트
  const rightCardX = PAD + halfW + 24;
  drawRoundedRect(ctx, rightCardX, curY, halfW, allocCardH, 18, '#FFFFFF', '#E2E8F0');
  ctx.fillStyle = '#0F172A';
  ctx.font = `bold 22px ${fontSans}`;
  ctx.fillText('3. 관심종목 섹터별 비중', rightCardX + 28, curY + 44);
  ctx.fillStyle = '#64748B';
  ctx.font = `500 15px ${fontSans}`;
  ctx.fillText('산업 섹터별 포트폴리오 분산 현황', rightCardX + 28, curY + 70);

  const sectorMap = new Map<string, { label: string; count: number; names: string[] }>();
  watchlist.forEach((w) => {
    const sec = w.sectorKo || '기타 섹터';
    const cur = sectorMap.get(sec);
    const ko = namesKo[w.symbol] || w.nameKo;
    if (cur) {
      cur.count += 1;
      cur.names.push(ko);
    } else {
      sectorMap.set(sec, { label: sec, count: 1, names: [ko] });
    }
  });

  const sectorSlices = Array.from(sectorMap.values()).map((s, idx) => ({
    ...s,
    color: SECTOR_COLORS[idx % SECTOR_COLORS.length],
  }));

  const dCx2 = rightCardX + 145;
  const dCy2 = curY + 235;
  let secAngle = -Math.PI / 2;
  sectorSlices.forEach((ss) => {
    const sweep = (ss.count / Math.max(watchlist.length, 1)) * Math.PI * 2;
    ctx.beginPath();
    ctx.arc(dCx2, dCy2, outerR, secAngle, secAngle + sweep);
    ctx.arc(dCx2, dCy2, innerR, secAngle + sweep, secAngle, true);
    ctx.closePath();
    ctx.fillStyle = ss.color;
    ctx.fill();
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 3;
    ctx.stroke();
    secAngle += sweep;
  });

  ctx.textAlign = 'center';
  ctx.fillStyle = '#64748B';
  ctx.font = `600 14px ${fontSans}`;
  ctx.fillText('섹터 분포', dCx2, dCy2 - 6);
  ctx.fillStyle = '#0F172A';
  ctx.font = `bold 24px ${fontMono}`;
  ctx.fillText(`${sectorSlices.length}개 섹터`, dCx2, dCy2 + 22);
  ctx.textAlign = 'left';

  let sLegY = curY + 115;
  sectorSlices.slice(0, 4).forEach((ss) => {
    const pct = ((ss.count / Math.max(watchlist.length, 1)) * 100).toFixed(1);
    drawRoundedRect(ctx, rightCardX + 275, sLegY, halfW - 303, 62, 10, '#F8FAFC', '#E2E8F0');
    ctx.fillStyle = ss.color;
    ctx.fillRect(rightCardX + 291, sLegY + 15, 13, 13);

    ctx.fillStyle = '#0F172A';
    ctx.font = `bold 15px ${fontSans}`;
    ctx.fillText(`${ss.label} (${pct}%)`, rightCardX + 314, sLegY + 27);

    ctx.fillStyle = '#64748B';
    ctx.font = `500 13px ${fontSans}`;
    ctx.fillText(ss.names.join(', ').slice(0, 28), rightCardX + 291, sLegY + 49);
    sLegY += 70;
  });

  curY += allocCardH + 26;

  // 6. 하단 관심종목 상세 시세 및 시가총액 요약 표
  const tableH = PAGE_H - curY - 104;
  drawRoundedRect(ctx, PAD, curY, CONTENT_W, tableH, 18, '#FFFFFF', '#E2E8F0');

  ctx.fillStyle = '#0F172A';
  ctx.font = `bold 22px ${fontSans}`;
  ctx.fillText('4. 관심종목 시세 및 시가총액 상세 내역 (단위: 백만 · 원래 통화 기준)', PAD + 28, curY + 44);

  // 테이블 헤더
  const headerY = curY + 68;
  drawRoundedRect(ctx, PAD + 24, headerY, CONTENT_W - 48, 44, 8, '#F1F5F9');

  const cols = [
    { label: '#', x: PAD + 44, align: 'left' as const },
    { label: '종목명 (한글명)', x: PAD + 100, align: 'left' as const },
    { label: '종목코드', x: PAD + 410, align: 'left' as const },
    { label: '시장 · 통화', x: PAD + 570, align: 'left' as const },
    { label: '섹터 분류', x: PAD + 750, align: 'left' as const },
    { label: '현재가', x: PAD + 1110, align: 'right' as const },
    { label: '등락률', x: PAD + 1250, align: 'right' as const },
    { label: '시가총액(백만)', x: PAGE_W - PAD - 44, align: 'right' as const },
  ];

  ctx.fillStyle = '#475569';
  ctx.font = `bold 15px ${fontSans}`;
  cols.forEach((c) => {
    ctx.textAlign = c.align;
    ctx.fillText(c.label, c.x, headerY + 28);
  });
  ctx.textAlign = 'left';

  // 테이블 행 렌더링
  let rowY = headerY + 48;
  const maxRowsPage1 = Math.min(watchlist.length, 9);
  for (let i = 0; i < maxRowsPage1; i++) {
    const item = watchlist[i];
    const dispKo = namesKo[item.symbol] || item.nameKo;
    if (i > 0) {
      ctx.beginPath();
      ctx.moveTo(PAD + 28, rowY);
      ctx.lineTo(PAGE_W - PAD - 28, rowY);
      ctx.strokeStyle = '#F1F5F9';
      ctx.lineWidth = 1.2;
      ctx.stroke();
    }

    const textY = rowY + 32;
    ctx.fillStyle = '#64748B';
    ctx.font = `500 15px ${fontMono}`;
    ctx.fillText(String(i + 1), cols[0].x, textY);

    ctx.fillStyle = '#0F172A';
    ctx.font = `bold 16px ${fontSans}`;
    const groupSuffix = item.group && item.group !== '기본' ? ` [${item.group}]` : '';
    ctx.fillText(`${dispKo}${groupSuffix}`.slice(0, 18), cols[1].x, textY);

    ctx.fillStyle = '#334155';
    ctx.font = `600 15px ${fontMono}`;
    ctx.fillText(item.symbol, cols[2].x, textY);

    ctx.fillStyle = '#475569';
    ctx.font = `500 15px ${fontSans}`;
    ctx.fillText(
      `${item.market === 'US' ? '미국' : item.market === 'CN' ? '중국A주' : '홍콩'} · ${item.currency}`,
      cols[3].x,
      textY
    );

    ctx.fillStyle = '#64748B';
    ctx.font = `500 14px ${fontSans}`;
    ctx.fillText(item.sectorKo, cols[4].x, textY);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#0F172A';
    ctx.font = `bold 16px ${fontMono}`;
    ctx.fillText(
      `${item.price.toLocaleString('ko-KR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${item.currency}`,
      cols[5].x,
      textY
    );

    const isPos = item.changePercent > 0;
    const isNeg = item.changePercent < 0;
    ctx.fillStyle = isPos ? '#E11D48' : isNeg ? '#2563EB' : '#64748B';
    ctx.font = `bold 16px ${fontMono}`;
    ctx.fillText(
      isPos ? `+${item.changePercent.toFixed(2)}%` : `${item.changePercent.toFixed(2)}%`,
      cols[6].x,
      textY
    );

    ctx.fillStyle = '#0F172A';
    ctx.font = `500 16px ${fontMono}`;
    ctx.fillText(item.marketCapMillions.toLocaleString('ko-KR'), cols[7].x, textY);
    ctx.textAlign = 'left';

    rowY += 46;
  }

  // 하단 푸터
  ctx.fillStyle = '#64748B';
  ctx.font = `500 14px ${fontSans}`;
  ctx.fillText(
    '본 PDF 보고서는 글로벌 인사이트(Global Stock Insight) 포터블 프로그램에서 생성된 개인용 참고 자료이며, 투자 권유가 아닙니다.',
    PAD,
    PAGE_H - 42
  );
  ctx.textAlign = 'right';
  ctx.font = `600 14px ${fontMono}`;
  ctx.fillText('Page 1 / 1 · Generated by Global Stock Insight v1.6.2', PAGE_W - PAD, PAGE_H - 42);
  ctx.textAlign = 'left';

  // jsPDF 문서 생성 및 이미지 삽입 후 저장
  const pdf = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
    compress: true,
  });

  pdf.setProperties({
    title: `글로벌 인사이트 관심종목 보고서 (${referenceDate})`,
    subject: '미국·중국A주·홍콩 관심종목 통계 및 수익률 차트 리포트',
    creator: 'Global Stock Insight Portable v1.6.2',
  });

  const imgData = canvas.toDataURL('image/png', 1.0);
  pdf.addImage(imgData, 'PNG', 0, 0, 210, 297, undefined, 'FAST');
  pdf.save(`글로벌인사이트_관심종목_PDF보고서_${referenceDate}.pdf`);
}
