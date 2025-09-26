from __future__ import annotations

import json
from pathlib import Path
from typing import Dict, Iterable, List

import pandas as pd

try:
    # When running as part of the FastAPI app
    from .disruptions import Alert
    from .ga_route import GAResult
    from .load_data import Flight
except ImportError:
    # When running as standalone scripts
    from disruptions import Alert
    from ga_route import GAResult
    from load_data import Flight


def _route_descriptor(route) -> str:  # type: ignore[no-untyped-def]
    return " → ".join(leg.flight.flight_id for leg in route.legs) or "DENIED"


def write_plan_routes(result: GAResult, out_path: Path) -> None:
    rows: List[Dict[str, object]] = []
    for cargo_id, assignment in result.assignments.items():
        route = assignment.route
        rows.append(
            {
                "cargo_id": cargo_id,
                "status": assignment.status,
                "reason": assignment.reason or "",
                "flight_sequence": "|".join(
                    leg.flight.flight_id for leg in route.legs
                ),
                "etds": "|".join(leg.departure_time.isoformat() for leg in route.legs),
                "etas": "|".join(leg.arrival_time.isoformat() for leg in route.legs),
                "total_cost": round(route.total_cost, 2),
                "revenue": round(route.total_revenue, 2),
                "margin": round(assignment.margin, 2),
                "transit_hours": round(route.transit_hours, 2),
                "sla_penalty": round(route.sla_penalty, 2),
                "handling_penalty": round(route.handling_penalty, 2),
                "notes": route.notes,
            }
        )
    df = pd.DataFrame(rows)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    df.sort_values(by="cargo_id").to_csv(out_path, index=False)


def write_flight_loads(
    result: GAResult,
    flights: Dict[str, Flight],
    out_path: Path,
) -> None:
    rows: List[Dict[str, object]] = []
    for flight_id, flight in flights.items():
        selection = result.flight_loads.get(flight_id)
        if selection is None:
            rows.append(
                {
                    "flight_id": flight_id,
                    "origin": flight.origin,
                    "destination": flight.destination,
                    "scheduled_departure": flight.departure_time.isoformat(),
                    "weight_capacity_kg": flight.weight_capacity_kg,
                    "volume_capacity_m3": flight.volume_capacity_m3,
                    "assigned_cargo": "",
                    "total_weight": 0.0,
                    "total_volume": 0.0,
                    "weight_utilization_pct": 0.0,
                    "volume_utilization_pct": 0.0,
                    "revenue_sum": 0.0,
                }
            )
            continue

        selected = selection.selected
        total_weight = sum(candidate.weight_kg for candidate in selected)
        total_volume = sum(candidate.volume_m3 for candidate in selected)
        weight_util = (total_weight / flight.weight_capacity_kg) * 100.0
        volume_util = (total_volume / flight.volume_capacity_m3) * 100.0
        revenue_sum = sum(candidate.revenue for candidate in selected)

        rows.append(
            {
                "flight_id": flight_id,
                "origin": flight.origin,
                "destination": flight.destination,
                "scheduled_departure": flight.departure_time.isoformat(),
                "weight_capacity_kg": flight.weight_capacity_kg,
                "volume_capacity_m3": flight.volume_capacity_m3,
                "assigned_cargo": "|".join(
                    candidate.cargo.cargo_id for candidate in selected
                ),
                "total_weight": round(total_weight, 2),
                "total_volume": round(total_volume, 2),
                "weight_utilization_pct": round(weight_util, 2),
                "volume_utilization_pct": round(volume_util, 2),
                "revenue_sum": round(revenue_sum, 2),
            }
        )
    df = pd.DataFrame(rows)
    df.sort_values(by="scheduled_departure").to_csv(out_path, index=False)


def write_alerts(alerts: Iterable[Alert], out_path: Path) -> None:
    rows = [
        {
            "alert_type": alert.alert_type,
            "severity": alert.severity,
            "message": alert.message,
            "cargo_id": alert.cargo_id or "",
            "flight_id": alert.flight_id or "",
            "status": alert.status or "",
            "margin_delta": alert.margin_delta if alert.margin_delta is not None else "",
        }
        for alert in alerts
    ]
    df = pd.DataFrame(rows)
    out_path.parent.mkdir(parents=True, exist_ok=True)
    df.to_csv(out_path, index=False)


def write_json_summary(
    result: GAResult,
    flights: Dict[str, Flight],
    alerts: Iterable[Alert],
    out_path: Path,
) -> None:
    delivered = sum(1 for a in result.assignments.values() if a.status == "delivered")
    rolled = sum(1 for a in result.assignments.values() if a.status == "rolled")
    denied = sum(1 for a in result.assignments.values() if a.status == "denied")
    total_cargo = len(result.assignments)

    capacity_summary = []
    for flight_id, flight in flights.items():
        selection = result.flight_loads.get(flight_id)
        total_weight = sum(c.weight_kg for c in selection.selected) if selection else 0.0
        total_volume = sum(c.volume_m3 for c in selection.selected) if selection else 0.0
        capacity_summary.append(
            {
                "flight_id": flight_id,
                "weight_utilization_pct": round(
                    (total_weight / flight.weight_capacity_kg) * 100.0, 2
                )
                if flight.weight_capacity_kg
                else 0.0,
                "volume_utilization_pct": round(
                    (total_volume / flight.volume_capacity_m3) * 100.0, 2
                )
                if flight.volume_capacity_m3
                else 0.0,
            }
        )

    alert_payload = [
        {
            "alert_type": alert.alert_type,
            "severity": alert.severity,
            "message": alert.message,
            "cargo_id": alert.cargo_id,
            "flight_id": alert.flight_id,
            "status": alert.status,
            "margin_delta": alert.margin_delta,
        }
        for alert in alerts
    ]

    payload = {
        "summary": {
            "total_margin": round(result.total_margin, 2),
            "cargo_counts": {
                "delivered": delivered,
                "rolled": rolled,
                "denied": denied,
                "total": total_cargo,
            },
        },
        "capacity": capacity_summary,
        "alerts": alert_payload,
    }

    out_path.parent.mkdir(parents=True, exist_ok=True)
    out_path.write_text(json.dumps(payload, indent=2), encoding="utf-8")
