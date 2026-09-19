"""
Artify Bharat — 'Ask Dadi' Agent CLI
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

from cli.main import main

if __name__ == "__main__":
    raise SystemExit(main())
