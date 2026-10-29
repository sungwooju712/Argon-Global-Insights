import { DailyPricePoint, MarketCode, PeriodType, StockUniverseItem } from '../types/stock.ts';

export const SEED_UNIVERSE: StockUniverseItem[] = [
  // 미국 (US)
  {
    symbol: 'AAPL',
    market: 'US',
    exchange: 'NASDAQ',
    currency: 'USD',
    nameOriginal: 'Apple Inc.',
    cik: '0000320193',
    sectorKo: 'IT · 하드웨어',
    basePrice: 233.40,
    previousClose: 230.10,
    marketCapMillions: 3548200,
  },
  {
    symbol: 'NVDA',
    market: 'US',
    exchange: 'NASDAQ',
    currency: 'USD',
    nameOriginal: 'NVIDIA Corporation',
    cik: '0001045810',
    sectorKo: '반도체 · AI',
    basePrice: 141.54,
    previousClose: 138.00,
    marketCapMillions: 3472100,
  },
  {
    symbol: 'MSFT',
    market: 'US',
    exchange: 'NASDAQ',
    currency: 'USD',
    nameOriginal: 'Microsoft Corporation',
    cik: '0000789019',
    sectorKo: '소프트웨어 · 클라우드',
    basePrice: 432.80,
    previousClose: 435.20,
    marketCapMillions: 3218500,
  },
  {
    symbol: 'GOOGL',
    market: 'US',
    exchange: 'NASDAQ',
    currency: 'USD',
    nameOriginal: 'Alphabet Inc.',
    cik: '0001652044',
    sectorKo: '플랫폼 · 검색/AI',
    basePrice: 181.20,
    previousClose: 178.90,
    marketCapMillions: 2241000,
  },
  {
    symbol: 'AMZN',
    market: 'US',
    exchange: 'NASDAQ',
    currency: 'USD',
    nameOriginal: 'Amazon.com, Inc.',
    cik: '0001018724',
    sectorKo: '이커머스 · 클라우드',
    basePrice: 208.90,
    previousClose: 205.40,
    marketCapMillions: 2196000,
  },
  {
    symbol: 'META',
    market: 'US',
    exchange: 'NASDAQ',
    currency: 'USD',
    nameOriginal: 'Meta Platforms, Inc.',
    cik: '0001326801',
    sectorKo: '소셜미디어 · AI',
    basePrice: 592.40,
    previousClose: 598.10,
    marketCapMillions: 1498000,
  },
  {
    symbol: 'TSLA',
    market: 'US',
    exchange: 'NASDAQ',
    currency: 'USD',
    nameOriginal: 'Tesla, Inc.',
    cik: '0001318605',
    sectorKo: '전기차 · 자율주행',
    basePrice: 262.50,
    previousClose: 269.10,
    marketCapMillions: 834200,
  },
  {
    symbol: 'BRK.B',
    market: 'US',
    exchange: 'NYSE',
    currency: 'USD',
    nameOriginal: 'Berkshire Hathaway Inc.',
    cik: '0001067983',
    sectorKo: '금융 · 복합지주',
    basePrice: 454.10,
    previousClose: 452.00,
    marketCapMillions: 981500,
  },
  {
    symbol: 'AVGO',
    market: 'US',
    exchange: 'NASDAQ',
    currency: 'USD',
    nameOriginal: 'Broadcom Inc.',
    cik: '0001730168',
    sectorKo: '반도체 · 인프라',
    basePrice: 176.80,
    previousClose: 173.40,
    marketCapMillions: 824600,
  },
  {
    symbol: 'AMD',
    market: 'US',
    exchange: 'NASDAQ',
    currency: 'USD',
    nameOriginal: 'Advanced Micro Devices, Inc.',
    cik: '0000002488',
    sectorKo: '반도체',
    basePrice: 156.20,
    previousClose: 159.80,
    marketCapMillions: 252800,
  },

  // 중국 A주 (CN)
  {
    symbol: '600519',
    market: 'CN',
    exchange: 'SHSE',
    currency: 'CNY',
    nameOriginal: '贵州茅台酒股份有限公司',
    sectorKo: '필수소비재 · 백주',
    basePrice: 1558.00,
    previousClose: 1532.50,
    marketCapMillions: 1957150,
  },
  {
    symbol: '300750',
    market: 'CN',
    exchange: 'SZSE',
    currency: 'CNY',
    nameOriginal: '宁德时代新能源科技股份有限公司',
    sectorKo: '2차전지 · 배터리',
    basePrice: 251.60,
    previousClose: 246.80,
    marketCapMillions: 1106800,
  },
  {
    symbol: '601318',
    market: 'CN',
    exchange: 'SHSE',
    currency: 'CNY',
    nameOriginal: '中国平安保险(集团)股份有限公司',
    sectorKo: '금융 · 종합보험',
    basePrice: 57.45,
    previousClose: 58.10,
    marketCapMillions: 1046200,
  },
  {
    symbol: '600036',
    market: 'CN',
    exchange: 'SHSE',
    currency: 'CNY',
    nameOriginal: '招商银行股份有限公司',
    sectorKo: '금융 · 상업은행',
    basePrice: 38.92,
    previousClose: 38.40,
    marketCapMillions: 981500,
  },
  {
    symbol: '000858',
    market: 'CN',
    exchange: 'SZSE',
    currency: 'CNY',
    nameOriginal: '宜宾五粮液股份有限公司',
    sectorKo: '필수소비재 · 백주',
    basePrice: 148.30,
    previousClose: 150.20,
    marketCapMillions: 575600,
  },
  {
    symbol: '002594',
    market: 'CN',
    exchange: 'SZSE',
    currency: 'CNY',
    nameOriginal: '比亚迪股份有限公司 (A)',
    sectorKo: '전기차 · 배터리',
    basePrice: 296.40,
    previousClose: 291.00,
    marketCapMillions: 862400,
  },
  {
    symbol: '600900',
    market: 'CN',
    exchange: 'SHSE',
    currency: 'CNY',
    nameOriginal: '中国长江电力股份有限公司',
    sectorKo: '유틸리티 · 수력발전',
    basePrice: 28.15,
    previousClose: 28.15,
    marketCapMillions: 688700,
  },

  // 홍콩 (HK)
  {
    symbol: '00700',
    market: 'HK',
    exchange: 'HKEX',
    currency: 'HKD',
    nameOriginal: 'Tencent Holdings Ltd (腾讯控股)',
    sectorKo: '플랫폼 · 게임/핀테크',
    basePrice: 421.80,
    previousClose: 414.20,
    marketCapMillions: 3914300,
  },
  {
    symbol: '09988',
    market: 'HK',
    exchange: 'HKEX',
    currency: 'HKD',
    nameOriginal: 'Alibaba Group Holding Ltd (阿里巴巴)',
    sectorKo: '이커머스 · 클라우드',
    basePrice: 98.45,
    previousClose: 100.10,
    marketCapMillions: 1886400,
  },
  {
    symbol: '03690',
    market: 'HK',
    exchange: 'HKEX',
    currency: 'HKD',
    nameOriginal: 'Meituan (美团-W)',
    sectorKo: '로컬플랫폼 · 딜리버리',
    basePrice: 184.20,
    previousClose: 179.60,
    marketCapMillions: 1142800,
  },
  {
    symbol: '01810',
    market: 'HK',
    exchange: 'HKEX',
    currency: 'HKD',
    nameOriginal: 'Xiaomi Corp (小米集团-W)',
    sectorKo: '스마트폰 · 스마트EV',
    basePrice: 25.85,
    previousClose: 25.10,
    marketCapMillions: 645200,
  },
  {
    symbol: '01211',
    market: 'HK',
    exchange: 'HKEX',
    currency: 'HKD',
    nameOriginal: 'BYD Company Ltd (比亚迪股份)',
    sectorKo: '전기차 · 배터리',
    basePrice: 288.60,
    previousClose: 292.40,
    marketCapMillions: 839500,
  },
  {
    symbol: '00941',
    market: 'HK',
    exchange: 'HKEX',
    currency: 'HKD',
    nameOriginal: 'China Mobile Ltd (中国移动)',
    sectorKo: '통신 · 클라우드',
    basePrice: 73.40,
    previousClose: 73.10,
    marketCapMillions: 1572000,
  },
  {
    symbol: '00388',
    market: 'HK',
    exchange: 'HKEX',
    currency: 'HKD',
    nameOriginal: 'Hong Kong Exchanges and Clearing Ltd',
    sectorKo: '금융 · 거래소',
    basePrice: 312.40,
    previousClose: 316.00,
    marketCapMillions: 396100,
  },
];

export function detectMarketFromSymbol(rawSymbol: string): StockUniverseItem {
  const clean = rawSymbol.trim().toUpperCase();
  const found = SEED_UNIVERSE.find((item) => item.symbol.toUpperCase() === clean);
  if (found) return found;

  // 5자리 숫자면 홍콩 주식 (예: 00700, 09988)
  if (/^\d{5}$/.test(clean)) {
    return {
      symbol: clean,
      market: 'HK',
      exchange: 'HKEX',
      currency: 'HKD',
      nameOriginal: `HKEX Listed (${clean})`,
      sectorKo: '홍콩 거래소 상장',
      basePrice: 85.40,
      previousClose: 84.10,
      marketCapMillions: 125000,
    };
  }

  // 6자리 숫자면 중국 A주 (예: 600519, 000858, 300750)
  if (/^\d{6}$/.test(clean)) {
    const isShanghai = clean.startsWith('6');
    return {
      symbol: clean,
      market: 'CN',
      exchange: isShanghai ? 'SHSE' : 'SZSE',
      currency: 'CNY',
      nameOriginal: `China A-Share (${clean})`,
      sectorKo: isShanghai ? '상하이 A주' : '선전 A주',
      basePrice: 64.20,
      previousClose: 63.50,
      marketCapMillions: 184000,
    };
  }

  // 그 외 영문 티커는 미국 주식
  return {
    symbol: clean,
    market: 'US',
    exchange: 'NASDAQ/NYSE',
    currency: 'USD',
    nameOriginal: `${clean} Corp.`,
    sectorKo: '미국 증시 상장',
    basePrice: 120.50,
    previousClose: 118.90,
    marketCapMillions: 95000,
  };
}

export function generateDailyHistory(symbol: string, currentPrice: number, days = 365): DailyPricePoint[] {
  let seed = 0;
  for (let i = 0; i < symbol.length; i++) {
    seed = (seed * 31 + symbol.charCodeAt(i)) % 100000;
  }

  const endDate = new Date('2026-10-29T00:00:00Z');
  const points: DailyPricePoint[] = [];

  // 역방향으로 일별 종가 생성 후 정렬
  let price = currentPrice;
  const tempReversed: { date: string; close: number }[] = [];

  for (let d = 0; d < days; d++) {
    const dt = new Date(endDate.getTime() - d * 24 * 60 * 60 * 1000);
    const dayOfWeek = dt.getUTCDay();
    if (dayOfWeek === 0 || dayOfWeek === 6) continue; // 주말 제외

    const dateStr = dt.toISOString().slice(0, 10);
    tempReversed.push({
      date: dateStr,
      close: Number(price.toFixed(2)),
    });

    // 의사 난수 기반 일별 등락
    seed = (seed * 16807 + 13) % 2147483647;
    const pseudoRand = ((seed % 1000) / 1000) - 0.482; // 약간의 우상향/변동성
    const wave = Math.sin((d + (symbol.charCodeAt(0) % 17)) / 14) * 0.008;
    const dailyReturn = pseudoRand * 0.026 + wave;
    price = Math.max(price / (1 + dailyReturn), 1);
  }

  for (let i = tempReversed.length - 1; i >= 0; i--) {
    points.push(tempReversed[i]);
  }
  return points;
}

export interface RawStatementDataset {
  periods: string[];
  IS: Record<string, Record<string, number | null>>;
  BS: Record<string, Record<string, number | null>>;
  CF: Record<string, Record<string, number | null>>;
}

const ANNUAL_PERIODS_US = ['2021-09-25', '2022-09-24', '2023-09-30', '2024-09-28', '2025-09-27'];
const QUARTERLY_PERIODS_US = [
  '2024-03-30',
  '2024-06-29',
  '2024-09-28',
  '2024-12-28',
  '2025-03-29',
  '2025-06-28',
  '2025-09-27',
  '2025-12-27',
];

const ANNUAL_PERIODS_ASIA = ['2021-12-31', '2022-12-31', '2023-12-31', '2024-12-31', '2025-12-31'];
const QUARTERLY_PERIODS_ASIA = [
  '2024-03-31',
  '2024-06-30',
  '2024-09-30',
  '2024-12-31',
  '2025-03-31',
  '2025-06-30',
  '2025-09-30',
  '2025-12-31',
];

function buildSeries(periods: string[], values: number[]): Record<string, number | null> {
  const result: Record<string, number | null> = {};
  periods.forEach((p, idx) => {
    result[p] = values[idx] !== undefined ? values[idx] : null;
  });
  return result;
}

// 1. AAPL (미국 - SEC EDGAR US-GAAP 원문 키 기반, 단위: 백만 USD)
const AAPL_ANNUAL: RawStatementDataset = {
  periods: ANNUAL_PERIODS_US,
  IS: {
    Revenues: buildSeries(ANNUAL_PERIODS_US, [365817, 394328, 383285, 391035, 412850]),
    CostOfRevenue: buildSeries(ANNUAL_PERIODS_US, [212981, 223546, 214137, 210352, 218420]),
    GrossProfit: buildSeries(ANNUAL_PERIODS_US, [152836, 170782, 169148, 180683, 194430]),
    ResearchAndDevelopmentExpense: buildSeries(ANNUAL_PERIODS_US, [21914, 26251, 29915, 31370, 33480]),
    SellingGeneralAndAdministrativeExpense: buildSeries(ANNUAL_PERIODS_US, [21973, 25094, 24932, 26097, 27110]),
    OperatingExpenses: buildSeries(ANNUAL_PERIODS_US, [43887, 51345, 54847, 57467, 60590]),
    OperatingIncomeLoss: buildSeries(ANNUAL_PERIODS_US, [108949, 119437, 114301, 123216, 133840]),
    NonoperatingIncomeExpense: buildSeries(ANNUAL_PERIODS_US, [258, -334, -565, 269, 410]),
    IncomeTaxExpenseBenefit: buildSeries(ANNUAL_PERIODS_US, [14527, 19300, 16741, 29749, 21850]),
    NetIncomeLoss: buildSeries(ANNUAL_PERIODS_US, [94680, 99803, 96995, 93736, 112400]),
    EarningsPerShareBasic: buildSeries(ANNUAL_PERIODS_US, [5.67, 6.15, 6.16, 6.11, 7.42]),
    EarningsPerShareDiluted: buildSeries(ANNUAL_PERIODS_US, [5.61, 6.11, 6.13, 6.08, 7.38]),
  },
  BS: {
    Assets: buildSeries(ANNUAL_PERIODS_US, [351002, 352755, 352583, 364980, 378450]),
    AssetsCurrent: buildSeries(ANNUAL_PERIODS_US, [134836, 135405, 143566, 152987, 161200]),
    CashAndCashEquivalentsAtCarryingValue: buildSeries(ANNUAL_PERIODS_US, [34940, 23646, 29965, 29943, 35410]),
    MarketableSecuritiesCurrent: buildSeries(ANNUAL_PERIODS_US, [27699, 24658, 31590, 35228, 37800]),
    AccountsReceivableNetCurrent: buildSeries(ANNUAL_PERIODS_US, [26278, 28184, 29508, 33410, 34900]),
    InventoryNet: buildSeries(ANNUAL_PERIODS_US, [6580, 4946, 6331, 7286, 6890]),
    AssetsNoncurrent: buildSeries(ANNUAL_PERIODS_US, [216166, 217350, 209017, 211993, 217250]),
    MarketableSecuritiesNoncurrent: buildSeries(ANNUAL_PERIODS_US, [127877, 120805, 100544, 91479, 94200]),
    PropertyPlantAndEquipmentNet: buildSeries(ANNUAL_PERIODS_US, [39440, 42117, 43715, 45680, 47950]),
    Liabilities: buildSeries(ANNUAL_PERIODS_US, [287912, 302083, 290437, 308030, 312100]),
    LiabilitiesCurrent: buildSeries(ANNUAL_PERIODS_US, [125481, 153982, 145308, 176392, 172400]),
    AccountsPayableCurrent: buildSeries(ANNUAL_PERIODS_US, [54763, 64115, 62611, 68960, 70120]),
    LongTermDebtNoncurrent: buildSeries(ANNUAL_PERIODS_US, [109106, 98959, 95281, 85750, 82400]),
    StockholdersEquity: buildSeries(ANNUAL_PERIODS_US, [63090, 50672, 62146, 56950, 66350]),
    RetainedEarningsAccumulatedDeficit: buildSeries(ANNUAL_PERIODS_US, [5562, -3068, -214, -19154, -11200]),
  },
  CF: {
    NetCashProvidedByUsedInOperatingActivities: buildSeries(ANNUAL_PERIODS_US, [104038, 122151, 110543, 118254, 126800]),
    DepreciationAndAmortization: buildSeries(ANNUAL_PERIODS_US, [11284, 11104, 11519, 11445, 11820]),
    ShareBasedCompensation: buildSeries(ANNUAL_PERIODS_US, [7906, 9038, 10833, 11688, 12350]),
    NetCashProvidedByUsedInInvestingActivities: buildSeries(ANNUAL_PERIODS_US, [-14545, -22354, 3705, 2935, -8420]),
    PaymentsToAcquirePropertyPlantAndEquipment: buildSeries(ANNUAL_PERIODS_US, [-11085, -10708, -10959, -9447, -10600]),
    NetCashProvidedByUsedInFinancingActivities: buildSeries(ANNUAL_PERIODS_US, [-93353, -110749, -108488, -121983, -112900]),
    PaymentsOfDividends: buildSeries(ANNUAL_PERIODS_US, [-14467, -14841, -15025, -15234, -15580]),
    PaymentsForRepurchaseOfCommonStock: buildSeries(ANNUAL_PERIODS_US, [-85971, -89402, -77550, -94949, -92000]),
  },
};

const AAPL_QUARTERLY: RawStatementDataset = {
  periods: QUARTERLY_PERIODS_US,
  IS: {
    Revenues: buildSeries(QUARTERLY_PERIODS_US, [90753, 85777, 94930, 124300, 95400, 89800, 98750, 128900]),
    CostOfRevenue: buildSeries(QUARTERLY_PERIODS_US, [48482, 46099, 51051, 66025, 50210, 47450, 52400, 68360]),
    GrossProfit: buildSeries(QUARTERLY_PERIODS_US, [42271, 39678, 43879, 58275, 45190, 42350, 46350, 60540]),
    ResearchAndDevelopmentExpense: buildSeries(QUARTERLY_PERIODS_US, [7903, 8006, 7765, 8268, 8310, 8420, 8290, 8460]),
    SellingGeneralAndAdministrativeExpense: buildSeries(QUARTERLY_PERIODS_US, [6468, 6320, 6523, 7175, 6680, 6540, 6720, 7170]),
    OperatingIncomeLoss: buildSeries(QUARTERLY_PERIODS_US, [27900, 25352, 29591, 42832, 30200, 27390, 31340, 44910]),
    IncomeTaxExpenseBenefit: buildSeries(QUARTERLY_PERIODS_US, [4422, 4042, 14874, 6254, 4830, 4380, 5010, 7630]),
    NetIncomeLoss: buildSeries(QUARTERLY_PERIODS_US, [23636, 21448, 14736, 36330, 25370, 23010, 26330, 37690]),
    EarningsPerShareDiluted: buildSeries(QUARTERLY_PERIODS_US, [1.53, 1.40, 0.97, 2.40, 1.68, 1.53, 1.76, 2.51]),
  },
  BS: {
    Assets: buildSeries(QUARTERLY_PERIODS_US, [337411, 331612, 364980, 344085, 348200, 351900, 378450, 384100]),
    AssetsCurrent: buildSeries(QUARTERLY_PERIODS_US, [128416, 125435, 152987, 133240, 136800, 139500, 161200, 164800]),
    CashAndCashEquivalentsAtCarryingValue: buildSeries(QUARTERLY_PERIODS_US, [32695, 25565, 29943, 30299, 31800, 28900, 35410, 37200]),
    InventoryNet: buildSeries(QUARTERLY_PERIODS_US, [6232, 6165, 7286, 6911, 6420, 6310, 6890, 6750]),
    PropertyPlantAndEquipmentNet: buildSeries(QUARTERLY_PERIODS_US, [43546, 44585, 45680, 46069, 46520, 47110, 47950, 48600]),
    Liabilities: buildSeries(QUARTERLY_PERIODS_US, [263217, 264904, 308030, 277327, 280100, 283400, 312100, 314500]),
    LiabilitiesCurrent: buildSeries(QUARTERLY_PERIODS_US, [123822, 131624, 176392, 144365, 142100, 146800, 172400, 171200]),
    LongTermDebtNoncurrent: buildSeries(QUARTERLY_PERIODS_US, [91831, 86196, 85750, 83956, 83200, 82900, 82400, 81600]),
    StockholdersEquity: buildSeries(QUARTERLY_PERIODS_US, [74194, 66708, 56950, 66758, 68100, 68500, 66350, 69600]),
  },
  CF: {
    NetCashProvidedByUsedInOperatingActivities: buildSeries(QUARTERLY_PERIODS_US, [22690, 28858, 26811, 29935, 25400, 30120, 29480, 41800]),
    PaymentsToAcquirePropertyPlantAndEquipment: buildSeries(QUARTERLY_PERIODS_US, [-1996, -2151, -2908, -2940, -2210, -2450, -2890, -3050]),
    NetCashProvidedByUsedInInvestingActivities: buildSeries(QUARTERLY_PERIODS_US, [-310, -127, 1445, 9792, -1420, -1890, -2110, -3000]),
    PaymentsOfDividends: buildSeries(QUARTERLY_PERIODS_US, [-3710, -3896, -3804, -3856, -3820, -3940, -3910, -3910]),
    PaymentsForRepurchaseOfCommonStock: buildSeries(QUARTERLY_PERIODS_US, [-23500, -26522, -25083, -23606, -22800, -24100, -22600, -22500]),
    NetCashProvidedByUsedInFinancingActivities: buildSeries(QUARTERLY_PERIODS_US, [-30433, -36017, -24948, -39371, -27100, -31200, -26800, -27800]),
  },
};

// 2. 600519 귀주모태주 (중국 A주 - AKShare 중국 회계기준 원문 키 기반, 단위: 백만 CNY)
const MOUTAI_ANNUAL: RawStatementDataset = {
  periods: ANNUAL_PERIODS_ASIA,
  IS: {
    '营业总收入': buildSeries(ANNUAL_PERIODS_ASIA, [109464, 127554, 150560, 174144, 198520]),
    '营业收入': buildSeries(ANNUAL_PERIODS_ASIA, [106190, 124100, 147694, 170899, 194810]),
    '营业成本': buildSeries(ANNUAL_PERIODS_ASIA, [8983, 10093, 11867, 13789, 15420]),
    '毛利润': buildSeries(ANNUAL_PERIODS_ASIA, [97207, 114007, 135827, 157110, 179390]),
    '销售费用': buildSeries(ANNUAL_PERIODS_ASIA, [2737, 3298, 4649, 5639, 6420]),
    '管理费用': buildSeries(ANNUAL_PERIODS_ASIA, [8450, 9012, 9729, 9316, 9840]),
    '研发费用': buildSeries(ANNUAL_PERIODS_ASIA, [62, 135, 157, 218, 260]),
    '财务费用': buildSeries(ANNUAL_PERIODS_ASIA, [-934, -1390, -1790, -1470, -1620]),
    '营业利润': buildSeries(ANNUAL_PERIODS_ASIA, [74751, 87701, 103709, 119639, 136890]),
    '利润总额': buildSeries(ANNUAL_PERIODS_ASIA, [74528, 87525, 103663, 119600, 136800]),
    '所得税费用': buildSeries(ANNUAL_PERIODS_ASIA, [18807, 22149, 26142, 30265, 34520]),
    '净利润': buildSeries(ANNUAL_PERIODS_ASIA, [55721, 65376, 77521, 89335, 102280]),
    '归属于母公司所有者的净利润': buildSeries(ANNUAL_PERIODS_ASIA, [52460, 62716, 74734, 86228, 98650]),
    '基本每股收益': buildSeries(ANNUAL_PERIODS_ASIA, [41.76, 49.93, 59.49, 68.64, 78.52]),
  },
  BS: {
    '资产总计': buildSeries(ANNUAL_PERIODS_ASIA, [255168, 254365, 272700, 298945, 326400]),
    '流动资产合计': buildSeries(ANNUAL_PERIODS_ASIA, [226912, 219125, 232856, 255120, 279800]),
    '货币资金': buildSeries(ANNUAL_PERIODS_ASIA, [51810, 58274, 69070, 59296, 74500]),
    '存货': buildSeries(ANNUAL_PERIODS_ASIA, [33394, 38824, 46435, 54343, 59800]),
    '非流动资产合计': buildSeries(ANNUAL_PERIODS_ASIA, [28256, 35240, 39844, 43825, 46600]),
    '固定资产': buildSeries(ANNUAL_PERIODS_ASIA, [17472, 19746, 19843, 21450, 22890]),
    '无形资产': buildSeries(ANNUAL_PERIODS_ASIA, [4862, 7488, 7912, 8420, 8750]),
    '负债合计': buildSeries(ANNUAL_PERIODS_ASIA, [58281, 49398, 49044, 56934, 58200]),
    '流动负债合计': buildSeries(ANNUAL_PERIODS_ASIA, [57824, 48912, 48520, 56380, 57600]),
    '合同负债': buildSeries(ANNUAL_PERIODS_ASIA, [12718, 15472, 14126, 9592, 11840]),
    '所有者权益合计': buildSeries(ANNUAL_PERIODS_ASIA, [196887, 204967, 223656, 242011, 268200]),
    '归属于母公司所有者权益合计': buildSeries(ANNUAL_PERIODS_ASIA, [189539, 197496, 215669, 233106, 258900]),
    '未分配利润': buildSeries(ANNUAL_PERIODS_ASIA, [160942, 166530, 178912, 192410, 214500]),
  },
  CF: {
    '经营活动产生的现金流量净额': buildSeries(ANNUAL_PERIODS_ASIA, [64029, 36699, 66593, 92464, 104200]),
    '投资活动产生的现金流量净额': buildSeries(ANNUAL_PERIODS_ASIA, [-5562, -5288, -9724, -1785, -4820]),
    '购建固定资产、无形资产和其他长期资产支付的现金': buildSeries(ANNUAL_PERIODS_ASIA, [-3490, -5308, -9540, -4620, -4950]),
    '筹资活动产生的现金流量净额': buildSeries(ANNUAL_PERIODS_ASIA, [-29140, -58906, -58889, -71020, -76400]),
    '分配股利、利润或偿付利息支付的现金': buildSeries(ANNUAL_PERIODS_ASIA, [-24236, -54789, -56550, -68792, -74200]),
    '现金及现金等价物净增加额': buildSeries(ANNUAL_PERIODS_ASIA, [29327, -27495, -2020, 19659, 22980]),
  },
};

const MOUTAI_QUARTERLY: RawStatementDataset = {
  periods: QUARTERLY_PERIODS_ASIA,
  IS: {
    '营业总收入': buildSeries(QUARTERLY_PERIODS_ASIA, [46485, 36966, 39671, 51022, 51420, 41250, 44890, 60960]),
    '营业收入': buildSeries(QUARTERLY_PERIODS_ASIA, [45776, 36155, 38845, 50123, 50610, 40380, 43920, 59900]),
    '营业成本': buildSeries(QUARTERLY_PERIODS_ASIA, [3369, 2948, 3268, 4204, 3720, 3280, 3610, 4810]),
    '毛利润': buildSeries(QUARTERLY_PERIODS_ASIA, [42407, 33207, 35577, 45919, 46890, 37100, 40310, 55090]),
    '销售费用': buildSeries(QUARTERLY_PERIODS_ASIA, [1142, 1475, 1621, 1401, 1290, 1610, 1780, 1740]),
    '管理费用': buildSeries(QUARTERLY_PERIODS_ASIA, [2068, 1792, 1945, 3511, 2190, 1890, 2080, 3680]),
    '营业利润': buildSeries(QUARTERLY_PERIODS_ASIA, [33192, 25014, 26782, 34651, 37120, 28140, 30420, 41210]),
    '所得税费用': buildSeries(QUARTERLY_PERIODS_ASIA, [8261, 6280, 6721, 9003, 9320, 7080, 7640, 10480]),
    '归属于母公司所有者的净利润': buildSeries(QUARTERLY_PERIODS_ASIA, [24065, 17631, 19132, 25400, 26890, 19840, 21780, 30140]),
    '基本每股收益': buildSeries(QUARTERLY_PERIODS_ASIA, [19.16, 14.03, 15.23, 20.22, 21.41, 15.79, 17.34, 23.98]),
  },
  BS: {
    '资产总计': buildSeries(QUARTERLY_PERIODS_ASIA, [285525, 279208, 286475, 298945, 308400, 301200, 312800, 326400]),
    '流动资产合计': buildSeries(QUARTERLY_PERIODS_ASIA, [244610, 237420, 243890, 255120, 263900, 256100, 267200, 279800]),
    '货币资金': buildSeries(QUARTERLY_PERIODS_ASIA, [65420, 58120, 61890, 59296, 68400, 62100, 66800, 74500]),
    '存货': buildSeries(QUARTERLY_PERIODS_ASIA, [47890, 48920, 50120, 54343, 55600, 56800, 58100, 59800]),
    '固定资产': buildSeries(QUARTERLY_PERIODS_ASIA, [20120, 20540, 20980, 21450, 21800, 22150, 22510, 22890]),
    '负债合计': buildSeries(QUARTERLY_PERIODS_ASIA, [43120, 52890, 41250, 56934, 46200, 54800, 44900, 58200]),
    '合同负债': buildSeries(QUARTERLY_PERIODS_ASIA, [9524, 9993, 9931, 9592, 10420, 10890, 11120, 11840]),
    '归属于母公司所有者权益合计': buildSeries(QUARTERLY_PERIODS_ASIA, [239780, 218540, 237690, 233106, 254100, 238200, 259400, 258900]),
  },
  CF: {
    '经营活动产生的现金流量净额': buildSeries(QUARTERLY_PERIODS_ASIA, [9187, 27435, 7799, 48043, 12450, 29800, 11200, 50750]),
    '购建固定资产、无形资产和其他长期资产支付的现金': buildSeries(QUARTERLY_PERIODS_ASIA, [-980, -1120, -1240, -1280, -1090, -1180, -1310, -1370]),
    '投资活动产生的现金流量净额': buildSeries(QUARTERLY_PERIODS_ASIA, [-945, -1080, 420, -180, -1120, -1210, -1190, -1300]),
    '筹资活动产生的现金流量净额': buildSeries(QUARTERLY_PERIODS_ASIA, [-120, -38790, -110, -32000, -150, -42100, -180, -33970]),
  },
};

// 3. 00700 텐센트홀딩스 (홍콩 - AKShare 회계기준 원문 키 기반, 단위: 백만 HKD)
const TENCENT_ANNUAL: RawStatementDataset = {
  periods: ANNUAL_PERIODS_ASIA,
  IS: {
    '营业总收入': buildSeries(ANNUAL_PERIODS_ASIA, [616175, 554552, 609015, 660257, 718400]),
    '营业收入': buildSeries(ANNUAL_PERIODS_ASIA, [616175, 554552, 609015, 660257, 718400]),
    '营业成本': buildSeries(ANNUAL_PERIODS_ASIA, [345614, 315806, 315906, 311012, 331800]),
    '毛利润': buildSeries(ANNUAL_PERIODS_ASIA, [270561, 238746, 293109, 349245, 386600]),
    '销售费用': buildSeries(ANNUAL_PERIODS_ASIA, [44796, 29229, 34211, 36388, 38900]),
    '管理费用': buildSeries(ANNUAL_PERIODS_ASIA, [98541, 106696, 103525, 112761, 118400]),
    '研发费用': buildSeries(ANNUAL_PERIODS_ASIA, [51880, 61401, 64078, 70680, 75400]),
    '财务费用': buildSeries(ANNUAL_PERIODS_ASIA, [7114, 9352, 12268, 11980, 11420]),
    '营业利润': buildSeries(ANNUAL_PERIODS_ASIA, [271620, 235706, 160074, 208099, 241200]),
    '所得税费用': buildSeries(ANNUAL_PERIODS_ASIA, [21998, 21516, 43312, 39012, 42800]),
    '净利润': buildSeries(ANNUAL_PERIODS_ASIA, [227810, 188709, 118048, 196467, 224800]),
    '归属于母公司所有者的净利润': buildSeries(ANNUAL_PERIODS_ASIA, [224822, 188243, 115216, 194073, 221900]),
    '基本每股收益': buildSeries(ANNUAL_PERIODS_ASIA, [23.59, 19.75, 12.18, 20.93, 24.18]),
  },
  BS: {
    '资产总计': buildSeries(ANNUAL_PERIODS_ASIA, [1612364, 1578131, 1577246, 1780995, 1894200]),
    '流动资产合计': buildSeries(ANNUAL_PERIODS_ASIA, [484812, 565989, 518542, 496420, 542800]),
    '货币资金': buildSeries(ANNUAL_PERIODS_ASIA, [167966, 156739, 172320, 132519, 164200]),
    '应收账款': buildSeries(ANNUAL_PERIODS_ASIA, [49331, 45467, 46606, 48210, 51400]),
    '非流动资产合计': buildSeries(ANNUAL_PERIODS_ASIA, [1127552, 1012142, 1058704, 1284575, 1351400]),
    '固定资产': buildSeries(ANNUAL_PERIODS_ASIA, [61914, 53978, 53232, 80185, 88400]),
    '无形资产': buildSeries(ANNUAL_PERIODS_ASIA, [171376, 161802, 178240, 182450, 189200]),
    '负债合计': buildSeries(ANNUAL_PERIODS_ASIA, [735671, 795271, 703565, 727099, 742100]),
    '流动负债合计': buildSeries(ANNUAL_PERIODS_ASIA, [403098, 434204, 352157, 396420, 405800]),
    '长期借款': buildSeries(ANNUAL_PERIODS_ASIA, [136936, 163668, 155819, 148920, 142300]),
    '所有者权益合计': buildSeries(ANNUAL_PERIODS_ASIA, [876693, 782860, 873681, 1053896, 1152100]),
    '归属于母公司所有者权益合计': buildSeries(ANNUAL_PERIODS_ASIA, [806299, 721391, 808591, 973548, 1068400]),
  },
  CF: {
    '经营活动产生的现金流量净额': buildSeries(ANNUAL_PERIODS_ASIA, [175186, 146091, 221962, 258521, 289400]),
    '购建固定资产、无形资产和其他长期资产支付的现金': buildSeries(ANNUAL_PERIODS_ASIA, [-33394, -18026, -23892, -76760, -68400]),
    '投资活动产生的现金流量净额': buildSeries(ANNUAL_PERIODS_ASIA, [-178542, -104890, -124910, -142300, -131200]),
    '筹资活动产生的现金流量净额': buildSeries(ANNUAL_PERIODS_ASIA, [18412, -52410, -81420, -156022, -126500]),
    '分配股利、利润或偿付利息支付的现金': buildSeries(ANNUAL_PERIODS_ASIA, [-15230, -15120, -22540, -31700, -38400]),
    '现金及现金等价物净增加额': buildSeries(ANNUAL_PERIODS_ASIA, [15056, -11209, 15632, -39801, 31700]),
  },
};

const TENCENT_QUARTERLY: RawStatementDataset = {
  periods: QUARTERLY_PERIODS_ASIA,
  IS: {
    '营业总收入': buildSeries(QUARTERLY_PERIODS_ASIA, [159501, 161117, 167193, 172446, 174800, 177600, 181200, 184800]),
    '营业收入': buildSeries(QUARTERLY_PERIODS_ASIA, [159501, 161117, 167193, 172446, 174800, 177600, 181200, 184800]),
    '营业成本': buildSeries(QUARTERLY_PERIODS_ASIA, [75631, 75229, 78396, 81756, 80410, 81690, 83350, 86350]),
    '毛利润': buildSeries(QUARTERLY_PERIODS_ASIA, [83870, 85888, 88797, 90690, 94390, 95910, 97850, 98450]),
    '销售费用': buildSeries(QUARTERLY_PERIODS_ASIA, [7536, 9156, 9411, 10285, 8920, 9640, 9890, 10450]),
    '管理费用': buildSeries(QUARTERLY_PERIODS_ASIA, [24846, 27495, 29058, 31362, 27900, 29100, 30200, 31200]),
    '研发费用': buildSeries(QUARTERLY_PERIODS_ASIA, [15678, 17277, 17890, 19835, 17850, 18620, 19120, 19810]),
    '营业利润': buildSeries(QUARTERLY_PERIODS_ASIA, [52556, 50732, 53333, 51478, 57570, 57170, 58840, 67620]),
    '归属于母公司所有者的净利润': buildSeries(QUARTERLY_PERIODS_ASIA, [41889, 47630, 53230, 51324, 52890, 54120, 56420, 58470]),
    '基本每股收益': buildSeries(QUARTERLY_PERIODS_ASIA, [4.48, 5.11, 5.76, 5.59, 5.76, 5.91, 6.16, 6.35]),
  },
  BS: {
    '资产总计': buildSeries(QUARTERLY_PERIODS_ASIA, [1602410, 1651890, 1712450, 1780995, 1808200, 1836400, 1865100, 1894200]),
    '流动资产合计': buildSeries(QUARTERLY_PERIODS_ASIA, [521400, 512800, 504200, 496420, 509400, 521800, 531200, 542800]),
    '货币资金': buildSeries(QUARTERLY_PERIODS_ASIA, [168400, 154200, 145600, 132519, 141200, 148900, 156400, 164200]),
    '固定资产': buildSeries(QUARTERLY_PERIODS_ASIA, [56400, 62100, 71200, 80185, 82400, 84500, 86200, 88400]),
    '负债合计': buildSeries(QUARTERLY_PERIODS_ASIA, [708900, 715400, 721200, 727099, 731200, 734800, 738900, 742100]),
    '归属于母公司所有者权益合计': buildSeries(QUARTERLY_PERIODS_ASIA, [832400, 874200, 926800, 973548, 998400, 1022100, 1044800, 1068400]),
  },
  CF: {
    '经营活动产生的现金流量净额': buildSeries(QUARTERLY_PERIODS_ASIA, [72300, 54100, 78100, 54021, 74200, 66800, 79400, 69000]),
    '购建固定资产、无形资产和其他长期资产支付的现金': buildSeries(QUARTERLY_PERIODS_ASIA, [-14359, -8729, -17094, -36578, -16200, -15800, -17900, -18500]),
    '投资活动产生的现金流量净额': buildSeries(QUARTERLY_PERIODS_ASIA, [-31200, -28400, -39800, -42900, -32100, -30400, -34200, -34500]),
    '筹资活动产生的现金流量净额': buildSeries(QUARTERLY_PERIODS_ASIA, [-38400, -41200, -36800, -39622, -33400, -31200, -30900, -31000]),
  },
};

export function getSeedRawFinancials(
  symbol: string,
  market: MarketCode,
  periodType: PeriodType,
  marketCapMillions: number
): RawStatementDataset {
  const clean = symbol.trim().toUpperCase();
  if (clean === 'AAPL') {
    return periodType === 'annual' ? AAPL_ANNUAL : AAPL_QUARTERLY;
  }
  if (clean === '600519') {
    return periodType === 'annual' ? MOUTAI_ANNUAL : MOUTAI_QUARTERLY;
  }
  if (clean === '00700') {
    return periodType === 'annual' ? TENCENT_ANNUAL : TENCENT_QUARTERLY;
  }

  // 그 외 종목은 시가총액 스케일 및 시장 기준(US-GAAP vs 중국/홍콩 AKShare 회계기준)에 맞춘 일관된 재무제표 생성
  const periods =
    market === 'US'
      ? periodType === 'annual'
        ? ANNUAL_PERIODS_US
        : QUARTERLY_PERIODS_US
      : periodType === 'annual'
      ? ANNUAL_PERIODS_ASIA
      : QUARTERLY_PERIODS_ASIA;

  const baseRev = Math.max(Math.round(marketCapMillions * (periodType === 'annual' ? 0.14 : 0.036)), 1200);
  const growthStep = periodType === 'annual' ? 0.11 : 0.035;

  const revs = periods.map((_, idx) => Math.round(baseRev * Math.pow(1 + growthStep, idx - periods.length + 1)));
  const cost = revs.map((r) => Math.round(r * 0.52));
  const gross = revs.map((r, i) => r - cost[i]);
  const rnd = revs.map((r) => Math.round(r * 0.11));
  const sga = revs.map((r) => Math.round(r * 0.09));
  const opInc = gross.map((g, i) => g - rnd[i] - sga[i]);
  const tax = opInc.map((o) => Math.round(o * 0.18));
  const netInc = opInc.map((o, i) => o - tax[i]);
  const eps = netInc.map((n) => Number((n / Math.max(marketCapMillions / 150, 100)).toFixed(2)));

  const assets = revs.map((r) => Math.round(r * (periodType === 'annual' ? 1.85 : 7.2)));
  const cash = assets.map((a) => Math.round(a * 0.22));
  const curAssets = assets.map((a) => Math.round(a * 0.48));
  const ppe = assets.map((a) => Math.round(a * 0.26));
  const liab = assets.map((a) => Math.round(a * 0.44));
  const curLiab = liab.map((l) => Math.round(l * 0.55));
  const ltDebt = liab.map((l) => Math.round(l * 0.32));
  const equity = assets.map((a, i) => a - liab[i]);

  const opCf = netInc.map((n) => Math.round(n * 1.24));
  const capex = opCf.map((c) => -Math.round(c * 0.28));
  const invCf = capex.map((cx) => Math.round(cx * 1.35));
  const finCf = opCf.map((c) => -Math.round(c * 0.52));

  if (market === 'US') {
    return {
      periods,
      IS: {
        Revenues: buildSeries(periods, revs),
        CostOfRevenue: buildSeries(periods, cost),
        GrossProfit: buildSeries(periods, gross),
        ResearchAndDevelopmentExpense: buildSeries(periods, rnd),
        SellingGeneralAndAdministrativeExpense: buildSeries(periods, sga),
        OperatingIncomeLoss: buildSeries(periods, opInc),
        IncomeTaxExpenseBenefit: buildSeries(periods, tax),
        NetIncomeLoss: buildSeries(periods, netInc),
        EarningsPerShareDiluted: buildSeries(periods, eps),
      },
      BS: {
        Assets: buildSeries(periods, assets),
        AssetsCurrent: buildSeries(periods, curAssets),
        CashAndCashEquivalentsAtCarryingValue: buildSeries(periods, cash),
        PropertyPlantAndEquipmentNet: buildSeries(periods, ppe),
        Liabilities: buildSeries(periods, liab),
        LiabilitiesCurrent: buildSeries(periods, curLiab),
        LongTermDebtNoncurrent: buildSeries(periods, ltDebt),
        StockholdersEquity: buildSeries(periods, equity),
      },
      CF: {
        NetCashProvidedByUsedInOperatingActivities: buildSeries(periods, opCf),
        PaymentsToAcquirePropertyPlantAndEquipment: buildSeries(periods, capex),
        NetCashProvidedByUsedInInvestingActivities: buildSeries(periods, invCf),
        NetCashProvidedByUsedInFinancingActivities: buildSeries(periods, finCf),
      },
    };
  }

  return {
    periods,
    IS: {
      '营业总收入': buildSeries(periods, revs),
      '营业收入': buildSeries(periods, revs),
      '营业成本': buildSeries(periods, cost),
      '毛利润': buildSeries(periods, gross),
      '研发费用': buildSeries(periods, rnd),
      '管理费用': buildSeries(periods, sga),
      '营业利润': buildSeries(periods, opInc),
      '所得税费用': buildSeries(periods, tax),
      '归属于母公司所有者的净利润': buildSeries(periods, netInc),
      '基本每股收益': buildSeries(periods, eps),
    },
    BS: {
      '资产总计': buildSeries(periods, assets),
      '流动资产合计': buildSeries(periods, curAssets),
      '货币资金': buildSeries(periods, cash),
      '固定资产': buildSeries(periods, ppe),
      '负债合计': buildSeries(periods, liab),
      '流动负债合计': buildSeries(periods, curLiab),
      '长期借款': buildSeries(periods, ltDebt),
      '归属于母公司所有者权益合计': buildSeries(periods, equity),
    },
    CF: {
      '经营活动产生的现金流量净额': buildSeries(periods, opCf),
      '购建固定资产、无形资产和其他长期资产支付的现金': buildSeries(periods, capex),
      '投资活动产生的现金流量净额': buildSeries(periods, invCf),
      '筹资活动产生的现金流量净额': buildSeries(periods, finCf),
    },
  };
}
