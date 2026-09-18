"""
Interactive chat REPL for the Ask Dadi agent - talk back and forth with Dadi.

Mirrors the real /api/v1/assistant/dadi request/response contract
(DadiQueryRequest -> DadiQueryResponse) and keeps a live in-session history
that is sent back with every turn, so Dadi actually remembers the conversation.
"""

import asyncio
import json
import os
from datetime import datetime
from typing import Dict, Any, List, Optional

from cli.display import (
    print_dadi_speech,
    print_error,
    print_info,
    print_mode_banner,
    print_repl_hint,
    print_success,
    print_warning,
)

# Slash-commands available inside the REPL
HELP_TEXT = """
Session commands:
  /help                 show this help
  /mode                 show online/offline agent mode
  /dialect <name>       switch dialect (bhojpuri | maithili | hindi | english)
  /category <name>      set craft category (handloom, pottery, woodcraft...)
  /tools                list the agent's tool backends
  /history              print the conversation so far
  /undo                 remove your last turn (and Dadi's reply) from memory
  /clear                reset conversation history
  /save [file]          save the transcript to a .json file (default: auto name)
  /exit (or Ctrl+C)     quit the REPL

Anything else you type goes straight to Dadi - she remembers the whole session.
"""


class ChatSession:
    """Holds REPL state: dialect, category, and the live multi-turn history."""

    def __init__(self, service: Any, dialect: str = "bhojpuri", category: str = "handloom"):
        self.service = service
        self.dialect = dialect
        self.category = category
        self.history: List[Dict[str, str]] = []

    async def send(self, text: str) -> Dict[str, Any]:
        """Send one message with the full session history (multi-turn memory)."""
        from app.schemas.assistant import DadiQueryRequest

        request = DadiQueryRequest(
            query_text=text,
            dialect=self.dialect,
            product_category=self.category,
            chat_history=list(self.history),  # what Dadi already knows
        )
        response = await self.service.get_dadi_advice(request)
        payload = response.model_dump()
        self.history.append({"role": "user", "content": text})
        self.history.append({"role": "assistant", "content": payload["answer_text"]})
        return payload

    def undo(self) -> bool:
        """Drop the most recent user+assistant turn pair. True if removed."""
        if len(self.history) >= 2:
            del self.history[-2:]
            return True
        return False

    def save_transcript(self, path: Optional[str] = None) -> str:
        """Write the conversation to a JSON transcript file; returns the path."""
        if path is None:
            stamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            path = os.path.join("media_storage", "transcripts", f"dadi_chat_{stamp}.json")
        os.makedirs(os.path.dirname(path), exist_ok=True)
        transcript = {
            "exported_at": datetime.now().isoformat(timespec="seconds"),
            "dialect": self.dialect,
            "craft_category": self.category,
            "turns": self.history,
        }
        with open(path, "w", encoding="utf-8") as fh:
            json.dump(transcript, fh, ensure_ascii=False, indent=2)
        return path


def _handle_slash(session: ChatSession, raw: str) -> bool:
    """Handle a slash command. Returns False when the REPL should exit."""
    parts = raw.split(maxsplit=1)
    cmd = parts[0].lower()
    arg = parts[1].strip() if len(parts) > 1 else ""

    if cmd in ("/exit", "/quit", "/q"):
        return False
    if cmd == "/help":
        print(HELP_TEXT)
    elif cmd == "/mode":
        print_mode_banner(session.service)
    elif cmd == "/dialect":
        if arg:
            session.dialect = arg.lower()
            print_success(f"Dialect set to: {session.dialect}")
        else:
            print_warning(f"Usage: /dialect bhojpuri|maithili|hindi|english (current: {session.dialect})")
    elif cmd == "/category":
        if arg:
            session.category = arg.lower()
            print_success(f"Craft category set to: {session.category}")
        else:
            print_warning(f"Usage: /category handloom|pottery|... (current: {session.category})")
    elif cmd == "/tools":
        from app.services.assistant_service import TOOL_BACKENDS

        print_info("Agent tool backends:")
        for name, fn in TOOL_BACKENDS.items():
            print_info(f"  - {name}  ({fn.__module__}.{fn.__qualname__})")
    elif cmd == "/history":
        if not session.history:
            print_info("(no messages yet)")
        for i, msg in enumerate(session.history, 1):
            who = "You  " if msg["role"] == "user" else "Dadi "
            print(f"  {i:>2}. {who}: {msg['content'][:100]}{'…' if len(msg['content']) > 100 else ''}")
    elif cmd == "/undo":
        if session.undo():
            print_success("Last turn removed from memory. Say something else!")
        else:
            print_warning("Nothing to undo yet.")
    elif cmd == "/clear":
        session.history.clear()
        print_success("History cleared - Dadi remembers nothing.")
    elif cmd == "/save":
        try:
            path = session.save_transcript(arg or None)
            print_success(f"Transcript saved: {path}")
        except OSError as exc:
            print_error(f"Could not save transcript: {exc}")
    else:
        print_warning(f"Unknown command: {cmd}  (try /help)")
    return True


def run_chat_repl(service: Any, dialect: str = "bhojpuri", category: str = "handloom") -> None:
    """Blocking interactive loop: type a message, get Dadi's answer."""
    session = ChatSession(service, dialect=dialect, category=category)

    print_mode_banner(service)
    print_info("Type your question - Dadi remembers this whole conversation.")
    print_repl_hint(session.dialect)

    try:
        while True:
            try:
                raw = input(f"\nYou [{session.dialect}] > ").strip()
            except EOFError:
                break
            if not raw:
                continue
            if raw.startswith("/"):
                if not _handle_slash(session, raw):
                    break
                continue

            try:
                payload = asyncio.run(session.send(raw))
            except Exception as exc:
                print_error(f"Agent call failed: {exc}")
                continue

            print_dadi_speech(payload["answer_text"])
            extras = []
            if payload.get("suggested_actions"):
                extras.append("Actions: " + ", ".join(payload["suggested_actions"]))
            if payload.get("dadi_tip"):
                extras.append(f"Tip: {payload['dadi_tip']}")
            for line in extras:
                print_info(line)
    except KeyboardInterrupt:
        pass

    print()
    print_info("Dadi: theek hai beta, phir milenge! 🙏")
