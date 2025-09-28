from __future__ import annotations

from pathlib import Path
from typing import Iterable, List, Literal, Optional
import csv
import uuid
from datetime import datetime, timezone, timedelta

from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

try:
    # When running as part of the FastAPI app
    from .disruptions import DisruptionEvent
    from .pipeline import PipelineConfig, result_to_payload, run_pipeline
except ImportError:
    # When running as standalone scripts
    from disruptions import DisruptionEvent
    from pipeline import PipelineConfig, result_to_payload, run_pipeline

ROOT_DIR = Path(__file__).resolve().parent.parent
DEFAULT_DATA_DIR = ROOT_DIR / "data"
DEFAULT_OUTPUT_DIR = ROOT_DIR / "outputs"

app = FastAPI(title="Cargo Route Planner API", version="0.1.0")


class DisruptionModel(BaseModel):
    event_type: Literal["delay", "cancel", "swap"] = Field(..., description="Type of disruption event")
    flight_id: str = Field(..., description="Affected flight identifier")
    delay_minutes: int = Field(0, ge=0, description="Delay duration in minutes")
    new_weight_capacity_kg: Optional[float] = Field(
        None, ge=0, description="Override weight capacity when swapping aircraft"
    )
    new_volume_capacity_m3: Optional[float] = Field(
        None, ge=0, description="Override volume capacity when swapping aircraft"
    )

    def to_event(self) -> DisruptionEvent:
        return DisruptionEvent(
            event_type=self.event_type,
            flight_id=self.flight_id,
            delay_minutes=self.delay_minutes,
            new_weight_capacity_kg=self.new_weight_capacity_kg,
            new_volume_capacity_m3=self.new_volume_capacity_m3,
        )


class PlanRequest(BaseModel):
    events: List[DisruptionModel] = Field(default_factory=list)
    seed: Optional[int] = Field(42, description="Random seed for GA convergence")
    write_outputs: bool = Field(
        False, description="Persist CSV/JSON artefacts to the default output directory"
    )
    data_dir: Optional[Path] = Field(
        None,
        description="Optional override directory containing flights.csv, cargo.csv, connections.csv",
    )
    output_dir: Optional[Path] = Field(
        None,
        description="Optional override directory for writing artefacts",
    )


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.post("/plan/run")
async def run_plan(request: PlanRequest) -> dict:
    data_dir = request.data_dir or DEFAULT_DATA_DIR
    output_dir = request.output_dir or DEFAULT_OUTPUT_DIR

    config = PipelineConfig(
        data_dir=data_dir,
        output_dir=output_dir,
        events=[event.to_event() for event in request.events],
        seed=request.seed,
        write_outputs=request.write_outputs,
    )
    result = run_pipeline(config)
    return result_to_payload(result)


@app.post("/plan/sample")
async def run_sample_plan() -> dict:
    config = PipelineConfig(
        data_dir=DEFAULT_DATA_DIR,
        output_dir=DEFAULT_OUTPUT_DIR,
        events=[],
        seed=42,
        write_outputs=False,
    )
    result = run_pipeline(config)
    return result_to_payload(result)


class CargoInputModel(BaseModel):
    cargo_id: str = Field(..., description="Unique cargo identifier")
    origin: str = Field(..., description="Origin airport code")
    destination: str = Field(..., description="Destination airport code")
    weight_kg: float = Field(..., gt=0, description="Cargo weight in kilograms")
    volume_m3: float = Field(..., gt=0, description="Cargo volume in cubic meters")
    revenue_inr: float = Field(..., gt=0, description="Revenue in Indian Rupees")
    priority: str = Field(..., description="Priority level (Low/Medium/High)")
    perishable: bool = Field(False, description="Whether cargo is perishable")
    max_transit_hours: float = Field(..., gt=0, description="Maximum transit time in hours")
    ready_time: str = Field(..., description="Ready time in ISO format")
    due_by: str = Field(..., description="Due by time in ISO format")
    handling_cost_per_kg: float = Field(..., ge=0, description="Handling cost per kg")
    sla_penalty_per_hour: float = Field(..., ge=0, description="SLA penalty per hour")


@app.post("/cargo/add")
async def add_cargo(cargo: CargoInputModel) -> dict:
    """Add a new cargo item to the CSV file."""
    cargo_path = DEFAULT_DATA_DIR / "cargo.csv"

    # Validate that origin and destination are different
    if cargo.origin.upper() == cargo.destination.upper():
        raise HTTPException(
            status_code=400,
            detail="Origin and destination must be different"
        )

    # Check if cargo_id already exists
    try:
        with open(cargo_path, 'r', newline='', encoding='utf-8') as csvfile:
            reader = csv.DictReader(csvfile)
            for row in reader:
                if row['cargo_id'].strip() == cargo.cargo_id.strip():
                    raise HTTPException(
                        status_code=400,
                        detail=f"Cargo ID '{cargo.cargo_id}' already exists"
                    )
    except FileNotFoundError:
        # If file doesn't exist, we'll create it with headers
        pass

    # Validate and normalize datetime formats
    def parse_datetime(dt_str: str) -> datetime:
        """Parse datetime string and ensure it has timezone information."""
        dt_str = dt_str.strip()

        # Handle different datetime formats
        if dt_str.endswith('Z'):
            # UTC time
            return datetime.fromisoformat(dt_str.replace('Z', '+00:00'))
        elif '+' in dt_str or '-' in dt_str[-6:]:  # Check for timezone offset
            # Already has timezone info
            return datetime.fromisoformat(dt_str)
        else:
            # No timezone info, assume Asia/Calcutta (+05:30)
            try:
                naive_dt = datetime.fromisoformat(dt_str)
                # Add Asia/Calcutta timezone
                tz = timezone(timedelta(hours=5, minutes=30))
                return naive_dt.replace(tzinfo=tz)
            except ValueError:
                raise ValueError(f"Invalid datetime format: {dt_str}")

    try:
        ready_dt = parse_datetime(cargo.ready_time)
        due_dt = parse_datetime(cargo.due_by)

        if due_dt <= ready_dt:
            raise HTTPException(
                status_code=400,
                detail="Due by time must be after ready time"
            )
    except ValueError as e:
        raise HTTPException(
            status_code=400,
            detail=f"Invalid datetime format: {str(e)}. Use ISO format (YYYY-MM-DDTHH:MM:SS) with optional timezone"
        )

    # Append to CSV file
    file_exists = cargo_path.exists()

    with open(cargo_path, 'a', newline='', encoding='utf-8') as csvfile:
        fieldnames = [
            'cargo_id', 'origin', 'destination', 'weight_kg', 'volume_m3',
            'revenue_inr', 'priority', 'perishable', 'max_transit_hours',
            'ready_time', 'due_by', 'handling_cost_per_kg', 'sla_penalty_per_hour'
        ]

        writer = csv.DictWriter(csvfile, fieldnames=fieldnames)

        # Write header if file is new
        if not file_exists:
            writer.writeheader()

        # Write cargo data with properly formatted datetime
        writer.writerow({
            'cargo_id': cargo.cargo_id.strip(),
            'origin': cargo.origin.strip().upper(),
            'destination': cargo.destination.strip().upper(),
            'weight_kg': cargo.weight_kg,
            'volume_m3': cargo.volume_m3,
            'revenue_inr': cargo.revenue_inr,
            'priority': cargo.priority.strip().capitalize(),
            'perishable': str(cargo.perishable).lower(),
            'max_transit_hours': cargo.max_transit_hours,
            'ready_time': ready_dt.isoformat(),
            'due_by': due_dt.isoformat(),
            'handling_cost_per_kg': cargo.handling_cost_per_kg,
            'sla_penalty_per_hour': cargo.sla_penalty_per_hour,
        })

    return {
        "message": "Cargo added successfully",
        "cargo_id": cargo.cargo_id,
        "status": "success"
    }
