import React, { useRef, useState } from 'react';
import {
  CheckCircle2,
  Clock,
  Download,
  History,
  RotateCcw,
  Save,
  Trash2,
  Upload,
} from 'lucide-react';
import {
  AutoSaveConfig,
  SnapshotRecord,
  WorkspaceStatePayload,
} from '../types/stock.ts';

interface AutoSaveRestorePanelProps {
  autoSaveConfig: AutoSaveConfig;
  secondsUntilNextSave: number | null;
  snapshots: SnapshotRecord[];
  onUpdateAutoSaveConfig: (next: Partial<AutoSaveConfig>) => Promise<void>;
  onCreateSnapshot: (triggerType: 'auto' | 'manual', label?: string) => Promise<void>;
  onRestoreSnapshot: (id: number) => Promise<void>;
  onDeleteSnapshot: (id: number) => Promise<void>;
  onExportBackupFile: () => Promise<void>;
  onImportBackupFile: (payload: WorkspaceStatePayload) => Promise<void>;
}

const INTERVAL_OPTIONS = [
  { value: 30, label: '30초마다 자동 저장' },
  { value: 60, label: '1분마다 자동 저장 (권장)' },
  { value: 180, label: '3분마다 자동 저장' },
  { value: 300, label: '5분마다 자동 저장' },
  { value: 600, label: '10분마다 자동 저장' },
  { value: 1800, label: '30분마다 자동 저장' },
];

export const AutoSaveRestorePanel: React.FC<AutoSaveRestorePanelProps> = ({
  autoSaveConfig,
  secondsUntilNextSave,
  snapshots,
  onUpdateAutoSaveConfig,
  onCreateSnapshot,
  onRestoreSnapshot,
  onDeleteSnapshot,
  onExportBackupFile,
  onImportBackupFile,
}) => {
  const [manualLabel, setManualLabel] = useState<string>('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const showToast = (msg: string) => {
    setStatusMessage(msg);
    setTimeout(() => {
      setStatusMessage((prev) => (prev === msg ? null : prev));
    }, 4000);
  };

  const handleManualSave = async (e: React.FormEvent) => {
    e.preventDefault();
    const label = manualLabel.trim() || '사용자 수동 체크포인트 저장';
    await onCreateSnapshot('manual', label);
    setManualLabel('');
    showToast(`'${label}' 스냅샷이 로컬 데이터베이스에 안전하게 저장되었습니다.`);
  };

  const handleRestore = async (snap: SnapshotRecord) => {
    setBusyId(snap.id);
    try {
      await onRestoreSnapshot(snap.id);
      showToast(`${snap.createdAt} 시점('${snap.label}') 상태로 성공적으로 복구되었습니다.`);
    } finally {
      setBusyId(null);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as WorkspaceStatePayload;
      await onImportBackupFile(parsed);
      showToast(`'${file.name}' 백업 파일을 수동으로 불러와 작업 상태를 복원했습니다.`);
    } catch {
      showToast('백업 파일 형식이 올바르지 않습니다. 내보내기 한 .json 파일을 선택해 주세요.');
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const triggerLabelMap: Record<SnapshotRecord['triggerType'], string> = {
    auto: '자동 저장',
    manual: '수동 저장',
    file_import: '파일 불러오기',
    pre_restore: '복구 전 자동백업',
  };

  return (
    <div className="space-y-5">
      {statusMessage && (
        <div className="bg-[#F0FDF4] border border-[#BBF7D0] text-[#166534] rounded-xl px-4 py-3 text-xs font-medium flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
          <span>{statusMessage}</span>
        </div>
      )}

      {/* 1. 자동 저장 주기 설정 및 수동 파일 불러오기 카드 */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* 좌측 7컬럼: 자동 저장 설정 */}
        <div className="lg:col-span-7 bg-white border border-[#E2E8F0] rounded-xl p-5 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between gap-2 mb-3">
              <div>
                <h3 className="text-base font-bold text-[#0F172A]">
                  자동 저장 간격 및 동작 설정
                </h3>
                <p className="text-xs text-[#64748B] mt-0.5">
                  관심종목 목록, 종목 한글명 사전(names_ko.json), 재무 매핑(mapping.json), 차트/필터 상태를 설정한 주기마다 자동 저장합니다.
                </p>
              </div>
              <label className="inline-flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={autoSaveConfig.enabled}
                  onChange={(e) =>
                    onUpdateAutoSaveConfig({ enabled: e.target.checked })
                  }
                  className="w-4 h-4 accent-[#2E7D5B] rounded"
                />
                <span className="text-xs font-semibold text-[#0F172A]">
                  {autoSaveConfig.enabled ? '자동 저장 켜짐' : '자동 저장 꺼짐'}
                </span>
              </label>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1.5">
                  자동 저장 주기 (사용자 설정)
                </label>
                <select
                  value={autoSaveConfig.intervalSeconds}
                  disabled={!autoSaveConfig.enabled}
                  onChange={(e) => {
                    const sec = Number(e.target.value);
                    onUpdateAutoSaveConfig({ intervalSeconds: sec });
                    showToast(`자동 저장 주기가 ${sec >= 60 ? `${sec / 60}분` : `${sec}초`} 간격으로 설정되었습니다.`);
                  }}
                  className="w-full px-3 py-2 text-xs font-medium border border-[#CBD5E1] rounded-lg bg-white text-[#0F172A] focus:outline-none focus:border-[#2E7D5B] disabled:opacity-50"
                >
                  {INTERVAL_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#334155] mb-1.5">
                  변경 즉시 자동 저장 옵션
                </label>
                <label className="flex items-center gap-2 px-3 py-2 border border-[#E2E8F0] rounded-lg bg-[#F8FAFC] cursor-pointer">
                  <input
                    type="checkbox"
                    checked={autoSaveConfig.saveOnEveryChange}
                    disabled={!autoSaveConfig.enabled}
                    onChange={(e) =>
                      onUpdateAutoSaveConfig({
                        saveOnEveryChange: e.target.checked,
                      })
                    }
                    className="w-4 h-4 accent-[#2E7D5B] rounded"
                  />
                  <span className="text-xs text-[#334155]">
                    종목 추가/삭제 및 사전 수정 시 즉시 저장
                  </span>
                </label>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-[#F1F5F9] flex flex-wrap items-center justify-between gap-2 text-xs text-[#64748B]">
            <div className="flex items-center gap-1.5 tabular-nums">
              <Clock className="w-3.5 h-3.5 text-[#2E7D5B]" />
              <span>
                마지막 저장 시각:{' '}
                <strong className="text-[#0F172A]">
                  {autoSaveConfig.lastAutoSavedAt || '기록 없음'}
                </strong>
              </span>
            </div>
            {autoSaveConfig.enabled && secondsUntilNextSave !== null && (
              <span className="tabular-nums font-medium text-[#2E7D5B]">
                다음 주기적 자동 저장까지 {secondsUntilNextSave}초 남음
              </span>
            )}
          </div>
        </div>

        {/* 우측 5컬럼: 지금 수동 저장 & 포터블 백업 파일 수동 불러오기/내보내기 */}
        <div className="lg:col-span-5 bg-white border border-[#E2E8F0] rounded-xl p-5 flex flex-col justify-between space-y-4">
          <div>
            <h3 className="text-base font-bold text-[#0F172A]">
              수동 체크포인트 저장 및 파일 불러오기
            </h3>
            <p className="text-xs text-[#64748B] mt-0.5">
              중요한 변경 전 수동으로 스냅샷을 남기거나, PC에 백업된 포터블 JSON 파일을 직접 불러와 복구합니다.
            </p>

            <form onSubmit={handleManualSave} className="mt-3 flex items-center gap-2">
              <input
                type="text"
                value={manualLabel}
                onChange={(e) => setManualLabel(e.target.value)}
                placeholder="수동 저장 메모 입력 (예: 3분기 실적 점검 완료)"
                className="flex-1 px-3 py-2 text-xs border border-[#CBD5E1] rounded-lg focus:outline-none focus:border-[#2E7D5B]"
              />
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#2E7D5B] hover:bg-[#25664A] rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <Save className="w-3.5 h-3.5" />
                지금 수동 저장
              </button>
            </form>
          </div>

          <div className="pt-3 border-t border-[#F1F5F9]">
            <div className="text-xs font-semibold text-[#334155] mb-2">
              포터블 파일(.json) 내보내기 / 수동 불러오기
            </div>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={onExportBackupFile}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-[#0F172A] bg-[#F8FAFC] border border-[#CBD5E1] hover:bg-[#F1F5F9] rounded-lg transition-colors whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5 text-[#2E7D5B]" />
                현재 상태 파일로 저장
              </button>

              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="inline-flex items-center justify-center gap-1.5 px-3 py-2 text-xs font-semibold text-white bg-[#0F172A] hover:bg-[#1E293B] rounded-lg transition-colors whitespace-nowrap"
              >
                <Upload className="w-3.5 h-3.5" />
                백업 파일 수동 불러오기
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept=".json,application/json"
                onChange={handleFileChange}
                className="hidden"
              />
            </div>
          </div>
        </div>
      </div>

      {/* 2. 저장된 스냅샷 타임라인 및 이전 상태로 복구 테이블 */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[#2E7D5B]" />
            <h3 className="text-base font-bold text-[#0F172A]">
              저장된 작업 히스토리 (이전 상태로 복구)
            </h3>
          </div>
          <span className="text-xs text-[#64748B] tabular-nums">
            총 {snapshots.length}개의 복구 가능 시점 보관 중 (복구 실행 시 직전 상태가 자동 백업됩니다)
          </span>
        </div>

        <div className="overflow-x-auto border border-[#E2E8F0] rounded-xl">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#F8FAFC] border-b border-[#E2E8F0] text-xs font-semibold text-[#475569]">
                <th className="py-3 px-4 w-16">#</th>
                <th className="py-3 px-4">저장 시각 (YYYY-MM-DD HH:mm:ss)</th>
                <th className="py-3 px-4">구분</th>
                <th className="py-3 px-4">저장 내용 요약 / 메모</th>
                <th className="py-3 px-4 text-right">포함 데이터</th>
                <th className="py-3 px-4 text-right w-40">상태 복구 / 관리</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F1F5F9] text-xs">
              {snapshots.map((snap) => (
                <tr key={snap.id} className="hover:bg-[#F8FAFC] transition-colors">
                  <td className="py-3 px-4 font-mono tabular-nums text-[#64748B]">
                    #{snap.id}
                  </td>
                  <td className="py-3 px-4 font-mono tabular-nums font-semibold text-[#0F172A] whitespace-nowrap">
                    {snap.createdAt}
                  </td>
                  <td className="py-3 px-4 whitespace-nowrap text-[#475569] font-medium">
                    {triggerLabelMap[snap.triggerType]}
                  </td>
                  <td className="py-3 px-4 font-medium text-[#1E293B]">
                    {snap.label}
                  </td>
                  <td className="py-3 px-4 text-right tabular-nums text-[#64748B] whitespace-nowrap">
                    관심종목 {snap.watchlistCount}개 · 한글사전 {snap.namesKoCount}개 · 매핑 {snap.mappingCount}개
                  </td>
                  <td className="py-3 px-4 text-right whitespace-nowrap">
                    <div className="inline-flex items-center gap-1.5">
                      <button
                        type="button"
                        disabled={busyId === snap.id}
                        onClick={() => handleRestore(snap)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-white bg-[#2E7D5B] hover:bg-[#25664A] rounded-md transition-colors disabled:opacity-50"
                      >
                        <RotateCcw className="w-3 h-3" />
                        이 상태로 복구
                      </button>
                      {snapshots.length > 1 && (
                        <button
                          type="button"
                          onClick={() => onDeleteSnapshot(snap.id)}
                          title="이 스냅샷 삭제"
                          className="p-1 text-[#94A3B8] hover:text-rose-600 rounded transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
