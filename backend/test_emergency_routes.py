#!/usr/bin/env python3
import sys
sys.path.append('.')

from ga_route import run_ga
from load_data import load_all
from pathlib import Path

def main():
    print("Loading data...")
    data_dir = Path('../data')
    flights, cargo, connections = load_all(data_dir)

    print("Running GA optimization...")
    result = run_ga(cargo, flights, connections)

    print("GA completed successfully")

    # Analyze results
    high_priority_delivered = sum(1 for a in result.assignments.values()
                                 if a.cargo.priority == 'High' and a.status == 'delivered')
    high_priority_total = sum(1 for a in result.assignments.values() if a.cargo.priority == 'High')

    medium_priority_delivered = sum(1 for a in result.assignments.values()
                                   if a.cargo.priority == 'Medium' and a.status == 'delivered')
    medium_priority_total = sum(1 for a in result.assignments.values() if a.cargo.priority == 'Medium')

    low_priority_delivered = sum(1 for a in result.assignments.values()
                                if a.cargo.priority == 'Low' and a.status == 'delivered')
    low_priority_total = sum(1 for a in result.assignments.values() if a.cargo.priority == 'Low')

    print("\n=== PRIORITY ASSIGNMENT RESULTS ===")
    print(f"High Priority: {high_priority_delivered}/{high_priority_total} delivered")
    print(f"Medium Priority: {medium_priority_delivered}/{medium_priority_total} delivered")
    print(f"Low Priority: {low_priority_delivered}/{low_priority_total} delivered")

    print("\n=== SAMPLE HIGH PRIORITY ASSIGNMENTS ===")
    high_priority_assignments = [(cargo_id, assignment) for cargo_id, assignment in result.assignments.items()
                                if assignment.cargo.priority == 'High' and assignment.status == 'delivered']

    for i, (cargo_id, assignment) in enumerate(high_priority_assignments[:5]):
        flight_count = len(assignment.route.legs)
        flight_ids = [leg.flight.flight_id for leg in assignment.route.legs]
        print(f"  {cargo_id}: {flight_count} flights - {flight_ids}")

    if high_priority_assignments:
        print(f"  ... and {len(high_priority_assignments) - 5} more")

    print("\n=== EMERGENCY ROUTES ===")
    emergency_routes = [(cargo_id, assignment) for cargo_id, assignment in result.assignments.items()
                       if 'emergency' in assignment.route.notes.lower()]

    for cargo_id, assignment in emergency_routes:
        flight_count = len(assignment.route.legs)
        print(f"  {cargo_id} ({assignment.cargo.priority}): {flight_count} flights assigned")

    if not emergency_routes:
        print("  No emergency routes found")

if __name__ == "__main__":
    main()