import React, { useMemo, useState } from 'react';
import {
  CheckCircle2,
  Code2,
  Copy,
  Download,
  Play,
  Plus,
  Search,
  Trash2,
  XCircle,
} from 'lucide-react';
import { buildPortablePythonFiles } from '../data/portablePythonBundle.ts';
import {
  AutoSaveConfig,
  CollectorTestResult,
  SnapshotRecord,
  WatchlistItem,
  WorkspaceStatePayload,
} from '../types/stock.ts';
import { AutoSaveRestorePanel } from './AutoSaveRestorePanel.tsx';

interface DataSettingsViewProps {
  initialTab?: 'autosave' | 'names_ko' | 'mapping' | 'tests' | 'python';
  watchlist: WatchlistItem[];
  namesKo: Record<string, string>;
  mapping: Record<string, string>;
  autoSaveConfig: AutoSaveConfig;
  secondsUntilNextSave: number | null;
  snapshots: SnapshotRecord[];
  onUpdateAutoSaveConfig: (next: Partial<AutoSaveConfig>) => Promise<void>;
  onCreateSnapshot: (triggerType: 'auto' | 'manual', label?: string) => Promise<void>;
  onRestoreSnapshot: (id: number) => Promise<void>;
  onDeleteSnapshot: (id: number) => Promise<void>;
  onExportBackupFile: () => Promise<void>;
  onImportBackupFile: (payload: WorkspaceStatePayload) => Promise<void>;
  onUpdateNameKo: (symbol: string, nameKo: string) => Promise<void>;
  onDeleteNameKo: (symbol: string) => Promise<void>;
  onUpdateMapping: (rawKey: string, labelKo: string) => Promise<void>;
}

export const DataSettingsView: React.FC<DataSettingsViewProps> = ({
  initialTab = 'autosave',
  watchlist,
  namesKo,
  mapping,
  autoSaveConfig,
  secondsUntilNextSave,
  snapshots,
  onUpdateAutoSaveConfig,
  onCreateSnapshot,
  onRestoreSnapshot,
  onDeleteSnapshot,
  onExportBackupFile,
  onImportBackupFile,
  onUpdateNameKo,
  onDeleteNameKo,
  onUpdateMapping,
}) => {
  const [activeTab, setActiveTab] = useState<'autosave' | 'names_ko' | 'mapping' | 'tests' | 'python'>(
    initialTab
  );

  // 종목 한글명 사전 입력 상태
  const [newSymbol, setNewSymbol] = useState('');
  const [newNameKo, setNewNameKo] = useState('');
  const [nameSearch, setNameSearch] = useState('');

  // 재무 매핑 사전 입력 상태
  const [newRawKey, setNewRawKey] = useState('');
  const [newLabelKo, setNewLabelKo] = useState('');
  const [mapSearch, setMapSearch] = useState('');

  // 단위 테스트 상태
  const [testRunning, setTestRunning] = useState(false);
  const [testResults, setTestResults] = useState<CollectorTestResult[] | null>(null);
  const [testedAt, setTestedAt] = useState<string | null>(null);

  // 파이썬 포터블 코드 뷰어 상태
  const [selectedPyFileIdx, setSelectedPyFileIdx] = useState(0);
  const [copiedFile, setCopiedFile] = useState<string | null>(null);

  const filteredNamesKo = useMemo(() => {
    const q = nameSearch.trim().toLowerCase();
    return Object.entries(namesKo).filter(
      ([sym, ko]) =>
        !q || sym.toLowerCase().includes(q) || ko.toLowerCase().includes(q)
    );
  }, [namesKo, nameSearch]);

  const filteredMapping = useMemo(() => {
    const q = mapSearch.trim().toLowerCase();
    return Object.entries(mapping).filter(
      ([raw, ko]) =>
        !q || raw.toLowerCase().includes(q) || ko.toLowerCase().includes(q)
    );
  }, [mapping, mapSearch]);

  const portableFiles = useMemo(() => {
    return buildPortablePythonFiles(
      namesKo,
      mapping,
      watchlist.map((w) => w.symbol),
      autoSaveConfig.intervalSeconds
    );
  }, [namesKo, mapping, watchlist, autoSaveConfig.intervalSeconds]);

  const handleAddOrUpdateNameKo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSymbol.trim() || !newNameKo.trim()) return;
    await onUpdateNameKo(newSymbol.trim().toUpperCase(), newNameKo.trim());
    setNewSymbol('');
    setNewNameKo('');
  };

  const handleAddOrUpdateMapping = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRawKey.trim() || !newLabelKo.trim()) return;
    await onUpdateMapping(newRawKey.trim(), newLabelKo.trim());
    setNewRawKey('');
    setNewLabelKo('');
  };

  const handleRunTests = async () => {
    setTestRunning(true);
    try {
      const resp = await fetch('/api/test-collectors', { method: 'POST' });
      const data = await resp.json();
      if (data.results) {
        setTestResults(data.results);
        setTestedAt(data.testedAt);
      }
    } finally {
      setTestRunning(false);
    }
  };

  const handleDownloadSingleFile = (filename: string, content: string) => {
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-5">
      {/* 상단 설정 탭 바 */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-2 flex flex-wrap items-center gap-1.5">
        {(
          [
            { key: 'autosave', label: '자동 저장 · 이전 상태 복구' },
            { key: 'names_ko', label: `종목 한글명 사전 (names_ko.json · ${Object.keys(namesKo).length}개)` },
            { key: 'mapping', label: `재무 항목 대응표 (mapping.json · ${Object.keys(mapping).length}개)` },
            { key: 'tests', label: '출처별 수집 함수 단위 테스트' },
            { key: 'python', label: '파이썬(Streamlit) 포터블 패키지' },
          ] as const
        ).map((tab) => {
          const active = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => setActiveTab(tab.key)}
              className={`px-3.5 py-2 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                active
                  ? 'bg-[#0F172A] text-white'
                  : 'text-[#475569] hover:text-[#0F172A] hover:bg-[#F8FAFC]'
              }`}
            >
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* 탭 1: 자동 저장 및 수동 불러오기 (복구) */}
      {activeTab === 'autosave' && (
        <AutoSaveRestorePanel
          autoSaveConfig={autoSaveConfig}
          secondsUntilNextSave={secondsUntilNextSave}
          snapshots={snapshots}
          onUpdateAutoSaveConfig={onUpdateAutoSaveConfig}
          onCreateSnapshot={onCreateSnapshot}
          onRestoreSnapshot={onRestoreSnapshot}
          onDeleteSnapshot={onDeleteSnapshot}
          onExportBackupFile={onExportBackupFile}
          onImportBackupFile={onImportBackupFile}
        />
      )}

      {/* 탭 2: 종목 한글명 사전 (names_ko.json) */}
      {activeTab === 'names_ko' && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-[#0F172A]">
                종목 한글명 사전 (names_ko.json) 관리
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                종목코드(예: AAPL, 600519, 00700)에 대한 한글 종목명을 직접 추가하거나 고칠 수 있습니다. 수정 즉시 대시보드와 재무제표에 반영됩니다.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                handleDownloadSingleFile('names_ko.json', JSON.stringify(namesKo, null, 2))
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0F172A] bg-[#F8FAFC] border border-[#CBD5E1] hover:bg-[#F1F5F9] rounded-lg"
            >
              <Download className="w-3.5 h-3.5 text-[#2E7D5B]" />
              names_ko.json 다운로드
            </button>
          </div>

          <form
            onSubmit={handleAddOrUpdateNameKo}
            className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 bg-[#F8FAFC] p-3.5 rounded-xl border border-[#E2E8F0]"
          >
            <input
              type="text"
              value={newSymbol}
              onChange={(e) => setNewSymbol(e.target.value)}
              placeholder="종목코드 (예: AAPL, 600519, 00700)"
              className="sm:col-span-4 px-3 py-2 text-xs border border-[#CBD5E1] rounded-lg bg-white focus:outline-none focus:border-[#2E7D5B]"
            />
            <input
              type="text"
              value={newNameKo}
              onChange={(e) => setNewNameKo(e.target.value)}
              placeholder="표시할 한글 종목명 (예: 애플, 귀주모태주, 텐센트홀딩스)"
              className="sm:col-span-6 px-3 py-2 text-xs border border-[#CBD5E1] rounded-lg bg-white focus:outline-none focus:border-[#2E7D5B]"
            />
            <button
              type="submit"
              className="sm:col-span-2 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-semibold text-white bg-[#2E7D5B] hover:bg-[#25664A] rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              추가 / 수정
            </button>
          </form>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={nameSearch}
              onChange={(e) => setNameSearch(e.target.value)}
              placeholder="등록된 종목코드 또는 한글명으로 검색..."
              className="w-full pl-8 pr-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#2E7D5B]"
            />
          </div>

          <div className="max-h-[420px] overflow-y-auto border border-[#E2E8F0] rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#F8FAFC] border-b border-[#E2E8F0] text-xs font-semibold text-[#475569]">
                <tr>
                  <th className="py-2.5 px-4 w-44">종목코드</th>
                  <th className="py-2.5 px-4">한글 종목명</th>
                  <th className="py-2.5 px-4 text-right w-36">빠른 수정 / 삭제</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] text-xs">
                {filteredNamesKo.map(([sym, ko]) => (
                  <tr key={sym} className="hover:bg-[#F8FAFC]">
                    <td className="py-2.5 px-4 font-mono font-semibold text-[#0F172A]">
                      {sym}
                    </td>
                    <td className="py-2.5 px-4 font-medium text-[#1E293B]">
                      {ko}
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          setNewSymbol(sym);
                          setNewNameKo(ko);
                        }}
                        className="px-2 py-1 text-xs font-medium text-[#2E7D5B] hover:underline mr-2"
                      >
                        불러와 수정
                      </button>
                      <button
                        type="button"
                        onClick={() => onDeleteNameKo(sym)}
                        className="p-1 text-[#94A3B8] hover:text-rose-600 rounded"
                      >
                        <Trash2 className="w-3.5 h-3.5 inline" />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 탭 3: 재무 항목 대응표 (mapping.json) */}
      {activeTab === 'mapping' && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <h3 className="text-base font-bold text-[#0F172A]">
                재무 항목 한글 대응표 (mapping.json · 총 {Object.keys(mapping).length}개 항목)
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                미국 SEC EDGAR(US-GAAP) 영문 항목과 중국·홍콩 AKShare 중문 항목을 한글로 변환합니다. 대응표에 없는 항목은 원문 그대로 표시됩니다.
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                handleDownloadSingleFile('mapping.json', JSON.stringify(mapping, null, 2))
              }
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-[#0F172A] bg-[#F8FAFC] border border-[#CBD5E1] hover:bg-[#F1F5F9] rounded-lg"
            >
              <Download className="w-3.5 h-3.5 text-[#2E7D5B]" />
              mapping.json 다운로드
            </button>
          </div>

          <form
            onSubmit={handleAddOrUpdateMapping}
            className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 bg-[#F8FAFC] p-3.5 rounded-xl border border-[#E2E8F0]"
          >
            <input
              type="text"
              value={newRawKey}
              onChange={(e) => setNewRawKey(e.target.value)}
              placeholder="원문 재무 항목 키 (예: Revenues, NetIncomeLoss, 营业收入)"
              className="sm:col-span-5 px-3 py-2 text-xs border border-[#CBD5E1] rounded-lg bg-white font-mono focus:outline-none focus:border-[#2E7D5B]"
            />
            <input
              type="text"
              value={newLabelKo}
              onChange={(e) => setNewLabelKo(e.target.value)}
              placeholder="대응 한글 항목명 (예: 매출액, 당기순이익, 영업수익)"
              className="sm:col-span-5 px-3 py-2 text-xs border border-[#CBD5E1] rounded-lg bg-white focus:outline-none focus:border-[#2E7D5B]"
            />
            <button
              type="submit"
              className="sm:col-span-2 inline-flex items-center justify-center gap-1 px-3 py-2 text-xs font-semibold text-white bg-[#2E7D5B] hover:bg-[#25664A] rounded-lg transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              매핑 저장
            </button>
          </form>

          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={mapSearch}
              onChange={(e) => setMapSearch(e.target.value)}
              placeholder="영문/중문 원문 항목명 또는 한글 번역명으로 검색 (예: Revenues, 매출액, 营业收入)..."
              className="w-full pl-8 pr-3 py-2 text-xs border border-[#E2E8F0] rounded-lg focus:outline-none focus:border-[#2E7D5B]"
            />
          </div>

          <div className="max-h-[420px] overflow-y-auto border border-[#E2E8F0] rounded-xl">
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-[#F8FAFC] border-b border-[#E2E8F0] text-xs font-semibold text-[#475569]">
                <tr>
                  <th className="py-2.5 px-4">원문 항목 키 (SEC EDGAR / AKShare)</th>
                  <th className="py-2.5 px-4">한글 재무 항목명</th>
                  <th className="py-2.5 px-4 text-right w-28">편집</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F1F5F9] text-xs">
                {filteredMapping.map(([rawKey, labelKo]) => (
                  <tr key={rawKey} className="hover:bg-[#F8FAFC]">
                    <td className="py-2.5 px-4 font-mono text-[#334155] break-all">
                      {rawKey}
                    </td>
                    <td className="py-2.5 px-4 font-semibold text-[#0F172A]">
                      {labelKo}
                    </td>
                    <td className="py-2.5 px-4 text-right whitespace-nowrap">
                      <button
                        type="button"
                        onClick={() => {
                          setNewRawKey(rawKey);
                          setNewLabelKo(labelKo);
                        }}
                        className="px-2 py-1 text-xs font-medium text-[#2E7D5B] hover:underline"
                      >
                        불러와 수정
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 탭 4: 출처별 데이터 수집 함수 단위 테스트 */}
      {activeTab === 'tests' && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-[#0F172A]">
                출처별 데이터 수집기 및 한글 매핑 검증 테스트
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                완료 기준인 AAPL(미국 SEC EDGAR), 600519(중국 A주 AKShare), 00700(홍콩 AKShare)의 수집 및 한글 재무제표 변환을 자동 검증합니다.
              </p>
            </div>
            <button
              type="button"
              onClick={handleRunTests}
              disabled={testRunning}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#2E7D5B] hover:bg-[#25664A] rounded-lg transition-colors disabled:opacity-50"
            >
              <Play className="w-3.5 h-3.5" />
              {testRunning ? '테스트 실행 중...' : '전체 수집기 테스트 실행'}
            </button>
          </div>

          {!testResults ? (
            <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-8 text-center">
              <p className="text-sm font-semibold text-[#334155]">
                우측 상단 &apos;전체 수집기 테스트 실행&apos; 버튼을 클릭하면 4대 핵심 검증 스위트가 즉시 실행됩니다.
              </p>
              <p className="text-xs text-[#64748B] mt-1">
                검증 대상: ① AAPL 연간 5개년 재무제표 · ② 600519 귀주모태주 시세 및 재무 · ③ 00700 텐센트 8분기 재무 · ④ mapping.json 100개 이상 항목 및 폴백
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="flex items-center justify-between bg-[#F0FDF4] border border-[#BBF7D0] px-4 py-2.5 rounded-lg text-xs text-[#166534]">
                <span className="font-semibold">
                  전체 테스트 통과 ({testResults.filter((r) => r.passed).length} / {testResults.length} 성공)
                </span>
                <span className="font-mono tabular-nums">실행 시각: {testedAt}</span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {testResults.map((res) => (
                  <div
                    key={res.id}
                    className="border border-[#E2E8F0] rounded-xl p-4 bg-white space-y-2.5"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2">
                        {res.passed ? (
                          <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
                        ) : (
                          <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        )}
                        <h4 className="text-xs font-bold text-[#0F172A]">{res.title}</h4>
                      </div>
                      <span className="text-[11px] font-mono tabular-nums text-[#64748B]">
                        {res.latencyMs}ms
                      </span>
                    </div>
                    <p className="text-xs text-[#475569]">{res.messageKo}</p>
                    <div className="bg-[#F8FAFC] border border-[#E2E8F0] rounded-lg p-2.5 space-y-1 text-[11px]">
                      {res.sampleFields.map((sf) => (
                        <div
                          key={sf.rawKey}
                          className="flex items-center justify-between gap-2 font-mono tabular-nums"
                        >
                          <span className="text-[#64748B]">
                            {sf.rawKey} → <strong className="text-[#0F172A]">{sf.labelKo}</strong>
                          </span>
                          <span className="font-semibold text-[#2E7D5B]">{sf.sampleValue}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 탭 5: 파이썬(Python 3.11 + Streamlit + SQLite) 포터블 패키지 코드 및 다운로드 */}
      {activeTab === 'python' && (
        <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
                <Code2 className="w-4 h-4 text-[#2E7D5B]" />
                <span>로컬 실행용 Python 3.11+ / Streamlit 포터블 소스코드 패키지</span>
              </h3>
              <p className="text-xs text-[#64748B] mt-0.5">
                현재 편집한 한글 사전(names_ko.json)과 재무 매핑(mapping.json), 관심종목 목록이 그대로 반영된 파이썬 포터블 패키지입니다.
                <code className="mx-1 px-1.5 py-0.5 bg-[#F1F5F9] rounded font-mono text-[11px]">
                  pip install -r requirements.txt
                </code>
                후
                <code className="mx-1 px-1.5 py-0.5 bg-[#F1F5F9] rounded font-mono text-[11px]">
                  streamlit run app.py
                </code>
                한 줄로 실행됩니다.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* 파일 목록 */}
            <div className="lg:col-span-4 border border-[#E2E8F0] rounded-xl p-3 bg-[#F8FAFC] space-y-1.5">
              <div className="text-xs font-bold text-[#334155] px-2 py-1">
                포터블 모듈 구성 파일 ({portableFiles.length}개)
              </div>
              {portableFiles.map((pf, idx) => {
                const active = selectedPyFileIdx === idx;
                return (
                  <div
                    key={pf.path}
                    onClick={() => setSelectedPyFileIdx(idx)}
                    className={`p-2.5 rounded-lg cursor-pointer transition-colors flex items-center justify-between gap-2 ${
                      active
                        ? 'bg-[#0F172A] text-white'
                        : 'bg-white border border-[#E2E8F0] text-[#1E293B] hover:bg-[#F1F5F9]'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="text-xs font-mono font-bold truncate">{pf.path}</div>
                      <div
                        className={`text-[11px] truncate ${
                          active ? 'text-slate-300' : 'text-[#64748B]'
                        }`}
                      >
                        {pf.descriptionKo}
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDownloadSingleFile(pf.filename, pf.content);
                      }}
                      title={`${pf.filename} 다운로드`}
                      className={`p-1.5 rounded ${
                        active ? 'hover:bg-slate-800 text-white' : 'hover:bg-slate-100 text-[#475569]'
                      }`}
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                );
              })}
            </div>

            {/* 코드 뷰어 */}
            <div className="lg:col-span-8 border border-[#E2E8F0] rounded-xl overflow-hidden flex flex-col">
              {portableFiles[selectedPyFileIdx] && (
                <>
                  <div className="bg-[#0F172A] text-white px-4 py-2.5 flex items-center justify-between">
                    <div>
                      <span className="font-mono text-xs font-bold">
                        {portableFiles[selectedPyFileIdx].path}
                      </span>
                      <span className="text-xs text-slate-400 ml-2">
                        — {portableFiles[selectedPyFileIdx].descriptionKo}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(
                            portableFiles[selectedPyFileIdx].content
                          );
                          setCopiedFile(portableFiles[selectedPyFileIdx].path);
                          setTimeout(() => setCopiedFile(null), 2000);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium bg-slate-800 hover:bg-slate-700 rounded text-slate-200"
                      >
                        <Copy className="w-3 h-3" />
                        {copiedFile === portableFiles[selectedPyFileIdx].path
                          ? '복사됨'
                          : '코드 복사'}
                      </button>
                      <button
                        type="button"
                        onClick={() =>
                          handleDownloadSingleFile(
                            portableFiles[selectedPyFileIdx].filename,
                            portableFiles[selectedPyFileIdx].content
                          )
                        }
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold bg-[#2E7D5B] hover:bg-[#25664A] rounded text-white"
                      >
                        <Download className="w-3 h-3" />
                        파일 저장
                      </button>
                    </div>
                  </div>
                  <pre className="p-4 bg-[#0B1320] text-slate-100 text-xs font-mono overflow-auto max-h-[460px] leading-relaxed">
                    <code>{portableFiles[selectedPyFileIdx].content}</code>
                  </pre>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
