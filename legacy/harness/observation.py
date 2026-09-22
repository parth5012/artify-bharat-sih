from enum import Enum
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field


class ObservationStatus(str, Enum):
    SUCCESS = "success"
    WARNING = "warning"
    ERROR = "error"


class Observation(BaseModel):
    """
    Standardized agent observation envelope adhering to agent-harness-construction standards.
    Guarantees deterministic structure for LLM cognitive parsing.
    """
    status: ObservationStatus
    summary: str = Field(..., description="One-line human/agent readable result")
    next_actions: List[str] = Field(default_factory=list, description="Explicit actionable follow-ups")
    artifacts: List[str] = Field(default_factory=list, description="Produced file paths, hashes, or entity IDs")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Diagnostic payload")

    def to_formatted_output(self) -> str:
        status_icon = "✓" if self.status == ObservationStatus.SUCCESS else ("⚠" if self.status == ObservationStatus.WARNING else "✗")
        lines = [
            f"[{status_icon} {self.status.value.upper()}] {self.summary}",
        ]
        if self.artifacts:
            lines.append("Artifacts: " + ", ".join(self.artifacts))
        if self.next_actions:
            lines.append("Next Actions:")
            for action in self.next_actions:
                lines.append(f"  - {action}")
        return "\n".join(lines)
