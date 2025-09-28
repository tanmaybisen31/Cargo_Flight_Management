from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any, Dict, Iterable, List, Optional

try:
    # When running as part of the FastAPI app
    from .disruptions import (
        Alert,
        DisruptionEvent,
        apply_disruptions,
        baseline_alerts,
    )
    from .ga_route import GAResult, run_ga
    from .load_data import Cargo, ConnectionRule, Flight, load_all
    from .outputs import (
        write_alerts,
        write_flight_loads,
        write_json_summary,
        write_plan_routes,
    )
    from .ai_recommendations import generate_ai_recommendations, format_recommendations_for_ui
except ImportError:
    # When running as standalone scripts
    from disruptions import (
        Alert,
        DisruptionEvent,
        apply_disruptions,
        baseline_alerts,
    )
    from ga_route import GAResult, run_ga
    from load_data import Cargo, ConnectionRule, Flight, load_all
    from outputs import (
        write_alerts,
        write_flight_loads,
        write_json_summary,
        write_plan_routes,
    )
    from ai_recommendations import generate_ai_recommendations, format_recommendations_for_ui


@dataclass
class PipelineResult:
    cargo: Dict[str, Cargo]
    flights: Dict[str, Flight]
    connection_rules: List[ConnectionRule]
    base_result: GAResult
    scenario_result: GAResult
    alerts: List[Alert]
    events: List[DisruptionEvent]
    adjusted_flights: Dict[str, Flight]
    ai_recommendations: Dict[str, Any]


@dataclass(frozen=True)
class PipelineConfig:
    data_dir: Path
    output_dir: Path
    events: Iterable[DisruptionEvent] | None = None
    seed: Optional[int] = 42
    write_outputs: bool = True


def run_pipeline(config: PipelineConfig) -> PipelineResult:
    flights, cargo, connections = load_all(config.data_dir)

    base_result = run_ga(
        cargo_map=cargo,
        flights=flights,
        connection_rules=connections,
        seed=config.seed,
    )
    base_alerts = baseline_alerts(base_result)

    events = list(config.events or [])
    if events:
        scenario_result, adjusted_flights, disruption_alerts = apply_disruptions(
            baseline=base_result,
            cargo_map=cargo,
            flights=flights,
            connection_rules=connections,
            events=events,
            seed=(config.seed or 42) + 1,
        )
        alerts = [*base_alerts, *disruption_alerts]
    else:
        scenario_result = base_result
        adjusted_flights = flights
        alerts = base_alerts

    if config.write_outputs:
        output_dir = config.output_dir
        write_plan_routes(scenario_result, output_dir / "plan_routes.csv")
        write_flight_loads(scenario_result, adjusted_flights, output_dir / "flight_loads.csv")
        write_alerts(alerts, output_dir / "alerts.csv")
        write_json_summary(
            scenario_result, adjusted_flights, alerts, output_dir / "plan_summary.json"
        )

    # Generate AI recommendations for denied/rolled cargo
    recommendations = generate_ai_recommendations(scenario_result, cargo, adjusted_flights)
    formatted_recommendations = format_recommendations_for_ui(recommendations)

    return PipelineResult(
        cargo=cargo,
        flights=flights,
        connection_rules=connections,
        base_result=base_result,
        scenario_result=scenario_result,
        alerts=alerts,
        events=events,
        adjusted_flights=adjusted_flights,
        ai_recommendations=formatted_recommendations,
    )


def result_to_payload(result: PipelineResult) -> Dict[str, Any]:
    cargo_payload = {}
    for cargo_id, assignment in result.scenario_result.assignments.items():
        cargo_obj = result.cargo[cargo_id]
        
        # CRITICAL VALIDATION: Ensure delivered cargo has valid flight assignments
        validated_status = assignment.status
        validated_reason = assignment.reason
        
        if assignment.status == "delivered":
            if not assignment.route.legs or len(assignment.route.legs) == 0:
                # INVALID: Cargo marked as delivered without flight assignment
                validated_status = "rolled"
                validated_reason = "VALIDATION ERROR: Delivered status without flight assignment - corrected to rolled"
                print(f"CRITICAL ERROR CORRECTED: Cargo {cargo_id} was marked delivered without flights")
        
        cargo_payload[cargo_id] = {
            "status": validated_status,
            "margin": assignment.margin,
            "reason": validated_reason,
            "origin": cargo_obj.origin,
            "destination": cargo_obj.destination,
            "priority": cargo_obj.priority,
            "weight_kg": cargo_obj.weight_kg,
            "volume_m3": cargo_obj.volume_m3,
            "revenue_inr": cargo_obj.revenue_inr,
            "route": [
                {
                    "flight_id": leg.flight.flight_id,
                    "origin": leg.flight.origin,
                    "destination": leg.flight.destination,
                    "departure": leg.departure_time.isoformat(),
                    "arrival": leg.arrival_time.isoformat(),
                    "dwell_hours_before": leg.dwell_hours_before,
                }
                for leg in assignment.route.legs
            ],
        }

    flight_payload = {}
    for flight_id, flight in result.adjusted_flights.items():
        selection = result.scenario_result.flight_loads.get(flight_id)
        assigned = []
        if selection:
            for candidate in selection.selected:
                assigned.append(
                    {
                        "cargo_id": candidate.cargo.cargo_id,
                        "weight_kg": candidate.weight_kg,
                        "volume_m3": candidate.volume_m3,
                        "revenue": candidate.revenue,
                        "priority": candidate.cargo.priority,
                    }
                )
        flight_payload[flight_id] = {
            "origin": flight.origin,
            "destination": flight.destination,
            "departure": flight.departure_time.isoformat(),
            "arrival": flight.arrival_time.isoformat(),
            "weight_capacity_kg": flight.weight_capacity_kg,
            "volume_capacity_m3": flight.volume_capacity_m3,
            "assigned": assigned,
        }

    return {
        "summary": {
            "total_margin": result.scenario_result.total_margin,
            "delivered": sum(
                1
                for a in result.scenario_result.assignments.values()
                if a.status == "delivered"
            ),
            "rolled": sum(
                1 for a in result.scenario_result.assignments.values() if a.status == "rolled"
            ),
            "denied": sum(
                1 for a in result.scenario_result.assignments.values() if a.status == "denied"
            ),
        },
        "cargo": cargo_payload,
        "flights": flight_payload,
        "alerts": [
            {
                "type": alert.alert_type,
                "severity": alert.severity,
                "message": alert.message,
                "cargo_id": alert.cargo_id,
                "flight_id": alert.flight_id,
                "status": alert.status,
                "margin_delta": alert.margin_delta,
            }
            for alert in result.alerts
        ],
        "events": [
            {
                "event_type": event.event_type,
                "flight_id": event.flight_id,
                "delay_minutes": event.delay_minutes,
                "new_weight_capacity_kg": event.new_weight_capacity_kg,
                "new_volume_capacity_m3": event.new_volume_capacity_m3,
            }
            for event in result.events
        ],
        "ai_recommendations": result.ai_recommendations,
    }
