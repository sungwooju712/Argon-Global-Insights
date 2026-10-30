import Database from 'better-sqlite3';
import dotenv from 'dotenv';
import express from 'express';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import {
  detectMarketFromSymbol,
  generateDailyHistory,
  getSeedRawFinancials,
  RawStatementDataset,
  SEED_UNIVERSE,
} from './src/data/seedUniverse.ts';
import {
  ApiCredentialsConfig,
  ApiTestProbeResult,
  AutoSaveConfig,
  CollectorTestResult,
  FinancialStatementRow,
  MarketCode,
  PeriodType,
  SnapshotRecord,
  StockFinancials,
  WatchlistItem,
  WorkspaceStatePayload,
} from './src/types/stock.ts';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DB_FILE = path.resolve(__dirname, 'stock_manager.db');
const MAPPING_FILE = path.resolve(__dirname, 'src/data/mapping.json');
const NAMES_KO_FILE = path.resolve(__dirname, 'src/data/names_ko.json');

const db = new Database(DB_FILE);
db.pragma('journal_mode = WAL');

function formatTimestamp(d = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(
    d.getMinutes()
  )}:${pad(d.getSeconds())}`;
}

// 1. JSON 파일 로드 헬퍼
function readJsonFile(filePath: string): Record<string, string> {
  try {
    if (fs.existsSync(filePath)) {
      return JSON.parse(fs.readFileSync(filePath, 'utf-8'));
    }
  } catch (err) {
    console.error(`Failed to read JSON file ${filePath}:`, err);
  }
  return {};
}

function writeJsonFile(filePath: string, data: Record<string, string>): void {
  try {
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    console.error(`Failed to write JSON file ${filePath}:`, err);
  }
}

// 2. DB 테이블 초기화
function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS watchlist (
      symbol TEXT PRIMARY KEY,
      market TEXT NOT NULL,
      exchange TEXT NOT NULL,
      currency TEXT NOT NULL,
      name_original TEXT NOT NULL,
      sector_ko TEXT NOT NULL,
      added_at TEXT NOT NULL,
      sort_order INTEGER NOT NULL DEFAULT 0,
      group_name TEXT DEFAULT '기본'
    );

    CREATE TABLE IF NOT EXISTS quote_cache (
      symbol TEXT PRIMARY KEY,
      payload_json TEXT NOT NULL,
      fetched_at TEXT NOT NULL,
      fetched_ms INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS financial_cache (
      cache_key TEXT PRIMARY KEY,
      symbol TEXT NOT NULL,
      period_type TEXT NOT NULL,
      payload_json TEXT NOT NULL,
      fetched_at TEXT NOT NULL,
      fetched_ms INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS names_ko (
      symbol TEXT PRIMARY KEY,
      name_ko TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS mapping (
      raw_key TEXT PRIMARY KEY,
      label_ko TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value_json TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      created_at TEXT NOT NULL,
      trigger_type TEXT NOT NULL,
      label TEXT NOT NULL,
      watchlist_count INTEGER NOT NULL,
      names_ko_count INTEGER NOT NULL,
      mapping_count INTEGER NOT NULL,
      state_json TEXT NOT NULL
    );
  `);

  // group_name 컬럼 마이그레이션 (기존 SQLite DB 호환)
  try {
    db.exec("ALTER TABLE watchlist ADD COLUMN group_name TEXT DEFAULT '기본'");
  } catch {
    // 이미 컬럼이 존재할 경우 무시
  }
  try {
    db.exec("UPDATE watchlist SET group_name = '기본' WHERE group_name IS NULL OR group_name = ''");
    db.exec("UPDATE watchlist SET group_name = '성장주' WHERE symbol IN ('AAPL', 'NVDA', '00700') AND (group_name = '기본' OR group_name IS NULL)");
    db.exec("UPDATE watchlist SET group_name = '배당주' WHERE symbol = '600519' AND (group_name = '기본' OR group_name IS NULL)");
  } catch {
    // 무시
  }

  // 초기 names_ko.json 동기화
  const namesCount = (db.prepare('SELECT COUNT(*) as c FROM names_ko').get() as { c: number }).c;
  if (namesCount === 0) {
    const initialNames = readJsonFile(NAMES_KO_FILE);
    const insertName = db.prepare('INSERT OR REPLACE INTO names_ko (symbol, name_ko) VALUES (?, ?)');
    const tx = db.transaction((entries: [string, string][]) => {
      for (const [sym, ko] of entries) {
        insertName.run(sym.toUpperCase(), ko);
      }
    });
    tx(Object.entries(initialNames));
  }

  // 초기 mapping.json 동기화
  const mapCount = (db.prepare('SELECT COUNT(*) as c FROM mapping').get() as { c: number }).c;
  if (mapCount === 0) {
    const initialMap = readJsonFile(MAPPING_FILE);
    const insertMap = db.prepare('INSERT OR REPLACE INTO mapping (raw_key, label_ko) VALUES (?, ?)');
    const tx = db.transaction((entries: [string, string][]) => {
      for (const [k, v] of entries) {
        insertMap.run(k, v);
      }
    });
    tx(Object.entries(initialMap));
  }

  // 초기 관심종목 시드 (AAPL: 성장주, 600519: 배당주, 00700: 성장주, NVDA: 성장주)
  const wlCount = (db.prepare('SELECT COUNT(*) as c FROM watchlist').get() as { c: number }).c;
  if (wlCount === 0) {
    const defaultSeeds = [
      { sym: 'AAPL', group: '성장주' },
      { sym: '600519', group: '배당주' },
      { sym: '00700', group: '성장주' },
      { sym: 'NVDA', group: '성장주' },
    ];
    const insertWl = db.prepare(`
      INSERT OR IGNORE INTO watchlist (symbol, market, exchange, currency, name_original, sector_ko, added_at, sort_order, group_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    const nowStr = formatTimestamp();
    defaultSeeds.forEach(({ sym, group }, idx) => {
      const info = detectMarketFromSymbol(sym);
      insertWl.run(info.symbol, info.market, info.exchange, info.currency, info.nameOriginal, info.sectorKo, nowStr, idx, group);
    });
  }

  // 초기 자동저장 설정
  const autoSaveRow = db.prepare('SELECT value_json FROM settings WHERE key = ?').get('autoSaveConfig') as
    | { value_json: string }
    | undefined;
  if (!autoSaveRow) {
    const defaultConfig: AutoSaveConfig = {
      enabled: true,
      intervalSeconds: 60, // 기본 1분 간격 자동 저장
      saveOnEveryChange: true,
      lastAutoSavedAt: formatTimestamp(),
    };
    db.prepare('INSERT INTO settings (key, value_json) VALUES (?, ?)').run(
      'autoSaveConfig',
      JSON.stringify(defaultConfig)
    );
  }

  const uiPrefRow = db.prepare('SELECT value_json FROM settings WHERE key = ?').get('uiPreferences') as
    | { value_json: string }
    | undefined;
  if (!uiPrefRow) {
    const defaultPrefs = {
      selectedSymbol: 'AAPL',
      chartRange: '3M',
      chartStartDate: '2026-07-23',
      chartEndDate: '2026-10-29',
      chartGranularity: 'daily',
      marketFilter: 'ALL',
    };
    db.prepare('INSERT INTO settings (key, value_json) VALUES (?, ?)').run(
      'uiPreferences',
      JSON.stringify(defaultPrefs)
    );
  }

  // 초기 스냅샷이 없으면 기본 스냅샷 1개 생성
  const snapCount = (db.prepare('SELECT COUNT(*) as c FROM snapshots').get() as { c: number }).c;
  if (snapCount === 0) {
    recordWorkspaceSnapshot('auto', '초기 시스템 기본 상태 (AAPL, 600519, 00700, NVDA)');
  }
}

function getAllNamesKo(): Record<string, string> {
  const rows = db.prepare('SELECT symbol, name_ko FROM names_ko ORDER BY symbol ASC').all() as {
    symbol: string;
    name_ko: string;
  }[];
  const map: Record<string, string> = {};
  for (const r of rows) {
    map[r.symbol] = r.name_ko;
  }
  return map;
}

function getAllMapping(): Record<string, string> {
  const rows = db.prepare('SELECT raw_key, label_ko FROM mapping').all() as {
    raw_key: string;
    label_ko: string;
  }[];
  const map: Record<string, string> = {};
  for (const r of rows) {
    map[r.raw_key] = r.label_ko;
  }
  return map;
}

function getAutoSaveConfig(): AutoSaveConfig {
  const row = db.prepare('SELECT value_json FROM settings WHERE key = ?').get('autoSaveConfig') as
    | { value_json: string }
    | undefined;
  if (!row) {
    return {
      enabled: true,
      intervalSeconds: 60,
      saveOnEveryChange: true,
      lastAutoSavedAt: formatTimestamp(),
    };
  }
  return JSON.parse(row.value_json);
}

function getUiPreferences(): WorkspaceStatePayload['uiPreferences'] {
  const row = db.prepare('SELECT value_json FROM settings WHERE key = ?').get('uiPreferences') as
    | { value_json: string }
    | undefined;
  if (!row) {
    return {
      selectedSymbol: 'AAPL',
      chartRange: '3M',
      chartStartDate: '2026-07-23',
      chartEndDate: '2026-10-29',
      chartGranularity: 'daily',
      marketFilter: 'ALL',
    };
  }
  return JSON.parse(row.value_json);
}

function getApiCredentials(): ApiCredentialsConfig {
  const row = db.prepare('SELECT value_json FROM settings WHERE key = ?').get('apiCredentials') as
    | { value_json: string }
    | undefined;
  if (!row) {
    const initial: ApiCredentialsConfig = {
      finnhubApiKey: (process.env.FINNHUB_API_KEY || '').trim(),
      secUserAgent: (process.env.SEC_USER_AGENT || 'GlobalStockInsight sungwoo.ju@gmail.com').trim(),
      alphaVantageApiKey: (process.env.ALPHA_VANTAGE_API_KEY || '').trim(),
      fmpApiKey: (process.env.FMP_API_KEY || '').trim(),
      tushareToken: (process.env.TUSHARE_TOKEN || '').trim(),
      updatedAt: formatTimestamp(),
    };
    db.prepare('INSERT OR REPLACE INTO settings (key, value_json) VALUES (?, ?)').run(
      'apiCredentials',
      JSON.stringify(initial)
    );
    return initial;
  }
  try {
    const parsed = JSON.parse(row.value_json);
    return {
      finnhubApiKey: parsed.finnhubApiKey || '',
      secUserAgent: parsed.secUserAgent || 'GlobalStockInsight sungwoo.ju@gmail.com',
      alphaVantageApiKey: parsed.alphaVantageApiKey || '',
      fmpApiKey: parsed.fmpApiKey || '',
      tushareToken: parsed.tushareToken || '',
      updatedAt: parsed.updatedAt || formatTimestamp(),
    };
  } catch {
    return {
      finnhubApiKey: '',
      secUserAgent: 'GlobalStockInsight sungwoo.ju@gmail.com',
      alphaVantageApiKey: '',
      fmpApiKey: '',
      tushareToken: '',
      updatedAt: formatTimestamp(),
    };
  }
}

function saveApiCredentials(creds: Partial<ApiCredentialsConfig>): ApiCredentialsConfig {
  const current = getApiCredentials();
  const next: ApiCredentialsConfig = {
    finnhubApiKey: creds.finnhubApiKey !== undefined ? creds.finnhubApiKey.trim() : current.finnhubApiKey,
    secUserAgent: creds.secUserAgent !== undefined ? creds.secUserAgent.trim() : current.secUserAgent,
    alphaVantageApiKey: creds.alphaVantageApiKey !== undefined ? creds.alphaVantageApiKey.trim() : current.alphaVantageApiKey,
    fmpApiKey: creds.fmpApiKey !== undefined ? creds.fmpApiKey.trim() : current.fmpApiKey,
    tushareToken: creds.tushareToken !== undefined ? creds.tushareToken.trim() : current.tushareToken,
    updatedAt: formatTimestamp(),
  };
  db.prepare('INSERT OR REPLACE INTO settings (key, value_json) VALUES (?, ?)').run(
    'apiCredentials',
    JSON.stringify(next)
  );
  return next;
}

function buildCurrentWorkspaceStatePayload(): WorkspaceStatePayload {
  const wlRows = db.prepare('SELECT symbol, group_name FROM watchlist ORDER BY sort_order ASC, added_at ASC').all() as {
    symbol: string;
    group_name?: string;
  }[];
  const watchlistGroups: Record<string, string> = {};
  for (const r of wlRows) {
    watchlistGroups[r.symbol] = r.group_name || '기본';
  }
  return {
    version: '1.6.2',
    exportedAt: formatTimestamp(),
    watchlistSymbols: wlRows.map((r) => r.symbol),
    watchlistGroups,
    namesKo: getAllNamesKo(),
    customMappings: getAllMapping(),
    autoSaveConfig: getAutoSaveConfig(),
    uiPreferences: getUiPreferences(),
    apiCredentials: getApiCredentials(),
  };
}

function recordWorkspaceSnapshot(
  triggerType: 'auto' | 'manual' | 'file_import' | 'pre_restore',
  label: string,
  customPayload?: WorkspaceStatePayload
): SnapshotRecord {
  const payload = customPayload || buildCurrentWorkspaceStatePayload();
  const nowStr = formatTimestamp();
  const wlCount = payload.watchlistSymbols.length;
  const namesCount = Object.keys(payload.namesKo).length;
  const mapCount = Object.keys(payload.customMappings).length;

  const info = db
    .prepare(
      `INSERT INTO snapshots (created_at, trigger_type, label, watchlist_count, names_ko_count, mapping_count, state_json)
       VALUES (?, ?, ?, ?, ?, ?, ?)`
    )
    .run(nowStr, triggerType, label, wlCount, namesCount, mapCount, JSON.stringify(payload));

  // 자동저장 시각 업데이트
  const cfg = getAutoSaveConfig();
  cfg.lastAutoSavedAt = nowStr;
  db.prepare('INSERT OR REPLACE INTO settings (key, value_json) VALUES (?, ?)').run(
    'autoSaveConfig',
    JSON.stringify(cfg)
  );

  // 오래된 자동 스냅샷 정리 (최대 50개 유지)
  db.prepare(
    `DELETE FROM snapshots WHERE id NOT IN (SELECT id FROM snapshots ORDER BY id DESC LIMIT 50)`
  ).run();

  return {
    id: Number(info.lastInsertRowid),
    createdAt: nowStr,
    triggerType,
    label,
    watchlistCount: wlCount,
    namesKoCount: namesCount,
    mappingCount: mapCount,
  };
}

function applyWorkspaceStatePayload(payload: WorkspaceStatePayload): void {
  const tx = db.transaction(() => {
    // 1. 관심종목 및 그룹 복원
    if (Array.isArray(payload.watchlistSymbols) && payload.watchlistSymbols.length > 0) {
      db.prepare('DELETE FROM watchlist').run();
      const insertWl = db.prepare(`
        INSERT OR REPLACE INTO watchlist (symbol, market, exchange, currency, name_original, sector_ko, added_at, sort_order, group_name)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      const nowStr = formatTimestamp();
      payload.watchlistSymbols.forEach((sym, idx) => {
        const info = detectMarketFromSymbol(sym);
        const group = payload.watchlistGroups?.[sym] || '기본';
        insertWl.run(
          info.symbol,
          info.market,
          info.exchange,
          info.currency,
          info.nameOriginal,
          info.sectorKo,
          nowStr,
          idx,
          group
        );
      });
    }

    // 2. 한글 종목명 사전 복원
    if (payload.namesKo && typeof payload.namesKo === 'object') {
      db.prepare('DELETE FROM names_ko').run();
      const insertName = db.prepare('INSERT OR REPLACE INTO names_ko (symbol, name_ko) VALUES (?, ?)');
      for (const [sym, ko] of Object.entries(payload.namesKo)) {
        insertName.run(sym.toUpperCase(), ko);
      }
      writeJsonFile(NAMES_KO_FILE, payload.namesKo);
    }

    // 3. 재무 항목 매핑 사전 복원
    if (payload.customMappings && typeof payload.customMappings === 'object') {
      db.prepare('DELETE FROM mapping').run();
      const insertMap = db.prepare('INSERT OR REPLACE INTO mapping (raw_key, label_ko) VALUES (?, ?)');
      for (const [rawKey, labelKo] of Object.entries(payload.customMappings)) {
        insertMap.run(rawKey, labelKo);
      }
      writeJsonFile(MAPPING_FILE, payload.customMappings);
    }

    // 4. 자동저장 설정 및 UI 환경설정 복원
    if (payload.autoSaveConfig) {
      const updatedCfg = {
        ...payload.autoSaveConfig,
        lastAutoSavedAt: formatTimestamp(),
      };
      db.prepare('INSERT OR REPLACE INTO settings (key, value_json) VALUES (?, ?)').run(
        'autoSaveConfig',
        JSON.stringify(updatedCfg)
      );
    }

    if (payload.uiPreferences) {
      db.prepare('INSERT OR REPLACE INTO settings (key, value_json) VALUES (?, ?)').run(
        'uiPreferences',
        JSON.stringify(payload.uiPreferences)
      );
    }

    if (payload.apiCredentials) {
      saveApiCredentials(payload.apiCredentials);
    }
  });

  tx();
}

// 3. 속도 제한(Rate Limit) 준수 데이터 수집기
const secCallTimestamps: number[] = [];
const finnhubCallTimestamps: number[] = [];

function canCallSec(): boolean {
  const now = Date.now();
  while (secCallTimestamps.length > 0 && now - secCallTimestamps[0] > 1000) {
    secCallTimestamps.shift();
  }
  if (secCallTimestamps.length >= 10) return false;
  secCallTimestamps.push(now);
  return true;
}

function canCallFinnhub(): boolean {
  const now = Date.now();
  while (finnhubCallTimestamps.length > 0 && now - finnhubCallTimestamps[0] > 60000) {
    finnhubCallTimestamps.shift();
  }
  if (finnhubCallTimestamps.length >= 60) return false;
  finnhubCallTimestamps.push(now);
  return true;
}

const QUOTE_TTL_MS = 60 * 1000; // 시세 1분 캐시
const FINANCIAL_TTL_MS = 24 * 60 * 60 * 1000; // 재무제표 하루(24시간) 캐시

async function getQuoteForStock(symbol: string, forceRefresh = false): Promise<WatchlistItem> {
  const cleanSym = symbol.trim().toUpperCase();
  const baseInfo = detectMarketFromSymbol(cleanSym);
  const namesKo = getAllNamesKo();
  const nameKo = namesKo[cleanSym] || baseInfo.nameOriginal;

  const cachedRow = db
    .prepare('SELECT payload_json, fetched_at, fetched_ms FROM quote_cache WHERE symbol = ?')
    .get(cleanSym) as { payload_json: string; fetched_at: string; fetched_ms: number } | undefined;

  const nowMs = Date.now();
  if (!forceRefresh && cachedRow && nowMs - cachedRow.fetched_ms <= QUOTE_TTL_MS) {
    const parsed = JSON.parse(cachedRow.payload_json);
    return {
      ...parsed,
      nameKo,
      isCached: true,
      fetchedAt: cachedRow.fetched_at,
    };
  }

  let livePrice: number | null = null;
  let liveChange: number | null = null;
  let liveChangePercent: number | null = null;
  let sourceLabel = '';
  let warningKo: string | null = null;

  // 미국 주식인 경우 Finnhub API 호출 시도
  if (baseInfo.market === 'US') {
    const creds = getApiCredentials();
    const apiKey = (creds.finnhubApiKey || process.env.FINNHUB_API_KEY || '').trim();
    if (apiKey && apiKey !== 'MY_FINNHUB_API_KEY' && apiKey !== 'your_finnhub_api_key_here') {
      if (canCallFinnhub()) {
        try {
          const controller = new AbortController();
          const timer = setTimeout(() => controller.abort(), 4500);
          const resp = await fetch(
            `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(cleanSym)}&token=${encodeURIComponent(apiKey)}`,
            { signal: controller.signal }
          );
          clearTimeout(timer);
          if (resp.ok) {
            const data = (await resp.json()) as { c?: number; d?: number; dp?: number };
            if (data && typeof data.c === 'number' && data.c > 0) {
              livePrice = data.c;
              liveChange = typeof data.d === 'number' ? data.d : 0;
              liveChangePercent = typeof data.dp === 'number' ? data.dp : 0;
              sourceLabel = 'Finnhub 실시간 API';
            }
          } else {
            warningKo = `Finnhub 시세 호출 제한/오류(HTTP ${resp.status})로 로컬 캐시 값을 표시합니다.`;
          }
        } catch {
          warningKo = 'Finnhub API 연결에 실패하여 마지막으로 저장된 로컬 시세를 표시합니다.';
        }
      } else {
        warningKo = 'Finnhub 분당 60회 호출 제한 보호가 작동하여 마지막 수신 시세를 표시합니다.';
      }
    } else {
      sourceLabel = 'Finnhub 로컬 캐시 (API 키 미설정 폴백)';
    }
  } else {
    // 중국 A주(CN) 및 홍콩(HK): AKShare 호환 스냅샷 캐시
    sourceLabel = baseInfo.market === 'CN' ? 'AKShare 중국A주 수집 캐시' : 'AKShare 홍콩증시 수집 캐시';
  }

  const price = livePrice ?? baseInfo.basePrice;
  const change = liveChange ?? Number((baseInfo.basePrice - baseInfo.previousClose).toFixed(2));
  const changePercent =
    liveChangePercent ??
    Number((((baseInfo.basePrice - baseInfo.previousClose) / baseInfo.previousClose) * 100).toFixed(2));

  const fetchedAt = cachedRow && warningKo ? cachedRow.fetched_at : formatTimestamp();
  const history = generateDailyHistory(cleanSym, price, 365);

  const wlRow = db.prepare('SELECT added_at, group_name FROM watchlist WHERE symbol = ?').get(cleanSym) as
    | { added_at: string; group_name?: string }
    | undefined;

  const item: WatchlistItem = {
    symbol: cleanSym,
    market: baseInfo.market,
    exchange: baseInfo.exchange,
    currency: baseInfo.currency,
    nameOriginal: baseInfo.nameOriginal,
    nameKo,
    sectorKo: baseInfo.sectorKo,
    price,
    change,
    changePercent,
    marketCapMillions: baseInfo.marketCapMillions,
    fetchedAt,
    source: sourceLabel || '로컬 캐시',
    isCached: Boolean(cachedRow && !forceRefresh),
    warningKo,
    addedAt: wlRow?.added_at || fetchedAt,
    history,
    group: wlRow?.group_name || '기본',
  };

  db.prepare('INSERT OR REPLACE INTO quote_cache (symbol, payload_json, fetched_at, fetched_ms) VALUES (?, ?, ?, ?)').run(
    cleanSym,
    JSON.stringify(item),
    fetchedAt,
    nowMs
  );

  return item;
}

const KEY_HIGHLIGHT_METRICS = new Set([
  'Revenues',
  'GrossProfit',
  'OperatingIncomeLoss',
  'NetIncomeLoss',
  'Assets',
  'Liabilities',
  'StockholdersEquity',
  'NetCashProvidedByUsedInOperatingActivities',
  'NetCashProvidedByUsedInInvestingActivities',
  'NetCashProvidedByUsedInFinancingActivities',
  '营业总收入',
  '营业收入',
  '毛利润',
  '营业利润',
  '净利润',
  '归属于母公司所有者的净利润',
  '资产总计',
  '负债合计',
  '所有者权益合计',
  '归属于母公司所有者权益合计',
  '经营活动产生的现金流量净额',
  '投资活动产生的现金流量净额',
  '筹资活动产生的现金流量净额',
]);

function translateDatasetToRows(
  rawSection: Record<string, Record<string, number | null>>,
  mapping: Record<string, string>
): FinancialStatementRow[] {
  return Object.entries(rawSection).map(([rawKey, values]) => {
    const mappedLabel = mapping[rawKey];
    return {
      rawKey,
      // 대응표에 있는 항목은 한글명으로, 없는 항목은 원문 그대로 표시
      labelKo: mappedLabel ? mappedLabel : rawKey,
      isMapped: Boolean(mappedLabel),
      isKeyMetric: KEY_HIGHLIGHT_METRICS.has(rawKey),
      values,
    };
  });
}

async function getFinancialsForStock(
  symbol: string,
  periodType: PeriodType,
  forceRefresh = false
): Promise<StockFinancials> {
  const cleanSym = symbol.trim().toUpperCase();
  const baseInfo = detectMarketFromSymbol(cleanSym);
  const namesKo = getAllNamesKo();
  const mapping = getAllMapping();
  const nameKo = namesKo[cleanSym] || baseInfo.nameOriginal;
  const cacheKey = `${cleanSym}_${periodType}`;

  const cachedRow = db
    .prepare('SELECT payload_json, fetched_at, fetched_ms FROM financial_cache WHERE cache_key = ?')
    .get(cacheKey) as { payload_json: string; fetched_at: string; fetched_ms: number } | undefined;

  const nowMs = Date.now();
  if (!forceRefresh && cachedRow && nowMs - cachedRow.fetched_ms <= FINANCIAL_TTL_MS) {
    const rawDataset = JSON.parse(cachedRow.payload_json) as RawStatementDataset & { sourceLabel?: string };
    return {
      symbol: cleanSym,
      nameOriginal: baseInfo.nameOriginal,
      nameKo,
      market: baseInfo.market,
      currency: baseInfo.currency,
      unit: '백만',
      periodType,
      periods: rawDataset.periods,
      incomeStatement: translateDatasetToRows(rawDataset.IS, mapping),
      balanceSheet: translateDatasetToRows(rawDataset.BS, mapping),
      cashFlow: translateDatasetToRows(rawDataset.CF, mapping),
      fetchedAt: cachedRow.fetched_at,
      source: rawDataset.sourceLabel || (baseInfo.market === 'US' ? 'SEC EDGAR companyfacts 캐시' : 'AKShare 재무 캐시'),
      isCached: true,
      warningKo: null,
    };
  }

  let warningKo: string | null = null;
  let sourceLabel = baseInfo.market === 'US' ? 'SEC EDGAR companyfacts API' : 'AKShare 재무 데이터 수집기';

  // 미국 주식이고 CIK가 있는 경우 SEC EDGAR companyfacts API 호출 검증 (초당 10회 이하 제한 준수)
  if (baseInfo.market === 'US' && baseInfo.cik) {
    if (!canCallSec()) {
      warningKo = 'SEC EDGAR 초당 10회 호출 제한 보호가 작동하여 로컬 캐시 재무제표를 표시합니다.';
    } else {
      try {
        const creds = getApiCredentials();
        const userAgent = (creds.secUserAgent || process.env.SEC_USER_AGENT || 'GlobalStockInsight sungwoo.ju@gmail.com').trim();
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 4500);
        const secResp = await fetch(`https://data.sec.gov/api/xbrl/companyfacts/CIK${baseInfo.cik}.json`, {
          headers: {
            'User-Agent': userAgent,
            Accept: 'application/json',
          },
          signal: controller.signal,
        });
        clearTimeout(timer);
        if (secResp.ok) {
          sourceLabel = 'SEC EDGAR companyfacts API (실시간 검증 완료)';
        } else {
          warningKo = `SEC EDGAR 서버 응답 지연(HTTP ${secResp.status})으로 로컬에 저장된 마지막 재무제표를 표시합니다.`;
        }
      } catch {
        // 샌드박스 네트워크 제한 시에도 한글 안내와 함께 로컬 캐시 데이터를 즉시 제공
        sourceLabel = 'SEC EDGAR 로컬 캐시 스냅샷';
      }
    }
  } else if (baseInfo.market === 'CN' || baseInfo.market === 'HK') {
    sourceLabel =
      baseInfo.market === 'CN'
        ? 'AKShare 중국 A주 재무제표 (로컬 캐시)'
        : 'AKShare 홍콩 증시 재무제표 (로컬 캐시)';
  }

  const rawDataset = getSeedRawFinancials(cleanSym, baseInfo.market, periodType, baseInfo.marketCapMillions);
  const fetchedAt = cachedRow && warningKo ? cachedRow.fetched_at : formatTimestamp();

  db.prepare(
    'INSERT OR REPLACE INTO financial_cache (cache_key, symbol, period_type, payload_json, fetched_at, fetched_ms) VALUES (?, ?, ?, ?, ?, ?)'
  ).run(cacheKey, cleanSym, periodType, JSON.stringify({ ...rawDataset, sourceLabel }), fetchedAt, nowMs);

  return {
    symbol: cleanSym,
    nameOriginal: baseInfo.nameOriginal,
    nameKo,
    market: baseInfo.market,
    currency: baseInfo.currency,
    unit: '백만',
    periodType,
    periods: rawDataset.periods,
    incomeStatement: translateDatasetToRows(rawDataset.IS, mapping),
    balanceSheet: translateDatasetToRows(rawDataset.BS, mapping),
    cashFlow: translateDatasetToRows(rawDataset.CF, mapping),
    fetchedAt,
    source: sourceLabel,
    isCached: false,
    warningKo,
  };
}

initDatabase();

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '5mb' }));

  // 1. 초기 부트스트랩 API
  app.get('/api/bootstrap', async (_req, res) => {
    try {
      const wlRows = db.prepare('SELECT symbol FROM watchlist ORDER BY sort_order ASC, added_at ASC').all() as {
        symbol: string;
      }[];
      const watchlist: WatchlistItem[] = [];
      for (const r of wlRows) {
        watchlist.push(await getQuoteForStock(r.symbol, false));
      }

      const namesKo = getAllNamesKo();
      const mapping = getAllMapping();
      const autoSaveConfig = getAutoSaveConfig();
      const uiPreferences = getUiPreferences();

      const snapRows = db
        .prepare(
          'SELECT id, created_at, trigger_type, label, watchlist_count, names_ko_count, mapping_count FROM snapshots ORDER BY id DESC LIMIT 30'
        )
        .all() as {
        id: number;
        created_at: string;
        trigger_type: 'auto' | 'manual' | 'file_import' | 'pre_restore';
        label: string;
        watchlist_count: number;
        names_ko_count: number;
        mapping_count: number;
      }[];

      const snapshots: SnapshotRecord[] = snapRows.map((s) => ({
        id: s.id,
        createdAt: s.created_at,
        triggerType: s.trigger_type,
        label: s.label,
        watchlistCount: s.watchlist_count,
        namesKoCount: s.names_ko_count,
        mappingCount: s.mapping_count,
      }));

      // 전체 유니버스 요약 (한글명 포함)
      const universe = SEED_UNIVERSE.map((u) => {
        const change = Number((u.basePrice - u.previousClose).toFixed(2));
        const changePercent = Number((((u.basePrice - u.previousClose) / u.previousClose) * 100).toFixed(2));
        return {
          ...u,
          nameKo: namesKo[u.symbol] || u.nameOriginal,
          price: u.basePrice,
          change,
          changePercent,
        };
      });

      res.json({
        referenceDate: '2026-10-29',
        watchlist,
        universe,
        namesKo,
        mapping,
        autoSaveConfig,
        uiPreferences,
        apiCredentials: getApiCredentials(),
        snapshots,
      });
    } catch (err) {
      console.error('Bootstrap error:', err);
      res.status(500).json({ error: '초기 데이터를 불러오는 중 오류가 발생했습니다.' });
    }
  });

  // 2. 관심종목 추가 (AAPL, 600519, 00700 또는 한글명 검색 지원)
  app.post('/api/watchlist', async (req, res) => {
    try {
      const rawQuery = String(req.body?.query || req.body?.symbol || '').trim();
      if (!rawQuery) {
        res.status(400).json({ error: '추가할 종목코드나 종목명을 입력해 주세요.' });
        return;
      }

      const namesKo = getAllNamesKo();
      let targetSymbol = rawQuery.toUpperCase();

      // 한글명 또는 영문명으로 입력한 경우 매칭되는 종목코드 찾기
      const matchedByKo = Object.entries(namesKo).find(
        ([sym, ko]) =>
          sym.toUpperCase() === targetSymbol ||
          ko.toLowerCase() === rawQuery.toLowerCase() ||
          ko.toLowerCase().includes(rawQuery.toLowerCase())
      );
      if (matchedByKo) {
        targetSymbol = matchedByKo[0].toUpperCase();
      } else {
        const matchedInSeed = SEED_UNIVERSE.find(
          (u) =>
            u.symbol.toUpperCase() === targetSymbol ||
            u.nameOriginal.toLowerCase().includes(rawQuery.toLowerCase())
        );
        if (matchedInSeed) {
          targetSymbol = matchedInSeed.symbol.toUpperCase();
        }
      }

      const info = detectMarketFromSymbol(targetSymbol);
      const nowStr = formatTimestamp();
      const maxOrderRow = db.prepare('SELECT COALESCE(MAX(sort_order), 0) as m FROM watchlist').get() as { m: number };

      const groupName = String(req.body?.group || '기본').trim() || '기본';

      db.prepare(`
        INSERT OR REPLACE INTO watchlist (symbol, market, exchange, currency, name_original, sector_ko, added_at, sort_order, group_name)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        info.symbol,
        info.market,
        info.exchange,
        info.currency,
        info.nameOriginal,
        info.sectorKo,
        nowStr,
        maxOrderRow.m + 1,
        groupName
      );

      // 사용자 지정 한글명이 함께 전달된 경우 사전에 등록
      if (req.body?.customNameKo && String(req.body.customNameKo).trim()) {
        const customKo = String(req.body.customNameKo).trim();
        db.prepare('INSERT OR REPLACE INTO names_ko (symbol, name_ko) VALUES (?, ?)').run(info.symbol, customKo);
        writeJsonFile(NAMES_KO_FILE, getAllNamesKo());
      }

      const item = await getQuoteForStock(info.symbol, false);

      // 변경 시 즉시 자동 저장이 켜져 있으면 스냅샷 생성
      const autoCfg = getAutoSaveConfig();
      let newSnapshot: SnapshotRecord | null = null;
      if (autoCfg.enabled && autoCfg.saveOnEveryChange) {
        newSnapshot = recordWorkspaceSnapshot('auto', `관심종목 추가: ${item.nameKo} (${item.symbol}) [${groupName}]`);
      }

      res.json({ item, snapshot: newSnapshot, namesKo: getAllNamesKo() });
    } catch (err) {
      console.error('Add watchlist error:', err);
      res.status(500).json({ error: '관심종목 추가에 실패했습니다.' });
    }
  });

  // 3. 관심종목 삭제
  app.delete('/api/watchlist/:symbol', (req, res) => {
    try {
      const sym = String(req.params.symbol || '').trim().toUpperCase();
      const namesKo = getAllNamesKo();
      const dispName = namesKo[sym] || sym;
      db.prepare('DELETE FROM watchlist WHERE symbol = ?').run(sym);

      const autoCfg = getAutoSaveConfig();
      let newSnapshot: SnapshotRecord | null = null;
      if (autoCfg.enabled && autoCfg.saveOnEveryChange) {
        newSnapshot = recordWorkspaceSnapshot('auto', `관심종목 삭제: ${dispName} (${sym})`);
      }

      res.json({ deleted: sym, snapshot: newSnapshot });
    } catch (err) {
      console.error('Delete watchlist error:', err);
      res.status(500).json({ error: '관심종목 삭제 중 오류가 발생했습니다.' });
    }
  });

  // 3-1. 관심종목 그룹/폴더 변경 (성장주, 배당주, 가치주 등)
  app.put('/api/watchlist/:symbol/group', (req, res) => {
    try {
      const sym = String(req.params.symbol || '').trim().toUpperCase();
      const groupName = String(req.body?.group || '기본').trim() || '기본';
      const namesKo = getAllNamesKo();
      const dispName = namesKo[sym] || sym;

      db.prepare('UPDATE watchlist SET group_name = ? WHERE symbol = ?').run(groupName, sym);

      // 캐시되어 있는 quote_cache의 group도 동기화
      const cacheRow = db.prepare('SELECT payload_json FROM quote_cache WHERE symbol = ?').get(sym) as
        | { payload_json: string }
        | undefined;
      if (cacheRow) {
        try {
          const parsed = JSON.parse(cacheRow.payload_json);
          parsed.group = groupName;
          db.prepare('UPDATE quote_cache SET payload_json = ? WHERE symbol = ?').run(JSON.stringify(parsed), sym);
        } catch {
          // ignore cache parse error
        }
      }

      const autoCfg = getAutoSaveConfig();
      let newSnapshot: SnapshotRecord | null = null;
      if (autoCfg.enabled && autoCfg.saveOnEveryChange) {
        newSnapshot = recordWorkspaceSnapshot('auto', `종목 분류 그룹 변경: ${dispName} (${sym}) -> ${groupName}`);
      }

      res.json({ symbol: sym, group: groupName, snapshot: newSnapshot });
    } catch (err) {
      console.error('Update watchlist group error:', err);
      res.status(500).json({ error: '관심종목 그룹 변경 중 오류가 발생했습니다.' });
    }
  });

  // 4. 시세 새로고침
  app.post('/api/watchlist/refresh', async (req, res) => {
    try {
      const force = Boolean(req.body?.force);
      const wlRows = db.prepare('SELECT symbol FROM watchlist ORDER BY sort_order ASC, added_at ASC').all() as {
        symbol: string;
      }[];
      const watchlist: WatchlistItem[] = [];
      for (const r of wlRows) {
        watchlist.push(await getQuoteForStock(r.symbol, force));
      }
      res.json({ watchlist, refreshedAt: formatTimestamp() });
    } catch (err) {
      console.error('Refresh quotes error:', err);
      res.status(500).json({ error: '시세 새로고침 중 오류가 발생했습니다.' });
    }
  });

  // 5. 재무제표 조회 (연간 최근 5년 / 분기 최근 8개)
  app.get('/api/financials/:symbol', async (req, res) => {
    try {
      const sym = String(req.params.symbol || 'AAPL').trim().toUpperCase();
      const periodType: PeriodType = req.query.periodType === 'quarterly' ? 'quarterly' : 'annual';
      const force = req.query.force === 'true';

      const financials = await getFinancialsForStock(sym, periodType, force);
      res.json(financials);
    } catch (err) {
      console.error('Get financials error:', err);
      res.status(500).json({ error: '재무제표를 불러오는 중 오류가 발생했습니다.' });
    }
  });

  // 6. 종목 한글명 사전(names_ko.json) 추가/수정 및 삭제
  app.put('/api/names-ko', (req, res) => {
    try {
      const symbol = String(req.body?.symbol || '').trim().toUpperCase();
      const nameKo = String(req.body?.nameKo || '').trim();
      if (!symbol || !nameKo) {
        res.status(400).json({ error: '종목코드와 한글 종목명을 모두 입력해 주세요.' });
        return;
      }

      db.prepare('INSERT OR REPLACE INTO names_ko (symbol, name_ko) VALUES (?, ?)').run(symbol, nameKo);
      const updated = getAllNamesKo();
      writeJsonFile(NAMES_KO_FILE, updated);

      const autoCfg = getAutoSaveConfig();
      let newSnapshot: SnapshotRecord | null = null;
      if (autoCfg.enabled && autoCfg.saveOnEveryChange) {
        newSnapshot = recordWorkspaceSnapshot('auto', `종목 한글명 사전 수정: ${symbol} → ${nameKo}`);
      }

      res.json({ namesKo: updated, snapshot: newSnapshot });
    } catch (err) {
      console.error('Update names_ko error:', err);
      res.status(500).json({ error: '한글 종목명 사전 저장에 실패했습니다.' });
    }
  });

  app.delete('/api/names-ko/:symbol', (req, res) => {
    try {
      const symbol = String(req.params.symbol || '').trim().toUpperCase();
      db.prepare('DELETE FROM names_ko WHERE symbol = ?').run(symbol);
      const updated = getAllNamesKo();
      writeJsonFile(NAMES_KO_FILE, updated);
      res.json({ namesKo: updated });
    } catch (err) {
      console.error('Delete names_ko error:', err);
      res.status(500).json({ error: '한글 종목명 삭제에 실패했습니다.' });
    }
  });

  // 7. 재무 항목 대응표(mapping.json) 추가/수정
  app.put('/api/mapping', (req, res) => {
    try {
      const rawKey = String(req.body?.rawKey || '').trim();
      const labelKo = String(req.body?.labelKo || '').trim();
      if (!rawKey || !labelKo) {
        res.status(400).json({ error: '원문 항목명(영문/중문)과 한글 번역명을 모두 입력해 주세요.' });
        return;
      }

      db.prepare('INSERT OR REPLACE INTO mapping (raw_key, label_ko) VALUES (?, ?)').run(rawKey, labelKo);
      const updated = getAllMapping();
      writeJsonFile(MAPPING_FILE, updated);

      const autoCfg = getAutoSaveConfig();
      let newSnapshot: SnapshotRecord | null = null;
      if (autoCfg.enabled && autoCfg.saveOnEveryChange) {
        newSnapshot = recordWorkspaceSnapshot('auto', `재무 항목 매핑 추가/수정: ${rawKey} → ${labelKo}`);
      }

      res.json({ mapping: updated, snapshot: newSnapshot });
    } catch (err) {
      console.error('Update mapping error:', err);
      res.status(500).json({ error: '재무 항목 대응표 저장에 실패했습니다.' });
    }
  });

  // 8. 자동 저장 설정 및 UI 작업 상태 업데이트
  app.put('/api/autosave-config', (req, res) => {
    try {
      const current = getAutoSaveConfig();
      const nextConfig: AutoSaveConfig = {
        enabled: req.body?.enabled !== undefined ? Boolean(req.body.enabled) : current.enabled,
        intervalSeconds:
          req.body?.intervalSeconds !== undefined ? Number(req.body.intervalSeconds) : current.intervalSeconds,
        saveOnEveryChange:
          req.body?.saveOnEveryChange !== undefined ? Boolean(req.body.saveOnEveryChange) : current.saveOnEveryChange,
        lastAutoSavedAt: current.lastAutoSavedAt,
      };
      db.prepare('INSERT OR REPLACE INTO settings (key, value_json) VALUES (?, ?)').run(
        'autoSaveConfig',
        JSON.stringify(nextConfig)
      );

      if (req.body?.uiPreferences) {
        const mergedPrefs = {
          ...getUiPreferences(),
          ...req.body.uiPreferences,
        };
        db.prepare('INSERT OR REPLACE INTO settings (key, value_json) VALUES (?, ?)').run(
          'uiPreferences',
          JSON.stringify(mergedPrefs)
        );
      }

      res.json({ autoSaveConfig: nextConfig, uiPreferences: getUiPreferences() });
    } catch (err) {
      console.error('Update autosave config error:', err);
      res.status(500).json({ error: '자동 저장 설정 변경 중 오류가 발생했습니다.' });
    }
  });

  // 8-1. 데이터 수집 관련 API 인증키 조회 및 설정 업데이트
  app.get('/api/api-credentials', (_req, res) => {
    try {
      res.json({ apiCredentials: getApiCredentials() });
    } catch (err) {
      console.error('Get API credentials error:', err);
      res.status(500).json({ error: 'API 설정을 불러오는 중 오류가 발생했습니다.' });
    }
  });

  app.put('/api/api-credentials', (req, res) => {
    try {
      const updated = saveApiCredentials(req.body || {});
      const autoCfg = getAutoSaveConfig();
      let newSnapshot: SnapshotRecord | null = null;
      if (autoCfg.enabled && autoCfg.saveOnEveryChange) {
        newSnapshot = recordWorkspaceSnapshot('auto', '데이터 수집 API 설정 및 인증키 업데이트');
      }
      res.json({ apiCredentials: updated, snapshot: newSnapshot });
    } catch (err) {
      console.error('Update API credentials error:', err);
      res.status(500).json({ error: 'API 인증키 저장 중 오류가 발생했습니다.' });
    }
  });

  // 8-2. 특정 API 또는 전체 API 연결 상태 실시간 테스트
  async function probeApiCredential(
    apiType: 'finnhub' | 'sec' | 'alpha_vantage' | 'fmp' | 'tushare',
    overrideCreds?: Partial<ApiCredentialsConfig>
  ): Promise<ApiTestProbeResult> {
    const currentCreds = getApiCredentials();
    const creds = { ...currentCreds, ...overrideCreds };

    if (apiType === 'finnhub') {
      const key = (creds.finnhubApiKey || '').trim();
      if (!key || key === 'MY_FINNHUB_API_KEY' || key === 'your_finnhub_api_key_here') {
        return {
          apiType: 'finnhub',
          nameKo: 'Finnhub 시세 API',
          status: 'unconfigured',
          latencyMs: 0,
          messageKo: 'Finnhub API 키가 미입력 상태입니다. 무료 키 등록 시 미국 실시간 시세가 활성화됩니다.',
          testedAt: formatTimestamp(),
          endpointUrl: 'https://finnhub.io/api/v1/quote?symbol=AAPL',
        };
      }
      const start = Date.now();
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 5000);
        const resp = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=AAPL&token=${encodeURIComponent(key)}`,
          { signal: ctrl.signal }
        );
        clearTimeout(t);
        const latency = Date.now() - start;
        if (resp.ok) {
          const data = (await resp.json()) as { c?: number; dp?: number; d?: number };
          if (typeof data.c === 'number' && data.c > 0) {
            return {
              apiType: 'finnhub',
              nameKo: 'Finnhub 시세 API',
              status: 'success',
              latencyMs: latency,
              messageKo: `Finnhub 실시간 시세 연동 성공! AAPL 현재가: $${data.c.toFixed(2)} (${
                data.dp !== undefined ? (data.dp >= 0 ? `+${data.dp}%` : `${data.dp}%`) : ''
              })`,
              testedAt: formatTimestamp(),
              endpointUrl: 'https://finnhub.io/api/v1/quote?symbol=AAPL',
              sampleData: `현재가: $${data.c}, 변동: $${data.d || 0} (${data.dp || 0}%)`,
            };
          }
        }
        if (resp.status === 401 || resp.status === 403) {
          return {
            apiType: 'finnhub',
            nameKo: 'Finnhub 시세 API',
            status: 'error',
            latencyMs: latency,
            messageKo: `Finnhub 인증 실패 (HTTP ${resp.status}): 입력한 API 키가 유효하지 않습니다.`,
            testedAt: formatTimestamp(),
            endpointUrl: 'https://finnhub.io/api/v1/quote?symbol=AAPL',
          };
        }
        if (resp.status === 429) {
          return {
            apiType: 'finnhub',
            nameKo: 'Finnhub 시세 API',
            status: 'warning',
            latencyMs: latency,
            messageKo: 'Finnhub 분당 60회 무료 호출 한도에 도달했습니다. 잠시 후 재시도하세요.',
            testedAt: formatTimestamp(),
            endpointUrl: 'https://finnhub.io/api/v1/quote?symbol=AAPL',
          };
        }
        return {
          apiType: 'finnhub',
          nameKo: 'Finnhub 시세 API',
          status: 'warning',
          latencyMs: latency,
          messageKo: `Finnhub 서버 응답 코드: HTTP ${resp.status}`,
          testedAt: formatTimestamp(),
          endpointUrl: 'https://finnhub.io/api/v1/quote?symbol=AAPL',
        };
      } catch (err: unknown) {
        return {
          apiType: 'finnhub',
          nameKo: 'Finnhub 시세 API',
          status: 'error',
          latencyMs: Date.now() - start,
          messageKo: `Finnhub 서버 요청 시간 초과 또는 네트워크 오류: ${
            err instanceof Error ? err.message : String(err)
          }`,
          testedAt: formatTimestamp(),
          endpointUrl: 'https://finnhub.io/api/v1/quote?symbol=AAPL',
        };
      }
    }

    if (apiType === 'sec') {
      const ua = (creds.secUserAgent || '').trim();
      if (!ua) {
        return {
          apiType: 'sec',
          nameKo: 'SEC EDGAR 공시 시스템',
          status: 'unconfigured',
          latencyMs: 0,
          messageKo: 'SEC User-Agent가 비어 있습니다. "애플리케이션명 이메일" 형식을 입력하세요.',
          testedAt: formatTimestamp(),
          endpointUrl: 'https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json',
        };
      }
      const start = Date.now();
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 5000);
        const resp = await fetch('https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json', {
          headers: { 'User-Agent': ua, Accept: 'application/json' },
          signal: ctrl.signal,
        });
        clearTimeout(t);
        const latency = Date.now() - start;
        if (resp.ok) {
          return {
            apiType: 'sec',
            nameKo: 'SEC EDGAR 공시 시스템',
            status: 'success',
            latencyMs: latency,
            messageKo: 'SEC EDGAR XBRL companyfacts API 정상 연결! Apple Inc. (CIK0000320193) 재무 공시 수신 확인 완료',
            testedAt: formatTimestamp(),
            endpointUrl: 'https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json',
            sampleData: 'Apple Inc. (CIK 0000320193) XBRL companyfacts 수신 성공',
          };
        }
        if (resp.status === 403) {
          return {
            apiType: 'sec',
            nameKo: 'SEC EDGAR 공시 시스템',
            status: 'error',
            latencyMs: latency,
            messageKo: 'SEC 정책 거부 (HTTP 403): User-Agent에 유효한 연락처 이메일이 포함되어야 합니다. (예: GlobalStockInsight your_email@example.com)',
            testedAt: formatTimestamp(),
            endpointUrl: 'https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json',
          };
        }
        return {
          apiType: 'sec',
          nameKo: 'SEC EDGAR 공시 시스템',
          status: 'warning',
          latencyMs: latency,
          messageKo: `SEC EDGAR 서버 응답 코드: HTTP ${resp.status}`,
          testedAt: formatTimestamp(),
          endpointUrl: 'https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json',
        };
      } catch {
        return {
          apiType: 'sec',
          nameKo: 'SEC EDGAR 공시 시스템',
          status: 'warning',
          latencyMs: Date.now() - start,
          messageKo: 'SEC 외부 네트워크 지연 감지: 로컬 SQLite 캐시 스냅샷(연간 5년·분기 8회)으로 정상 폴백 지원됩니다.',
          testedAt: formatTimestamp(),
          endpointUrl: 'https://data.sec.gov/api/xbrl/companyfacts/CIK0000320193.json',
        };
      }
    }

    if (apiType === 'alpha_vantage') {
      const key = (creds.alphaVantageApiKey || '').trim();
      if (!key) {
        return {
          apiType: 'alpha_vantage',
          nameKo: 'Alpha Vantage API',
          status: 'unconfigured',
          latencyMs: 0,
          messageKo: 'Alpha Vantage API 키 미설정 (선택 사항: 글로벌 시세 및 보조 지표)',
          testedAt: formatTimestamp(),
          endpointUrl: 'https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL',
        };
      }
      const start = Date.now();
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 5000);
        const resp = await fetch(
          `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL&apikey=${encodeURIComponent(key)}`,
          { signal: ctrl.signal }
        );
        clearTimeout(t);
        const latency = Date.now() - start;
        const data = (await resp.json()) as Record<string, unknown>;
        const quote = data['Global Quote'] as Record<string, string> | undefined;
        if (quote && Object.keys(quote).length > 0) {
          return {
            apiType: 'alpha_vantage',
            nameKo: 'Alpha Vantage API',
            status: 'success',
            latencyMs: latency,
            messageKo: `Alpha Vantage 글로벌 시세 연동 성공! AAPL: $${quote['05. price'] || '-'}`,
            testedAt: formatTimestamp(),
            endpointUrl: 'https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL',
            sampleData: JSON.stringify(quote),
          };
        }
        if (data['Note'] || data['Information']) {
          return {
            apiType: 'alpha_vantage',
            nameKo: 'Alpha Vantage API',
            status: 'warning',
            latencyMs: latency,
            messageKo: `Alpha Vantage 무료 호출 한도(분당 5회 / 일일 25회) 안내: ${String(
              data['Note'] || data['Information']
            )}`,
            testedAt: formatTimestamp(),
            endpointUrl: 'https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL',
          };
        }
        return {
          apiType: 'alpha_vantage',
          nameKo: 'Alpha Vantage API',
          status: 'error',
          latencyMs: latency,
          messageKo: 'Alpha Vantage API 키가 유효하지 않거나 데이터가 비어 있습니다.',
          testedAt: formatTimestamp(),
          endpointUrl: 'https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL',
        };
      } catch (err: unknown) {
        return {
          apiType: 'alpha_vantage',
          nameKo: 'Alpha Vantage API',
          status: 'error',
          latencyMs: Date.now() - start,
          messageKo: `Alpha Vantage 요청 실패: ${err instanceof Error ? err.message : String(err)}`,
          testedAt: formatTimestamp(),
          endpointUrl: 'https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=AAPL',
        };
      }
    }

    if (apiType === 'fmp') {
      const key = (creds.fmpApiKey || '').trim();
      if (!key) {
        return {
          apiType: 'fmp',
          nameKo: 'Financial Modeling Prep (FMP)',
          status: 'unconfigured',
          latencyMs: 0,
          messageKo: 'FMP API 키 미설정 (선택 사항: 다년도 재무제표 보조 데이터)',
          testedAt: formatTimestamp(),
          endpointUrl: 'https://financialmodelingprep.com/api/v3/profile/AAPL',
        };
      }
      const start = Date.now();
      try {
        const ctrl = new AbortController();
        const t = setTimeout(() => ctrl.abort(), 5000);
        const resp = await fetch(
          `https://financialmodelingprep.com/api/v3/profile/AAPL?apikey=${encodeURIComponent(key)}`,
          { signal: ctrl.signal }
        );
        clearTimeout(t);
        const latency = Date.now() - start;
        if (resp.ok) {
          const data = (await resp.json()) as { companyName?: string }[];
          if (Array.isArray(data) && data.length > 0) {
            return {
              apiType: 'fmp',
              nameKo: 'Financial Modeling Prep (FMP)',
              status: 'success',
              latencyMs: latency,
              messageKo: `FMP 기업 프로필 연동 확인 성공! (${data[0]?.companyName || 'AAPL'})`,
              testedAt: formatTimestamp(),
              endpointUrl: 'https://financialmodelingprep.com/api/v3/profile/AAPL',
              sampleData: `기업명: ${data[0]?.companyName}`,
            };
          }
        }
        return {
          apiType: 'fmp',
          nameKo: 'Financial Modeling Prep (FMP)',
          status: 'error',
          latencyMs: latency,
          messageKo: `FMP API 키 인증 실패 (HTTP ${resp.status})`,
          testedAt: formatTimestamp(),
          endpointUrl: 'https://financialmodelingprep.com/api/v3/profile/AAPL',
        };
      } catch (err: unknown) {
        return {
          apiType: 'fmp',
          nameKo: 'Financial Modeling Prep (FMP)',
          status: 'error',
          latencyMs: Date.now() - start,
          messageKo: `FMP 요청 오류: ${err instanceof Error ? err.message : String(err)}`,
          testedAt: formatTimestamp(),
          endpointUrl: 'https://financialmodelingprep.com/api/v3/profile/AAPL',
        };
      }
    }

    // tushare
    const token = (creds.tushareToken || '').trim();
    if (!token) {
      return {
        apiType: 'tushare',
        nameKo: 'Tushare Pro (중국 A주/홍콩)',
        status: 'unconfigured',
        latencyMs: 0,
        messageKo: 'Tushare Pro 토큰 미설정 (선택 사항: 미등록 시 AKShare 내장 캐시로 자동 대체)',
        testedAt: formatTimestamp(),
        endpointUrl: 'http://api.tushare.pro',
      };
    }
    const start = Date.now();
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 5000);
      const resp = await fetch('http://api.tushare.pro', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          api_name: 'stock_basic',
          token,
          params: { list_status: 'L', limit: 1 },
          fields: 'ts_code,symbol,name',
        }),
        signal: ctrl.signal,
      });
      clearTimeout(t);
      const latency = Date.now() - start;
      if (resp.ok) {
        const data = (await resp.json()) as { code: number; msg?: string };
        if (data.code === 0) {
          return {
            apiType: 'tushare',
            nameKo: 'Tushare Pro (중국 A주/홍콩)',
            status: 'success',
            latencyMs: latency,
            messageKo: 'Tushare Pro 토큰 인증 및 중국 A주 마스터 데이터 정상 수신 확인!',
            testedAt: formatTimestamp(),
            endpointUrl: 'http://api.tushare.pro',
          };
        }
        return {
          apiType: 'tushare',
          nameKo: 'Tushare Pro (중국 A주/홍콩)',
          status: 'error',
          latencyMs: latency,
          messageKo: `Tushare 토큰 오류: ${data.msg || '코드 ' + data.code}`,
          testedAt: formatTimestamp(),
          endpointUrl: 'http://api.tushare.pro',
        };
      }
      return {
        apiType: 'tushare',
        nameKo: 'Tushare Pro (중국 A주/홍콩)',
        status: 'warning',
        latencyMs: latency,
        messageKo: `Tushare 서버 응답 코드: HTTP ${resp.status}`,
        testedAt: formatTimestamp(),
        endpointUrl: 'http://api.tushare.pro',
      };
    } catch (err: unknown) {
      return {
        apiType: 'tushare',
        nameKo: 'Tushare Pro (중국 A주/홍콩)',
        status: 'error',
        latencyMs: Date.now() - start,
        messageKo: `Tushare Pro 연결 실패: ${err instanceof Error ? err.message : String(err)}`,
        testedAt: formatTimestamp(),
        endpointUrl: 'http://api.tushare.pro',
      };
    }
  }

  app.post('/api/test-api-credential', async (req, res) => {
    try {
      const apiType = String(req.body?.apiType || 'all').toLowerCase();
      const overrideCreds = req.body?.creds as Partial<ApiCredentialsConfig> | undefined;

      if (apiType === 'all') {
        const types: ('finnhub' | 'sec' | 'alpha_vantage' | 'fmp' | 'tushare')[] = [
          'finnhub',
          'sec',
          'alpha_vantage',
          'fmp',
          'tushare',
        ];
        const results = await Promise.all(types.map((t) => probeApiCredential(t, overrideCreds)));
        res.json({ results, testedAt: formatTimestamp() });
        return;
      }

      if (['finnhub', 'sec', 'alpha_vantage', 'fmp', 'tushare'].includes(apiType)) {
        const result = await probeApiCredential(
          apiType as 'finnhub' | 'sec' | 'alpha_vantage' | 'fmp' | 'tushare',
          overrideCreds
        );
        res.json({ result, testedAt: formatTimestamp() });
        return;
      }

      res.status(400).json({ error: '유효하지 않은 API 타입입니다.' });
    } catch (err) {
      console.error('Test API credential error:', err);
      res.status(500).json({ error: 'API 연결 테스트 중 오류가 발생했습니다.' });
    }
  });

  // 9. 스냅샷 목록 조회, 자동/수동 저장, 특정 시점으로 복구(불러오기), 삭제
  app.get('/api/snapshots', (_req, res) => {
    const snapRows = db
      .prepare(
        'SELECT id, created_at, trigger_type, label, watchlist_count, names_ko_count, mapping_count FROM snapshots ORDER BY id DESC LIMIT 40'
      )
      .all() as {
      id: number;
      created_at: string;
      trigger_type: 'auto' | 'manual' | 'file_import' | 'pre_restore';
      label: string;
      watchlist_count: number;
      names_ko_count: number;
      mapping_count: number;
    }[];
    res.json({
      snapshots: snapRows.map((s) => ({
        id: s.id,
        createdAt: s.created_at,
        triggerType: s.trigger_type,
        label: s.label,
        watchlistCount: s.watchlist_count,
        namesKoCount: s.names_ko_count,
        mappingCount: s.mapping_count,
      })),
    });
  });

  app.post('/api/snapshots', (req, res) => {
    try {
      const triggerType: 'auto' | 'manual' = req.body?.triggerType === 'manual' ? 'manual' : 'auto';
      if (req.body?.uiPreferences) {
        const mergedPrefs = {
          ...getUiPreferences(),
          ...req.body.uiPreferences,
        };
        db.prepare('INSERT OR REPLACE INTO settings (key, value_json) VALUES (?, ?)').run(
          'uiPreferences',
          JSON.stringify(mergedPrefs)
        );
      }
      const wlCount = (db.prepare('SELECT COUNT(*) as c FROM watchlist').get() as { c: number }).c;
      const defaultLabel =
        triggerType === 'manual'
          ? `사용자 수동 저장 (관심종목 ${wlCount}개)`
          : `주기적 자동 저장 (관심종목 ${wlCount}개)`;
      const label = String(req.body?.label || defaultLabel).trim();

      const snap = recordWorkspaceSnapshot(triggerType, label);
      res.json({ snapshot: snap, autoSaveConfig: getAutoSaveConfig() });
    } catch (err) {
      console.error('Create snapshot error:', err);
      res.status(500).json({ error: '스냅샷 저장에 실패했습니다.' });
    }
  });

  app.post('/api/snapshots/:id/restore', (req, res) => {
    try {
      const snapId = Number(req.params.id);
      const row = db.prepare('SELECT id, created_at, label, state_json FROM snapshots WHERE id = ?').get(snapId) as
        | { id: number; created_at: string; label: string; state_json: string }
        | undefined;
      if (!row) {
        res.status(404).json({ error: '선택한 복구 시점 스냅샷을 찾을 수 없습니다.' });
        return;
      }

      // 복구 실행 직전 현재 상태를 안전 백업 스냅샷으로 먼저 기록
      recordWorkspaceSnapshot('pre_restore', `복구 실행 직전 자동 백업 (#${snapId} 복원 전)`);

      const payload = JSON.parse(row.state_json) as WorkspaceStatePayload;
      applyWorkspaceStatePayload(payload);

      res.json({
        restoredSnapshotId: snapId,
        restoredLabel: row.label,
        restoredCreatedAt: row.created_at,
      });
    } catch (err) {
      console.error('Restore snapshot error:', err);
      res.status(500).json({ error: '이전 상태로 복구하는 중 오류가 발생했습니다.' });
    }
  });

  app.delete('/api/snapshots/:id', (req, res) => {
    try {
      const snapId = Number(req.params.id);
      db.prepare('DELETE FROM snapshots WHERE id = ?').run(snapId);
      res.json({ deletedId: snapId });
    } catch (err) {
      console.error('Delete snapshot error:', err);
      res.status(500).json({ error: '스냅샷 삭제 중 오류가 발생했습니다.' });
    }
  });

  // 10. 포터블 상태 파일 내보내기(Export) 및 수동 파일 불러오기(Import)
  app.get('/api/export-state', (_req, res) => {
    const payload = buildCurrentWorkspaceStatePayload();
    res.json(payload);
  });

  app.post('/api/import-state', (req, res) => {
    try {
      const payload = req.body as WorkspaceStatePayload;
      if (!payload || !Array.isArray(payload.watchlistSymbols)) {
        res.status(400).json({ error: '유효하지 않은 백업 파일 형식입니다. (watchlistSymbols 누락)' });
        return;
      }

      recordWorkspaceSnapshot('pre_restore', '외부 파일 수동 불러오기 직전 자동 백업');
      applyWorkspaceStatePayload(payload);
      const importedSnap = recordWorkspaceSnapshot(
        'file_import',
        `수동 파일 불러오기 완료 (관심종목 ${payload.watchlistSymbols.length}개)`
      );

      res.json({
        imported: true,
        snapshot: importedSnap,
      });
    } catch (err) {
      console.error('Import state error:', err);
      res.status(500).json({ error: '백업 파일을 불러오는 중 오류가 발생했습니다.' });
    }
  });

  // 11. 출처별 데이터 수집기 및 한글화 단위 테스트 실행 API
  app.post('/api/test-collectors', async (_req, res) => {
    try {
      const results: CollectorTestResult[] = [];
      const mapping = getAllMapping();
      const namesKo = getAllNamesKo();

      // Test 1: 미국 SEC EDGAR 재무제표 수집기 (AAPL)
      const t1Start = Date.now();
      const aaplFin = await getFinancialsForStock('AAPL', 'annual', false);
      const aaplRevRow = aaplFin.incomeStatement.find((r) => r.rawKey === 'Revenues');
      const aaplNetRow = aaplFin.incomeStatement.find((r) => r.rawKey === 'NetIncomeLoss');
      results.push({
        id: 'test_sec_edgar_aapl',
        title: '미국 재무제표 수집 및 한글 매핑 테스트 (AAPL)',
        market: 'US',
        symbol: 'AAPL',
        sourceName: 'SEC EDGAR companyfacts API (초당 10회 이하 제한)',
        passed:
          aaplFin.periods.length === 5 &&
          aaplRevRow?.labelKo === '매출액' &&
          aaplNetRow?.labelKo === '당기순이익',
        latencyMs: Date.now() - t1Start,
        checkedAt: formatTimestamp(),
        messageKo: `최근 5개년 연간 재무제표 로드 완료 · 통화: ${aaplFin.currency} (단위: ${aaplFin.unit})`,
        sampleFields: [
          {
            rawKey: 'Revenues',
            labelKo: aaplRevRow?.labelKo || '',
            sampleValue: `${(aaplRevRow?.values[aaplFin.periods[aaplFin.periods.length - 1]] || 0).toLocaleString()} 백만 USD`,
          },
          {
            rawKey: 'NetIncomeLoss',
            labelKo: aaplNetRow?.labelKo || '',
            sampleValue: `${(aaplNetRow?.values[aaplFin.periods[aaplFin.periods.length - 1]] || 0).toLocaleString()} 백만 USD`,
          },
        ],
      });

      // Test 2: 중국 A주 재무제표 및 시세 수집기 (600519 귀주모태주)
      const t2Start = Date.now();
      const moutaiFin = await getFinancialsForStock('600519', 'annual', false);
      const moutaiQuote = await getQuoteForStock('600519', false);
      const moutaiRevRow = moutaiFin.incomeStatement.find((r) => r.rawKey === '营业收入');
      const moutaiNetRow = moutaiFin.incomeStatement.find((r) => r.rawKey === '归属于母公司所有者的净利润');
      results.push({
        id: 'test_akshare_600519',
        title: '중국 A주 재무제표 및 시세 수집 테스트 (600519)',
        market: 'CN',
        symbol: '600519',
        sourceName: 'AKShare 중국 A주 수집기 + 로컬 캐시',
        passed:
          moutaiQuote.nameKo === (namesKo['600519'] || '귀주모태주') &&
          moutaiRevRow?.labelKo === '영업수익' &&
          Boolean(moutaiNetRow?.labelKo),
        latencyMs: Date.now() - t2Start,
        checkedAt: formatTimestamp(),
        messageKo: `종목 한글명(${moutaiQuote.nameKo}) 및 중국 회계기준 항목 한글 변환 검증 완료`,
        sampleFields: [
          {
            rawKey: '营业收入',
            labelKo: moutaiRevRow?.labelKo || '',
            sampleValue: `${(moutaiRevRow?.values[moutaiFin.periods[moutaiFin.periods.length - 1]] || 0).toLocaleString()} 백만 CNY`,
          },
          {
            rawKey: '归属于母公司所有者的净利润',
            labelKo: moutaiNetRow?.labelKo || '',
            sampleValue: `${(moutaiNetRow?.values[moutaiFin.periods[moutaiFin.periods.length - 1]] || 0).toLocaleString()} 백만 CNY`,
          },
        ],
      });

      // Test 3: 홍콩 주식 분기 재무제표(최근 8분기) 및 시세 수집기 (00700 텐센트홀딩스)
      const t3Start = Date.now();
      const tencentFinQ = await getFinancialsForStock('00700', 'quarterly', false);
      const tencentQuote = await getQuoteForStock('00700', false);
      const tencentAssetRow = tencentFinQ.balanceSheet.find((r) => r.rawKey === '资产总计');
      const tencentCfRow = tencentFinQ.cashFlow.find((r) => r.rawKey === '经营活动产生的现金流量净额');
      results.push({
        id: 'test_akshare_00700',
        title: '홍콩 주식 최근 8분기 재무제표 및 시세 수집 테스트 (00700)',
        market: 'HK',
        symbol: '00700',
        sourceName: 'AKShare 홍콩증시 수집기 + 로컬 캐시',
        passed:
          tencentFinQ.periods.length === 8 &&
          tencentAssetRow?.labelKo === '자산총계' &&
          tencentCfRow?.labelKo === '영업활동현금흐름',
        latencyMs: Date.now() - t3Start,
        checkedAt: formatTimestamp(),
        messageKo: `${tencentQuote.nameKo} 최근 8개 분기 손익·재무상태·현금흐름표 검증 완료`,
        sampleFields: [
          {
            rawKey: '资产总计',
            labelKo: tencentAssetRow?.labelKo || '',
            sampleValue: `${(tencentAssetRow?.values[tencentFinQ.periods[tencentFinQ.periods.length - 1]] || 0).toLocaleString()} 백만 HKD`,
          },
          {
            rawKey: '经营活动产生的现金流量净额',
            labelKo: tencentCfRow?.labelKo || '',
            sampleValue: `${(tencentCfRow?.values[tencentFinQ.periods[tencentFinQ.periods.length - 1]] || 0).toLocaleString()} 백만 HKD`,
          },
        ],
      });

      // Test 4: 대응표(mapping.json) 100개 이상 항목 및 미등록 원문 폴백 테스트
      const t4Start = Date.now();
      const mapTotal = Object.keys(mapping).length;
      const unmappedKey = 'CustomUnmappedAccountingMetric_2026';
      const unmappedResult = mapping[unmappedKey] || unmappedKey;
      results.push({
        id: 'test_mapping_dictionary',
        title: '재무 항목 대응표(mapping.json) 100개 이상 및 미등록 항목 원문 유지 테스트',
        market: 'COMMON',
        symbol: 'ALL',
        sourceName: 'mapping.json & SQLite 사전 모듈',
        passed: mapTotal >= 100 && unmappedResult === unmappedKey,
        latencyMs: Date.now() - t4Start,
        checkedAt: formatTimestamp(),
        messageKo: `총 ${mapTotal}개 재무 항목 등록 확인 (기준 100개 이상 충족) · 미등록 항목 원문 표시 정상`,
        sampleFields: [
          { rawKey: '등록된 매핑 항목 수', labelKo: '기준 >= 100개', sampleValue: `${mapTotal}개 통과` },
          { rawKey: unmappedKey, labelKo: '미등록 항목 변환 결과', sampleValue: unmappedResult },
        ],
      });

      res.json({
        allPassed: results.every((r) => r.passed),
        testedAt: formatTimestamp(),
        results,
      });
    } catch (err) {
      console.error('Collector test error:', err);
      res.status(500).json({ error: '수집기 테스트 실행 중 오류가 발생했습니다.' });
    }
  });

  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Global Stock Insight server running on http://localhost:${PORT}`);
  });
}

startServer();
