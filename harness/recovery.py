from typing import Optional, List
from pydantic import BaseModel, Field


class RecoveryPlan(BaseModel):
    """
    Contract for error recovery preventing infinite repair loops.
    """
    root_cause_hint: str = Field(..., description="Likely underlying issue")
    safe_retry_instruction: str = Field(..., description="Actionable step to fix and retry")
    explicit_stop_condition: str = Field(..., description="Threshold beyond which agent must abort")
    max_retries: int = Field(default=3, ge=1, le=5)
    current_attempt: int = Field(default=1, ge=1)

    @property
    def should_abort(self) -> bool:
        return self.current_attempt >= self.max_retries


class ErrorRecoveryContract:
    """
    Evaluates failure states and constructs recovery guidance with explicit stop gates.
    """

    @staticmethod
    def construct_plan(
        error: Exception | str,
        attempt: int = 1,
        max_retries: int = 3,
        context: Optional[str] = None
    ) -> RecoveryPlan:
        err_msg = str(error).lower()

        if "not found" in err_msg or "404" in err_msg:
            return RecoveryPlan(
                root_cause_hint="Target entity, resource, or file path does not exist in registry.",
                safe_retry_instruction="Verify path using glob or query parent entity before retrying.",
                explicit_stop_condition=f"Abort after {max_retries} failed path lookups to prevent path hallucination.",
                max_retries=max_retries,
                current_attempt=attempt
            )
        elif "connection" in err_msg or "timeout" in err_msg or "503" in err_msg:
            return RecoveryPlan(
                root_cause_hint="Service endpoint or background broker (Redis/PostgreSQL) temporarily unreachable.",
                safe_retry_instruction="Check service healthcheck endpoints or apply exponential backoff (2s, 4s).",
                explicit_stop_condition=f"Abort after {max_retries} network timeouts to avoid exhausting context budget.",
                max_retries=max_retries,
                current_attempt=attempt
            )
        elif "validation" in err_msg or "pydantic" in err_msg:
            return RecoveryPlan(
                root_cause_hint="Input payload violates strict schema-first boundaries.",
                safe_retry_instruction="Align fields with Pydantic model contract and verify required types.",
                explicit_stop_condition="Abort if schema remains mismatched on 2nd attempt.",
                max_retries=2,
                current_attempt=attempt
            )
        else:
            return RecoveryPlan(
                root_cause_hint=f"General runtime fault: {str(error)[:120]}",
                safe_retry_instruction="Isolate state, check logs, and inspect recent file modifications.",
                explicit_stop_condition=f"Stop immediately if attempt reaches {max_retries}.",
                max_retries=max_retries,
                current_attempt=attempt
            )
