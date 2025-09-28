from __future__ import annotations

from dataclasses import dataclass
from itertools import combinations
from typing import Iterable, List, Sequence, Tuple

try:
    # When running as part of the FastAPI app
    from .load_data import Cargo, Flight
except ImportError:
    # When running as standalone scripts
    from load_data import Cargo, Flight


@dataclass(frozen=True)
class FlightCargoCandidate:
    cargo: Cargo
    margin: float
    revenue: float
    weight_kg: float
    volume_m3: float
    revenue_density: float
    priority_score: int
    dwell_hours: float


@dataclass(frozen=True)
class FlightSelection:
    flight: Flight
    selected: Tuple[FlightCargoCandidate, ...]
    rejected: Tuple[FlightCargoCandidate, ...]
    total_weight: float
    total_volume: float
    revenue_density_sum: float


PRIORITY_SCORES = {"High": 3, "Medium": 2, "Low": 1}


def _score_subset(subset: Sequence[FlightCargoCandidate], flight_weight_capacity: float, flight_volume_capacity: float) -> Tuple[float, int, float, float, float, float]:
    if not subset:
        return 0.0, 0, float("inf"), 0.0, 0.0, 0.0

    revenue_density_sum = sum(item.revenue_density for item in subset)
    priority_sum = sum(item.priority_score for item in subset)
    avg_dwell = sum(item.dwell_hours for item in subset) / len(subset)
    total_margin = sum(item.margin for item in subset)

    # Calculate utilization metrics
    total_weight = sum(item.weight_kg for item in subset)
    total_volume = sum(item.volume_m3 for item in subset)
    weight_utilization = total_weight / flight_weight_capacity
    volume_utilization = total_volume / flight_volume_capacity

    # Add utilization bonus (prefer solutions that use 60-90% of capacity)
    utilization_score = 0.0
    if weight_utilization >= 0.6 and volume_utilization >= 0.6:
        # Bonus for good utilization (up to 30% capacity usage)
        utilization_bonus = min(weight_utilization, volume_utilization) * 1000
        utilization_score += utilization_bonus

    return revenue_density_sum, priority_sum, avg_dwell, total_margin, utilization_score, weight_utilization + volume_utilization


def select_best_cargo(flight: Flight, candidates: Iterable[FlightCargoCandidate]) -> FlightSelection:
    candidate_list = list(candidates)
    capacity_weight = flight.weight_capacity_kg
    capacity_volume = flight.volume_capacity_m3

    # Separate candidates by priority
    high_priority = [c for c in candidate_list if c.priority_score >= 3]  # High priority
    medium_priority = [c for c in candidate_list if c.priority_score == 2]  # Medium priority
    low_priority = [c for c in candidate_list if c.priority_score <= 1]  # Low priority

    # INTELLIGENT CAPACITY MANAGEMENT: Reserve capacity for ALL high and medium priority cargo
    total_high_medium_weight = sum(c.weight_kg for c in high_priority + medium_priority)
    total_high_medium_volume = sum(c.volume_m3 for c in high_priority + medium_priority)

    # Enhanced capacity check with smart allocation
    if total_high_medium_weight > capacity_weight or total_high_medium_volume > capacity_volume:
        # Try intelligent reallocation before emergency assignment
        optimized_selection = _intelligent_priority_allocation(
            flight, high_priority, medium_priority, low_priority
        )
        if optimized_selection:
            return optimized_selection
        return _emergency_high_medium_assignment(flight, high_priority, medium_priority, low_priority)

    # Phase 1: Assign ALL high-priority cargo (they MUST be assigned)
    high_selected = []
    remaining_weight = capacity_weight
    remaining_volume = capacity_volume

    for candidate in high_priority:
        if (candidate.weight_kg <= remaining_weight and
            candidate.volume_m3 <= remaining_volume):
            high_selected.append(candidate)
            remaining_weight -= candidate.weight_kg
            remaining_volume -= candidate.volume_m3
        else:
            # This should never happen with capacity reservation, but handle it anyway
            return _emergency_high_medium_assignment(flight, high_priority, medium_priority, low_priority)

    # Phase 2: Assign ALL medium-priority cargo (they MUST be assigned)
    medium_selected = []
    for candidate in medium_priority:
        if (candidate.weight_kg <= remaining_weight and
            candidate.volume_m3 <= remaining_volume):
            medium_selected.append(candidate)
            remaining_weight -= candidate.weight_kg
            remaining_volume -= candidate.volume_m3
        else:
            # This should never happen with capacity reservation, but handle it anyway
            return _emergency_high_medium_assignment(flight, high_priority, medium_priority, low_priority)

    # Phase 3: Fill remaining capacity with low-priority cargo
    low_selected = []
    if low_priority:
        low_selected = _select_optimal_low_priority(
            low_priority, remaining_weight, remaining_volume
        )

    # Combine all selected cargo
    selected = high_selected + medium_selected + low_selected

    # Final safety check: ensure ALL high and medium priority cargo are selected
    all_high_medium = high_priority + medium_priority
    selected_high_medium = [c for c in selected if c in all_high_medium]

    if len(selected_high_medium) != len(all_high_medium):
        # This indicates a critical error - force emergency assignment
        print(f"CRITICAL ERROR: High/Medium priority cargo not fully assigned. Forcing emergency assignment.")
        return _emergency_high_medium_assignment(flight, high_priority, medium_priority, low_priority)

    # Calculate final metrics
    total_weight = sum(item.weight_kg for item in selected)
    total_volume = sum(item.volume_m3 for item in selected)
    revenue_density_sum = sum(item.revenue_density for item in selected)

    return FlightSelection(
        flight=flight,
        selected=tuple(selected),
        rejected=tuple(low_priority),  # Only low priority can be rejected
        total_weight=total_weight,
        total_volume=total_volume,
        revenue_density_sum=revenue_density_sum,
    )


def _emergency_high_medium_assignment(
    flight: Flight,
    high_priority: List[FlightCargoCandidate],
    medium_priority: List[FlightCargoCandidate],
    low_priority: List[FlightCargoCandidate]
) -> FlightSelection:
    """Emergency assignment that guarantees ALL high and medium priority cargo are assigned."""
    capacity_weight = flight.weight_capacity_kg
    capacity_volume = flight.volume_capacity_m3

    selected: List[FlightCargoCandidate] = []
    rejected: List[FlightCargoCandidate] = []
    remaining_weight = capacity_weight
    remaining_volume = capacity_volume

    # First, assign as many high priority as possible
    high_selected = []
    for candidate in high_priority:
        if (candidate.weight_kg <= remaining_weight and
            candidate.volume_m3 <= remaining_volume):
            high_selected.append(candidate)
            remaining_weight -= candidate.weight_kg
            remaining_volume -= candidate.volume_m3

    # Then assign as many medium priority as possible
    medium_selected = []
    for candidate in medium_priority:
        if (candidate.weight_kg <= remaining_weight and
            candidate.volume_m3 <= remaining_volume):
            medium_selected.append(candidate)
            remaining_weight -= candidate.weight_kg
            remaining_volume -= candidate.volume_m3

    # If we still have high/medium priority cargo that couldn't fit, we need to make room
    all_critical = high_priority + medium_priority
    selected_critical = high_selected + medium_selected

    if len(selected_critical) < len(all_critical):
        # Emergency capacity reallocation: reject some low-priority cargo to make room
        remaining_critical = [c for c in all_critical if c not in selected_critical]

        # Sort currently selected cargo by priority (lowest first) to determine what to reject
        selected_sorted = sorted(selected_critical, key=lambda x: x.priority_score)

        # Replace lowest priority cargo with remaining critical cargo
        for critical_cargo in remaining_critical:
            # Find the lowest priority selected cargo to replace
            replaced = False
            for i in range(len(selected_sorted)):
                candidate_to_replace = selected_sorted[i]
                if (candidate_to_replace.weight_kg >= critical_cargo.weight_kg and
                    candidate_to_replace.volume_m3 >= critical_cargo.volume_m3):
                    # Replace this cargo with the critical cargo
                    if candidate_to_replace in selected_critical:
                        selected_critical.remove(candidate_to_replace)
                        selected_critical.append(critical_cargo)
                        replaced = True
                        break

            if not replaced:
                # If we can't replace, just add the critical cargo (this will exceed capacity)
                selected_critical.append(critical_cargo)

    # All low priority cargo gets rejected in emergency mode
    rejected.extend(low_priority)

    total_weight = sum(item.weight_kg for item in selected_critical)
    total_volume = sum(item.volume_m3 for item in selected_critical)
    revenue_density_sum = sum(item.revenue_density for item in selected_critical)

    return FlightSelection(
        flight=flight,
        selected=tuple(selected_critical),
        rejected=tuple(rejected + low_priority),
        total_weight=total_weight,
        total_volume=total_volume,
        revenue_density_sum=revenue_density_sum,
    )


def _select_optimal_low_priority(
    candidates: List[FlightCargoCandidate],
    max_weight: float,
    max_volume: float
) -> List[FlightCargoCandidate]:
    """Select optimal subset of low-priority cargo for remaining capacity."""
    best_subset: List[FlightCargoCandidate] = []
    best_score = -1.0

    for r in range(len(candidates) + 1):
        for combo in combinations(candidates, r):
            total_weight = sum(item.weight_kg for item in combo)
            total_volume = sum(item.volume_m3 for item in combo)
            if total_weight > max_weight or total_volume > max_volume:
                continue

            # Score based on revenue density and utilization
            revenue_density_sum = sum(item.revenue_density for item in combo)
            # Prevent division by zero
            weight_util = total_weight / max_weight if max_weight > 0 else 0
            volume_util = total_volume / max_volume if max_volume > 0 else 0
            utilization_score = min(weight_util, volume_util) * 1000

            total_score = revenue_density_sum + utilization_score
            if total_score > best_score:
                best_score = total_score
                best_subset = list(combo)

    return best_subset


def _intelligent_priority_allocation(
    flight: Flight,
    high_priority: List[FlightCargoCandidate],
    medium_priority: List[FlightCargoCandidate],
    low_priority: List[FlightCargoCandidate]
) -> Optional[FlightSelection]:
    """Intelligent allocation that maximizes value while respecting priority constraints."""
    capacity_weight = flight.weight_capacity_kg
    capacity_volume = flight.volume_capacity_m3
    
    # Sort high priority by revenue density (best value first)
    high_sorted = sorted(high_priority, key=lambda x: x.revenue_density, reverse=True)
    medium_sorted = sorted(medium_priority, key=lambda x: x.revenue_density, reverse=True)
    
    selected = []
    remaining_weight = capacity_weight
    remaining_volume = capacity_volume
    
    # Phase 1: Assign as many high priority as possible (best value first)
    for candidate in high_sorted:
        if (candidate.weight_kg <= remaining_weight and
            candidate.volume_m3 <= remaining_volume):
            selected.append(candidate)
            remaining_weight -= candidate.weight_kg
            remaining_volume -= candidate.volume_m3
    
    # Phase 2: Assign medium priority cargo that fits
    for candidate in medium_sorted:
        if (candidate.weight_kg <= remaining_weight and
            candidate.volume_m3 <= remaining_volume):
            selected.append(candidate)
            remaining_weight -= candidate.weight_kg
            remaining_volume -= candidate.volume_m3
    
    # Phase 3: Fill remaining space with best low priority cargo
    if low_priority and remaining_weight > 0 and remaining_volume > 0:
        low_selected = _select_optimal_low_priority(
            low_priority, remaining_weight, remaining_volume
        )
        selected.extend(low_selected)
    
    # Validate that we got reasonable allocation
    total_weight = sum(c.weight_kg for c in selected)
    total_volume = sum(c.volume_m3 for c in selected)
    
    # Check if we achieved good utilization
    weight_util = total_weight / capacity_weight
    volume_util = total_volume / capacity_volume
    
    if weight_util < 0.3 and volume_util < 0.3:  # Very poor utilization
        return None
    
    # Calculate rejected cargo
    all_candidates = high_priority + medium_priority + low_priority
    rejected = [c for c in all_candidates if c not in selected]
    
    revenue_density_sum = sum(c.revenue_density for c in selected)
    
    return FlightSelection(
        flight=flight,
        selected=tuple(selected),
        rejected=tuple(rejected),
        total_weight=total_weight,
        total_volume=total_volume,
        revenue_density_sum=revenue_density_sum,
    )


def _advanced_cargo_scoring(candidate: FlightCargoCandidate, flight: Flight) -> float:
    """Advanced scoring function that considers multiple factors."""
    base_score = candidate.revenue_density * candidate.priority_score
    
    # Utilization efficiency bonus
    weight_ratio = candidate.weight_kg / flight.weight_capacity_kg
    volume_ratio = candidate.volume_m3 / flight.volume_capacity_m3
    utilization_efficiency = min(weight_ratio, volume_ratio) / max(weight_ratio, volume_ratio, 0.001)
    
    # Dwell time penalty (prefer cargo with less dwell time)
    dwell_penalty = max(0, candidate.dwell_hours - 2) * 0.1
    
    # Size efficiency (prefer cargo that uses capacity efficiently)
    size_efficiency = min(weight_ratio, volume_ratio) * 1000
    
    final_score = base_score * utilization_efficiency + size_efficiency - dwell_penalty
    
    return final_score
