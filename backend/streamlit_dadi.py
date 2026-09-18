"""
Ask Dadi - Streamlit Test Console
==================================
Browser-based tester for the 'Ask Dadi' agent (app/services/assistant_service.py).
Unicode/Hinglish/Devanagari renders and types perfectly here - unlike the TUI.

Run (from backend/):
    .venv\\Scripts\\python.exe -m streamlit run streamlit_dadi.py --server.headless true

Uses the SAME service call as POST /api/v1/assistant/dadi (get_dadi_advice),
so what you validate here is exactly what the frontend gets.
"""

import asyncio
import time
from datetime import datetime
from typing import Dict, Any, List

import streamlit as st

from app.schemas.assistant import DadiQueryRequest
from app.services.assistant_service import AskDadiService, TOOL_BACKENDS, TOOL_DESCRIPTIONS

st.set_page_config(
    page_title="Ask Dadi — Agent Console",
    page_icon="🧓",
    layout="centered",
    initial_sidebar_state="expanded",
)

# ---------------------------------------------------------------------------
# Service (cached across reruns; force-fresh via sidebar button)
# ---------------------------------------------------------------------------


@st.cache_resource(show_spinner=False)
def get_service() -> AskDadiService:
    return AskDadiService()


def reset_service() -> None:
    get_service.clear()
    st.session_state.messages = []
    st.session_state.tool_events = []
    st.session_state.latencies = []


service = get_service()


def run_agent(user_text: str, dialect: str, category: str, history: List[Dict[str, str]]) -> str:
    """Bridge Streamlit's sync world to the async service; returns answer text."""
    request = DadiQueryRequest(
        query_text=user_text,
        dialect=dialect,
        product_category=category,
        chat_history=history,
    )
    return asyncio.run(service.get_dadi_advice(request)).answer_text


# ---------------------------------------------------------------------------
# Session state
# ---------------------------------------------------------------------------
if "messages" not in st.session_state:
    st.session_state.messages = []          # [{"role": "user"|"assistant", "content": str}]
if "tool_events" not in st.session_state:
    st.session_state.tool_events = []       # [{"tool", "args", "latency_ms", "result"}]
if "latencies" not in st.session_state:
    st.session_state.latencies = []         # per-turn answer latency (ms)

# ---------------------------------------------------------------------------
# Sidebar: status + controls
# ---------------------------------------------------------------------------
with st.sidebar:
    st.header("🧓 Ask Dadi Console")

    st.subheader("Agent status")
    if service.mode == "online":
        st.success(f"ONLINE — tool-calling agent\n\nModel: `{service.llm.model_name}`")
    else:
        st.warning("OFFLINE — knowledge-base mentor")
        st.caption("Add `GROQ_API_KEY` + `GROQ_MODEL=openai/gpt-oss-120b` to backend/.env, then click ⟳ Reload agent.")

    langsmith_on = service.mode == "online"  # placeholder, real check below
    try:
        from app.config import get_settings

        _s = get_settings()
        if _s.LANGSMITH_TRACING and _s.LANGSMITH_API_KEY:
            st.info(f"LangSmith: ON → `{_s.LANGSMITH_PROJECT}`")
        else:
            st.caption("LangSmith: off")
    except Exception:
        st.caption("LangSmith: unknown")

    st.subheader("Conversation")
    dialect = st.selectbox(
        "Dialect",
        ["bhojpuri", "maithili", "hindi", "english"],
        index=2,
        help="Language Dadi replies in",
    )
    category = st.selectbox(
        "Craft category",
        ["handloom", "pottery", "woodcraft", "metalwork", "embroidery", "painting"],
        index=0,
    )

    c1, c2 = st.columns(2)
    if c1.button("🧹 Clear chat", use_container_width=True):
        st.session_state.messages = []
        st.session_state.tool_events = []
        st.session_state.latencies = []
        st.rerun()
    if c2.button("⟳ Reload agent", use_container_width=True):
        reset_service()
        st.rerun()

    st.subheader("Quick tests")
    st.caption("One-tap scenario queries (sent as your message):")
    for label, q, d in [
        ("📸 Camera advice (Bhojpuri)", "हमार साड़ी के फोटो कैसन खींची जेकरा से GeM पर बढ़िया दिखे?", "bhojpuri"),
        ("💰 Pricing math (Hindi)", "1200 rupaye ka mall hai, 40 ghante mehnat lagi, daam kya rakhu?", "hindi"),
        ("➡️ Follow-up (memory)", "aur thoda discount milega kya?", "hindi"),
        ("🏛️ Wage floor (English)", "How much is the government wage in Bihar?", "english"),
        ("🎓 PM-DAKSH (Hindi)", "PM-DAKSH me kaise naam likhau aur kya milega?", "hindi"),
    ]:
        if st.button(label, key=f"qt_{label}", use_container_width=True):
            st.session_state.pending_query = (q, d)
            st.rerun()

    st.subheader("Tool playground")
    st.caption("Call the agent's tools directly (no LLM):")
    if st.button("⚙️ explain_fair_price", use_container_width=True):
        st.session_state.show_price_tool = True
    if st.button("🗺️ get_state_wage_floor", use_container_width=True):
        st.session_state.show_wage_tool = True
    if st.button("🖼️ analyze_craft_photo", use_container_width=True):
        st.session_state.show_photo_tool = True

# ---------------------------------------------------------------------------
# Tool playgrounds (sidebar-triggered expanders)
# ---------------------------------------------------------------------------
if st.session_state.get("show_price_tool"):
    with st.expander("⚙️ explain_fair_price — live", open=True):
        mc, hc, sc = st.columns(3)
        m = mc.number_input("Material ₹", min_value=0.0, value=1200.0, step=50.0)
        h = hc.number_input("Labor hrs", min_value=0.5, value=40.0, step=0.5)
        s_code = sc.text_input("State", value="HR")
        gi = st.checkbox("GI tagged", value=True)
        if st.button("Run tool", key="run_price"):
            from app.services.assistant_service import explain_fair_price_tool

            t0 = time.perf_counter()
            res = explain_fair_price_tool(m, h, state_code=s_code.upper(), craft_category=category, has_gi_tag=gi)
            ms = (time.perf_counter() - t0) * 1000
            st.metric("Suggested retail ₹", f"{res['suggested_retail_price']:,.0f}")
            st.metric("Floor ₹", f"{res['floor_price']:,.0f}")
            st.json(res)
            st.session_state.tool_events.append(
                {"tool": "explain_fair_price", "latency_ms": round(ms), "status": res.get("status")}
            )

if st.session_state.get("show_wage_tool"):
    with st.expander("🗺️ get_state_wage_floor — live", open=True):
        w_state = st.text_input("State code", value="BR")
        if st.button("Run tool", key="run_wage"):
            from app.services.assistant_service import get_state_wage_floor_tool

            res = get_state_wage_floor_tool(state_code=w_state.upper())
            st.success(res["note"])
            st.json(res)

if st.session_state.get("show_photo_tool"):
    with st.expander("🖼️ analyze_craft_photo — live", open=True):
        up = st.file_uploader("Craft photo", type=["jpg", "jpeg", "png"])
        if up is not None and st.button("Analyze photo", key="run_photo"):
            from app.services.assistant_service import analyze_craft_photo_tool
            import base64

            b64 = base64.b64encode(up.getvalue()).decode()
            res = analyze_craft_photo_tool(image_source=b64)
            if res.get("status") == "success":
                a, b, c = st.columns(3)
                a.metric("Complexity", res["complexity_score"])
                b.metric("Brightness", res["avg_brightness_0_to_255"])
                c.metric("Blur score", res["blur_score_laplacian_variance"])
                for tip in res["photo_tips"]:
                    st.write(f"- {tip}")
            else:
                st.error(res.get("error", "analysis failed"))
            st.json(res)

# ---------------------------------------------------------------------------
# Main chat area
# ---------------------------------------------------------------------------
st.title("🧓 Ask Dadi — दादी से पूछो")
st.caption(
    "Conversational dialect mentor • camera advice • fair-wage pricing • PM-DAKSH "
    f"• dialect: **{dialect}** • category: **{category}**"
)

# Render history
for msg in st.session_state.messages:
    avatar, name = ("🧑‍🌾", "You") if msg["role"] == "user" else ("🧓", "Dadi")
    with st.chat_message(name, avatar=avatar):
        st.markdown(msg["content"])

# Handle sidebar quick-test injection
pending = st.session_state.pop("pending_query", None)

# Chat input (Devanagari typing works here)
user_input = st.chat_input("अपना सवाल लिखिए… (type in Hindi/Hinglish/English)")
if pending:
    user_input, forced_dialect = pending
    dialect = forced_dialect  # quick tests fix the dialect for that turn

if user_input:
    st.session_state.messages.append({"role": "user", "content": user_input})
    with st.chat_message("You", avatar="🧑‍🌾"):
        st.markdown(user_input)

    t0 = time.perf_counter()
    with st.chat_message("Dadi", avatar="🧓"):
        with st.spinner("Dadi soch rahi hai…"):
            try:
                answer = run_agent(
                    user_input,
                    dialect,
                    category,
                    st.session_state.messages[:-1],  # history BEFORE this turn
                )
            except Exception as exc:
                answer = f"⚠️ Agent error: {exc}"
    ms = (time.perf_counter() - t0) * 1000
    st.session_state.latencies.append(round(ms))
    st.session_state.messages.append({"role": "assistant", "content": answer})
    with st.chat_message("Dadi", avatar="🧓"):
        st.markdown(answer)
        st.caption(f"⏱ {ms:.0f} ms • {'ONLINE agent' if service.mode == 'online' else 'OFFLINE mentor'}")

    st.rerun()

# ---------------------------------------------------------------------------
# Footer stats
# ---------------------------------------------------------------------------
if st.session_state.tool_events or st.session_state.latencies:
    with st.expander("📊 Session diagnostics"):
        if st.session_state.latencies:
            st.line_chart(st.session_state.latencies)
            st.caption(f"Answer latency per turn (ms) • last: {st.session_state.latencies[-1]} ms")
        if st.session_state.tool_events:
            st.dataframe(st.session_state.tool_events, use_container_width=True)
        if st.button("🧹 Clear chat", key="clear_bottom"):
            st.session_state.messages = []
            st.session_state.tool_events = []
            st.session_state.latencies = []
            st.rerun()

st.divider()
st.caption(
    f"Mode: **{service.mode.upper()}** • Tools registered: {len(TOOL_BACKENDS)} "
    "(explain_fair_price, get_state_wage_floor, analyze_craft_photo) • "
    "Same contract as POST /api/v1/assistant/dadi"
)
