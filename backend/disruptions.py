from __future__ import annotations

from dataclasses import dataclass, replace
from datetime import timedelta
from typing import Dict, Iterable, List, Literal, Optional, Tuple

try:
    # When running as part of the FastAPI app
    from .ga_route import GAResult, run_ga
    from .load_data import Cargo, ConnectionRule, Flight
except ImportError:
    # When running as standalone scripts
    from ga_route import GAResult, run_ga
    from load_data import Cargo, ConnectionRule, Flight


AlertSeverity = Literal["info", "warning", "critical"]
DisruptionType = Literal["delay", "cancel", "swap"]


@dataclass(frozen=True)
class DisruptionEvent:
    event_type: DisruptionType
    flight_id: str
    delay_minutes: int = 0
    new_weight_capacity_kg: Optional[float] = None
    new_volume_capacity_m3: Optional[float] = None


@dataclass(frozen=True)
class Alert:
    alert_type: str
    severity: AlertSeverity
    message: str
    cargo_id: Optional[str] = None
    flight_id: Optional[str] = None
    status: Optional[str] = None
    margin_delta: Optional[float] = None


def _adjust_flights(
    flights: Dict[str, Flight],
    events: Iterable[DisruptionEvent],
) -> Tuple[Dict[str, Flight], List[Alert]]:
    adjusted = dict(flights)
    alerts: List[Alert] = []

    for event in events:
        flight = adjusted.get(event.flight_id)
        if event.event_type == "delay":
            if flight is None:
                alerts.append(
                    Alert(
                        alert_type="delay",
                        severity="warning",
                        message=f"Delay reported for unknown flight {event.flight_id}",
                        flight_id=event.flight_id,
                    )
                )
                continue
            if event.delay_minutes <= 0:
                continue
            delta = timedelta(minutes=event.delay_minutes)
            adjusted[flight.flight_id] = replace(
                flight,
                departure_time=flight.departure_time + delta,
                arrival_time=flight.arrival_time + delta,
            )
            alerts.append(
                Alert(
                    alert_type="delay",
                    severity="info",
                    message=(
                        f"Flight {flight.flight_id} delayed by {event.delay_minutes} minutes"
                    ),
                    flight_id=flight.flight_id,
                )
            )
        elif event.event_type == "cancel":
            if flight is None:
                alerts.append(
                    Alert(
                        alert_type="cancel",
                        severity="warning",
                        message=f"Cancellation reported for unknown flight {event.flight_id}",
                        flight_id=event.flight_id,
                    )
                )
                continue
            adjusted.pop(flight.flight_id)
            alerts.append(
                Alert(
                    alert_type="cancel",
                    severity="critical",
                    message=f"Flight {flight.flight_id} cancelled",
                    flight_id=flight.flight_id,
                )
            )
        elif event.event_type == "swap":
            if flight is None:
                alerts.append(
                    Alert(
                        alert_type="swap",
                        severity="warning",
                        message=f"Aircraft swap reported for unknown flight {event.flight_id}",
                        flight_id=event.flight_id,
                    )
                )
                continue
            new_weight = event.new_weight_capacity_kg or flight.weight_capacity_kg
            new_volume = event.new_volume_capacity_m3 or flight.volume_capacity_m3
            adjusted[flight.flight_id] = replace(
                flight,
                weight_capacity_kg=new_weight,
                volume_capacity_m3=new_volume,
            )
            alerts.append(
                Alert(
                    alert_type="swap",
                    severity="warning",
                    message=(
                        f"Aircraft swap on {flight.flight_id}: capacity set to "
                        f"{new_weight:.0f} kg / {new_volume:.0f} m³"
                    ),
                    flight_id=flight.flight_id,
                )
            )
    return adjusted, alerts


def _leg_sequence(route) -> Tuple[str, ...]:  # type: ignore[no-untyped-def]
    return tuple(leg.flight.flight_id for leg in route.legs)


def _compare_results(
    baseline: GAResult,
    scenario: GAResult,
) -> List[Alert]:
    alerts: List[Alert] = []
    cargo_ids = set(baseline.assignments.keys()) | set(scenario.assignments.keys())

    for cargo_id in sorted(cargo_ids):
        base_assign = baseline.assignments.get(cargo_id)
        new_assign = scenario.assignments.get(cargo_id)
        if new_assign is None:
            alerts.append(
                Alert(
                    alert_type="cargo_missing",
                    severity="critical",
                    message=f"Cargo {cargo_id} missing from disrupted solution",
                    cargo_id=cargo_id,
                )
            )
            continue
        base_status = base_assign.status if base_assign else "unknown"
        new_status = new_assign.status
        margin_delta = None
        if base_assign is not None:
            margin_delta = new_assign.margin - base_assign.margin

        base_route = _leg_sequence(base_assign.route) if base_assign else tuple()
        new_route = _leg_sequence(new_assign.route)

        if base_status != new_status:
            severity: AlertSeverity = "critical" if new_status != "delivered" else "info"
            alerts.append(
                Alert(
                    alert_type="status_change",
                    severity=severity,
                    message=(
                        f"Cargo {cargo_id} status changed {base_status} → {new_status}"
                    ),
                    cargo_id=cargo_id,
                    status=new_status,
                    margin_delta=margin_delta,
                )
            )
        elif base_route != new_route:
            alerts.append(
                Alert(
                    alert_type="reroute",
                    severity="warning",
                    message=(
                        f"Cargo {cargo_id} rerouted: {'-'.join(base_route) or 'NONE'} → "
                        f"{'-'.join(new_route) or 'NONE'}"
                    ),
                    cargo_id=cargo_id,
                    status=new_status,
                    margin_delta=margin_delta,
                )
            )
        elif margin_delta and abs(margin_delta) > 1e-3:
            severity = "warning" if margin_delta < 0 else "info"
            alerts.append(
                Alert(
                    alert_type="margin_change",
                    severity=severity,
                    message=(
                        f"Cargo {cargo_id} margin {'decreased' if margin_delta < 0 else 'increased'} "
                        f"by ₹{abs(margin_delta):,.0f}"
                    ),
                    cargo_id=cargo_id,
                    status=new_status,
                    margin_delta=margin_delta,
                )
            )

        if new_status != "delivered" and new_assign.reason:
            alerts.append(
                Alert(
                    alert_type="exception",
                    severity="critical",
                    message=new_assign.reason,
                    cargo_id=cargo_id,
                    status=new_status,
                    margin_delta=margin_delta,
                )
            )

    return alerts


def baseline_alerts(result: GAResult) -> List[Alert]:
    alerts: List[Alert] = []
    for cargo_id, assignment in result.assignments.items():
        if assignment.status != "delivered":
            alerts.append(
                Alert(
                    alert_type="baseline_exception",
                    severity="warning",
                    message=assignment.reason or f"Cargo {cargo_id} not delivered",
                    cargo_id=cargo_id,
                    status=assignment.status,
                    margin_delta=None,
                )
            )
    return alerts


def apply_disruptions(
    baseline: GAResult,
    cargo_map: Dict[str, Cargo],
    flights: Dict[str, Flight],
    connection_rules: Iterable[ConnectionRule],
    events: Iterable[DisruptionEvent],
    seed: Optional[int] = 123,
) -> Tuple[GAResult, Dict[str, Flight], List[Alert]]:
    adjusted_flights, event_alerts = _adjust_flights(flights, events)

    scenario_result = run_ga(
        cargo_map=cargo_map,
        flights=adjusted_flights,
        connection_rules=connection_rules,
        seed=seed,
    )

    comparison_alerts = _compare_results(baseline, scenario_result)

    return scenario_result, adjusted_flights, [*event_alerts, *comparison_alerts]
