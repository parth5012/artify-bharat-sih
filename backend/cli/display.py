"""
Tiny terminal-display helpers for the Ask Dadi CLI.

Keeps ANSI styling in one place; degrades gracefully on Windows legacy
consoles (no color detection, just safe escape codes + UTF-8 reconfigure
done in cli.main).
"""

import json
import sys
from typing import Any, Dict, Optional

# ANSI codes (enabled on win32 via os.system("") in cli.main)
_RESET = "\033[0m"
_BOLD = "\033[1m"
_DIM = "\033[2m"
_TERRACOTTA = "\033[38;5;173m"   # Material Terracotta (#C85A32) — brand accent
_INDIGO = "\033[38;5;61m"        # Heritage Indigo (#1A365D)
_GOLD = "\033[38;5;172m"         # Khadi Gold (#D97706)
_GREEN = "\033[38;5;71m"
_RED = "\033[38;5;167m"

_DADI_AVATAR = "🧓"


def _supports_color() -> bool:
    return sys.stdout is not None and sys.stdout.isatty()


def print_header(title: str) -> None:
    if _supports_color():
        print(f"\n{_BOLD}{_TERRACOTTA}{'─' * 70}{_RESET}")
        print(f"{_BOLD}{_TERRACOTTA}  {title}{_RESET}")
        print(f"{_BOLD}{_TERRACOTTA}{'─' * 70}{_RESET}")
    else:
        print(f"\n{'=' * 70}\n  {title}\n{'=' * 70}")


def print_info(text: str) -> None:
    prefix = f"{_DIM}>{_RESET} " if _supports_color() else "> "
    print(f"{prefix}{text}")


def print_success(text: str) -> None:
    prefix = f"{_GREEN}[ok]{_RESET} " if _supports_color() else "[ok] "
    print(f"{prefix}{text}")


def print_warning(text: str) -> None:
    prefix = f"{_GOLD}[!!]{_RESET} " if _supports_color() else "[!!] "
    print(f"{prefix}{text}")


def print_error(text: str) -> None:
    prefix = f"{_RED}[xx]{_RESET} " if _supports_color() else "[xx] "
    print(f"{prefix}{text}", file=sys.stderr)


def print_json(data: Any, indent: int = 2) -> None:
    print(json.dumps(data, ensure_ascii=False, indent=indent, default=str))


def print_mode_banner(service: Any) -> None:
    """One-line banner showing which agent mode is answering."""
    if service.mode == "online":
        label = f"{_GREEN}ONLINE{_RESET} (LangChain tool-calling agent via ChatGroq)" if _supports_color() else "ONLINE (LangChain tool-calling agent via ChatGroq)"
    else:
        label = f"{_GOLD}OFFLINE{_RESET} (knowledge-base mentor; set GROQ_API_KEY + install langchain-groq for online)" if _supports_color() else "OFFLINE (knowledge-base mentor; set GROQ_API_KEY + install langchain-groq for online)"
    print(f"\n{_DADI_AVATAR} Ask Dadi agent mode: {label}\n")


def print_dadi_speech(text: str) -> None:
    """Print Dadi's answer in a quoted block."""
    lines = text.splitlines() or [""]
    if _supports_color():
        print(f"{_INDIGO}{_BOLD}{_DADI_AVATAR} Dadi:{_RESET}")
    else:
        print(f"{_DADI_AVATAR} Dadi:")
    for line in lines:
        print(f"  {line}")


def print_repl_hint(dialect: str) -> None:
    print_info(f"dialect={dialect}  |  /help for session commands  |  Ctrl+C or /exit to quit")
