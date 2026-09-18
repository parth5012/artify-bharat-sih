"""Deprecated shim (Wayfinder #100).

The in-memory verification_jury contracts are superseded by the canonical
DB-backed contracts in app.schemas.jury. This module re-exports them under
the legacy PeerJury* names so existing imports keep working while the API
layer migrates to the DB source (/api/v1/verify.py).
"""

from app.schemas.jury import (  # noqa: F401
    JuryAssignRequest,
    JuryAssignResponse,
    JuryStatusResponse,
    JuryVoteRequest,
    JuryVoteResponse,
    ReportFakeRequest,
    ReportFakeResponse,
)

# Legacy aliases (in-memory verification_jury contract names)
PeerJuryAssignRequest = JuryAssignRequest
PeerJuryAssignResponse = JuryAssignResponse
PeerJuryVoteRequest = JuryVoteRequest
PeerJuryVoteResponse = JuryVoteResponse
