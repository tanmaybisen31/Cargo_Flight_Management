from __future__ import annotations

import json
from dataclasses import dataclass
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Dict, Iterable, List, Optional, Tuple

import pandas as pd


ISO_FORMAT_ERROR = "Value '{value}' for field '{field}' is not a valid ISO 8601 timestamp."


class DataValidationError(Exception):
    """Raised when source data fail validation checks."""


@dataclass(frozen=True)
class Flight:
    flight_id: str
    origin: str
    destination: str
    departure_time: datetime
    arrival_time: datetime
    aircraft_type: str
    weight_capacity_kg: float
    volume_capacity_m3: float
    operating_cost_per_kg: float
    handling_penalty_per_hour: float
    aircraft_swap_capacity_kg: float
    aircraft_swap_volume_m3: float


@dataclass(frozen=True)
class Cargo:
    cargo_id: str
    origin: str
    destination: str
    weight_kg: float
    volume_m3: float
    revenue_inr: float
    priority: str
    perishable: bool
    max_transit_hours: float
    ready_time: datetime
    due_by: datetime
    handling_cost_per_kg: float
    sla_penalty_per_hour: float


@dataclass(frozen=True)
class ConnectionRule:
    origin: str
    destination: str
    connection_airport: Optional[str]
    min_connect_minutes: int
    max_connect_hours: float


REQUIRED_FLIGHT_COLUMNS = {
    "flight_id",
    "origin",
    "destination",
    "departure_time",
    "arrival_time",
    "aircraft_type",
    "weight_capacity_kg",
    "volume_capacity_m3",
    "operating_cost_per_kg",
    "handling_penalty_per_hour",
    "aircraft_swap_capacity_kg",
    "aircraft_swap_volume_m3",
}

REQUIRED_CARGO_COLUMNS = {
    "cargo_id",
    "origin",
    "destination",
    "weight_kg",
    "volume_m3",
    "revenue_inr",
    "priority",
    "perishable",
    "max_transit_hours",
    "ready_time",
    "due_by",
    "handling_cost_per_kg",
    "sla_penalty_per_hour",
}

REQUIRED_CONNECTION_COLUMNS = {
    "origin",
    "destination",
    "connection_airport",
    "min_connect_minutes",
    "max_connect_hours",
}


BOOL_TRUE = {"true", "1", "yes", "y"}
BOOL_FALSE = {"false", "0", "no", "n"}


def _ensure_columns(df: pd.DataFrame, required: Iterable[str], source: Path) -> None:
    missing = set(required) - set(df.columns)
    if missing:
        raise DataValidationError(
            f"{source.name} is missing required columns: {', '.join(sorted(missing))}"
        )


def _parse_iso_datetime(value: str, field: str) -> datetime:
    """Parse datetime string and ensure it has timezone information."""
    try:
        value = value.strip()

        # Handle different datetime formats
        if value.endswith('Z'):
            # UTC time
            return datetime.fromisoformat(value.replace('Z', '+00:00'))
        elif '+' in value or '-' in value[-6:]:  # Check for timezone offset
            # Already has timezone info
            return datetime.fromisoformat(value)
        else:
            # No timezone info, assume Asia/Calcutta (+05:30)
            naive_dt = datetime.fromisoformat(value)
            # Add Asia/Calcutta timezone
            tz = timezone(timedelta(hours=5, minutes=30))
            return naive_dt.replace(tzinfo=tz)
    except ValueError as exc:
        raise DataValidationError(ISO_FORMAT_ERROR.format(value=value, field=field)) from exc


def _parse_bool(value: str, field: str) -> bool:
    value_norm = str(value).strip().lower()
    if value_norm in BOOL_TRUE:
        return True
    if value_norm in BOOL_FALSE:
        return False
    raise DataValidationError(f"Field '{field}' with value '{value}' must be boolean-like.")


def _validate_positive(name: str, value: float) -> None:
    if value <= 0:
        raise DataValidationError(f"Field '{name}' must be positive. Found {value}.")


def load_flights(path: Path) -> Dict[str, Flight]:
    df = pd.read_csv(path)
    _ensure_columns(df, REQUIRED_FLIGHT_COLUMNS, path)

    flights: Dict[str, Flight] = {}
    for _, row in df.iterrows():
        flight_id = str(row["flight_id"]).strip()
        if not flight_id:
            raise DataValidationError("flight_id cannot be empty")

        departure = _parse_iso_datetime(str(row["departure_time"]), "departure_time")
        arrival = _parse_iso_datetime(str(row["arrival_time"]), "arrival_time")
        if arrival <= departure:
            raise DataValidationError(
                f"Flight {flight_id} arrival_time must be after departure_time"
            )

        weight_capacity = float(row["weight_capacity_kg"])
        volume_capacity = float(row["volume_capacity_m3"])
        operating_cost = float(row["operating_cost_per_kg"])
        handling_penalty = float(row["handling_penalty_per_hour"])
        swap_weight = float(row["aircraft_swap_capacity_kg"])
        swap_volume = float(row["aircraft_swap_volume_m3"])

        for field_name, value in {
            "weight_capacity_kg": weight_capacity,
            "volume_capacity_m3": volume_capacity,
            "operating_cost_per_kg": operating_cost,
            "handling_penalty_per_hour": handling_penalty,
            "aircraft_swap_capacity_kg": swap_weight,
            "aircraft_swap_volume_m3": swap_volume,
        }.items():
            _validate_positive(field_name, value)

        flights[flight_id] = Flight(
            flight_id=flight_id,
            origin=str(row["origin"]).strip().upper(),
            destination=str(row["destination"]).strip().upper(),
            departure_time=departure,
            arrival_time=arrival,
            aircraft_type=str(row["aircraft_type"]).strip(),
            weight_capacity_kg=weight_capacity,
            volume_capacity_m3=volume_capacity,
            operating_cost_per_kg=operating_cost,
            handling_penalty_per_hour=handling_penalty,
            aircraft_swap_capacity_kg=swap_weight,
            aircraft_swap_volume_m3=swap_volume,
        )
    return flights


def load_cargo(path: Path) -> Dict[str, Cargo]:
    df = pd.read_csv(path)
    _ensure_columns(df, REQUIRED_CARGO_COLUMNS, path)

    cargo_map: Dict[str, Cargo] = {}
    for _, row in df.iterrows():
        cargo_id = str(row["cargo_id"]).strip()
        if not cargo_id:
            raise DataValidationError("cargo_id cannot be empty")
        weight = float(row["weight_kg"])
        volume = float(row["volume_m3"])
        revenue = float(row["revenue_inr"])
        max_transit = float(row["max_transit_hours"])
        handling_cost = float(row["handling_cost_per_kg"])
        sla_penalty = float(row["sla_penalty_per_hour"])

        for field_name, value in {
            "weight_kg": weight,
            "volume_m3": volume,
            "revenue_inr": revenue,
            "max_transit_hours": max_transit,
            "handling_cost_per_kg": handling_cost,
            "sla_penalty_per_hour": sla_penalty,
        }.items():
            _validate_positive(field_name, value)

        ready_time = _parse_iso_datetime(str(row["ready_time"]), "ready_time")
        due_by = _parse_iso_datetime(str(row["due_by"]), "due_by")
        if due_by <= ready_time:
            raise DataValidationError(
                f"Cargo {cargo_id} due_by must be after ready_time"
            )

        priority = str(row["priority"]).strip().capitalize()
        perishable = _parse_bool(row["perishable"], "perishable")

        cargo_map[cargo_id] = Cargo(
            cargo_id=cargo_id,
            origin=str(row["origin"]).strip().upper(),
            destination=str(row["destination"]).strip().upper(),
            weight_kg=weight,
            volume_m3=volume,
            revenue_inr=revenue,
            priority=priority,
            perishable=perishable,
            max_transit_hours=max_transit,
            ready_time=ready_time,
            due_by=due_by,
            handling_cost_per_kg=handling_cost,
            sla_penalty_per_hour=sla_penalty,
        )
    return cargo_map


def load_connections(path: Path) -> List[ConnectionRule]:
    df = pd.read_csv(path)
    _ensure_columns(df, REQUIRED_CONNECTION_COLUMNS, path)

    rules: List[ConnectionRule] = []
    for _, row in df.iterrows():
        origin = str(row["origin"]).strip().upper()
        destination = str(row["destination"]).strip().upper()
        connection_airport = str(row["connection_airport"]).strip().upper() or None
        min_connect = int(row["min_connect_minutes"])
        max_connect = float(row["max_connect_hours"])
        if min_connect < 0:
            raise DataValidationError(
                f"min_connect_minutes must be >= 0 for {origin}->{destination}"
            )
        _validate_positive("max_connect_hours", max_connect)

        rules.append(
            ConnectionRule(
                origin=origin,
                destination=destination,
                connection_airport=connection_airport,
                min_connect_minutes=min_connect,
                max_connect_hours=max_connect,
            )
        )
    return rules


def load_all(data_dir: Path) -> Tuple[Dict[str, Flight], Dict[str, Cargo], List[ConnectionRule]]:
    flights = load_flights(data_dir / "flights.csv")
    cargo = load_cargo(data_dir / "cargo.csv")
    connections = load_connections(data_dir / "connections.csv")
    return flights, cargo, connections


def export_to_json(data: Dict[str, object], out_path: Path) -> None:
    out_path.write_text(
        json.dumps(data, default=str, indent=2, sort_keys=True), encoding="utf-8"
    )
