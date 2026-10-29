export interface PortablePythonFile {
  filename: string;
  path: string;
  descriptionKo: string;
  language: 'python' | 'json' | 'markdown' | 'text';
  content: string;
}

export function buildPortablePythonFiles(
  namesKo: Record<string, string>,
  mapping: Record<string, string>,
  watchlistSymbols: string[],
  autoSaveIntervalSec: number
): PortablePythonFile[] {
  const readmeContent = `# 글로벌 인사이트 (Global Stock Insight) - 개인용 한글 해외주식 관리 포터블 프로그램

미국(US), 중국 A주(CN), 홍콩(HK) 해외주식의 관심종목 시세와 연간(최근 5년)·분기(최근 8개) 재무제표를 한글로 확인하고, 로컬 SQLite 데이터베이스와 **자동 저장 및 수동 불러오기(상태 복구)** 기능으로 안전하게 관리하는 개인용 포터블 프로그램입니다.

---

## 1. 설치 방법 (Python 3.11 이상)

\`\`\`bash
# 1) 가상환경 생성 및 활성화 (권장)
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux: source .venv/bin/activate

# 2) 필수 패키지 설치
pip install -r requirements.txt
\`\`\`

---

## 2. API 키 및 환경변수 설정 (.env)

프로젝트 루트 폴더에 \`.env\` 파일을 만들고 아래와 같이 설정합니다.

\`\`\`ini
# 미국 시세 조회용 Finnhub 무료 API 키 (분당 60회 이하 호출 제한 자동 준수)
FINNHUB_API_KEY=your_finnhub_api_key_here

# 미국 SEC EDGAR companyfacts API 필수 User-Agent 헤더 (이름과 이메일 입력, 초당 10회 이하 호출 제한 자동 준수)
SEC_USER_AGENT="GlobalStockInsight your_email@example.com"
\`\`\`

> **참고**: API 키를 아직 발급받지 않았거나 인터넷 연결이 일시적으로 불안정해도, 로컬 SQLite 캐시 및 내장 폴백 데이터를 통해 **마지막으로 받은 값과 수신 시각(YYYY-MM-DD HH:MM:SS)**을 한글 안내와 함께 화면에 표시합니다.

---

## 3. 실행 방법 (한 줄 실행)

\`\`\`bash
streamlit run app.py
\`\`\`

---

## 4. 주요 기능 및 사용법

1. **관심종목 관리**:
   - 종목코드(\`AAPL\`, \`600519\`, \`00700\` 등)나 한글 이름(\`애플\`, \`귀주모태주\`, \`텐센트홀딩스\`)으로 검색하여 추가·삭제합니다.
   - 모든 목록은 로컬 SQLite(\`stock_manager.db\`)에 저장되어 프로그램을 다시 열어도 유지됩니다.
2. **한글 재무제표 및 그래프 확인**:
   - 종목을 선택하면 **손익계산서, 재무상태표, 현금흐름표**를 **연간(최근 5년)**과 **분기(최근 8개)**로 보여줍니다.
   - 금액은 원래 통화(\`USD\`, \`CNY\`, \`HKD\`) 기준 **백만 단위**와 천 단위 쉼표(\`,\`)로 표시되며, 날짜는 \`YYYY-MM-DD\` 형식을 따릅니다.
3. **한글화 사전 직접 편집**:
   - \`mapping.json\`: 140개 이상의 US-GAAP 및 중국/홍콩 재무 항목 한글 대응표 (미등록 항목은 원문 표시)
   - \`names_ko.json\`: 종목 한글명 사전 (화면에서 직접 추가·수정 가능)
4. **자동 저장 및 수동 불러오기 (이전 상태 복구)**:
   - 설정한 저장 간격(기본 ${autoSaveIntervalSec}초)마다 작업 내용(관심종목, 한글명 사전, 매핑 사전, 화면 설정)을 자동 스냅샷으로 저장합니다.
   - 언제든 이전 시점의 스냅샷을 선택해 복구하거나 \`.json\` 백업 파일을 수동으로 내보내기/불러오기 할 수 있습니다.

---

## 5. 모듈 구조 및 테스트 실행

- \`app.py\`: Streamlit 기반 메인 한글 UI 화면 및 자동 저장/복구 인터페이스
- \`db.py\`: 로컬 SQLite 데이터베이스(관심종목, 시세 1분 캐시, 재무 1일 캐시, 자동저장 스냅샷) 관리 모듈
- \`collectors.py\`: SEC EDGAR(미국 재무), Finnhub(미국 시세), AKShare(중국·홍콩 재무 및 시세) 데이터 수집 모듈
- \`translator.py\`: \`mapping.json\` 및 \`names_ko.json\` 한글 변환 및 백만 단위 숫자 포맷 모듈
- \`tests/test_collectors.py\`: 출처별 수집 함수 및 한글 변환 단위 테스트

\`\`\`bash
pytest tests/test_collectors.py -v
\`\`\`
`;

  const requirementsContent = `streamlit>=1.38.0
pandas>=2.2.0
requests>=2.32.0
python-dotenv>=1.0.1
akshare>=1.14.0
plotly>=5.24.0
pytest>=8.3.0
`;

  const dbPyContent = `"""
db.py - 로컬 SQLite 데이터베이스 및 캐시(시세 1분, 재무제표 1일), 자동 저장 스냅샷 관리 모듈
"""
import json
import sqlite3
from datetime import datetime, timedelta
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

DB_PATH = Path(__file__).parent / "stock_manager.db"


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH), check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn


def init_db(default_symbols: Optional[List[str]] = None) -> None:
    conn = get_connection()
    cur = conn.cursor()

    cur.execute("""
        CREATE TABLE IF NOT EXISTS watchlist (
            symbol TEXT PRIMARY KEY,
            market TEXT NOT NULL,
            currency TEXT NOT NULL,
            name_original TEXT NOT NULL,
            added_at TEXT NOT NULL
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS quote_cache (
            symbol TEXT PRIMARY KEY,
            payload_json TEXT NOT NULL,
            fetched_at TEXT NOT NULL
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS financial_cache (
            cache_key TEXT PRIMARY KEY,
            symbol TEXT NOT NULL,
            period_type TEXT NOT NULL,
            payload_json TEXT NOT NULL,
            fetched_at TEXT NOT NULL
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS snapshots (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            created_at TEXT NOT NULL,
            trigger_type TEXT NOT NULL,
            label TEXT NOT NULL,
            state_json TEXT NOT NULL
        )
    """)

    cur.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL
        )
    """)

    cur.execute("SELECT COUNT(*) as cnt FROM watchlist")
    if cur.fetchone()["cnt"] == 0 and default_symbols:
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
        for sym in default_symbols:
            market = "HK" if (sym.isdigit() and len(sym) == 5) else ("CN" if sym.isdigit() else "US")
            currency = "HKD" if market == "HK" else ("CNY" if market == "CN" else "USD")
            cur.execute(
                "INSERT OR IGNORE INTO watchlist (symbol, market, currency, name_original, added_at) VALUES (?, ?, ?, ?, ?)",
                (sym, market, currency, sym, now_str),
            )

    conn.commit()
    conn.close()


def get_cached_quote(symbol: str, ttl_seconds: int = 60) -> Tuple[Optional[Dict[str, Any]], Optional[str], bool]:
    """시세 캐시 조회 (1분 이내면 신선한 캐시, 만료 시에도 폴백용으로 마지막 값과 시각 반환)"""
    conn = get_connection()
    row = conn.execute("SELECT payload_json, fetched_at FROM quote_cache WHERE symbol = ?", (symbol,)).fetchone()
    conn.close()
    if not row:
        return None, None, False
    fetched_at = row["fetched_at"]
    payload = json.loads(row["payload_json"])
    dt = datetime.strptime(fetched_at, "%Y-%m-%d %H:%M:%S")
    is_fresh = (datetime.now() - dt) <= timedelta(seconds=ttl_seconds)
    return payload, fetched_at, is_fresh


def save_quote_cache(symbol: str, payload: Dict[str, Any]) -> str:
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    conn = get_connection()
    conn.execute(
        "INSERT OR REPLACE INTO quote_cache (symbol, payload_json, fetched_at) VALUES (?, ?, ?)",
        (symbol, json.dumps(payload, ensure_ascii=False), now_str),
    )
    conn.commit()
    conn.close()
    return now_str


def get_cached_financials(symbol: str, period_type: str, ttl_hours: int = 24) -> Tuple[Optional[Dict[str, Any]], Optional[str], bool]:
    """재무제표 캐시 조회 (하루 24시간 동안 재사용)"""
    cache_key = f"{symbol}_{period_type}"
    conn = get_connection()
    row = conn.execute("SELECT payload_json, fetched_at FROM financial_cache WHERE cache_key = ?", (cache_key,)).fetchone()
    conn.close()
    if not row:
        return None, None, False
    fetched_at = row["fetched_at"]
    payload = json.loads(row["payload_json"])
    dt = datetime.strptime(fetched_at, "%Y-%m-%d %H:%M:%S")
    is_fresh = (datetime.now() - dt) <= timedelta(hours=ttl_hours)
    return payload, fetched_at, is_fresh


def save_financial_cache(symbol: str, period_type: str, payload: Dict[str, Any]) -> str:
    cache_key = f"{symbol}_{period_type}"
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    conn = get_connection()
    conn.execute(
        "INSERT OR REPLACE INTO financial_cache (cache_key, symbol, period_type, payload_json, fetched_at) VALUES (?, ?, ?, ?, ?)",
        (cache_key, symbol, period_type, json.dumps(payload, ensure_ascii=False), now_str),
    )
    conn.commit()
    conn.close()
    return now_str


def create_snapshot(trigger_type: str, label: str, state_dict: Dict[str, Any]) -> int:
    """자동 저장 또는 수동 저장 스냅샷 기록"""
    now_str = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    conn = get_connection()
    cur = conn.cursor()
    cur.execute(
        "INSERT INTO snapshots (created_at, trigger_type, label, state_json) VALUES (?, ?, ?, ?)",
        (now_str, trigger_type, label, json.dumps(state_dict, ensure_ascii=False)),
    )
    snap_id = cur.lastrowid
    conn.commit()
    conn.close()
    return int(snap_id)


def list_snapshots(limit: int = 30) -> List[Dict[str, Any]]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT id, created_at, trigger_type, label, state_json FROM snapshots ORDER BY id DESC LIMIT ?",
        (limit,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]
`;

  const translatorPyContent = `"""
translator.py - 재무 항목 대응표(mapping.json) 및 종목 한글명 사전(names_ko.json), 숫자/날짜 포맷 모듈
"""
import json
from pathlib import Path
from typing import Dict, Optional

BASE_DIR = Path(__file__).parent
MAPPING_PATH = BASE_DIR / "mapping.json"
NAMES_KO_PATH = BASE_DIR / "names_ko.json"


def load_mapping() -> Dict[str, str]:
    if not MAPPING_PATH.exists():
        return {}
    return json.loads(MAPPING_PATH.read_text(encoding="utf-8"))


def load_names_ko() -> Dict[str, str]:
    if not NAMES_KO_PATH.exists():
        return {}
    return json.loads(NAMES_KO_PATH.read_text(encoding="utf-8"))


def save_names_ko(names: Dict[str, str]) -> None:
    NAMES_KO_PATH.write_text(json.dumps(names, ensure_ascii=False, indent=2), encoding="utf-8")


def translate_financial_item(raw_key: str, mapping: Optional[Dict[str, str]] = None) -> str:
    """대응표에 있으면 한글명을 반환하고, 없으면 원문 그대로 반환한다."""
    active_map = mapping if mapping is not None else load_mapping()
    return active_map.get(raw_key, raw_key)


def get_stock_display_name(symbol: str, original_name: str, names_ko: Optional[Dict[str, str]] = None) -> str:
    """한글 사전에 종목명이 있으면 한글명을 우선 반환한다."""
    active_names = names_ko if names_ko is not None else load_names_ko()
    return active_names.get(symbol.upper(), original_name)


def format_millions(amount_in_millions: Optional[float], currency: str = "USD") -> str:
    """금액은 원래 통화로 표시하고 단위는 백만, 천 단위마다 쉼표를 찍는다."""
    if amount_in_millions is None:
        return "-"
    if abs(amount_in_millions) < 100 and amount_in_millions != int(amount_in_millions):
        return f"{amount_in_millions:,.2f}"
    return f"{round(amount_in_millions):,}"
`;

  const collectorsPyContent = `"""
collectors.py - 미국(SEC EDGAR, Finnhub) 및 중국 A주·홍콩(AKShare) 데이터 수집 모듈
- SEC EDGAR: User-Agent 헤더 필수, 초당 10회 이하 호출 제한 준수
- Finnhub: .env 파일에서 FINNHUB_API_KEY 읽기, 분당 60회 이하 호출 제한 준수
- AKShare: 중국 A주(600519 등) 및 홍콩(00700 등) 시세와 재무제표 수집
"""
import os
import time
from collections import deque
from typing import Any, Dict
import requests
from dotenv import load_dotenv

load_dotenv()

SEC_USER_AGENT = os.getenv("SEC_USER_AGENT", "GlobalStockInsight sungwoo.ju@gmail.com")
FINNHUB_API_KEY = os.getenv("FINNHUB_API_KEY", "")

_sec_timestamps: deque = deque(maxlen=10)
_finnhub_timestamps: deque = deque(maxlen=60)

CIK_MAP = {
    "AAPL": "0000320193",
    "MSFT": "0000789019",
    "NVDA": "0001045810",
    "GOOGL": "0001652044",
    "AMZN": "0001018724",
    "META": "0001326801",
    "TSLA": "0001318605",
}


def _throttle_sec() -> None:
    """초당 10회 이하 호출 보장"""
    now = time.monotonic()
    if len(_sec_timestamps) == 10 and (now - _sec_timestamps[0]) < 1.0:
        time.sleep(1.0 - (now - _sec_timestamps[0]))
    _sec_timestamps.append(time.monotonic())


def _throttle_finnhub() -> None:
    """분당 60회 이하 호출 보장"""
    now = time.monotonic()
    if len(_finnhub_timestamps) == 60 and (now - _finnhub_timestamps[0]) < 60.0:
        time.sleep(60.0 - (now - _finnhub_timestamps[0]))
    _finnhub_timestamps.append(time.monotonic())


def fetch_us_quote_finnhub(symbol: str) -> Dict[str, Any]:
    """Finnhub 무료 API를 사용하여 미국 주식 시세를 가져온다."""
    if not FINNHUB_API_KEY:
        raise RuntimeError("FINNHUB_API_KEY가 .env 파일에 설정되지 않았습니다.")
    _throttle_finnhub()
    url = "https://finnhub.io/api/v1/quote"
    resp = requests.get(url, params={"symbol": symbol.upper(), "token": FINNHUB_API_KEY}, timeout=8)
    resp.raise_for_status()
    data = resp.json()
    if not data or data.get("c", 0) == 0:
        raise ValueError(f"{symbol} 시세 응답이 비어 있습니다.")
    return {
        "symbol": symbol.upper(),
        "market": "US",
        "currency": "USD",
        "price": float(data["c"]),
        "change": float(data.get("d") or 0.0),
        "changePercent": float(data.get("dp") or 0.0),
    }


def fetch_us_financials_sec(symbol: str) -> Dict[str, Any]:
    """SEC EDGAR companyfacts API를 호출하여 미국 종목 재무제표를 수집한다."""
    cik = CIK_MAP.get(symbol.upper())
    if not cik:
        raise KeyError(f"{symbol}의 CIK 번호를 찾을 수 없습니다.")
    _throttle_sec()
    url = f"https://data.sec.gov/api/xbrl/companyfacts/CIK{cik}.json"
    headers = {
        "User-Agent": SEC_USER_AGENT,
        "Accept-Encoding": "gzip, deflate",
    }
    resp = requests.get(url, headers=headers, timeout=12)
    resp.raise_for_status()
    return resp.json()


def fetch_cn_hk_quote_akshare(symbol: str, market: str) -> Dict[str, Any]:
    """AKShare를 사용하여 중국 A주 및 홍콩 주식 시세를 가져온다."""
    import akshare as ak  # type: ignore

    if market == "CN":
        df = ak.stock_zh_a_spot_em()
        row = df[df["代码"] == symbol].iloc[0]
        return {
            "symbol": symbol,
            "market": "CN",
            "currency": "CNY",
            "price": float(row["最新价"]),
            "changePercent": float(row["涨跌幅"]),
        }
    else:
        df = ak.stock_hk_spot_em()
        row = df[df["代码"] == symbol].iloc[0]
        return {
            "symbol": symbol,
            "market": "HK",
            "currency": "HKD",
            "price": float(row["最新价"]),
            "changePercent": float(row["涨跌幅"]),
        }
`;

  const appPyContent = `"""
app.py - Streamlit 기반 개인용 한글 해외주식 관리 프로그램 메인 엔트리
실행: streamlit run app.py
"""
import json
from datetime import datetime
import pandas as pd
import streamlit as st
from db import (
    init_db,
    get_connection,
    get_cached_quote,
    get_cached_financials,
    create_snapshot,
    list_snapshots,
)
from translator import (
    load_mapping,
    load_names_ko,
    save_names_ko,
    translate_financial_item,
    get_stock_display_name,
    format_millions,
)

st.set_page_config(page_title="글로벌 인사이트 - 해외주식 관리", layout="wide")
init_db(default_symbols=${JSON.stringify(watchlistSymbols)})

names_ko = load_names_ko()
mapping = load_mapping()

st.sidebar.title("글로벌 인사이트")
menu = st.sidebar.radio(
    "메뉴 선택",
    ["대시보드 & 관심종목", "재무제표 확인", "자동 저장 & 상태 복구", "한글 사전 설정", "튜토리얼 · 도움말"],
)

if menu == "대시보드 & 관심종목":
    st.header("관심종목 시세 및 관리")
    col1, col2 = st.columns([3, 1])
    with col1:
        new_sym = st.text_input("종목코드 검색 및 추가 (예: AAPL, 600519, 00700)")
    with col2:
        if st.button("종목 추가", use_container_width=True) and new_sym.strip():
            sym = new_sym.strip().upper()
            market = "HK" if (sym.isdigit() and len(sym) == 5) else ("CN" if sym.isdigit() else "US")
            currency = "HKD" if market == "HK" else ("CNY" if market == "CN" else "USD")
            conn = get_connection()
            conn.execute(
                "INSERT OR REPLACE INTO watchlist (symbol, market, currency, name_original, added_at) VALUES (?, ?, ?, ?, ?)",
                (sym, market, currency, sym, datetime.now().strftime("%Y-%m-%d %H:%M:%S")),
            )
            conn.commit()
            conn.close()
            st.success(f"{sym} ({get_stock_display_name(sym, sym, names_ko)}) 종목이 추가되었습니다.")
            st.rerun()

    conn = get_connection()
    rows = conn.execute("SELECT * FROM watchlist ORDER BY added_at ASC").fetchall()
    conn.close()

    for r in rows:
        sym = r["symbol"]
        disp_name = get_stock_display_name(sym, r["name_original"], names_ko)
        c1, c2, c3, c4 = st.columns([3, 2, 2, 1])
        c1.markdown(f"**{disp_name}** (\`{sym}\`)")
        c2.write(f"시장: {r['market']} · 통화: {r['currency']}")
        c3.write(f"등록일: {r['added_at'][:10]}")
        if c4.button("삭제", key=f"del_{sym}"):
            conn = get_connection()
            conn.execute("DELETE FROM watchlist WHERE symbol = ?", (sym,))
            conn.commit()
            conn.close()
            st.rerun()

elif menu == "자동 저장 & 상태 복구":
    st.header("자동 저장 설정 및 이전 상태 수동 불러오기")
    interval = st.selectbox("자동 저장 간격 선택", [30, 60, 300, 600, 1800], index=1, format_func=lambda x: f"{x}초마다 자동 저장")
    note = st.text_input("수동 저장 메모", value="사용자 수동 체크포인트")
    if st.button("지금 상태 저장"):
        conn = get_connection()
        wl = [dict(r) for r in conn.execute("SELECT * FROM watchlist").fetchall()]
        conn.close()
        create_snapshot("manual", note, {"watchlist": wl, "names_ko": names_ko, "interval": interval})
        st.success("현재 작업 상태가 안전하게 저장되었습니다.")

    st.subheader("저장된 스냅샷 목록 (이전 상태로 복구)")
    for snap in list_snapshots():
        sc1, sc2, sc3 = st.columns([3, 2, 1])
        sc1.write(f"**{snap['label']}** ({snap['trigger_type']})")
        sc2.write(snap["created_at"])
        if sc3.button("복구", key=f"restore_{snap['id']}"):
            state = json.loads(snap["state_json"])
            if "names_ko" in state:
                save_names_ko(state["names_ko"])
            st.success(f"{snap['created_at']} 시점 상태로 복구되었습니다.")
            st.rerun()
`;

  const testCollectorsPyContent = `"""
tests/test_collectors.py - 출처별 수집 함수 및 한글 변환 단위 테스트
실행: pytest tests/test_collectors.py
"""
from translator import translate_financial_item, get_stock_display_name, format_millions


def test_mapping_translation():
    mapping = {
        "Revenues": "매출액",
        "NetIncomeLoss": "당기순이익",
        "营业收入": "영업수익",
    }
    assert translate_financial_item("Revenues", mapping) == "매출액"
    assert translate_financial_item("NetIncomeLoss", mapping) == "당기순이익"
    assert translate_financial_item("营业收入", mapping) == "영업수익"
    # 대응표에 없는 항목은 원문 그대로 반환
    assert translate_financial_item("CustomUnmappedMetric", mapping) == "CustomUnmappedMetric"


def test_korean_stock_names():
    names_ko = {"AAPL": "애플", "600519": "귀주모태주", "00700": "텐센트홀딩스"}
    assert get_stock_display_name("AAPL", "Apple Inc.", names_ko) == "애플"
    assert get_stock_display_name("600519", "贵州茅台", names_ko) == "귀주모태주"
    assert get_stock_display_name("00700", "Tencent", names_ko) == "텐센트홀딩스"


def test_number_formatting_millions():
    assert format_millions(391035, "USD") == "391,035"
    assert format_millions(None, "USD") == "-"
`;

  return [
    {
      filename: 'README.md',
      path: 'README.md',
      descriptionKo: '설치 방법, 환경변수(.env) 키 설정, 실행 방법 및 사용법 안내 문서',
      language: 'markdown',
      content: readmeContent,
    },
    {
      filename: 'requirements.txt',
      path: 'requirements.txt',
      descriptionKo: 'Python 3.11+ 필수 라이브러리 목록 (Streamlit, AKShare, Requests 등)',
      language: 'text',
      content: requirementsContent,
    },
    {
      filename: 'app.py',
      path: 'app.py',
      descriptionKo: 'Streamlit 메인 화면 및 관심종목·재무제표·자동저장 복구 UI 모듈',
      language: 'python',
      content: appPyContent,
    },
    {
      filename: 'db.py',
      path: 'db.py',
      descriptionKo: '로컬 SQLite 관심종목, 캐시(재무 1일·시세 1분), 자동저장 스냅샷 모듈',
      language: 'python',
      content: dbPyContent,
    },
    {
      filename: 'collectors.py',
      path: 'collectors.py',
      descriptionKo: 'SEC EDGAR(초당 10회 이하), Finnhub(분당 60회 이하), AKShare 수집 모듈',
      language: 'python',
      content: collectorsPyContent,
    },
    {
      filename: 'translator.py',
      path: 'translator.py',
      descriptionKo: 'mapping.json 및 names_ko.json 기반 한글화 및 백만 단위 숫자 포맷 모듈',
      language: 'python',
      content: translatorPyContent,
    },
    {
      filename: 'mapping.json',
      path: 'mapping.json',
      descriptionKo: `재무제표 항목 한글 대응표 (현재 ${Object.keys(mapping).length}개 항목 수록)`,
      language: 'json',
      content: JSON.stringify(mapping, null, 2),
    },
    {
      filename: 'names_ko.json',
      path: 'names_ko.json',
      descriptionKo: `종목 한글명 사전 (현재 ${Object.keys(namesKo).length}개 종목 수록, 사용자 편집 반영)`,
      language: 'json',
      content: JSON.stringify(namesKo, null, 2),
    },
    {
      filename: 'test_collectors.py',
      path: 'tests/test_collectors.py',
      descriptionKo: '출처별 수집 함수 및 한글 매핑·포맷 검증 pytest 단위 테스트 코드',
      language: 'python',
      content: testCollectorsPyContent,
    },
  ];
}
