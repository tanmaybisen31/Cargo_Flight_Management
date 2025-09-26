#!/usr/bin/env python3
"""
Test script to verify priority system works with oversubscribed capacity.
"""

import sys
import os
sys.path.insert(0, os.path.dirname(__file__))

# Simple test to check cargo data
def test_oversubscribed_capacity():
    print("Testing oversubscribed capacity scenario...")

    # Read cargo data
    cargo_file = "../data/cargo.csv"
    if not os.path.exists(cargo_file):
        print(f"ERROR: Cargo file not found: {cargo_file}")
        return

    total_weight = 0
    total_volume = 0
    high_count = 0
    medium_count = 0
    low_count = 0

    with open(cargo_file, 'r') as f:
        lines = f.readlines()[1:]  # Skip header

        for line in lines:
            parts = line.strip().split(',')
            if len(parts) >= 8:
                weight = float(parts[3])  # weight_kg is column 3 (0-indexed: 0,1,2,3)
                volume = float(parts[4])  # volume_m3 is column 4
                priority = parts[6]       # priority is column 6

                total_weight += weight
                total_volume += volume

                if priority == "High":
                    high_count += 1
                elif priority == "Medium":
                    medium_count += 1
                elif priority == "Low":
                    low_count += 1

    print(f"Total cargo items: {len(lines)}")
    print(f"High priority: {high_count}")
    print(f"Medium priority: {medium_count}")
    print(f"Low priority: {low_count}")
    print(f"Total weight demand: {total_weight:,.0f} kg")
    print(f"Total volume demand: {total_volume:,.0f} m³")

    # Read flight data
    flight_file = "../data/flights.csv"
    if not os.path.exists(flight_file):
        print(f"ERROR: Flight file not found: {flight_file}")
        return

    flight_weight_capacity = 0
    flight_volume_capacity = 0

    with open(flight_file, 'r') as f:
        lines = f.readlines()[1:]  # Skip header

        for line in lines:
            parts = line.strip().split(',')
            if len(parts) >= 8:
                weight_cap = float(parts[6])
                volume_cap = float(parts[7])

                flight_weight_capacity += weight_cap
                flight_volume_capacity += volume_cap

    print(f"Total flight weight capacity: {flight_weight_capacity:,.0f} kg")
    print(f"Total flight volume capacity: {flight_volume_capacity:,.0f} m³")

    weight_utilization = (total_weight / flight_weight_capacity) * 100
    volume_utilization = (total_volume / flight_volume_capacity) * 100

    print(f"Weight utilization if all assigned: {weight_utilization:.1f}%")
    print(f"Volume utilization if all assigned: {volume_utilization:.1f}%")

    if weight_utilization > 100 or volume_utilization > 100:
        print("✅ OVER-SUBSCRIBED: Total demand exceeds capacity")
        print("✅ This will test the priority system - low priority should be denied/rolled")
    else:
        print("⚠️ NOT over-subscribed: All cargo could potentially fit")

    print("\nExpected behavior:")
    print("- High priority cargo: 100% assignment guarantee")
    print("- Medium priority cargo: 100% assignment guarantee")
    print("- Low priority cargo: May be denied/rolled to make room")

    print("\nTest setup complete!")

if __name__ == "__main__":
    test_oversubscribed_capacity()