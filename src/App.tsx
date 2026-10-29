/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  BarChart3,
  BookOpen,
  Calendar,
  CheckCircle2,
  Clock,
  Database,
  Download,
  FileSpreadsheet,
  HelpCircle,
  History,
  LayoutGrid,
  LineChart,
  Moon,
  Plus,
  RefreshCw,
  RotateCcw,
  Save,
  Search,
  Settings2,
  Star,
  Sun,
  Trash2,
  TrendingUp,
  Upload,
  X,
} from 'lucide-react';
import { DataSettingsView } from './components/DataSettingsView.tsx';
import { FinancialStatementView } from './components/FinancialStatementView.tsx';
import { PerformanceChart } from './components/PerformanceChart.tsx';
import { TutorialHelpView } from './components/TutorialHelpView.tsx';
import { WatchlistAllocationPieChart } from './components/WatchlistAllocationPieChart.tsx';
import {
  AutoSaveConfig,
  MarketCode,
  SnapshotRecord,
  StockUniverseItem,
  WatchlistItem,
  WorkspaceStatePayload,
} from './types/stock.ts';

type ActiveMenu =
  | 'dashboard'
  | 'analysis'
  | 'search'
  | 'watchlist'
  | 'autosave'
  | 'settings'
  | 'tutorial';

interface EnrichedUniverseItem extends StockUniverseItem {
  nameKo: string;
  price: number;
  change: number;
  changePercent: number;
}

export default function App() {
  const [activeMenu, setActiveMenu] = useState<ActiveMenu>('dashboard');
  const [settingsSubTab, setSettingsSubTab] = useState<
    'autosave' | 'names_ko' | 'mapping' | 'tests' | 'python'
  >('names_ko');

  const [referenceDate, setReferenceDate] = useState<string>('2026-10-29');
  const [watchlist, setWatchlist] = useState<WatchlistItem[]>([]);
  const [universe, setUniverse] = useState<EnrichedUniverseItem[]>([]);
  const [namesKo, setNamesKo] = useState<Record<string, string>>({});
  const [mapping, setMapping] = useState<Record<string, string>>({});
  const [snapshots, setSnapshots] = useState<SnapshotRecord[]>([]);

  const [autoSaveConfig, setAutoSaveConfig] = useState<AutoSaveConfig>({
    enabled: true,
    intervalSeconds: 60,
    saveOnEveryChange: true,
    lastAutoSavedAt: null,
  });

  const [uiPreferences, setUiPreferences] = useState<
    WorkspaceStatePayload['uiPreferences']
  >({
    selectedSymbol: 'AAPL',
    chartRange: '3M',
    chartStartDate: '2026-07-23',
    chartEndDate: '2026-10-29',
    chartGranularity: 'daily',
    marketFilter: 'ALL',
    darkMode: false,
  });

  const [isDarkMode, setIsDarkMode] = useState<boolean>(() => {
    try {
      return localStorage.getItem('global_insight_theme') === 'dark';
    } catch {
      return false;
    }
  });

  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [bannerMessage, setBannerMessage] = useState<string | null>(null);

  // 상단 검색창 및 모달 상태
  const [headerSearch, setHeaderSearch] = useState<string>('');
  const [isAddModalOpen, setIsAddModalOpen] = useState<boolean>(false);
  const [addSymbolQuery, setAddSymbolQuery] = useState<string>('');
  const [addCustomNameKo, setAddCustomNameKo] = useState<string>('');
  const [isQuickHelpOpen, setIsQuickHelpOpen] = useState<boolean>(false);

  // 대시보드 하단 테이블 탭 ('watchlist' | 'universe')
  const [dashboardTableMode, setDashboardTableMode] = useState<'watchlist' | 'universe'>(
    'watchlist'
  );

  // 종목검색 화면 필터 상태
  const [searchPageQuery, setSearchPageQuery] = useState<string>('');
  const [searchMarketFilter, setSearchMarketFilter] = useState<'ALL' | MarketCode>('ALL');

  // 자동저장 카운트다운 타이머
  const [secondsUntilNextSave, setSecondsUntilNextSave] = useState<number | null>(60);
  const headerSearchInputRef = useRef<HTMLInputElement | null>(null);
  const quickImportInputRef = useRef<HTMLInputElement | null>(null);

  const showNotice = useCallback((msg: string) => {
    setBannerMessage(msg);
    setTimeout(() => {
      setBannerMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  }, []);

  const loadBootstrap = useCallback(async () => {
    try {
      const resp = await fetch('/api/bootstrap');
      if (!resp.ok) throw new Error('초기화 호출 실패');
      const data = await resp.json();
      setReferenceDate(data.referenceDate || '2026-10-29');
      setWatchlist(data.watchlist || []);
      setUniverse(data.universe || []);
      setNamesKo(data.namesKo || {});
      setMapping(data.mapping || {});
      if (data.autoSaveConfig) setAutoSaveConfig(data.autoSaveConfig);
      if (data.uiPreferences) {
        setUiPreferences(data.uiPreferences);
        if (typeof data.uiPreferences.darkMode === 'boolean') {
          setIsDarkMode(data.uiPreferences.darkMode);
        }
      }
      setSnapshots(data.snapshots || []);
    } catch (err) {
      console.error(err);
      showNotice('서버 연결 중 일시적 지연이 발생하여 로컬 캐시 상태를 확인합니다.');
    } finally {
      setLoading(false);
    }
  }, [showNotice]);

  useEffect(() => {
    loadBootstrap();
  }, [loadBootstrap]);

  // 다크 모드 클래스(html.dark) 및 로컬 스토리지 동기화
  useEffect(() => {
    const root = document.documentElement;
    if (isDarkMode) {
      root.classList.add('dark');
      localStorage.setItem('global_insight_theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('global_insight_theme', 'light');
    }
  }, [isDarkMode]);

  // Ctrl+K 단축키로 상단 검색창 포커스
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        headerSearchInputRef.current?.focus();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, []);

  // 스냅샷 생성 핸들러
  const handleCreateSnapshot = useCallback(
    async (triggerType: 'auto' | 'manual', label?: string) => {
      try {
        const resp = await fetch('/api/snapshots', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ triggerType, label, uiPreferences }),
        });
        if (resp.ok) {
          const data = await resp.json();
          if (data.autoSaveConfig) setAutoSaveConfig(data.autoSaveConfig);
          const listResp = await fetch('/api/snapshots');
          if (listResp.ok) {
            const listData = await listResp.json();
            setSnapshots(listData.snapshots || []);
          }
          // 브라우저 로컬 스토리지에도 최신 백업 미러링
          localStorage.setItem(
            'global_insight_last_autosave',
            JSON.stringify({
              savedAt: new Date().toISOString(),
              watchlistSymbols: watchlist.map((w) => w.symbol),
              namesKo,
              uiPreferences,
            })
          );
        }
      } catch (err) {
        console.error('Auto-save snapshot error:', err);
      }
    },
    [uiPreferences, watchlist, namesKo]
  );

  // 사용자 설정 간격(intervalSeconds) 기반 자동 저장 타이머
  useEffect(() => {
    if (!autoSaveConfig.enabled || autoSaveConfig.intervalSeconds <= 0) {
      setSecondsUntilNextSave(null);
      return;
    }

    setSecondsUntilNextSave(autoSaveConfig.intervalSeconds);
    const timer = setInterval(() => {
      setSecondsUntilNextSave((prev) => {
        if (prev === null || prev <= 1) {
          handleCreateSnapshot(
            'auto',
            `주기적 자동 저장 (${
              autoSaveConfig.intervalSeconds >= 60
                ? `${autoSaveConfig.intervalSeconds / 60}분`
                : `${autoSaveConfig.intervalSeconds}초`
            } 간격)`
          );
          return autoSaveConfig.intervalSeconds;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [autoSaveConfig.enabled, autoSaveConfig.intervalSeconds, handleCreateSnapshot]);

  // 관심종목 추가
  const handleAddWatchlist = async (symbolOrQuery: string, customKo?: string) => {
    const clean = symbolOrQuery.trim();
    if (!clean) return;
    try {
      const resp = await fetch('/api/watchlist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: clean, customNameKo: customKo }),
      });
      const data = await resp.json();
      if (!resp.ok) {
        showNotice(data.error || '종목 추가에 실패했습니다.');
        return;
      }
      await loadBootstrap();
      showNotice(
        `${data.item.nameKo} (${data.item.symbol}) 종목이 관심종목에 추가되고 로컬 SQLite에 저장되었습니다.`
      );
    } catch {
      showNotice('관심종목 추가 중 오류가 발생했습니다.');
    }
  };

  // 관심종목 삭제
  const handleDeleteWatchlist = async (symbol: string) => {
    try {
      const disp = namesKo[symbol] || symbol;
      const resp = await fetch(`/api/watchlist/${encodeURIComponent(symbol)}`, {
        method: 'DELETE',
      });
      if (resp.ok) {
        await loadBootstrap();
        showNotice(`${disp} (${symbol}) 종목이 관심종목에서 삭제되었습니다.`);
      }
    } catch {
      showNotice('관심종목 삭제 중 오류가 발생했습니다.');
    }
  };

  // 시세 새로고침
  const handleRefreshQuotes = async (force = true) => {
    setRefreshing(true);
    try {
      const resp = await fetch('/api/watchlist/refresh', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ force }),
      });
      if (resp.ok) {
        const data = await resp.json();
        setWatchlist(data.watchlist || []);
        showNotice(`시세 및 캐시 상태가 갱신되었습니다 (${data.refreshedAt}).`);
      }
    } finally {
      setRefreshing(false);
    }
  };

  // 한글 종목명 사전 수정/삭제
  const handleUpdateNameKo = async (symbol: string, nameKo: string) => {
    const resp = await fetch('/api/names-ko', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ symbol, nameKo }),
    });
    if (resp.ok) {
      await loadBootstrap();
      showNotice(`종목 한글명 사전(names_ko.json)에 '${symbol} → ${nameKo}' 항목이 반영되었습니다.`);
    }
  };

  const handleDeleteNameKo = async (symbol: string) => {
    const resp = await fetch(`/api/names-ko/${encodeURIComponent(symbol)}`, {
      method: 'DELETE',
    });
    if (resp.ok) {
      await loadBootstrap();
      showNotice(`종목 한글명 사전에서 '${symbol}' 항목이 삭제되었습니다.`);
    }
  };

  // 재무 매핑 사전 수정
  const handleUpdateMapping = async (rawKey: string, labelKo: string) => {
    const resp = await fetch('/api/mapping', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ rawKey, labelKo }),
    });
    if (resp.ok) {
      await loadBootstrap();
      showNotice(`재무 항목 대응표(mapping.json)에 '${rawKey} → ${labelKo}' 항목이 저장되었습니다.`);
    }
  };

  // 자동저장 설정 업데이트
  const handleUpdateAutoSaveConfig = async (next: Partial<AutoSaveConfig>) => {
    const resp = await fetch('/api/autosave-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...next, uiPreferences }),
    });
    if (resp.ok) {
      const data = await resp.json();
      setAutoSaveConfig(data.autoSaveConfig);
    }
  };

  // 차트 기간/단위 설정 업데이트
  const handleUpdateChartPrefs = async (
    prefs: Partial<WorkspaceStatePayload['uiPreferences']>
  ) => {
    const merged = { ...uiPreferences, ...prefs };
    setUiPreferences(merged);
    await fetch('/api/autosave-config', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ uiPreferences: merged }),
    });
  };

  // 낮/밤(라이트/다크) 모드 테마 전환 핸들러
  const handleToggleDarkMode = async () => {
    const nextDark = !isDarkMode;
    setIsDarkMode(nextDark);
    await handleUpdateChartPrefs({ darkMode: nextDark });
  };

  // 스냅샷 복구(불러오기)
  const handleRestoreSnapshot = async (id: number) => {
    const resp = await fetch(`/api/snapshots/${id}/restore`, { method: 'POST' });
    if (resp.ok) {
      await loadBootstrap();
      showNotice(`스냅샷 #${id} 시점의 관심종목 및 사전 상태로 복구되었습니다.`);
    }
  };

  const handleDeleteSnapshot = async (id: number) => {
    const resp = await fetch(`/api/snapshots/${id}`, { method: 'DELETE' });
    if (resp.ok) {
      setSnapshots((prev) => prev.filter((s) => s.id !== id));
    }
  };

  // 포터블 백업 파일 내보내기 (.json)
  const handleExportBackupFile = async () => {
    const resp = await fetch('/api/export-state');
    if (!resp.ok) return;
    const payload = await resp.json();
    const blob = new Blob([JSON.stringify(payload, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `global_insight_portable_backup_${referenceDate}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showNotice('현재 작업 상태가 포터블 백업 파일(.json)로 다운로드되었습니다.');
  };

  // 포터블 백업 파일 수동 불러오기 (.json)
  const handleImportBackupFile = async (payload: WorkspaceStatePayload) => {
    const resp = await fetch('/api/import-state', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (resp.ok) {
      await loadBootstrap();
      showNotice('선택한 백업 파일로부터 관심종목, 한글 사전, 매핑 및 설정을 모두 복구했습니다.');
    } else {
      showNotice('백업 파일을 불러오지 못했습니다. 파일 형식을 확인해 주세요.');
    }
  };

  // 엑셀(CSV) 관심종목 보고서 다운로드
  const handleExportWatchlistCsv = () => {
    const headers = [
      '순위',
      '종목코드',
      '종목명(한글)',
      '원문종목명',
      '시장',
      '통화',
      '현재가',
      '등락률(%)',
      '시가총액(백만)',
      '마지막수신시각',
    ];
    const rows = watchlist.map((w, i) =>
      [
        i + 1,
        w.symbol,
        `"${w.nameKo}"`,
        `"${w.nameOriginal}"`,
        w.market,
        w.currency,
        w.price,
        w.changePercent,
        w.marketCapMillions,
        `"${w.fetchedAt}"`,
      ].join(',')
    );
    const blob = new Blob(['\uFEFF' + [headers.join(','), ...rows].join('\n')], {
      type: 'text/csv;charset=utf-8;',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `관심종목_보고서_${referenceDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    showNotice('관심종목 시세 보고서(CSV)가 다운로드되었습니다.');
  };

  const openStockAnalysis = (symbol: string) => {
    handleUpdateChartPrefs({ selectedSymbol: symbol.toUpperCase() });
    setActiveMenu('analysis');
  };

  // 대시보드 통계 계산
  const stats = useMemo(() => {
    const usCount = universe.filter((u) => u.market === 'US').length;
    const cnCount = universe.filter((u) => u.market === 'CN').length;
    const hkCount = universe.filter((u) => u.market === 'HK').length;

    const upCount = universe.filter((u) => u.changePercent > 0).length;
    const downCount = universe.filter((u) => u.changePercent < 0).length;
    const flatCount = universe.filter((u) => u.changePercent === 0).length;
    const upRatio =
      universe.length > 0 ? ((upCount / universe.length) * 100).toFixed(1) : '0.0';

    const wlAvgChange =
      watchlist.length > 0
        ? (
            watchlist.reduce((acc, cur) => acc + cur.changePercent, 0) /
            watchlist.length
          ).toFixed(2)
        : '0.00';

    // 관심종목 USD 환산 합산 시가총액 (단위: 백만 USD 기준 추정, CNY≈0.14, HKD≈0.128)
    const fxToUsd: Record<string, number> = { USD: 1, CNY: 0.14, HKD: 0.128 };
    const totalWlCapUsdMillions = Math.round(
      watchlist.reduce(
        (acc, cur) => acc + cur.marketCapMillions * (fxToUsd[cur.currency] || 1),
        0
      )
    );

    return {
      totalUniverse: universe.length,
      usCount,
      cnCount,
      hkCount,
      upCount,
      downCount,
      flatCount,
      upRatio,
      wlCount: watchlist.length,
      wlAvgChange,
      totalWlCapUsdMillions,
    };
  }, [universe, watchlist]);

  const filteredUniverseForSearch = useMemo(() => {
    const q = searchPageQuery.trim().toLowerCase();
    return universe.filter((item) => {
      if (searchMarketFilter !== 'ALL' && item.market !== searchMarketFilter) {
        return false;
      }
      if (!q) return true;
      return (
        item.symbol.toLowerCase().includes(q) ||
        item.nameKo.toLowerCase().includes(q) ||
        item.nameOriginal.toLowerCase().includes(q) ||
        item.sectorKo.toLowerCase().includes(q)
      );
    });
  }, [universe, searchPageQuery, searchMarketFilter]);

  const menuHeaderMeta: Record<ActiveMenu, { title: string; subtitle: string }> = {
    dashboard: {
      title: '대시보드',
      subtitle: '미국 · 중국 A주 · 홍콩 3대 시장과 내 관심종목을 한눈에',
    },
    analysis: {
      title: '종목 분석 (재무제표)',
      subtitle: '손익계산서 · 재무상태표 · 현금흐름표 연간(최근 5년) 및 분기(최근 8개) 한글 조회',
    },
    search: {
      title: '종목검색',
      subtitle: '종목코드(AAPL, 600519, 00700 등) 또는 한글 이름으로 검색 및 관심종목 추가',
    },
    watchlist: {
      title: '즐겨찾기(관심종목) 관리',
      subtitle: '로컬 SQLite에 저장된 관심종목의 현재가, 등락률, 한글명 편집 및 삭제 관리',
    },
    autosave: {
      title: '자동 저장 · 이전 상태 복구',
      subtitle: '사용자 설정 저장 간격 관리, 수동 체크포인트 저장 및 이전 스냅샷/백업 파일 불러오기',
    },
    settings: {
      title: '데이터 · 설정',
      subtitle: '종목 한글명 사전(names_ko.json), 재무 대응표(mapping.json), 수집기 테스트 및 파이썬 포터블 패키지',
    },
    tutorial: {
      title: '튜토리얼 · 도움말',
      subtitle: '주요 기능 단계별 사용법, 화면 구성도(스크린샷), 대표 종목 실습 예시 및 FAQ',
    },
  };

  return (
    <div className="min-h-screen flex bg-[#F4F6F9] text-[#0F172A]">
      {/* 좌측 고정 다크 네이비 사이드바 (참고 사진 1_22ca6cb2.png 완벽 재현) */}
      <aside className="w-[235px] bg-[#111C2D] text-slate-200 flex flex-col justify-between shrink-0 select-none border-r border-[#1E293B]">
        <div>
          {/* 브랜드 헤더 */}
          <div className="px-4 py-4 flex items-center gap-3 border-b border-slate-800/80">
            <div className="w-8 h-8 rounded-lg bg-[#2E7D5B] flex items-center justify-center text-white shrink-0">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-[15px] font-bold text-white tracking-tight truncate">
                글로벌 인사이트
              </div>
              <div className="text-[10px] font-mono tracking-wider text-slate-400">
                GLOBAL INSIGHT
              </div>
            </div>
          </div>

          {/* 네비게이션 그룹 1: 분석 */}
          <div className="px-3 pt-4">
            <div className="px-2.5 pb-1.5 text-[11px] font-semibold text-slate-400">
              분석
            </div>
            <nav className="space-y-1">
              {[
                { key: 'dashboard' as const, label: '대시보드', icon: LayoutGrid },
                { key: 'analysis' as const, label: '종목 분석', icon: LineChart },
                { key: 'search' as const, label: '종목검색', icon: Search },
              ].map((item) => {
                const Icon = item.icon;
                const active = activeMenu === item.key;
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => setActiveMenu(item.key)}
                    className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium rounded-lg transition-colors ${
                      active
                        ? 'bg-[#1D352D] text-[#4ADE80] font-semibold'
                        : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span className="truncate">{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* 네비게이션 그룹 2: 내 종목 */}
          <div className="px-3 pt-5">
            <div className="px-2.5 pb-1.5 text-[11px] font-semibold text-slate-400">
              내 종목
            </div>
            <nav className="space-y-1">
              <button
                type="button"
                onClick={() => setActiveMenu('watchlist')}
                className={`w-full flex items-center justify-between px-3 py-2 text-[13px] font-medium rounded-lg transition-colors ${
                  activeMenu === 'watchlist'
                    ? 'bg-[#1D352D] text-[#4ADE80] font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                <span className="flex items-center gap-2.5 truncate">
                  <Star className="w-4 h-4 shrink-0" />
                  <span className="truncate">즐겨찾기 관리</span>
                </span>
                <span className="text-[11px] font-mono tabular-nums px-1.5 py-0.5 rounded bg-slate-800 text-slate-300">
                  {watchlist.length}
                </span>
              </button>
            </nav>
          </div>

          {/* 네비게이션 그룹 3: 시스템 & 도움말 */}
          <div className="px-3 pt-5">
            <div className="px-2.5 pb-1.5 text-[11px] font-semibold text-slate-400">
              시스템
            </div>
            <nav className="space-y-1">
              <button
                type="button"
                onClick={() => setActiveMenu('autosave')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium rounded-lg transition-colors ${
                  activeMenu === 'autosave'
                    ? 'bg-[#1D352D] text-[#4ADE80] font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                <History className="w-4 h-4 shrink-0" />
                <span className="truncate">자동저장 · 복구</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setSettingsSubTab('names_ko');
                  setActiveMenu('settings');
                }}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium rounded-lg transition-colors ${
                  activeMenu === 'settings'
                    ? 'bg-[#1D352D] text-[#4ADE80] font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                <Settings2 className="w-4 h-4 shrink-0" />
                <span className="truncate">데이터 · 설정</span>
              </button>

              <button
                type="button"
                onClick={() => setActiveMenu('tutorial')}
                className={`w-full flex items-center gap-2.5 px-3 py-2 text-[13px] font-medium rounded-lg transition-colors ${
                  activeMenu === 'tutorial'
                    ? 'bg-[#1D352D] text-[#4ADE80] font-semibold'
                    : 'text-slate-300 hover:bg-slate-800/70 hover:text-white'
                }`}
              >
                <BookOpen className="w-4 h-4 shrink-0" />
                <span className="truncate">튜토리얼 · 도움말</span>
              </button>
            </nav>
          </div>
        </div>

        {/* 사이드바 하단: 실시간 자동저장 상태 및 빠른 수동 저장/복구 */}
        <div className="p-3.5 border-t border-slate-800/80 space-y-2.5 text-xs">
          <div className="bg-[#17243A] rounded-lg p-2.5 space-y-1.5 border border-slate-800">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-slate-300 font-semibold flex items-center gap-1">
                <Clock className="w-3 h-3 text-[#4ADE80]" />
                {autoSaveConfig.enabled ? '자동 저장 켜짐' : '자동 저장 꺼짐'}
              </span>
              {autoSaveConfig.enabled && secondsUntilNextSave !== null && (
                <span className="font-mono tabular-nums text-[#4ADE80]">
                  {secondsUntilNextSave}s
                </span>
              )}
            </div>
            <div className="text-[10px] text-slate-400 font-mono tabular-nums truncate">
              최근: {autoSaveConfig.lastAutoSavedAt?.slice(11) || '-'} (
              {autoSaveConfig.intervalSeconds >= 60
                ? `${autoSaveConfig.intervalSeconds / 60}분 주기`
                : `${autoSaveConfig.intervalSeconds}초 주기`}
              )
            </div>
            <div className="grid grid-cols-2 gap-1.5 pt-1">
              <button
                type="button"
                onClick={() => handleCreateSnapshot('manual', '사이드바 빠른 수동 저장')}
                className="px-2 py-1 text-[11px] font-semibold bg-[#2E7D5B] hover:bg-[#25664A] text-white rounded transition-colors"
              >
                지금 저장
              </button>
              <button
                type="button"
                onClick={() => setActiveMenu('autosave')}
                className="px-2 py-1 text-[11px] font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded transition-colors"
              >
                상태 복구
              </button>
            </div>
          </div>

          <div className="px-1 space-y-1">
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>개인용 포터블</span>
              <span className="font-mono text-[#4ADE80]">v1.6.2</span>
            </div>
            <p className="text-[10px] text-slate-500 leading-snug">
              정보 제공용이며 투자 권유가 아닙니다. 데이터 오류·지연 가능성을 확인하세요.
            </p>
          </div>
        </div>
      </aside>

      {/* 우측 메인 워크스페이스 영역 */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* 상단 헤더 바 (참고 사진과 동일한 배치) */}
        <header className="bg-white border-b border-[#E2E8F0] px-6 py-3.5 flex flex-wrap items-center justify-between gap-4">
          <div>
            <h1 className="text-lg font-bold text-[#0F172A] tracking-tight">
              {menuHeaderMeta[activeMenu].title}
            </h1>
            <p className="text-xs text-[#64748B]">
              {menuHeaderMeta[activeMenu].subtitle}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* 빠른 종목 검색창 (Ctrl+K) */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                if (!headerSearch.trim()) return;
                const q = headerSearch.trim();
                setSearchPageQuery(q);
                setActiveMenu('search');
              }}
              className="relative"
            >
              <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                ref={headerSearchInputRef}
                type="text"
                value={headerSearch}
                onChange={(e) => setHeaderSearch(e.target.value)}
                placeholder="종목명·코드 검색 (Ctrl+K)"
                className="pl-8 pr-3 py-1.5 text-xs bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg w-48 sm:w-56 text-[#0F172A] placeholder:text-[#94A3B8] focus:bg-white focus:outline-none focus:border-[#2E7D5B]"
              />
            </form>

            {/* 기준일 표시 */}
            <div className="hidden md:flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#475569] bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg tabular-nums whitespace-nowrap">
              <Calendar className="w-3.5 h-3.5 text-[#64748B]" />
              <span>기준일 {referenceDate}</span>
            </div>

            {/* 자동 저장 상태 빠른 열기 버튼 */}
            <button
              type="button"
              onClick={() => setActiveMenu('autosave')}
              title="자동 저장 간격 설정 및 이전 상태 수동 복구"
              className="hidden lg:inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1E293B] bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-[#F1F5F9] rounded-lg transition-colors tabular-nums whitespace-nowrap shrink-0"
            >
              <History className="w-3.5 h-3.5 text-[#2E7D5B]" />
              <span>
                자동저장 ({autoSaveConfig.intervalSeconds >= 60 ? `${autoSaveConfig.intervalSeconds / 60}분` : `${autoSaveConfig.intervalSeconds}초`})
              </span>
            </button>

            {/* + 종목 추가 에메랄드 그린 버튼 */}
            <button
              type="button"
              onClick={() => setIsAddModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#2E7D5B] hover:bg-[#25664A] rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>종목 추가</span>
            </button>

            {/* 새로고침 버튼 */}
            <button
              type="button"
              onClick={() => handleRefreshQuotes(true)}
              disabled={refreshing}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#334155] bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] rounded-lg transition-colors whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${refreshing ? 'animate-spin' : ''}`} />
              <span>새로고침</span>
            </button>

            {/* 낮/밤(라이트/다크) 모드 테마 전환 토글 버튼 */}
            <button
              type="button"
              onClick={handleToggleDarkMode}
              title={isDarkMode ? '라이트(낮) 모드로 전환' : '다크(밤) 모드로 전환'}
              aria-label={isDarkMode ? '라이트 모드로 전환' : '다크 모드로 전환'}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg border transition-colors whitespace-nowrap shrink-0 ${
                isDarkMode
                  ? 'bg-[#1E293B] text-amber-300 border-[#334155] hover:bg-[#334155]'
                  : 'bg-white text-[#334155] border-[#E2E8F0] hover:bg-[#F8FAFC]'
              }`}
            >
              {isDarkMode ? (
                <>
                  <Sun className="w-3.5 h-3.5 text-amber-400" />
                  <span>라이트 모드</span>
                </>
              ) : (
                <>
                  <Moon className="w-3.5 h-3.5 text-[#475569]" />
                  <span>다크 모드</span>
                </>
              )}
            </button>

            {/* ? 도움말 빠른 버튼 */}
            <button
              type="button"
              onClick={() => setIsQuickHelpOpen(true)}
              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-[#334155] bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] rounded-lg transition-colors whitespace-nowrap shrink-0"
              title="주요 기능 사용법 및 도움말 열기"
            >
              <HelpCircle className="w-3.5 h-3.5 text-[#2E7D5B]" />
              <span>도움말</span>
            </button>
          </div>
        </header>

        {/* 상단 알림 토스트 배너 */}
        {bannerMessage && (
          <div className="mx-6 mt-4 bg-[#F0FDF4] border border-[#BBF7D0] text-[#166534] px-4 py-2.5 rounded-xl text-xs font-medium flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
              <span>{bannerMessage}</span>
            </div>
            <button
              type="button"
              onClick={() => setBannerMessage(null)}
              className="text-xs text-[#166534] hover:underline"
            >
              닫기
            </button>
          </div>
        )}

        {/* 본문 콘텐츠 뷰포트 */}
        <main className="flex-1 p-6 space-y-5 max-w-[1600px] w-full mx-auto">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((n) => (
                <div
                  key={n}
                  className="h-28 bg-white border border-[#E2E8F0] rounded-xl p-5 animate-pulse"
                />
              ))}
            </div>
          ) : (
            <>
              {/* ==================== 1. 대시보드 화면 ==================== */}
              {activeMenu === 'dashboard' && (
                <>
                  {/* 상단 4열 핵심 요약 KPI 카드 (참고 사진과 동일한 구조) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
                    {/* 카드 1: 글로벌 유니버스 */}
                    <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 flex items-start justify-between">
                      <div>
                        <div className="text-xs font-medium text-[#64748B]">
                          글로벌 유니버스 (US·CN·HK)
                        </div>
                        <div className="text-2xl font-bold text-[#0F172A] mt-2 font-mono tabular-nums">
                          {stats.totalUniverse}
                        </div>
                        <div className="text-xs text-[#64748B] mt-1.5 tabular-nums">
                          미국 {stats.usCount} · 중국A주 {stats.cnCount} · 홍콩 {stats.hkCount}
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-[#F0FDF4] text-[#2E7D5B] flex items-center justify-center shrink-0">
                        <Database className="w-4 h-4" />
                      </div>
                    </div>

                    {/* 카드 2: 상승 / 하락 */}
                    <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 flex items-start justify-between">
                      <div>
                        <div className="text-xs font-medium text-[#64748B]">
                          상승 / 하락
                        </div>
                        <div className="text-2xl font-bold mt-2 font-mono tabular-nums flex items-baseline gap-1.5">
                          <span className="text-[#E11D48]">{stats.upCount}</span>
                          <span className="text-[#CBD5E1] text-lg font-normal">/</span>
                          <span className="text-[#2563EB]">{stats.downCount}</span>
                        </div>
                        <div className="text-xs text-[#64748B] mt-1.5 tabular-nums">
                          보합 {stats.flatCount}개 · 상승 비율 {stats.upRatio}%
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-rose-50 text-[#E11D48] flex items-center justify-center shrink-0">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                    </div>

                    {/* 카드 3: 관심종목 */}
                    <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 flex items-start justify-between">
                      <div>
                        <div className="text-xs font-medium text-[#64748B]">
                          관심종목 (로컬 SQLite)
                        </div>
                        <div className="text-2xl font-bold text-[#0F172A] mt-2 font-mono tabular-nums">
                          {stats.wlCount}
                        </div>
                        <div className="text-xs text-[#64748B] mt-1.5 tabular-nums">
                          평균 당일 등락률{' '}
                          <span
                            className={
                              Number(stats.wlAvgChange) >= 0
                                ? 'text-[#E11D48] font-semibold'
                                : 'text-[#2563EB] font-semibold'
                            }
                          >
                            {Number(stats.wlAvgChange) >= 0
                              ? `+${stats.wlAvgChange}%`
                              : `${stats.wlAvgChange}%`}
                          </span>
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-amber-50 text-amber-600 flex items-center justify-center shrink-0">
                        <Star className="w-4 h-4" />
                      </div>
                    </div>

                    {/* 카드 4: 관심종목 합산 시가총액 */}
                    <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 flex items-start justify-between">
                      <div>
                        <div className="text-xs font-medium text-[#64748B]">
                          관심종목 시가총액 합산
                        </div>
                        <div className="text-2xl font-bold text-[#0F172A] mt-2 font-mono tabular-nums">
                          {stats.totalWlCapUsdMillions.toLocaleString()}
                          <span className="text-xs font-normal text-[#64748B] ml-1">
                            백만 USD
                          </span>
                        </div>
                        <div className="text-xs text-[#64748B] mt-1.5">
                          각 종목 통화(USD·CNY·HKD) 백만 단위 지원
                        </div>
                      </div>
                      <div className="w-8 h-8 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                        <BarChart3 className="w-4 h-4" />
                      </div>
                    </div>
                  </div>

                  {/* 중앙 8:4 분할 영역: 좌측 관심종목 흐름 멀티라인 차트 + 우측 시장 온도 & 빠른 작업 */}
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-stretch">
                    <div className="lg:col-span-9 flex flex-col">
                      <PerformanceChart
                        watchlist={watchlist}
                        chartRange={uiPreferences.chartRange}
                        chartStartDate={uiPreferences.chartStartDate}
                        chartEndDate={uiPreferences.chartEndDate}
                        chartGranularity={uiPreferences.chartGranularity}
                        isDarkMode={isDarkMode}
                        onUpdateChartPrefs={handleUpdateChartPrefs}
                        onSelectStockForAnalysis={openStockAnalysis}
                      />
                    </div>

                    <div className="lg:col-span-3 flex flex-col justify-between gap-4">
                      {/* 우측 상단 카드: 시장 온도 */}
                      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-3">
                        <div>
                          <h3 className="text-[15px] font-bold text-[#0F172A]">시장 온도</h3>
                          <p className="text-xs text-[#64748B]">
                            미국 · 중국 A주 · 홍콩 등락 분포
                          </p>
                        </div>

                        {/* 적색 / 회색 / 청색 분포 프로그레스 바 */}
                        <div className="w-full h-2.5 rounded-full bg-[#F1F5F9] overflow-hidden flex">
                          <div
                            style={{
                              width: `${(stats.upCount / Math.max(stats.totalUniverse, 1)) * 100}%`,
                            }}
                            className="bg-[#E11D48] h-full"
                          />
                          <div
                            style={{
                              width: `${(stats.flatCount / Math.max(stats.totalUniverse, 1)) * 100}%`,
                            }}
                            className="bg-[#94A3B8] h-full"
                          />
                          <div
                            style={{
                              width: `${(stats.downCount / Math.max(stats.totalUniverse, 1)) * 100}%`,
                            }}
                            className="bg-[#2563EB] h-full"
                          />
                        </div>

                        <div className="space-y-1.5 text-xs pt-1">
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-[#475569]">
                              <span className="w-2 h-2 rounded-full bg-[#E11D48]" />
                              상승
                            </span>
                            <span className="font-mono font-bold tabular-nums text-[#E11D48]">
                              {stats.upCount}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-[#475569]">
                              <span className="w-2 h-2 rounded-full bg-[#94A3B8]" />
                              보합
                            </span>
                            <span className="font-mono font-bold tabular-nums text-[#334155]">
                              {stats.flatCount}
                            </span>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="flex items-center gap-2 text-[#475569]">
                              <span className="w-2 h-2 rounded-full bg-[#2563EB]" />
                              하락
                            </span>
                            <span className="font-mono font-bold tabular-nums text-[#2563EB]">
                              {stats.downCount}
                            </span>
                          </div>
                        </div>

                        <div className="text-[11px] text-[#64748B] pt-2 border-t border-[#F1F5F9] tabular-nums">
                          상승 {stats.upCount}개 ({stats.upRatio}%) · 하락 {stats.downCount}개
                        </div>
                      </div>

                      {/* 우측 하단 카드: 빠른 작업 (참고 사진과 동일한 버튼 구성 + 복구/도움말 연동) */}
                      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-3 flex-1 flex flex-col justify-between">
                        <div>
                          <h3 className="text-[15px] font-bold text-[#0F172A]">빠른 작업</h3>
                          <p className="text-xs text-[#64748B]">
                            자주 쓰는 기능을 바로 실행
                          </p>
                        </div>

                        <div className="space-y-2">
                          <button
                            type="button"
                            onClick={() => setIsAddModalOpen(true)}
                            className="w-full py-2 px-3 text-xs font-semibold text-white bg-[#2E7D5B] hover:bg-[#25664A] rounded-lg transition-colors flex items-center justify-center gap-1.5"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>종목 추가 (AAPL, 600519, 00700)</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setActiveMenu('search')}
                            className="w-full py-2 px-3 text-xs font-medium text-[#1E293B] bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] rounded-lg transition-colors flex items-center gap-2"
                          >
                            <Search className="w-3.5 h-3.5 text-[#64748B]" />
                            <span>종목검색 열기</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setActiveMenu('watchlist')}
                            className="w-full py-2 px-3 text-xs font-medium text-[#1E293B] bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] rounded-lg transition-colors flex items-center gap-2"
                          >
                            <LineChart className="w-3.5 h-3.5 text-[#64748B]" />
                            <span>관심종목 관리</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => setActiveMenu('autosave')}
                            className="w-full py-2 px-3 text-xs font-medium text-[#1E293B] bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] rounded-lg transition-colors flex items-center gap-2"
                          >
                            <RotateCcw className="w-3.5 h-3.5 text-[#2E7D5B]" />
                            <span>자동저장 및 이전 상태 복구</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleExportWatchlistCsv}
                            className="w-full py-2 px-3 text-xs font-medium text-[#1E293B] bg-white border border-[#E2E8F0] hover:bg-[#F8FAFC] rounded-lg transition-colors flex items-center gap-2"
                          >
                            <FileSpreadsheet className="w-3.5 h-3.5 text-[#64748B]" />
                            <span>엑셀(CSV) 보고서</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 관심종목 시장별(미국/중국A주/홍콩) 및 섹터별 비중 파이 차트 */}
                  <WatchlistAllocationPieChart
                    watchlist={watchlist}
                    namesKo={namesKo}
                    isDarkMode={isDarkMode}
                    onSelectStockForAnalysis={openStockAnalysis}
                    onOpenAddModal={() => setIsAddModalOpen(true)}
                  />

                  {/* 하단 종목 테이블 (내 관심종목 / 시가총액 상위 유니버스 전환 가능) */}
                  <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
                    <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
                      <div>
                        <h2 className="text-[16px] font-bold text-[#0F172A]">
                          {dashboardTableMode === 'watchlist'
                            ? '내 관심종목 시세 및 재무제표 바로가기'
                            : '글로벌 시가총액 상위 종목 (미국 · 중국 A주 · 홍콩)'}
                        </h2>
                        <p className="text-xs text-[#64748B] mt-0.5">
                          종목명을 클릭하면 연간(5년)·분기(8개) 한글 재무제표 화면으로 이동합니다. (단위: 백만 · 원래 통화 표시)
                        </p>
                      </div>

                      <div className="flex items-center gap-2">
                        <div className="flex items-center bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-0.5">
                          <button
                            type="button"
                            onClick={() => setDashboardTableMode('watchlist')}
                            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                              dashboardTableMode === 'watchlist'
                                ? 'bg-white text-[#0F172A] border border-[#CBD5E1]'
                                : 'text-[#64748B] hover:text-[#0F172A]'
                            }`}
                          >
                            내 관심종목 ({watchlist.length})
                          </button>
                          <button
                            type="button"
                            onClick={() => setDashboardTableMode('universe')}
                            className={`px-3 py-1 text-xs font-semibold rounded-md transition-colors ${
                              dashboardTableMode === 'universe'
                                ? 'bg-white text-[#0F172A] border border-[#CBD5E1]'
                                : 'text-[#64748B] hover:text-[#0F172A]'
                            }`}
                          >
                            3대 시장 대표 종목 ({universe.length})
                          </button>
                        </div>

                        <button
                          type="button"
                          onClick={() => setActiveMenu('search')}
                          className="text-xs font-semibold text-[#2E7D5B] hover:underline px-2"
                        >
                          종목검색
                        </button>
                      </div>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-[#E2E8F0] text-xs font-medium text-[#64748B]">
                            <th className="py-2.5 px-3 w-10 text-center">#</th>
                            <th className="py-2.5 px-3">종목명 (한글명 우선 · 종목코드)</th>
                            <th className="py-2.5 px-3">시장 · 통화</th>
                            <th className="py-2.5 px-3 text-right">현재가</th>
                            <th className="py-2.5 px-3 text-right">등락률</th>
                            <th className="py-2.5 px-3 text-right">시가총액 (단위: 백만)</th>
                            <th className="py-2.5 px-3 text-right">관리 / 재무제표</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#F1F5F9] text-[13px]">
                          {(dashboardTableMode === 'watchlist' ? watchlist : universe).map(
                            (row, idx) => {
                              const isPositive = row.changePercent > 0;
                              const isNegative = row.changePercent < 0;
                              const inWl = watchlist.some(
                                (w) => w.symbol.toUpperCase() === row.symbol.toUpperCase()
                              );

                              return (
                                <tr
                                  key={row.symbol}
                                  className="hover:bg-[#F8FAFC] transition-colors"
                                >
                                  <td className="py-3 px-3 text-center font-mono tabular-nums text-xs text-[#64748B]">
                                    {idx + 1}
                                  </td>
                                  <td className="py-3 px-3">
                                    <button
                                      type="button"
                                      onClick={() => openStockAnalysis(row.symbol)}
                                      className="inline-flex items-center gap-2 text-left group cursor-pointer"
                                    >
                                      <span className="font-bold text-[#0F172A] group-hover:text-[#2E7D5B] transition-colors">
                                        {namesKo[row.symbol] || row.nameKo}
                                      </span>
                                      <span className="font-mono text-xs text-[#64748B]">
                                        {row.symbol}
                                      </span>
                                    </button>
                                  </td>
                                  <td className="py-3 px-3 text-xs text-[#475569]">
                                    {row.market === 'US'
                                      ? '미국'
                                      : row.market === 'CN'
                                      ? '중국 A주'
                                      : '홍콩'}{' '}
                                    · {row.currency}
                                  </td>
                                  <td className="py-3 px-3 text-right font-mono tabular-nums font-semibold text-[#0F172A]">
                                    {row.price.toLocaleString('ko-KR', {
                                      minimumFractionDigits: 2,
                                      maximumFractionDigits: 2,
                                    })}{' '}
                                    <span className="text-[11px] font-normal text-[#64748B]">
                                      {row.currency}
                                    </span>
                                  </td>
                                  <td
                                    className={`py-3 px-3 text-right font-mono tabular-nums font-semibold ${
                                      isPositive
                                        ? 'text-[#E11D48]'
                                        : isNegative
                                        ? 'text-[#2563EB]'
                                        : 'text-[#64748B]'
                                    }`}
                                  >
                                    {isPositive
                                      ? `+${row.changePercent.toFixed(2)}%`
                                      : `${row.changePercent.toFixed(2)}%`}
                                  </td>
                                  <td className="py-3 px-3 text-right font-mono tabular-nums text-[#0F172A]">
                                    {row.marketCapMillions.toLocaleString('ko-KR')}
                                  </td>
                                  <td className="py-3 px-3 text-right whitespace-nowrap">
                                    <div className="inline-flex items-center gap-1.5">
                                      <button
                                        type="button"
                                        onClick={() => openStockAnalysis(row.symbol)}
                                        className="px-2.5 py-1 text-xs font-semibold text-[#2E7D5B] bg-[#F0FDF4] hover:bg-[#DCFCE7] rounded-md transition-colors"
                                      >
                                        재무제표
                                      </button>
                                      {inWl ? (
                                        <button
                                          type="button"
                                          onClick={() => handleDeleteWatchlist(row.symbol)}
                                          title="관심종목에서 삭제"
                                          className="p-1 text-[#94A3B8] hover:text-rose-600 rounded transition-colors"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      ) : (
                                        <button
                                          type="button"
                                          onClick={() => handleAddWatchlist(row.symbol)}
                                          className="px-2 py-1 text-xs font-medium text-[#0F172A] bg-[#F8FAFC] border border-[#CBD5E1] hover:bg-[#F1F5F9] rounded-md"
                                        >
                                          + 추가
                                        </button>
                                      )}
                                    </div>
                                  </td>
                                </tr>
                              );
                            }
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              )}

              {/* ==================== 2. 종목 분석 (한글 재무제표) 화면 ==================== */}
              {activeMenu === 'analysis' && (
                <FinancialStatementView
                  selectedSymbol={uiPreferences.selectedSymbol}
                  watchlist={watchlist}
                  namesKo={namesKo}
                  onSelectSymbol={(sym) =>
                    handleUpdateChartPrefs({ selectedSymbol: sym.toUpperCase() })
                  }
                  onAddWatchlist={handleAddWatchlist}
                  onUpdateMapping={handleUpdateMapping}
                  onUpdateNameKo={handleUpdateNameKo}
                />
              )}

              {/* ==================== 3. 종목검색 화면 ==================== */}
              {activeMenu === 'search' && (
                <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base font-bold text-[#0F172A]">
                        해외주식 종목 검색 및 직접 추가 (미국 · 중국 A주 · 홍콩)
                      </h2>
                      <p className="text-xs text-[#64748B] mt-0.5">
                        AAPL(미국), 600519(중국 A주), 00700(홍콩) 등 종목코드나 한글명으로 검색하여 관심종목에 추가하거나 재무제표를 바로 조회합니다.
                      </p>
                    </div>
                  </div>

                  {/* 검색창 및 직접 추가 바 */}
                  <div className="grid grid-cols-1 md:grid-cols-12 gap-2.5 bg-[#F8FAFC] p-3.5 rounded-xl border border-[#E2E8F0]">
                    <div className="md:col-span-6 relative">
                      <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        value={searchPageQuery}
                        onChange={(e) => setSearchPageQuery(e.target.value)}
                        placeholder="종목코드 또는 한글명 입력 (예: AAPL, 600519, 00700, 애플, 귀주모태주, 텐센트)"
                        className="w-full pl-9 pr-3 py-2 text-xs bg-white border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#2E7D5B]"
                      />
                    </div>

                    <div className="md:col-span-4 flex items-center gap-1">
                      {(['ALL', 'US', 'CN', 'HK'] as const).map((mk) => (
                        <button
                          key={mk}
                          type="button"
                          onClick={() => setSearchMarketFilter(mk)}
                          className={`flex-1 py-2 text-xs font-semibold rounded-lg transition-colors ${
                            searchMarketFilter === mk
                              ? 'bg-[#0F172A] text-white'
                              : 'bg-white text-[#475569] border border-[#E2E8F0] hover:bg-[#F1F5F9]'
                          }`}
                        >
                          {mk === 'ALL'
                            ? '전체 시장'
                            : mk === 'US'
                            ? '미국(US)'
                            : mk === 'CN'
                            ? '중국A주(CN)'
                            : '홍콩(HK)'}
                        </button>
                      ))}
                    </div>

                    <div className="md:col-span-2">
                      <button
                        type="button"
                        onClick={() => {
                          if (searchPageQuery.trim()) {
                            handleAddWatchlist(searchPageQuery.trim());
                          } else {
                            setIsAddModalOpen(true);
                          }
                        }}
                        className="w-full py-2 px-3 text-xs font-semibold text-white bg-[#2E7D5B] hover:bg-[#25664A] rounded-lg transition-colors flex items-center justify-center gap-1"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>입력 코드 바로 추가</span>
                      </button>
                    </div>
                  </div>

                  {/* 검색 결과 표 */}
                  <div className="overflow-x-auto border border-[#E2E8F0] rounded-xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-xs font-semibold text-[#475569]">
                          <th className="py-3 px-4">종목명 (한글명)</th>
                          <th className="py-3 px-4">종목코드</th>
                          <th className="py-3 px-4">원문명</th>
                          <th className="py-3 px-4">시장 · 통화</th>
                          <th className="py-3 px-4 text-right">현재가</th>
                          <th className="py-3 px-4 text-right">등락률</th>
                          <th className="py-3 px-4 text-right">시가총액(백만)</th>
                          <th className="py-3 px-4 text-right">작업</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F1F5F9] text-xs">
                        {filteredUniverseForSearch.map((item) => {
                          const inWl = watchlist.some(
                            (w) => w.symbol.toUpperCase() === item.symbol.toUpperCase()
                          );
                          return (
                            <tr key={item.symbol} className="hover:bg-[#F8FAFC]">
                              <td className="py-3 px-4 font-bold text-[#0F172A]">
                                {namesKo[item.symbol] || item.nameKo}
                              </td>
                              <td className="py-3 px-4 font-mono font-semibold text-[#334155]">
                                {item.symbol}
                              </td>
                              <td className="py-3 px-4 text-[#64748B]">
                                {item.nameOriginal}
                              </td>
                              <td className="py-3 px-4 text-[#475569]">
                                {item.market} ({item.exchange}) · {item.currency}
                              </td>
                              <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold">
                                {item.price.toLocaleString()} {item.currency}
                              </td>
                              <td
                                className={`py-3 px-4 text-right font-mono tabular-nums font-semibold ${
                                  item.changePercent > 0
                                    ? 'text-[#E11D48]'
                                    : item.changePercent < 0
                                    ? 'text-[#2563EB]'
                                    : 'text-[#64748B]'
                                }`}
                              >
                                {item.changePercent > 0
                                  ? `+${item.changePercent.toFixed(2)}%`
                                  : `${item.changePercent.toFixed(2)}%`}
                              </td>
                              <td className="py-3 px-4 text-right font-mono tabular-nums">
                                {item.marketCapMillions.toLocaleString()}
                              </td>
                              <td className="py-3 px-4 text-right whitespace-nowrap">
                                <div className="inline-flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    onClick={() => openStockAnalysis(item.symbol)}
                                    className="px-2.5 py-1 text-xs font-semibold text-[#2E7D5B] bg-[#F0FDF4] hover:bg-[#DCFCE7] rounded-md"
                                  >
                                    재무제표
                                  </button>
                                  {inWl ? (
                                    <button
                                      type="button"
                                      onClick={() => handleDeleteWatchlist(item.symbol)}
                                      className="px-2.5 py-1 text-xs font-medium text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md"
                                    >
                                      삭제
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleAddWatchlist(item.symbol)}
                                      className="px-2.5 py-1 text-xs font-semibold text-white bg-[#2E7D5B] hover:bg-[#25664A] rounded-md"
                                    >
                                      + 관심추가
                                    </button>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ==================== 4. 즐겨찾기(관심종목) 관리 화면 ==================== */}
              {activeMenu === 'watchlist' && (
                <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div>
                      <h2 className="text-base font-bold text-[#0F172A]">
                        내 관심종목 관리 (로컬 SQLite 영구 저장)
                      </h2>
                      <p className="text-xs text-[#64748B] mt-0.5">
                        프로그램을 다시 열어도 목록이 그대로 유지됩니다. 대표 종목(AAPL, 600519, 00700)을 빠르게 추가하거나 삭제하고 재무제표를 확인할 수 있습니다.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {['AAPL', '600519', '00700'].map((sym) => {
                        const exists = watchlist.some((w) => w.symbol === sym);
                        if (exists) return null;
                        return (
                          <button
                            key={sym}
                            type="button"
                            onClick={() => handleAddWatchlist(sym)}
                            className="px-3 py-1.5 text-xs font-semibold text-[#2E7D5B] bg-[#F0FDF4] border border-[#BBF7D0] hover:bg-[#DCFCE7] rounded-lg"
                          >
                            + {namesKo[sym] || sym} ({sym}) 빠른 추가
                          </button>
                        );
                      })}
                      <button
                        type="button"
                        onClick={() => setIsAddModalOpen(true)}
                        className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#2E7D5B] hover:bg-[#25664A] rounded-lg"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>새 종목 추가</span>
                      </button>
                    </div>
                  </div>

                  <div className="overflow-x-auto border border-[#E2E8F0] rounded-xl">
                    <table className="w-full text-left border-collapse">
                      <thead>
                        <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-xs font-semibold text-[#475569]">
                          <th className="py-3 px-4">#</th>
                          <th className="py-3 px-4">종목명 (한글명)</th>
                          <th className="py-3 px-4">종목코드</th>
                          <th className="py-3 px-4">시장 · 통화</th>
                          <th className="py-3 px-4 text-right">현재가</th>
                          <th className="py-3 px-4 text-right">등락률</th>
                          <th className="py-3 px-4 text-right">마지막 수신 시각</th>
                          <th className="py-3 px-4 text-right">재무제표 / 삭제</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#F1F5F9] text-xs">
                        {watchlist.map((item, idx) => (
                          <tr key={item.symbol} className="hover:bg-[#F8FAFC]">
                            <td className="py-3 px-4 font-mono tabular-nums text-[#64748B]">
                              {idx + 1}
                            </td>
                            <td className="py-3 px-4 font-bold text-[#0F172A]">
                              {namesKo[item.symbol] || item.nameKo}
                            </td>
                            <td className="py-3 px-4 font-mono font-semibold text-[#334155]">
                              {item.symbol}
                            </td>
                            <td className="py-3 px-4 text-[#475569]">
                              {item.market === 'US'
                                ? '미국'
                                : item.market === 'CN'
                                ? '중국 A주'
                                : '홍콩'}{' '}
                              · {item.currency}
                            </td>
                            <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-[#0F172A]">
                              {item.price.toLocaleString('ko-KR', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}{' '}
                              {item.currency}
                            </td>
                            <td
                              className={`py-3 px-4 text-right font-mono tabular-nums font-semibold ${
                                item.changePercent > 0
                                  ? 'text-[#E11D48]'
                                  : item.changePercent < 0
                                  ? 'text-[#2563EB]'
                                  : 'text-[#64748B]'
                              }`}
                            >
                              {item.changePercent > 0
                                ? `+${item.changePercent.toFixed(2)}%`
                                : `${item.changePercent.toFixed(2)}%`}
                            </td>
                            <td className="py-3 px-4 text-right font-mono tabular-nums text-[#64748B]">
                              {item.fetchedAt}
                            </td>
                            <td className="py-3 px-4 text-right whitespace-nowrap">
                              <div className="inline-flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => openStockAnalysis(item.symbol)}
                                  className="px-2.5 py-1 text-xs font-semibold text-white bg-[#2E7D5B] hover:bg-[#25664A] rounded-md"
                                >
                                  재무제표 확인
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteWatchlist(item.symbol)}
                                  className="px-2.5 py-1 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-md"
                                >
                                  삭제
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ==================== 5. 자동 저장 · 복구 전용 화면 ==================== */}
              {activeMenu === 'autosave' && (
                <DataSettingsView
                  initialTab="autosave"
                  watchlist={watchlist}
                  namesKo={namesKo}
                  mapping={mapping}
                  autoSaveConfig={autoSaveConfig}
                  secondsUntilNextSave={secondsUntilNextSave}
                  snapshots={snapshots}
                  onUpdateAutoSaveConfig={handleUpdateAutoSaveConfig}
                  onCreateSnapshot={handleCreateSnapshot}
                  onRestoreSnapshot={handleRestoreSnapshot}
                  onDeleteSnapshot={handleDeleteSnapshot}
                  onExportBackupFile={handleExportBackupFile}
                  onImportBackupFile={handleImportBackupFile}
                  onUpdateNameKo={handleUpdateNameKo}
                  onDeleteNameKo={handleDeleteNameKo}
                  onUpdateMapping={handleUpdateMapping}
                />
              )}

              {/* ==================== 6. 데이터 · 설정 화면 ==================== */}
              {activeMenu === 'settings' && (
                <DataSettingsView
                  initialTab={settingsSubTab}
                  watchlist={watchlist}
                  namesKo={namesKo}
                  mapping={mapping}
                  autoSaveConfig={autoSaveConfig}
                  secondsUntilNextSave={secondsUntilNextSave}
                  snapshots={snapshots}
                  onUpdateAutoSaveConfig={handleUpdateAutoSaveConfig}
                  onCreateSnapshot={handleCreateSnapshot}
                  onRestoreSnapshot={handleRestoreSnapshot}
                  onDeleteSnapshot={handleDeleteSnapshot}
                  onExportBackupFile={handleExportBackupFile}
                  onImportBackupFile={handleImportBackupFile}
                  onUpdateNameKo={handleUpdateNameKo}
                  onDeleteNameKo={handleDeleteNameKo}
                  onUpdateMapping={handleUpdateMapping}
                />
              )}

              {/* ==================== 7. 튜토리얼 · 도움말 화면 ==================== */}
              {activeMenu === 'tutorial' && (
                <TutorialHelpView
                  onNavigateToView={(v) => setActiveMenu(v)}
                  onQuickAddSymbol={handleAddWatchlist}
                  onOpenAnalysisForSymbol={openStockAnalysis}
                />
              )}
            </>
          )}

          {/* 하단 고지사항 푸터 (참고 사진과 동일한 카드형 안내문) */}
          <footer className="bg-white border border-[#E2E8F0] rounded-xl p-4 text-xs text-[#64748B] space-y-1.5">
            <p>
              본 프로그램은 미국(SEC EDGAR companyfacts API · Finnhub 무료 API) 및 중국·홍콩(AKShare) 공개 데이터를 수집·캐시하는{' '}
              <strong className="text-[#0F172A]">개인용 포터블 정보 제공 도구</strong>입니다. 재무지표는 원래 통화 기준 백만 단위로 표시되며,{' '}
              <strong className="text-[#0F172A]">투자 판단의 근거로 단독 사용하지 마세요.</strong>
            </p>
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-[#94A3B8] tabular-nums">
              <span>
                캐시 정책: 재무제표 1일(24시간) · 시세 1분(60초) 로컬 SQLite 저장 · 자동 저장 주기:{' '}
                {autoSaveConfig.enabled
                  ? `${autoSaveConfig.intervalSeconds >= 60 ? `${autoSaveConfig.intervalSeconds / 60}분` : `${autoSaveConfig.intervalSeconds}초`}`
                  : '수동'}
              </span>
              <span>
                글로벌 인사이트 포터블 · US / CN / HK · v1.6.2
              </span>
            </div>
          </footer>
        </main>
      </div>

      {/* ==================== 모달 1: + 종목 추가 모달 ==================== */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl">
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-[#0F172A]">
                관심종목 추가 (미국 · 중국 A주 · 홍콩)
              </h3>
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-[#64748B] hover:text-[#0F172A] rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (!addSymbolQuery.trim()) return;
                await handleAddWatchlist(
                  addSymbolQuery.trim(),
                  addCustomNameKo.trim() || undefined
                );
                setAddSymbolQuery('');
                setAddCustomNameKo('');
                setIsAddModalOpen(false);
              }}
              className="space-y-3"
            >
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">
                  종목코드 또는 종목명 (필수)
                </label>
                <input
                  type="text"
                  value={addSymbolQuery}
                  onChange={(e) => setAddSymbolQuery(e.target.value)}
                  placeholder="예: AAPL, 600519, 00700 또는 애플, 귀주모태주, 텐센트"
                  className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#2E7D5B]"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1">
                  사용자 지정 한글명 (선택 — 입력 시 names_ko.json에 함께 등록)
                </label>
                <input
                  type="text"
                  value={addCustomNameKo}
                  onChange={(e) => setAddCustomNameKo(e.target.value)}
                  placeholder="비워두면 기본 한글명 사전(names_ko.json)이 자동 적용됩니다"
                  className="w-full px-3 py-2 text-xs border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#2E7D5B]"
                />
              </div>

              {/* 빠른 추천 종목 */}
              <div className="pt-1">
                <div className="text-[11px] font-medium text-[#64748B] mb-1.5">
                  클릭하여 빠른 입력:
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {[
                    { sym: 'AAPL', ko: '애플' },
                    { sym: '600519', ko: '귀주모태주' },
                    { sym: '00700', ko: '텐센트홀딩스' },
                    { sym: 'NVDA', ko: '엔비디아' },
                    { sym: 'MSFT', ko: '마이크로소프트' },
                    { sym: '300750', ko: 'CATL' },
                    { sym: '09988', ko: '알리바바그룹' },
                  ].map((q) => (
                    <button
                      key={q.sym}
                      type="button"
                      onClick={() => {
                        setAddSymbolQuery(q.sym);
                        setAddCustomNameKo(q.ko);
                      }}
                      className="px-2 py-1 text-[11px] font-medium bg-[#F8FAFC] border border-[#E2E8F0] hover:bg-[#F1F5F9] rounded text-[#334155]"
                    >
                      {q.ko} ({q.sym})
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[#F1F5F9]">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3.5 py-2 text-xs font-medium text-[#475569] hover:text-[#0F172A]"
                >
                  취소
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#2E7D5B] hover:bg-[#25664A] rounded-lg"
                >
                  관심종목 추가
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ==================== 모달 2: ? 빠른 도움말 & 상태 복구 모달 ==================== */}
      {isQuickHelpOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4">
          <div className="bg-white border border-[#E2E8F0] rounded-xl max-w-2xl w-full p-5 space-y-4 shadow-xl max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-[#F1F5F9] pb-3">
              <div className="flex items-center gap-2">
                <HelpCircle className="w-4 h-4 text-[#2E7D5B]" />
                <h3 className="text-base font-bold text-[#0F172A]">
                  빠른 도움말 요약 및 작업 상태 백업/복구
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsQuickHelpOpen(false)}
                className="p-1 text-[#64748B] hover:text-[#0F172A] rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5">
                <div className="font-bold text-[#0F172A]">
                  1. 관심종목 추가 및 삭제 (SQLite)
                </div>
                <p className="text-[#475569] leading-relaxed">
                  우측 상단 <strong>[+ 종목 추가]</strong>에서 <code>AAPL</code>, <code>600519</code>, <code>00700</code> 등을 입력해 추가합니다. 로컬 SQLite에 저장되어 재실행 시에도 유지됩니다.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5">
                <div className="font-bold text-[#0F172A]">
                  2. 연간(5년)·분기(8개) 한글 재무제표
                </div>
                <p className="text-[#475569] leading-relaxed">
                  종목명을 클릭하면 손익계산서·재무상태표·현금흐름표를 원래 통화 <strong>백만 단위</strong>와 한글 계정명(<code>mapping.json</code>)으로 보여줍니다.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5">
                <div className="font-bold text-[#0F172A]">
                  3. 자동 저장 간격 설정 및 수동 불러오기
                </div>
                <p className="text-[#475569] leading-relaxed">
                  좌측 <strong>[자동저장 · 복구]</strong>에서 저장 간격(30초~30분)을 설정하고, 언제든 이전 시점 스냅샷이나 <code>.json</code> 백업 파일로 복구할 수 있습니다.
                </p>
              </div>

              <div className="p-3.5 rounded-xl bg-[#F8FAFC] border border-[#E2E8F0] space-y-1.5">
                <div className="font-bold text-[#0F172A]">
                  4. 한글 사전 편집 & 파이썬 포터블
                </div>
                <p className="text-[#475569] leading-relaxed">
                  좌측 <strong>[데이터 · 설정]</strong>에서 <code>names_ko.json</code>과 <code>mapping.json</code>을 편집하고 Python Streamlit 포터블 코드를 다운로드합니다.
                </p>
              </div>
            </div>

            {/* 모달 내 빠른 저장/불러오기 실행 바 */}
            <div className="bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl p-3.5 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="text-[#166534] font-medium">
                현재 작업 상태를 즉시 저장하거나 백업 파일을 불러오시겠습니까?
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    handleCreateSnapshot('manual', '빠른 도움말 창에서 수동 저장');
                    setIsQuickHelpOpen(false);
                  }}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 font-semibold text-white bg-[#2E7D5B] rounded-lg"
                >
                  <Save className="w-3.5 h-3.5" />
                  지금 상태 저장
                </button>
                <button
                  type="button"
                  onClick={() => quickImportInputRef.current?.click()}
                  className="inline-flex items-center gap-1 px-2.5 py-1.5 font-semibold text-[#0F172A] bg-white border border-[#CBD5E1] rounded-lg"
                >
                  <Upload className="w-3.5 h-3.5" />
                  백업 파일 불러오기
                </button>
                <input
                  ref={quickImportInputRef}
                  type="file"
                  accept=".json,application/json"
                  onChange={async (e) => {
                    const f = e.target.files?.[0];
                    if (!f) return;
                    try {
                      const parsed = JSON.parse(await f.text());
                      await handleImportBackupFile(parsed);
                      setIsQuickHelpOpen(false);
                    } catch {
                      showNotice('유효한 백업 JSON 파일이 아닙니다.');
                    }
                  }}
                  className="hidden"
                />
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#F1F5F9]">
              <button
                type="button"
                onClick={() => {
                  setIsQuickHelpOpen(false);
                  setActiveMenu('tutorial');
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0F172A] hover:bg-[#1E293B] rounded-lg"
              >
                <BookOpen className="w-3.5 h-3.5" />
                전체 튜토리얼 · 화면 구성도(스크린샷) 가이드 열기
              </button>
              <button
                type="button"
                onClick={() => setIsQuickHelpOpen(false)}
                className="px-3.5 py-2 text-xs font-medium text-[#475569] hover:text-[#0F172A]"
              >
                닫기
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
