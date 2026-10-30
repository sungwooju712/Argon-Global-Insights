import React, { useMemo, useState } from 'react';
import {
  ArrowRight,
  BookOpen,
  CheckCircle2,
  Clock,
  Database,
  FileSpreadsheet,
  HelpCircle,
  LayoutDashboard,
  Search,
  Sparkles,
  Terminal,
} from 'lucide-react';

interface TutorialHelpViewProps {
  onNavigateToView: (
    view: 'dashboard' | 'analysis' | 'search' | 'watchlist' | 'autosave' | 'settings' | 'tutorial',
    subParam?: string
  ) => void;
  onQuickAddSymbol: (symbol: string) => Promise<void>;
  onOpenAnalysisForSymbol: (symbol: string) => void;
}

interface GuideStepCard {
  id: string;
  category: 'dashboard' | 'watchlist' | 'financials' | 'autosave' | 'dictionary';
  stepNumber: string;
  title: string;
  summary: string;
  steps: string[];
  exampleBox: {
    title: string;
    items: { label: string; value: string; note?: string }[];
  };
  actionLabel: string;
  onAction: () => void;
}

export const TutorialHelpView: React.FC<TutorialHelpViewProps> = ({
  onNavigateToView,
  onQuickAddSymbol,
  onOpenAnalysisForSymbol,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<
    'all' | 'dashboard' | 'watchlist' | 'financials' | 'autosave' | 'dictionary'
  >('all');
  const [imgLoadedError, setImgLoadedError] = useState(false);
  const [quickActionFeedback, setQuickActionFeedback] = useState<string | null>(null);

  const triggerFeedback = (msg: string) => {
    setQuickActionFeedback(msg);
    setTimeout(() => {
      setQuickActionFeedback((prev) => (prev === msg ? null : prev));
    }, 3500);
  };

  const guideCards: GuideStepCard[] = useMemo(
    () => [
      {
        id: 'guide-1-dashboard',
        category: 'dashboard',
        stepNumber: '01. 대시보드 & 수익률 흐름 파악',
        title: '대시보드에서 3대 시장(미국·중국A주·홍콩)과 내 관심종목 흐름 한눈에 보기',
        summary:
          '상단 4개 요약 카드에서 등록 유니버스와 상승/하락 비율을 확인하고, 중앙 멀티라인 차트에서 관심종목들의 기간별 수익률(%)을 비교합니다.',
        steps: [
          '좌측 사이드바 최상단의 [대시보드] 메뉴를 클릭합니다.',
          '중앙 [관심종목 흐름] 차트 우측 상단에서 [1개월 / 3개월 / 6개월 / 1년 / 전체] 버튼을 누르거나 시작일~종료일(YYYY-MM-DD)을 입력한 뒤 [적용]을 클릭합니다.',
          '차트 상단 레전드(예: 애플, 귀주모태주, 텐센트홀딩스)를 클릭하면 특정 종목 곡선만 강조해서 볼 수 있고, 더블클릭하면 해당 종목의 재무제표 화면으로 바로 이동합니다.',
        ],
        exampleBox: {
          title: '예시: 기간별 수익률 비교 및 시장 온도 확인',
          items: [
            { label: '기간 필터 입력 예시', value: '2026-07-23 ~ 2026-10-29 (3개월 · 일간)', note: 'YYYY-MM-DD 표준 날짜' },
            { label: '우측 시장 온도 바', value: '상승(적색) · 보합(회색) · 하락(청색) 종목 비율 시각화', note: '한눈에 장세 파악' },
          ],
        },
        actionLabel: '대시보드 화면으로 이동',
        onAction: () => onNavigateToView('dashboard'),
      },
      {
        id: 'guide-2-watchlist',
        category: 'watchlist',
        stepNumber: '02. 관심종목 검색·추가·삭제',
        title: '종목코드(AAPL, 600519, 00700) 또는 한글명으로 관심종목 관리하기',
        summary:
          '미국·중국 A주·홍콩 주식을 종목코드나 한글 이름으로 검색해 추가하고 삭제합니다. 모든 변경 사항은 로컬 SQLite 데이터베이스에 즉시 저장됩니다.',
        steps: [
          '화면 우측 상단의 초록색 [+ 종목 추가] 버튼 또는 상단 검색창(Ctrl+K), 좌측 [즐겨찾기 관리] 메뉴를 엽니다.',
          '미국 주식은 영문 티커(예: AAPL, NVDA), 중국 A주는 6자리 숫자(예: 600519), 홍콩 주식은 5자리 숫자(예: 00700) 또는 한글명(애플, 귀주모태주, 텐센트)을 입력합니다.',
          '[추가] 버튼을 누르면 로컬 SQLite에 저장되어 프로그램을 다시 열어도 목록이 그대로 유지되며, 목록 우측의 휴지통 아이콘으로 언제든 삭제할 수 있습니다.',
        ],
        exampleBox: {
          title: '필수 대표 3대 종목 입력 예시 (완료 기준 종목)',
          items: [
            { label: '미국 (NASDAQ)', value: 'AAPL → 애플 (통화: USD)', note: 'Finnhub 시세 + SEC EDGAR 재무' },
            { label: '중국 A주 (상하이)', value: '600519 → 귀주모태주 (통화: CNY)', note: 'AKShare 중국A주 시세 및 재무' },
            { label: '홍콩 (HKEX)', value: '00700 → 텐센트홀딩스 (통화: HKD)', note: 'AKShare 홍콩증시 시세 및 재무' },
          ],
        },
        actionLabel: '즐겨찾기(관심종목) 관리 열기',
        onAction: () => onNavigateToView('watchlist'),
      },
      {
        id: 'guide-3-financials',
        category: 'financials',
        stepNumber: '03. 한글 재무제표 및 그래프 확인',
        title: '손익계산서·재무상태표·현금흐름표를 연간(5년)과 분기(8개)로 분석하기',
        summary:
          '140개 이상의 재무 항목 대응표(mapping.json)를 통해 영문(US-GAAP)·중문 회계 항목을 모두 한글로 변환하여 표와 막대그래프로 보여줍니다.',
        steps: [
          '좌측 사이드바에서 [종목 분석]을 클릭하거나, 대시보드 표에서 원하는 종목의 이름을 클릭합니다.',
          '상단 탭에서 [손익계산서], [재무상태표], [현금흐름표] 중 하나를 선택하고, 우측에서 [연간 (최근 5년)] 또는 [분기 (최근 8개)]를 선택합니다.',
          '재무제표 표에서 원하는 항목 행(예: 매출액, 영업이익, 당기순이익)을 클릭하면 상단 그래프에 해당 항목이 즉시 반영되어 추이를 비교할 수 있습니다.',
          '각 항목 우측의 연필 아이콘을 누르면 그 자리에서 한글 번역명을 원하는 표현으로 바로 고칠 수 있습니다.',
        ],
        exampleBox: {
          title: '재무제표 숫자 및 한글 변환 규칙 예시',
          items: [
            { label: '미국 계정 한글화', value: 'Revenues → 매출액 / NetIncomeLoss → 당기순이익', note: '단위: 백만 USD' },
            { label: '중국·홍콩 계정 한글화', value: '营业收入 → 영업수익 / 资产总计 → 자산총계', note: '단위: 백만 CNY / HKD' },
            { label: '숫자 및 날짜 표기', value: '391,035 (백만 단위, 천 단위 쉼표) · 2025-09-27', note: '미등록 항목은 원문 유지' },
          ],
        },
        actionLabel: 'AAPL 한글 재무제표 바로 보기',
        onAction: () => onOpenAnalysisForSymbol('AAPL'),
      },
      {
        id: 'guide-4-autosave',
        category: 'autosave',
        stepNumber: '04. 자동 저장 간격 설정 & 수동 불러오기(상태 복구)',
        title: '작업 내용을 주기적으로 자동 저장하고 언제든 이전 상태로 복구하기',
        summary:
          '사용자가 지정한 시간 간격마다 관심종목·한글사전·매핑·차트 설정을 자동 백업하며, 실수로 데이터를 지웠을 때 이전 시점으로 1초 만에 되돌립니다.',
        steps: [
          '좌측 사이드바의 [자동저장 · 복구] 메뉴 또는 상단 헤더의 [자동저장] 상태 버튼을 클릭합니다.',
          '[자동 저장 주기] 드롭다운에서 30초, 1분(기본), 3분, 5분, 10분, 30분 중 원하는 간격을 선택하고 [종목 추가/삭제 및 사전 수정 시 즉시 저장] 체크박스를 설정합니다.',
          '특정 시점을 기억해 두고 싶을 때는 메모를 입력하고 [지금 수동 저장] 버튼을 클릭합니다.',
          '이전 상태로 되돌리고 싶을 때는 하단 [저장된 작업 히스토리] 목록에서 원하는 시점의 [이 상태로 복구] 버튼을 누르거나, [백업 파일 수동 불러오기]로 PC의 .json 파일을 업로드합니다.',
        ],
        exampleBox: {
          title: '자동 저장 및 수동 복구 활용 예시',
          items: [
            { label: '자동 저장 주기 설정', value: '1분마다 자동 저장 + 변경 시 즉시 저장', note: '우측 하단/상단에 마지막 저장 시각 표시' },
            { label: '시점 복구 안전장치', value: '복구 실행 직전 현재 상태를 [복구 전 자동백업]으로 먼저 저장', note: '데이터 유실 0% 보장' },
            { label: '포터블 파일 이동', value: '[현재 상태 파일로 저장] → 다른 PC에서 [백업 파일 수동 불러오기]', note: '.json 포터블 호환' },
          ],
        },
        actionLabel: '자동 저장 및 상태 복구 설정 열기',
        onAction: () => onNavigateToView('autosave'),
      },
      {
        id: 'guide-5-dictionary',
        category: 'dictionary',
        stepNumber: '05. 데이터 수집 API 키 등록, 한글 사전 편집 & 파이썬 포터블 실행',
        title: '수집 API 설정(.env) · names_ko.json · mapping.json 편집 및 Python Streamlit 포터블 실행',
        summary:
          '미국 Finnhub·SEC EDGAR 및 중국 Tushare API 키를 등록하고, 종목 한글명과 재무 대응표를 자유롭게 편집하며 파이썬 포터블 패키지를 다운로드합니다.',
        steps: [
          '좌측 사이드바의 [수집 API 설정] 또는 [데이터 · 설정] 메뉴를 클릭합니다.',
          '[데이터 수집 API 설정] 탭에서 미국 실시간 시세용 Finnhub API 키와 SEC EDGAR User-Agent를 등록하고 [연결 테스트]를 눌러 상태를 확인합니다.',
          '[종목 한글명 사전] 탭에서 새 종목코드와 한글 이름을 입력해 추가하거나 기존 이름을 수정합니다.',
          '[재무 항목 대응표] 탭에서 140개 이상의 회계 항목 번역을 검색·추가·수정합니다.',
          '[출처별 수집 함수 단위 테스트] 탭에서 [전체 수집기 테스트 실행]을 눌러 AAPL, 600519, 00700 수집 및 매핑 통과 여부를 확인합니다.',
          '[파이썬(Streamlit) 포터블 패키지] 탭에서 사용자의 API 키가 포함된 .env, app.py, collectors.py 등을 확인하고 PC로 다운로드합니다.',
        ],
        exampleBox: {
          title: 'API 연동 및 로컬 PC 파이썬 포터블 실행 예시',
          items: [
            { label: 'Finnhub 무료 키', value: 'FINNHUB_API_KEY 등록 시 실시간 시세 즉시 활성화', note: '분당 60회 속도제한 보호' },
            { label: 'SEC User-Agent', value: 'SEC_USER_AGENT="앱이름 이메일주소"', note: '초당 10회 제한 자동 준수' },
            { label: '파이썬 실행 명령어', value: 'pip install -r requirements.txt && streamlit run app.py', note: '.env 자동 동기화' },
          ],
        },
        actionLabel: '데이터 수집 API 및 사전 설정 열기',
        onAction: () => onNavigateToView('settings'),
      },
    ],
    [onNavigateToView, onOpenAnalysisForSymbol]
  );

  const filteredGuides = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return guideCards.filter((card) => {
      if (selectedCategory !== 'all' && card.category !== selectedCategory) return false;
      if (!q) return true;
      const haystack = [
        card.title,
        card.summary,
        ...card.steps,
        card.exampleBox.title,
        ...card.exampleBox.items.map((i) => `${i.label} ${i.value} ${i.note || ''}`),
      ]
        .join(' ')
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [guideCards, selectedCategory, searchQuery]);

  return (
    <div className="space-y-6">
      {/* 상단 튜토리얼 헤더 및 검색창 */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#2E7D5B] mb-1">
              <BookOpen className="w-4 h-4" />
              <span>사용자 매뉴얼 및 인터랙티브 튜토리얼</span>
            </div>
            <h2 className="text-xl font-bold text-[#0F172A] tracking-tight">
              글로벌 인사이트 주요 기능 사용법 및 시각적 가이드
            </h2>
            <p className="text-xs text-[#64748B] mt-1">
              각 기능의 단계별 설명과 화면 구성도(스크린샷), 대표 종목(AAPL, 600519, 00700) 실습 예제를 확인하고 바로 실행해 볼 수 있습니다.
            </p>
          </div>

          {/* 도움말 검색창 */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-[#94A3B8] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="도움말 검색 (예: 자동저장, 재무제표, 600519)..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-[#CBD5E1] rounded-lg bg-[#F8FAFC] focus:bg-white focus:outline-none focus:border-[#2E7D5B]"
            />
          </div>
        </div>

        {/* 카테고리 필터 버튼 */}
        <div className="flex flex-wrap items-center gap-1.5 mt-4 pt-3 border-t border-[#F1F5F9]">
          {(
            [
              { key: 'all', label: '전체 가이드 보기' },
              { key: 'dashboard', label: '1. 대시보드 & 차트' },
              { key: 'watchlist', label: '2. 관심종목 추가·삭제' },
              { key: 'financials', label: '3. 한글 재무제표 (5년/8분기)' },
              { key: 'autosave', label: '4. 자동 저장 & 이전 상태 복구' },
              { key: 'dictionary', label: '5. 한글 사전 & 파이썬 포터블' },
            ] as const
          ).map((cat) => {
            const active = selectedCategory === cat.key;
            return (
              <button
                key={cat.key}
                type="button"
                onClick={() => setSelectedCategory(cat.key)}
                className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap shrink-0 ${
                  active
                    ? 'bg-[#0F172A] text-white'
                    : 'bg-[#F8FAFC] text-[#475569] border border-[#E2E8F0] hover:bg-[#F1F5F9]'
                }`}
              >
                {cat.label}
              </button>
            );
          })}
        </div>

        {quickActionFeedback && (
          <div className="mt-3 bg-[#F0FDF4] border border-[#BBF7D0] text-[#166534] px-3.5 py-2 rounded-lg text-xs font-medium flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
            <span>{quickActionFeedback}</span>
          </div>
        )}
      </div>

      {/* 원클릭 빠른 실습 바 (AAPL, 600519, 00700 즉시 테스트) */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5">
        <div className="flex flex-wrap items-center justify-between gap-3 mb-3">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#2E7D5B]" />
            <h3 className="text-sm font-bold text-[#0F172A]">
              원클릭 빠른 실습: 3대 시장 대표 종목(미국·중국 A주·홍콩) 바로 체험하기
            </h3>
          </div>
          <span className="text-xs text-[#64748B]">
            버튼을 클릭하면 해당 종목을 관심종목에 추가하거나 한글 재무제표를 즉시 엽니다.
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            {
              symbol: 'AAPL',
              nameKo: '애플 (Apple Inc.)',
              marketLabel: '미국 NASDAQ · USD',
              desc: 'SEC EDGAR companyfacts 기반 최근 5년 연간 / 8개 분기 재무제표',
            },
            {
              symbol: '600519',
              nameKo: '귀주모태주 (贵州茅台)',
              marketLabel: '중국 상하이 A주 · CNY',
              desc: 'AKShare 중국 회계기준 항목(营业收入 등) 100% 한글 변환 재무제표',
            },
            {
              symbol: '00700',
              nameKo: '텐센트홀딩스 (腾讯控股)',
              marketLabel: '홍콩 HKEX · HKD',
              desc: 'AKShare 홍콩증시 시세 및 백만 HKD 단위 한글 손익·재무·현금흐름표',
            },
          ].map((item) => (
            <div
              key={item.symbol}
              className="border border-[#E2E8F0] rounded-xl p-3.5 bg-[#FAFCFF] flex flex-col justify-between gap-3"
            >
              <div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-bold text-[#0F172A]">{item.nameKo}</span>
                  <span className="font-mono text-xs font-bold text-[#2E7D5B]">{item.symbol}</span>
                </div>
                <div className="text-[11px] text-[#64748B] mt-0.5">{item.marketLabel}</div>
                <p className="text-xs text-[#475569] mt-2 leading-relaxed">{item.desc}</p>
              </div>
              <div className="flex items-center gap-2 pt-2 border-t border-[#E2E8F0]">
                <button
                  type="button"
                  onClick={async () => {
                    await onQuickAddSymbol(item.symbol);
                    triggerFeedback(`${item.nameKo}(${item.symbol}) 종목이 관심종목(SQLite)에 추가되었습니다.`);
                  }}
                  className="flex-1 px-2.5 py-1.5 text-xs font-semibold text-[#0F172A] bg-white border border-[#CBD5E1] hover:bg-[#F1F5F9] rounded-lg transition-colors"
                >
                  + 관심종목 추가
                </button>
                <button
                  type="button"
                  onClick={() => onOpenAnalysisForSymbol(item.symbol)}
                  className="flex-1 px-2.5 py-1.5 text-xs font-semibold text-white bg-[#2E7D5B] hover:bg-[#25664A] rounded-lg transition-colors"
                >
                  한글 재무제표 보기
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 기준 화면 스크린샷 및 영역별 번호 매김 가이드 */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4">
        <div>
          <h3 className="text-base font-bold text-[#0F172A] flex items-center gap-2">
            <LayoutDashboard className="w-4 h-4 text-[#2E7D5B]" />
            <span>프로그램 화면 구성 안내 (스크린샷 및 영역별 기능 설명)</span>
          </h3>
          <p className="text-xs text-[#64748B] mt-0.5">
            아래 기준 화면 스크린샷과 번호별 설명을 참고하면 원하는 메뉴와 컨트롤의 위치를 한눈에 찾을 수 있습니다.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
          {/* 좌측 7컬럼: 참조 스크린샷 이미지 */}
          <div className="lg:col-span-7 border border-[#E2E8F0] rounded-xl overflow-hidden bg-[#0F172A] flex flex-col justify-between">
            {!imgLoadedError ? (
              <img
                src="/assets/aistudio/1_22ca6cb2.png"
                alt="글로벌 인사이트 대시보드 화면 구성 참조 스크린샷"
                referrerPolicy="no-referrer"
                onError={() => setImgLoadedError(true)}
                className="w-full h-auto object-contain bg-[#F4F6F9]"
              />
            ) : (
              <div className="p-8 text-center text-slate-300 space-y-2">
                <LayoutDashboard className="w-10 h-10 mx-auto text-[#4ADE80]" />
                <div className="text-sm font-bold">대시보드 표준 레이아웃 구성도</div>
                <p className="text-xs text-slate-400">
                  좌측 다크 네이비 사이드바 + 상단 검색/액션 헤더 + 4열 요약 KPI + 중앙 관심종목 수익률 차트 & 시장 온도 + 하단 시세표
                </p>
              </div>
            )}
            <div className="bg-[#111C2D] text-slate-300 px-4 py-2.5 text-xs flex items-center justify-between">
              <span>참조 UI 디자인: 좌측 다크 사이드바 + 우측 고밀도 카드/차트/시세 테이블 구조</span>
              <span className="font-mono text-[11px] text-[#4ADE80]">1440px 와이드 레이아웃</span>
            </div>
          </div>

          {/* 우측 5컬럼: 번호별 영역 상세 설명 */}
          <div className="lg:col-span-5 flex flex-col justify-between space-y-2.5">
            {[
              {
                num: '01. 좌측 다크 네이비 사이드바',
                desc: '[대시보드], [종목 분석(재무제표)], [종목검색], [즐겨찾기 관리], [자동저장·복구], [데이터·설정], [튜토리얼·도움말] 메뉴를 언제든 전환합니다.',
              },
              {
                num: '02. 상단 빠른 검색 및 액션 바',
                desc: '종목코드/한글명 빠른 검색(Ctrl+K), 기준일 표시, 자동 저장 상태 확인, [+ 종목 추가], [새로고침], [? 도움말] 버튼을 제공합니다.',
              },
              {
                num: '03. 상단 4열 핵심 지표(KPI) 카드',
                desc: '유니버스 종목 수(미국·중국A주·홍콩), 상승/하락 종목 수 및 비율, 내 관심종목 수 및 평균 수익률, 합산 시가총액을 요약합니다.',
              },
              {
                num: '04. 중앙 좌측: 관심종목 흐름 멀티라인 차트',
                desc: '1개월·3개월·6개월·1년·전체 및 사용자 지정 날짜 범위(YYYY-MM-DD) 동안 내 관심종목들의 누적 수익률(%) 추이를 비교합니다.',
              },
              {
                num: '05. 중앙 우측: 시장 온도 & 빠른 작업',
                desc: '상승·보합·하락 분포 막대와 함께 [+ 종목 추가], [재무제표 분석], [이전 상태 복구], [엑셀(CSV) 보고서]를 원클릭 실행합니다.',
              },
              {
                num: '06. 하단: 관심종목 및 대표 종목 시세표',
                desc: '한글 종목명(우선 표시), 종목코드, 시장(US/CN/HK), 통화, 현재가, 등락률, 시가총액(백만 단위)을 정렬된 표로 보여줍니다.',
              },
            ].map((zone) => (
              <div
                key={zone.num}
                className="p-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] hover:bg-white transition-colors"
              >
                <div className="text-xs font-bold text-[#0F172A]">{zone.num}</div>
                <p className="text-xs text-[#475569] mt-0.5 leading-relaxed">{zone.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 단계별 상세 가이드 카드 목록 */}
      <div className="space-y-4">
        {filteredGuides.map((card) => (
          <div
            key={card.id}
            className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4"
          >
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="text-xs font-bold text-[#2E7D5B]">{card.stepNumber}</div>
                <h3 className="text-base font-bold text-[#0F172A] mt-0.5">{card.title}</h3>
                <p className="text-xs text-[#64748B] mt-1">{card.summary}</p>
              </div>
              <button
                type="button"
                onClick={card.onAction}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#2E7D5B] hover:bg-[#25664A] rounded-lg transition-colors whitespace-nowrap shrink-0"
              >
                <span>{card.actionLabel}</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 pt-2 border-t border-[#F1F5F9]">
              {/* 좌측 7컬럼: 따라하기 단계 */}
              <div className="lg:col-span-7 space-y-2">
                <div className="text-xs font-bold text-[#334155]">단계별 사용 방법</div>
                <ol className="space-y-2 text-xs text-[#1E293B]">
                  {card.steps.map((stepText, idx) => (
                    <li key={idx} className="flex items-start gap-2.5 leading-relaxed">
                      <span className="font-mono font-bold text-[#2E7D5B] shrink-0">
                        {idx + 1}.
                      </span>
                      <span>{stepText}</span>
                    </li>
                  ))}
                </ol>
              </div>

              {/* 우측 5컬럼: 실전 입력/출력 예시 박스 */}
              <div className="lg:col-span-5 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl p-3.5 space-y-2">
                <div className="text-xs font-bold text-[#0F172A] flex items-center gap-1.5">
                  <FileSpreadsheet className="w-3.5 h-3.5 text-[#2E7D5B]" />
                  <span>{card.exampleBox.title}</span>
                </div>
                <div className="space-y-2 pt-1">
                  {card.exampleBox.items.map((ex, i) => (
                    <div
                      key={i}
                      className="bg-white border border-[#E2E8F0] rounded-lg p-2.5 text-xs"
                    >
                      <div className="flex items-center justify-between text-[11px] text-[#64748B]">
                        <span>{ex.label}</span>
                        {ex.note && <span>{ex.note}</span>}
                      </div>
                      <div className="font-mono font-semibold text-[#0F172A] mt-0.5">
                        {ex.value}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* 자주 묻는 질문 (FAQ) 및 데이터/캐시 정책 요약 */}
      <div className="bg-white border border-[#E2E8F0] rounded-xl p-5 space-y-4">
        <div className="flex items-center gap-2">
          <HelpCircle className="w-4 h-4 text-[#2E7D5B]" />
          <h3 className="text-base font-bold text-[#0F172A]">
            자주 묻는 질문 (FAQ) 및 데이터·캐시 동작 안내
          </h3>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="border border-[#E2E8F0] rounded-xl p-4 bg-[#F8FAFC] space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#0F172A]">
              <Clock className="w-3.5 h-3.5 text-[#2E7D5B]" />
              <span>Q. 재무제표와 시세 캐시 주기는 어떻게 되나요?</span>
            </div>
            <p className="text-xs text-[#475569] leading-relaxed">
              모든 응답은 로컬 SQLite에 자동 캐시됩니다. <strong>재무제표는 하루(24시간)</strong>, <strong>시세는 1분(60초)</strong> 동안 재사용하며, 호출 제한(SEC 초당 10회, Finnhub 분당 60회)을 엄격히 지킵니다.
            </p>
          </div>

          <div className="border border-[#E2E8F0] rounded-xl p-4 bg-[#F8FAFC] space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#0F172A]">
              <Database className="w-3.5 h-3.5 text-[#2E7D5B]" />
              <span>Q. API 호출에 실패하거나 키가 없으면 어떻게 되나요?</span>
            </div>
            <p className="text-xs text-[#475569] leading-relaxed">
              호출에 실패하면 화면 상단에 한글 안내 메시지를 띄우고, 로컬 데이터베이스에 저장된 <strong>마지막 수신 값과 그 시각(YYYY-MM-DD HH:mm:ss)</strong>을 안전하게 보여줍니다.
            </p>
          </div>

          <div className="border border-[#E2E8F0] rounded-xl p-4 bg-[#F8FAFC] space-y-1.5">
            <div className="flex items-center gap-1.5 text-xs font-bold text-[#0F172A]">
              <Terminal className="w-3.5 h-3.5 text-[#2E7D5B]" />
              <span>Q. 대응표(mapping.json)에 없는 재무 항목은 어떻게 표시되나요?</span>
            </div>
            <p className="text-xs text-[#475569] leading-relaxed">
              기본 140개 이상의 주요 항목은 한글로 변환되며, 대응표에 없는 신규 항목은 누락하지 않고 <strong>원문 그대로 표시</strong>합니다. 표 우측 편집 버튼으로 언제든 한글명을 부여할 수 있습니다.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
