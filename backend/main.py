from __future__ import annotations

import argparse
import json
from pathlib import Path
from typing import Iterable, List

from .disruptions import DisruptionEvent
from .pipeline import PipelineConfig, run_pipeline


def _load_events(path: Path) -> Iterable[DisruptionEvent]:
    if not path.exists():
        raise FileNotFoundError(f"Disruption file not found: {path}")
    data = json.loads(path.read_text(encoding="utf-8"))
    events: List[DisruptionEvent] = []
    for raw in data:
        events.append(
            DisruptionEvent(
                event_type=raw["event_type"],
                flight_id=raw["flight_id"],
                delay_minutes=raw.get("delay_minutes", 0),
                new_weight_capacity_kg=raw.get("new_weight_capacity_kg"),
                new_volume_capacity_m3=raw.get("new_volume_capacity_m3"),
            )
        )
    return events


def main() -> None:
    parser = argparse.ArgumentParser(description="Cargo Route & Load Planning POC")
    parser.add_argument(
        "--data",
        type=Path,
        default=Path("data"),
        help="Directory containing flights.csv, cargo.csv, connections.csv",
    )
    parser.add_argument(
        "--output",
        type=Path,
        default=Path("outputs"),
        help="Directory to write results",
    )
    parser.add_argument(
        "--events",
        type=Path,
        help="Optional JSON file describing disruption events",
    )
    parser.add_argument(
        "--seed",
        type=int,
        default=42,
        help="Random seed for GA reproducibility",
    )
    parser.add_argument(
        "--no-write",
        action="store_true",
        help="Disable writing CSV/JSON artefacts to disk",
    )

    args = parser.parse_args()

    events = _load_events(args.events) if args.events else None

    config = PipelineConfig(
        data_dir=args.data,
        output_dir=args.output,
        events=events,
        seed=args.seed,
        write_outputs=not args.no_write,
    )
    result = run_pipeline(config)

    print(
        json.dumps(
            {
                "total_margin": result.scenario_result.total_margin,
                "cargo_delivered": sum(
                    1
                    for assignment in result.scenario_result.assignments.values()
                    if assignment.status == "delivered"
                ),
                "alerts": len(result.alerts),
                "output_dir": str(args.output.resolve()),
            },
            indent=2,
        )
    )


if __name__ == "__main__":
    main()
