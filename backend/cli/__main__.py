"""Enables `python -m cli` execution from the backend/ directory."""

from cli.main import main

if __name__ == "__main__":
    raise SystemExit(main())
