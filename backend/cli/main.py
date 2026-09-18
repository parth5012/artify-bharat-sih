"""
Artify Bharat - 'Ask Dadi' Agent CLI
=====================================
A developer harness to test the Ask Dadi conversational agent
(backend/app/services/assistant_service.py) straight from the terminal,
without starting the FastAPI server.

Run from the backend/ directory:

    python -m cli                    # interactive Dadi chat REPL
    python -m cli chat               # same as above
    python -m cli ask "daam kaise..."# one-shot query through the full agent
    python -m cli price 1200 40 --state HR --craft saree
    python -m cli wage BR            # statutory wage floor lookup
    python -m cli photo test_saree.jpg
    python -m cli tools              # list the agent's LangChain tools
    python -m cli reels              # PM-DAKSH Learn & Earn reels
    python -m cli demo               # canned end-to-end demo queries
    python -m cli status             # online (Groq) vs offline mode + deps

Session commands inside the chat REPL: /mode /dialect /history /clear /tools /help /exit
"""

import argparse
import asyncio
import os
import sys
from typing import Dict, Any, List, Optional

from cli.chat import run_chat_repl
from cli.display import (
    print_error,
    print_header,
    print_info,
    print_json,
    print_mode_banner,
    print_success,
    print_warning,
)

# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------


def _get_service():
    """Instantiate a fresh AskDadiService (honors GROQ_API_KEY env)."""
    from app.services.assistant_service import AskDadiService

    return AskDadiService()


async def _advice_once(service, query_text: str, dialect: str, category: str) -> Dict[str, Any]:
    """Run one get_dadi_advice() call and return the response dict."""
    from app.schemas.assistant import DadiQueryRequest

    request = DadiQueryRequest(
        query_text=query_text,
        dialect=dialect,
        product_category=category,
    )
    response = await service.get_dadi_advice(request)
    return response.model_dump()


# ---------------------------------------------------------------------------
# Status / diagnostics
# ---------------------------------------------------------------------------


def _print_status(service) -> None:
    from app.config import get_settings
    from app.services.assistant_service import TOOL_BACKENDS

    settings = get_settings()
    env_key = os.getenv("GROQ_API_KEY") or ""
    settings_key = (settings.GROQ_API_KEY or "").strip()
    key_present = bool(env_key or settings_key)
    key_valid = key_present and (env_key or settings_key).startswith("gsk_")
    print_header("Ask Dadi Agent Status")

    if service.mode == "online":
        model_id = os.getenv("GROQ_MODEL", settings.GROQ_MODEL)
        print_success("Mode: ONLINE (LangChain tool-calling agent via ChatGroq)")
        if "compound" in (model_id or ""):
            print_warning(
                f"Model '{model_id}' does NOT support custom tool calling "
                "(built-in-tool system). Set GROQ_MODEL=openai/gpt-oss-120b in backend/.env"
            )
        else:
            print_info(f"Model: {model_id}")
    else:
        print_warning("Mode: OFFLINE (deterministic knowledge-base mentor)")
        if not key_present:
            print_info("Reason: GROQ_API_KEY not found in environment or backend/.env")
            print_info("Enable:  add 'GROQ_API_KEY=gsk_...' to backend/.env")
        elif not key_valid:
            print_info("Reason: GROQ_API_KEY is set but does not look valid (Groq keys start with 'gsk_')")
            print_info("Fix:     replace the placeholder/typo in backend/.env")
        else:
            print_info("Reason: langchain-groq package not installed -> cd backend && uv add langchain-groq")

    print_info(f"Registered tool backends ({len(TOOL_BACKENDS)}):")
    for name in TOOL_BACKENDS:
        print_info(f"  - {name}")

    try:
        import langchain_groq  # noqa: F401

        print_info("langchain-groq: installed")
    except ImportError:
        print_info("langchain-groq: NOT installed (online mode disabled)")

    # LangSmith observability status
    try:
        import langsmith  # noqa: F401

        ls_sdk = "installed"
    except ImportError:
        ls_sdk = "NOT installed"
    if settings.LANGSMITH_TRACING and settings.LANGSMITH_API_KEY:
        print_success(f"LangSmith: ENABLED -> project '{settings.LANGSMITH_PROJECT}' ({settings.LANGSMITH_ENDPOINT})")
    elif settings.LANGSMITH_TRACING:
        print_warning("LangSmith: tracing=true but LANGSMITH_API_KEY missing -> traces NOT sent")
    else:
        print_info(f"LangSmith: disabled (set LANGSMITH_TRACING=true + LANGSMITH_API_KEY; sdk {ls_sdk})")

    print_info(f"Config dir: {os.getcwd()}")


# ---------------------------------------------------------------------------
# Demo script
# ---------------------------------------------------------------------------

DEMO_QUERIES: List[Dict[str, str]] = [
    {
        "query": "हमार साड़ी के फोटो कैसन खींची जेकरा से GeM पर बढ़िया दिखे?",
        "dialect": "bhojpuri",
        "category": "handloom",
        "label": "Camera advice (Bhojpuri)",
    },
    {
        "query": "1200 rupaye ka mall hai, 40 ghante mehnat lagi, daam kya rakhu?",
        "dialect": "hindi",
        "category": "handloom",
        "label": "Pricing math with numbers (Hindi) -> runs REAL pricing engine",
    },
    {
        "query": "How much is the government wage in Bihar for skilled craft work?",
        "dialect": "english",
        "category": "handloom",
        "label": "Wage floor lookup (English)",
    },
    {
        "query": "PM-DAKSH me kaise naam likhau aur kya milega?",
        "dialect": "hindi",
        "category": "handloom",
        "label": "PM-DAKSH upskilling guidance",
    },
]


def _run_demo(service) -> None:
    print_mode_banner(service)
    for i, demo in enumerate(DEMO_QUERIES, 1):
        print_header(f"Demo {i}/{len(DEMO_QUERIES)} — {demo['label']}")
        print_info(f"You: {demo['query']}  [dialect={demo['dialect']}]")
        try:
            resp = asyncio.run(_advice_once(service, demo["query"], demo["dialect"], demo["category"]))
        except Exception as exc:
            print_error(f"Demo call failed: {exc}")
            continue
        print_info("Dadi:")
        print(resp["answer_text"])
        print()
        print_info(f"English : {resp['answer_english']}")
        print_info(f"Actions : {', '.join(resp['suggested_actions'])}")
        print_info(f"Tip     : {resp['dadi_tip']}")
        print()


# ---------------------------------------------------------------------------
# Subcommand builders
# ---------------------------------------------------------------------------


def _add_common_query_args(p: argparse.ArgumentParser) -> None:
    p.add_argument("--dialect", default="bhojpuri", help="bhojpuri | maithili | hindi | english")
    p.add_argument("--category", default="handloom", help="craft category, e.g. handloom, pottery")


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        prog="python -m cli",
        description="Artify Bharat — 'Ask Dadi' agent test CLI",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog=(
            "Examples:\n"
            '  python -m cli ask "daam kaise taye karein" --dialect hindi\n'
            "  python -m cli price 1200 40 --state HR --craft saree\n"
            "  python -m cli photo test_saree.jpg\n"
            "  python -m cli demo\n"
        ),
    )
    sub = parser.add_subparsers(dest="command")

    # chat (default when no command given)
    chat_p = sub.add_parser("chat", help="interactive Dadi chat REPL (default)")
    _add_common_query_args(chat_p)

    # ask
    ask_p = sub.add_parser("ask", help="one-shot query through the full agent")
    ask_p.add_argument("query", help="what to ask Dadi (quote it)")
    _add_common_query_args(ask_p)

    # price
    price_p = sub.add_parser("price", help="call explain_fair_price tool directly")
    price_p.add_argument("material_cost", type=float, help="raw material cost in INR")
    price_p.add_argument("labor_hours", type=float, help="hours of artisan labor")
    price_p.add_argument("--state", default="HR", help="state code (HR, BR, RJ, UP, DL, ...)")
    price_p.add_argument("--craft", default="handloom", help="craft category")
    price_p.add_argument("--no-gi", action="store_true", help="product has NO GI tag")
    price_p.add_argument("--festive", action="store_true", help="apply festive season multiplier")

    # wage
    wage_p = sub.add_parser("wage", help="call get_state_wage_floor tool directly")
    wage_p.add_argument("state", nargs="?", default="HR", help="state code (default HR)")

    # photo
    photo_p = sub.add_parser("photo", help="call analyze_craft_photo tool on an image")
    photo_p.add_argument("image", help="path to a jpg/png, or a base64 string / data URI")

    # tools
    sub.add_parser("tools", help="list the agent's registered tool backends")

    # reels
    sub.add_parser("reels", help="show PM-DAKSH Learn & Earn reels")

    # demo
    sub.add_parser("demo", help="run canned end-to-end demo queries")

    # status
    sub.add_parser("status", help="show agent mode (online/offline) and dependencies")

    return parser


# ---------------------------------------------------------------------------
# Command dispatch
# ---------------------------------------------------------------------------


def _cmd_price(args: argparse.Namespace) -> int:
    from app.services.assistant_service import explain_fair_price_tool

    result = explain_fair_price_tool(
        material_cost=args.material_cost,
        labor_hours=args.labor_hours,
        state_code=args.state,
        craft_category=args.craft,
        has_gi_tag=not args.no_gi,
        is_festive_season=args.festive,
    )
    print_header("explain_fair_price tool result")
    print_json(result)
    return 0


def _cmd_wage(args: argparse.Namespace) -> int:
    from app.services.assistant_service import get_state_wage_floor_tool

    result = get_state_wage_floor_tool(state_code=args.state)
    print_header(f"get_state_wage_floor tool result ({args.state})")
    print_json(result)
    return 0


def _cmd_photo(args: argparse.Namespace) -> int:
    from app.services.assistant_service import analyze_craft_photo_tool

    result = analyze_craft_photo_tool(image_source=args.image)
    print_header("analyze_craft_photo tool result")
    print_json(result)
    return 0 if result.get("status") == "success" else 1


def _cmd_tools() -> int:
    from app.services.assistant_service import TOOL_BACKENDS, TOOL_DESCRIPTIONS

    print_header(f"Ask Dadi tool backends ({len(TOOL_BACKENDS)})")
    for name, fn in TOOL_BACKENDS.items():
        print_success(f"{name}  ->  {fn.__module__}.{fn.__qualname__}")
        print_info(f"    {TOOL_DESCRIPTIONS.get(name, '')[:110]}...")
    return 0


def _cmd_reels() -> int:
    from app.services.assistant_service import assistant_service

    reels = assistant_service.get_learn_and_earn_reels()
    print_header(f"PM-DAKSH Learn & Earn reels ({len(reels)})")
    print_json(reels)
    return 0


def dispatch(args: argparse.Namespace) -> int:
    service = _get_service()

    if args.command == "status":
        _print_status(service)
        return 0

    if args.command == "tools":
        return _cmd_tools()

    if args.command == "price":
        return _cmd_price(args)

    if args.command == "wage":
        return _cmd_wage(args)

    if args.command == "photo":
        return _cmd_photo(args)

    if args.command == "reels":
        return _cmd_reels()

    if args.command == "demo":
        _run_demo(service)
        return 0

    if args.command == "ask":
        print_mode_banner(service)
        resp = asyncio.run(_advice_once(service, args.query, args.dialect, args.category))
        print_header("Dadi replies")
        print(resp["answer_text"])
        print()
        print_info(f"English : {resp['answer_english']}")
        print_info(f"Actions : {', '.join(resp['suggested_actions'])}")
        print_info(f"Tip     : {resp['dadi_tip']}")
        return 0

    # Default (no subcommand or explicit `chat`): interactive REPL
    run_chat_repl(service, dialect=getattr(args, "dialect", "bhojpuri"),
                  category=getattr(args, "category", "handloom"))
    return 0


def main(argv: Optional[List[str]] = None) -> int:
    # Windows terminals: make UTF-8 (₹, Devanagari) work without chcp games
    if sys.platform == "win32":
        os.system("")  # enable VT/ANSI colors in legacy consoles
        try:
            sys.stdout.reconfigure(encoding="utf-8", errors="replace")
            sys.stderr.reconfigure(encoding="utf-8", errors="replace")
        except (AttributeError, OSError):
            pass

    parser = build_parser()
    args = parser.parse_args(argv)
    try:
        return dispatch(args)
    except KeyboardInterrupt:
        print()
        print_info("Dadi: theek hai beta, phir milenge!")
        return 130
    except Exception as exc:  # surface a friendly message, not a traceback wall
        print_error(str(exc))
        if "--debug" in (argv or []):
            raise  # re-run with --debug to see the full traceback
        return 1
