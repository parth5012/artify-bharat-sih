from typing import Dict, Any, Callable, Type, Optional, List
from pydantic import BaseModel, Field
from .observation import Observation, ObservationStatus
from .recovery import ErrorRecoveryContract


class AgentAction(BaseModel):
    """Base schema-first contract for every agent action."""
    action_name: str
    description: str


# 1. Micro-Tool: Issue Cryptographic Passport (High-Risk Provenance Action)
class IssuePassportAction(BaseModel):
    product_id: str = Field(..., description="UUID of cataloged and priced product")


# 2. Medium-Tool: Dynamic Pricing Calculation
class CalculatePricingAction(BaseModel):
    product_id: str = Field(..., description="Target product UUID")
    raw_material_cost: float = Field(..., ge=0.0, description="Raw materials in INR")
    labor_days: float = Field(..., ge=0.5, description="Days invested in handcrafting")
    daily_wage_rate: float = Field(default=450.0, ge=200.0, description="Cluster wage baseline")


# 3. Medium-Tool: Channel Export
class ExportChannelAction(BaseModel):
    product_id: str = Field(..., description="Product UUID with issued passport")
    channels: List[str] = Field(default=["GeM", "ONDC"], description="Target marketplace channels")
    b2b_quantity: int = Field(default=10, ge=1, description="Bulk order minimum threshold")


# 4. Macro-Tool: Run Verification Suite (Combines multiple check steps)
class RunVerificationAction(BaseModel):
    scope: str = Field(default="all", description="Test scope: 'all', 'backend', 'crypto', 'pricing'")


class ActionSpaceRegistry:
    """
    Manages typed action schemas and executes tools within standardized observation and recovery envelopes.
    """

    def __init__(self):
        self._actions: Dict[str, Type[BaseModel]] = {
            "issue_passport": IssuePassportAction,
            "calculate_pricing": CalculatePricingAction,
            "export_channels": ExportChannelAction,
            "run_verification": RunVerificationAction,
        }
        self._handlers: Dict[str, Callable[[Any], Observation]] = {}

    def register_handler(self, action_name: str, handler: Callable[[Any], Observation]):
        self._handlers[action_name] = handler

    def execute(self, action_name: str, payload: Dict[str, Any], attempt: int = 1) -> Observation:
        if action_name not in self._actions:
            plan = ErrorRecoveryContract.construct_plan(
                f"Unknown action: '{action_name}'. Registered: {list(self._actions.keys())}",
                attempt=attempt
            )
            return Observation(
                status=ObservationStatus.ERROR,
                summary=f"Unknown action '{action_name}' requested.",
                next_actions=[plan.safe_retry_instruction],
                metadata={"root_cause": plan.root_cause_hint, "stop_condition": plan.explicit_stop_condition}
            )

        schema = self._actions[action_name]
        try:
            validated_payload = schema(**payload)
        except Exception as validation_err:
            plan = ErrorRecoveryContract.construct_plan(validation_err, attempt=attempt)
            return Observation(
                status=ObservationStatus.ERROR,
                summary=f"Validation failed for action '{action_name}': {str(validation_err)}",
                next_actions=[plan.safe_retry_instruction],
                metadata={"root_cause": plan.root_cause_hint, "stop_condition": plan.explicit_stop_condition}
            )

        handler = self._handlers.get(action_name)
        if not handler:
            return Observation(
                status=ObservationStatus.WARNING,
                summary=f"No execution handler registered for action '{action_name}'. Action validated successfully.",
                next_actions=["Register action handler or execute via backend REST API endpoint."],
                artifacts=[]
            )

        try:
            return handler(validated_payload)
        except Exception as exec_err:
            plan = ErrorRecoveryContract.construct_plan(exec_err, attempt=attempt)
            return Observation(
                status=ObservationStatus.ERROR,
                summary=f"Execution of '{action_name}' failed: {str(exec_err)}",
                next_actions=[plan.safe_retry_instruction],
                metadata={"root_cause": plan.root_cause_hint, "stop_condition": plan.explicit_stop_condition}
            )
