import sys
from pathlib import Path

# Add project root to path for harness imports
root_dir = Path(__file__).resolve().parent.parent.parent
if str(root_dir) not in sys.path:
    sys.path.insert(0, str(root_dir))

import pytest
from harness.observation import Observation, ObservationStatus
from harness.recovery import ErrorRecoveryContract
from harness.action_space import ActionSpaceRegistry, CalculatePricingAction
from harness.evaluator import AgentBenchmarkEvaluator, TaskEvaluationResult


def test_observation_envelope_formatting():
    obs = Observation(
        status=ObservationStatus.SUCCESS,
        summary="Heritage Passport verified successfully.",
        next_actions=["Export to GeM", "Export to ONDC"],
        artifacts=["SHA256:e3b0c442..."],
    )
    formatted = obs.to_formatted_output()
    assert "[✓ SUCCESS]" in formatted
    assert "Artifacts: SHA256:e3b0c442..." in formatted
    assert "Export to GeM" in formatted


def test_error_recovery_contract_stop_condition():
    plan = ErrorRecoveryContract.construct_plan("Entity with ID not found in database", attempt=3, max_retries=3)
    assert plan.should_abort is True
    assert "Target entity, resource, or file path does not exist" in plan.root_cause_hint
    assert "Abort after 3 failed path lookups" in plan.explicit_stop_condition

    plan_ok = ErrorRecoveryContract.construct_plan("Entity with ID not found in database", attempt=1, max_retries=3)
    assert plan_ok.should_abort is False


def test_action_space_validation_and_execution():
    registry = ActionSpaceRegistry()

    # Register a handler
    def handle_pricing(payload: CalculatePricingAction) -> Observation:
        wage = payload.labor_days * payload.daily_wage_rate
        return Observation(
            status=ObservationStatus.SUCCESS,
            summary=f"Calculated fair wage: ₹{wage}",
            artifacts=[f"Product:{payload.product_id}"],
        )

    registry.register_handler("calculate_pricing", handle_pricing)

    # Valid execution
    res = registry.execute(
        "calculate_pricing",
        {"product_id": "prod-1", "raw_material_cost": 500.0, "labor_days": 10.0},
    )
    assert res.status == ObservationStatus.SUCCESS
    assert "₹4500.0" in res.summary

    # Invalid payload (violates ge=0.5 constraint)
    res_err = registry.execute(
        "calculate_pricing",
        {"product_id": "prod-1", "raw_material_cost": 500.0, "labor_days": -2.0},
    )
    assert res_err.status == ObservationStatus.ERROR
    assert "Validation failed" in res_err.summary
    assert "root_cause" in res_err.metadata


def test_benchmark_evaluator_metrics():
    evaluator = AgentBenchmarkEvaluator()

    evaluator.record_task_result(
        TaskEvaluationResult(task_id="t1", passed=True, attempts_required=1, estimated_cost_usd=0.01)
    )
    evaluator.record_task_result(
        TaskEvaluationResult(task_id="t2", passed=True, attempts_required=2, estimated_cost_usd=0.02)
    )
    evaluator.record_task_result(
        TaskEvaluationResult(task_id="t3", passed=False, attempts_required=3, estimated_cost_usd=0.03)
    )

    summary = evaluator.compute_summary()
    assert summary.total_tasks == 3
    assert summary.successful_tasks == 2
    assert summary.completion_rate_pct == 66.67
    assert summary.pass_at_1_pct == 33.33
    assert summary.pass_at_3_pct == 66.67
    assert summary.total_cost_usd == 0.06
