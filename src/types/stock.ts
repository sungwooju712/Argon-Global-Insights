export type MarketCode = 'US' | 'CN' | 'HK';
export type CurrencyCode = 'USD' | 'CNY' | 'HKD';

export interface DailyPricePoint {
  date: string; // YYYY-MM-DD
  close: number;
}

export interface StockUniverseItem {
  symbol: string;
  market: MarketCode;
  exchange: string;
  currency: CurrencyCode;
  nameOriginal: string;
  cik?: string; // For SEC EDGAR lookup (10-digit zero-padded)
  sectorKo: string;
  basePrice: number;
  previousClose: number;
  marketCapMillions: number; // In native currency millions
}

export interface WatchlistItem {
  symbol: string;
  market: MarketCode;
  exchange: string;
  currency: CurrencyCode;
  nameOriginal: string;
  nameKo: string;
  sectorKo: string;
  price: number;
  change: number;
  changePercent: number;
  marketCapMillions: number;
  fetchedAt: string; // YYYY-MM-DD HH:mm:ss
  source: string;
  isCached: boolean;
  warningKo?: string | null;
  addedAt: string;
  history: DailyPricePoint[];
}

export type StatementType = 'IS' | 'BS' | 'CF';
export type PeriodType = 'annual' | 'quarterly';

export interface FinancialStatementRow {
  rawKey: string;
  labelKo: string;
  isMapped: boolean;
  isKeyMetric?: boolean;
  values: Record<string, number | null>; // period (YYYY-MM-DD) -> value in millions of native currency
}

export interface StockFinancials {
  symbol: string;
  nameOriginal: string;
  nameKo: string;
  market: MarketCode;
  currency: CurrencyCode;
  unit: '백만';
  periodType: PeriodType;
  periods: string[]; // YYYY-MM-DD sorted chronological or reverse chronological
  incomeStatement: FinancialStatementRow[];
  balanceSheet: FinancialStatementRow[];
  cashFlow: FinancialStatementRow[];
  fetchedAt: string; // YYYY-MM-DD HH:mm:ss
  source: string;
  isCached: boolean;
  warningKo?: string | null;
}

export interface AutoSaveConfig {
  enabled: boolean;
  intervalSeconds: number; // 1 (즉시), 30, 60, 300, 600, 1800
  saveOnEveryChange: boolean;
  lastAutoSavedAt: string | null;
}

export interface WorkspaceStatePayload {
  version: string;
  exportedAt: string;
  watchlistSymbols: string[];
  namesKo: Record<string, string>;
  customMappings: Record<string, string>;
  autoSaveConfig: AutoSaveConfig;
  uiPreferences: {
    selectedSymbol: string;
    chartRange: '1M' | '3M' | '6M' | '1Y' | 'ALL' | 'CUSTOM';
    chartStartDate: string;
    chartEndDate: string;
    chartGranularity: 'daily' | 'monthly' | 'yearly';
    marketFilter: 'ALL' | MarketCode;
    darkMode?: boolean;
  };
}

export interface SnapshotRecord {
  id: number;
  createdAt: string; // YYYY-MM-DD HH:mm:ss
  triggerType: 'auto' | 'manual' | 'file_import' | 'pre_restore';
  label: string;
  watchlistCount: number;
  namesKoCount: number;
  mappingCount: number;
  payload?: WorkspaceStatePayload;
}

export interface CollectorTestResult {
  id: string;
  title: string;
  market: MarketCode | 'COMMON';
  symbol: string;
  sourceName: string;
  passed: boolean;
  latencyMs: number;
  checkedAt: string;
  messageKo: string;
  sampleFields: { rawKey: string; labelKo: string; sampleValue: string }[];
}
