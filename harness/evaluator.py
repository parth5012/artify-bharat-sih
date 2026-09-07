from typing import List, Dict, Any
from pydantic import BaseModel, Field


class TaskEvaluationResult(BaseModel):
    task_id: str
    passed: bool
    attempts_required: int = 1
    duration_seconds: float = 0.0
    tokens_consumed: int = 0
    estimated_cost_usd: float = 0.0


class BenchmarkSummary(BaseModel):
    total_tasks: int
    successful_tasks: int
    completion_rate_pct: float
    pass_at_1_pct: float
    pass_at_3_pct: float
    avg_attempts_per_task: float
    total_cost_usd: float


class AgentBenchmarkEvaluator:
    """
    Computes Pass@1, Pass@3, completion rates, and token cost tracking
    as prescribed by agent-harness-construction metrics.
    """

    def __init__(self):
        self._results: List[TaskEvaluationResult] = []

    def record_task_result(self, result: TaskEvaluationResult):
        self._results.append(result)

    def compute_summary(self) -> BenchmarkSummary:
        total = len(self._results)
        if total == 0:
            return BenchmarkSummary(
                total_tasks=0,
                successful_tasks=0,
                completion_rate_pct=0.0,
                pass_at_1_pct=0.0,
                pass_at_3_pct=0.0,
                avg_attempts_per_task=0.0,
                total_cost_usd=0.0,
            )

        passed = [r for r in self._results if r.passed]
        passed_at_1 = [r for r in passed if r.attempts_required == 1]
        passed_at_3 = [r for r in passed if r.attempts_required <= 3]

        completion_rate = (len(passed) / total) * 100.0
        pass_at_1 = (len(passed_at_1) / total) * 100.0
        pass_at_3 = (len(passed_at_3) / total) * 100.0
        avg_attempts = sum(r.attempts_required for r in self._results) / total
        total_cost = sum(r.estimated_cost_usd for r in self._results)

        return BenchmarkSummary(
            total_tasks=total,
            successful_tasks=len(passed),
            completion_rate_pct=round(completion_rate, 2),
            pass_at_1_pct=round(pass_at_1, 2),
            pass_at_3_pct=round(pass_at_3, 2),
            avg_attempts_per_task=round(avg_attempts, 2),
            total_cost_usd=round(total_cost, 4),
        )
