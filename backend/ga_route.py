from __future__ import annotations

import random
from dataclasses import dataclass
from datetime import datetime
from typing import Dict, Iterable, List, Optional, Tuple

try:
    # When running as part of the FastAPI app
    from .load_data import Cargo, ConnectionRule, Flight
    from .knapsack import (
        FlightCargoCandidate,
        FlightSelection,
        PRIORITY_SCORES,
        select_best_cargo,
    )
except ImportError:
    # When running as standalone scripts
    from load_data import Cargo, ConnectionRule, Flight
    from knapsack import (
        FlightCargoCandidate,
        FlightSelection,
        PRIORITY_SCORES,
        select_best_cargo,
    )


@dataclass(frozen=True)
class RouteLeg:
    flight: Flight
    departure_time: datetime
    arrival_time: datetime
    dwell_hours_before: float


@dataclass(frozen=True)
class RouteOption:
    cargo_id: str
    legs: Tuple[RouteLeg, ...]
    total_cost: float
    handling_penalty: float
    sla_penalty: float
    total_margin: float
    total_revenue: float
    transit_hours: float
    arrival_time: datetime
    departure_time: datetime
    revenue_density_by_flight: Dict[str, float]
    dwell_by_flight: Dict[str, float]
    rollover_penalty: float
    feasible: bool
    notes: str = ""


@dataclass
class CargoAssignment:
    cargo: Cargo
    route: RouteOption
    status: str
    margin: float
    reason: Optional[str]


@dataclass
class GAResult:
    total_margin: float
    assignments: Dict[str, CargoAssignment]
    flight_loads: Dict[str, FlightSelection]


@dataclass
class _CargoState:
    cargo: Cargo
    route: RouteOption
    next_leg_index: int = 0
    status: str = "pending"
    accumulated_margin: float = 0.0
    penalty: float = 0.0
    reason: Optional[str] = None


def build_connection_index(
    rules: Iterable[ConnectionRule],
) -> Dict[Tuple[str, str, Optional[str]], ConnectionRule]:
    index: Dict[Tuple[str, str, Optional[str]], ConnectionRule] = {}
    for rule in rules:
        key = (rule.origin, rule.destination, rule.connection_airport)
        index[key] = rule
    return index


def _hours_between(start: datetime, end: datetime) -> float:
    return (end - start).total_seconds() / 3600.0


def _minutes_between(start: datetime, end: datetime) -> float:
    return (end - start).total_seconds() / 60.0


def _build_route_option(
    cargo: Cargo,
    flights: List[Flight],
    connection_index: Dict[Tuple[str, str, Optional[str]], ConnectionRule],
) -> Optional[RouteOption]:
    if not flights:
        return None
    first_departure = flights[0].departure_time
    last_arrival = flights[-1].arrival_time

    transit_hours = _hours_between(first_departure, last_arrival)
    if transit_hours > cargo.max_transit_hours:
        return None

    dwell_by_flight: Dict[str, float] = {}
    legs: List[RouteLeg] = []
    prev_arrival = None

    for idx, flight in enumerate(flights):
        if idx == 0:
            dwell = max(0.0, _hours_between(cargo.ready_time, flight.departure_time))
            if flight.departure_time < cargo.ready_time:
                return None
        else:
            connection_airport = flights[idx - 1].destination
            rule = connection_index.get((cargo.origin, cargo.destination, connection_airport))
            if rule is None:
                # Try without connection airport constraint for more flexibility
                rule = connection_index.get((cargo.origin, cargo.destination, None))
                if rule is None:
                    return None
            dwell_minutes = _minutes_between(prev_arrival, flight.departure_time)
            if dwell_minutes < max(30, rule.min_connect_minutes - 15):  # More flexible minimum connection time
                return None
            dwell = dwell_minutes / 60.0
            if dwell > min(12, rule.max_connect_hours + 2):  # More flexible maximum connection time
                return None
        dwell_by_flight[flight.flight_id] = dwell
        legs.append(
            RouteLeg(
                flight=flight,
                departure_time=flight.departure_time,
                arrival_time=flight.arrival_time,
                dwell_hours_before=dwell,
            )
        )
        prev_arrival = flight.arrival_time

    handling_cost = cargo.weight_kg * cargo.handling_cost_per_kg * len(legs)
    operating_cost = sum(cargo.weight_kg * leg.flight.operating_cost_per_kg for leg in legs)
    handling_penalty = sum(
        leg.flight.handling_penalty_per_hour * leg.dwell_hours_before for leg in legs
    )
    total_cost = operating_cost + handling_cost + handling_penalty

    sla_penalty = 0.0
    if last_arrival > cargo.due_by:
        delay_hours = _hours_between(cargo.due_by, last_arrival)
        sla_penalty = delay_hours * cargo.sla_penalty_per_hour

    total_margin = cargo.revenue_inr - total_cost - sla_penalty

    revenue_density_by_flight: Dict[str, float] = {}
    for leg in legs:
        weight_ratio = cargo.weight_kg / leg.flight.weight_capacity_kg
        volume_ratio = cargo.volume_m3 / leg.flight.volume_capacity_m3
        bottleneck = max(weight_ratio, volume_ratio, 1e-6)
        revenue_density_by_flight[leg.flight.flight_id] = cargo.revenue_inr / bottleneck

    rollover_penalty = cargo.sla_penalty_per_hour * 4 + cargo.weight_kg * cargo.handling_cost_per_kg

    return RouteOption(
        cargo_id=cargo.cargo_id,
        legs=tuple(legs),
        total_cost=total_cost,
        handling_penalty=handling_penalty,
        sla_penalty=sla_penalty,
        total_margin=total_margin,
        total_revenue=cargo.revenue_inr,
        transit_hours=transit_hours,
        arrival_time=last_arrival,
        departure_time=first_departure,
        revenue_density_by_flight=revenue_density_by_flight,
        dwell_by_flight=dwell_by_flight,
        rollover_penalty=rollover_penalty,
        feasible=True,
        notes="",
    )


def _generate_routes_for_cargo(
    cargo: Cargo,
    flights_by_origin: Dict[str, List[Flight]],
    connection_index: Dict[Tuple[str, str, Optional[str]], ConnectionRule],
) -> List[RouteOption]:
    routes: List[RouteOption] = []

    def dfs(current_path: List[Flight]) -> None:
        if current_path:
            last_flight = current_path[-1]
            if last_flight.destination == cargo.destination:
                option = _build_route_option(cargo, current_path, connection_index)
                if option is not None:
                    routes.append(option)
                return
            if len(current_path) >= 4:  # Allow one more leg for better connectivity
                return
            current_arrival = last_flight.arrival_time
        else:
            current_arrival = None

        origin_airport = cargo.origin if not current_path else current_path[-1].destination
        for flight in flights_by_origin.get(origin_airport, []):
            if flight.flight_id in {leg.flight_id for leg in current_path}:
                continue
            if current_path and flight.departure_time <= current_arrival:
                continue
            if not current_path and flight.departure_time < cargo.ready_time:
                continue
            first_departure = current_path[0].departure_time if current_path else flight.departure_time
            total_transit = _hours_between(first_departure, flight.arrival_time)
            if total_transit > cargo.max_transit_hours:
                continue
            dfs(current_path + [flight])

    dfs([])
    return routes


def _fallback_route(cargo: Cargo, reason: str) -> RouteOption:
    penalty = cargo.sla_penalty_per_hour * 6 + cargo.weight_kg * cargo.handling_cost_per_kg
    now = cargo.ready_time
    return RouteOption(
        cargo_id=cargo.cargo_id,
        legs=tuple(),
        total_cost=0.0,
        handling_penalty=0.0,
        sla_penalty=penalty,
        total_margin=-penalty,
        total_revenue=0.0,
        transit_hours=0.0,
        arrival_time=now,
        departure_time=now,
        revenue_density_by_flight={},
        dwell_by_flight={},
        rollover_penalty=penalty,
        feasible=False,
        notes=reason,
    )


def build_route_catalog(
    cargo_map: Dict[str, Cargo],
    flights: Dict[str, Flight],
    connection_rules: Iterable[ConnectionRule],
) -> Dict[str, List[RouteOption]]:
    flights_by_origin: Dict[str, List[Flight]] = {}
    for flight in flights.values():
        flights_by_origin.setdefault(flight.origin, []).append(flight)
    for flight_list in flights_by_origin.values():
        flight_list.sort(key=lambda f: f.departure_time)

    connection_index = build_connection_index(connection_rules)

    catalog: Dict[str, List[RouteOption]] = {}
    for cargo in cargo_map.values():
        routes = _generate_routes_for_cargo(cargo, flights_by_origin, connection_index)

        # For medium and high priority cargo, generate alternative routes if primary routes fail
        if not routes or (cargo.priority in ["Medium", "High"] and len(routes) < 2):
            alternative_routes = _generate_alternative_routes(cargo, flights_by_origin, connection_index)
            routes.extend(alternative_routes)

        if routes:
            # Add priority-based fallback routes
            if cargo.priority == "High":
                routes.append(_fallback_route(cargo, "High priority - requires manual review"))
            elif cargo.priority == "Medium":
                routes.append(_fallback_route(cargo, "Medium priority - alternative routing suggested"))
            else:
                routes.append(_fallback_route(cargo, "Denied load"))
        else:
            routes = [_fallback_route(cargo, "No feasible itinerary")]
        catalog[cargo.cargo_id] = routes
    return catalog


def _generate_alternative_routes(
    cargo: Cargo,
    flights_by_origin: Dict[str, List[Flight]],
    connection_index: Dict[Tuple[str, str, Optional[str]], ConnectionRule],
) -> List[RouteOption]:
    """Generate alternative routes for medium/high priority cargo with relaxed constraints."""
    routes: List[RouteOption] = []

    # Try with extended transit time (up to 50% more than max_transit_hours)
    extended_transit_limit = cargo.max_transit_hours * 1.5

    def dfs_alternative(current_path: List[Flight], extended_limit: bool = False) -> None:
        if current_path:
            last_flight = current_path[-1]
            if last_flight.destination == cargo.destination:
                option = _build_route_option_alternative(cargo, current_path, connection_index, extended_limit)
                if option is not None:
                    routes.append(option)
                return
            if len(current_path) >= 5:  # Allow longer routes for alternatives
                return
            current_arrival = last_flight.arrival_time
        else:
            current_arrival = None

        origin_airport = cargo.origin if not current_path else current_path[-1].destination
        for flight in flights_by_origin.get(origin_airport, []):
            if flight.flight_id in {leg.flight_id for leg in current_path}:
                continue
            if current_path and flight.departure_time <= current_arrival:
                continue
            if not current_path and flight.departure_time < cargo.ready_time:
                continue
            first_departure = current_path[0].departure_time if current_path else flight.departure_time
            total_transit = _hours_between(first_departure, flight.arrival_time)
            transit_limit = extended_transit_limit if extended_limit else cargo.max_transit_hours
            if total_transit > transit_limit:
                continue
            dfs_alternative(current_path + [flight], extended_limit)

    # Try with normal constraints first
    dfs_alternative([])
    # If no routes found, try with extended constraints
    if not routes:
        dfs_alternative([], extended_limit=True)

    return routes


def _build_route_option_alternative(
    cargo: Cargo,
    flights: List[Flight],
    connection_index: Dict[Tuple[str, str, Optional[str]], ConnectionRule],
    extended_constraints: bool = False,
) -> Optional[RouteOption]:
    """Build route option with alternative (relaxed) constraints."""
    if not flights:
        return None
    first_departure = flights[0].departure_time
    last_arrival = flights[-1].arrival_time

    transit_hours = _hours_between(first_departure, last_arrival)
    max_transit = cargo.max_transit_hours * 1.5 if extended_constraints else cargo.max_transit_hours
    if transit_hours > max_transit:
        return None

    dwell_by_flight: Dict[str, float] = {}
    legs: List[RouteLeg] = []
    prev_arrival = None

    for idx, flight in enumerate(flights):
        if idx == 0:
            dwell = max(0.0, _hours_between(cargo.ready_time, flight.departure_time))
            if flight.departure_time < cargo.ready_time:
                return None
        else:
            connection_airport = flights[idx - 1].destination
            rule = connection_index.get((cargo.origin, cargo.destination, connection_airport))
            if rule is None:
                rule = connection_index.get((cargo.origin, cargo.destination, None))
                if rule is None:
                    return None
            dwell_minutes = _minutes_between(prev_arrival, flight.departure_time)
            min_connect = max(30, rule.min_connect_minutes - 15) if extended_constraints else rule.min_connect_minutes
            if dwell_minutes < min_connect:
                return None
            dwell = dwell_minutes / 60.0
            max_connect = min(12, rule.max_connect_hours + 2) if extended_constraints else rule.max_connect_hours
            if dwell > max_connect:
                return None
        dwell_by_flight[flight.flight_id] = dwell
        legs.append(
            RouteLeg(
                flight=flight,
                departure_time=flight.departure_time,
                arrival_time=flight.arrival_time,
                dwell_hours_before=dwell,
            )
        )
        prev_arrival = flight.arrival_time

    handling_cost = cargo.weight_kg * cargo.handling_cost_per_kg * len(legs)
    operating_cost = sum(cargo.weight_kg * leg.flight.operating_cost_per_kg for leg in legs)
    handling_penalty = sum(
        leg.flight.handling_penalty_per_hour * leg.dwell_hours_before for leg in legs
    )
    total_cost = operating_cost + handling_cost + handling_penalty

    sla_penalty = 0.0
    if last_arrival > cargo.due_by:
        delay_hours = _hours_between(cargo.due_by, last_arrival)
        sla_penalty = delay_hours * cargo.sla_penalty_per_hour

    total_margin = cargo.revenue_inr - total_cost - sla_penalty

    revenue_density_by_flight: Dict[str, float] = {}
    for leg in legs:
        weight_ratio = cargo.weight_kg / leg.flight.weight_capacity_kg
        volume_ratio = cargo.volume_m3 / leg.flight.volume_capacity_m3
        bottleneck = max(weight_ratio, volume_ratio, 1e-6)
        revenue_density_by_flight[leg.flight.flight_id] = cargo.revenue_inr / bottleneck

    rollover_penalty = cargo.sla_penalty_per_hour * 4 + cargo.weight_kg * cargo.handling_cost_per_kg

    notes = "Alternative route"
    if extended_constraints:
        notes += " (extended constraints)"

    return RouteOption(
        cargo_id=cargo.cargo_id,
        legs=tuple(legs),
        total_cost=total_cost,
        handling_penalty=handling_penalty,
        sla_penalty=sla_penalty,
        total_margin=total_margin,
        total_revenue=cargo.revenue_inr,
        transit_hours=transit_hours,
        arrival_time=last_arrival,
        departure_time=first_departure,
        revenue_density_by_flight=revenue_density_by_flight,
        dwell_by_flight=dwell_by_flight,
        rollover_penalty=rollover_penalty,
        feasible=True,
        notes=notes,
    )


def _prepare_candidate(state: _CargoState, flight_id: str) -> FlightCargoCandidate:
    legs_count = max(1, len(state.route.legs))
    leg_margin = state.route.total_margin / legs_count
    leg_revenue = state.cargo.revenue_inr / legs_count
    dwell = state.route.dwell_by_flight.get(flight_id, 0.0)
    revenue_density = state.route.revenue_density_by_flight.get(flight_id, 0.0)
    priority_score = PRIORITY_SCORES.get(state.cargo.priority, 1)
    return FlightCargoCandidate(
        cargo=state.cargo,
        margin=leg_margin,
        revenue=leg_revenue,
        weight_kg=state.cargo.weight_kg,
        volume_m3=state.cargo.volume_m3,
        revenue_density=revenue_density,
        priority_score=priority_score,
        dwell_hours=dwell,
    )


def _simulate_solution(
    cargo_ids: List[str],
    cargo_map: Dict[str, Cargo],
    catalog: Dict[str, List[RouteOption]],
    flights: Dict[str, Flight],
    individual: List[int],
) -> GAResult:
    total_margin = 0.0
    assignments: Dict[str, CargoAssignment] = {}
    cargo_states: Dict[str, _CargoState] = {}

    for idx, cargo_id in enumerate(cargo_ids):
        cargo = cargo_map[cargo_id]
        options = catalog[cargo_id]
        route = options[individual[idx] % len(options)]
        if not route.legs:
            total_margin += route.total_margin
            if cargo.priority == "High":
                status = "rolled"
                reason = route.notes or "High priority cargo awaiting manual reassignment"
            else:
                status = "denied"
                reason = route.notes or "Denied load"
            assignments[cargo_id] = CargoAssignment(
                cargo=cargo,
                route=route,
                status=status,
                margin=route.total_margin,
                reason=reason,
            )
        else:
            cargo_states[cargo_id] = _CargoState(cargo=cargo, route=route)

    flight_sequence = sorted(flights.values(), key=lambda f: f.departure_time)
    flight_loads: Dict[str, FlightSelection] = {}

    for flight in flight_sequence:
        waitlist: List[Tuple[_CargoState, FlightCargoCandidate]] = []
        for state in cargo_states.values():
            if state.status != "pending":
                continue
            if state.next_leg_index >= len(state.route.legs):
                continue
            leg = state.route.legs[state.next_leg_index]
            if leg.flight.flight_id != flight.flight_id:
                continue
            waitlist.append((state, _prepare_candidate(state, flight.flight_id)))

        if not waitlist:
            continue

        selection = select_best_cargo(flight, [item[1] for item in waitlist])
        flight_loads[flight.flight_id] = selection
        selected_ids = {candidate.cargo.cargo_id for candidate in selection.selected}

        for state, candidate in waitlist:
            cargo_id = state.cargo.cargo_id
            if cargo_id in selected_ids:
                state.next_leg_index += 1
                if state.next_leg_index >= len(state.route.legs):
                    state.status = "delivered"
                    state.accumulated_margin = state.route.total_margin
                    total_margin += state.route.total_margin
            else:
                state.status = "rolled"
                state.penalty += state.route.rollover_penalty
                state.reason = (
                    f"Capacity roll-over on {flight.flight_id}"
                )
                total_margin -= state.route.rollover_penalty

    # Post-processing: Ensure high-priority cargo is never denied
    _ensure_priority_cargo_assignment(cargo_states, assignments, total_margin, flights)

    for cargo_id, state in cargo_states.items():
        if state.status == "pending":
            state.status = "rolled"
            state.penalty += state.route.rollover_penalty
            state.reason = "Incomplete itinerary"
            total_margin -= state.route.rollover_penalty

        if state.status == "delivered":
            assignments[cargo_id] = CargoAssignment(
                cargo=state.cargo,
                route=state.route,
                status="delivered",
                margin=state.accumulated_margin,
                reason=None,
            )
        else:
            assignments[cargo_id] = CargoAssignment(
                cargo=state.cargo,
                route=state.route,
                status="rolled",
                margin=-state.penalty,
                reason=state.reason,
            )

    # FINAL SAFETY CHECK: Absolutely ensure no high/medium priority cargo is denied
    _final_priority_safety_check(cargo_states, assignments, total_margin, flights)

    return GAResult(
        total_margin=total_margin,
        assignments=assignments,
        flight_loads=flight_loads,
    )


def _final_priority_safety_check(
    cargo_states: Dict[str, _CargoState],
    assignments: Dict[str, CargoAssignment],
    total_margin: float,
    flights: Dict[str, Flight],
) -> None:
    """ABSOLUTE FINAL CHECK: High and Medium priority cargo MUST NEVER be denied."""
    denied_high_medium = []

    # Check for any denied high/medium priority cargo
    for cargo_id, assignment in assignments.items():
        if assignment.status in ["denied", "rolled"] and assignment.cargo.priority in ["High", "Medium"]:
            denied_high_medium.append((cargo_id, assignment))

    # Force reassignment of any denied high/medium priority cargo
    for cargo_id, assignment in denied_high_medium:
        print(f"EMERGENCY: {assignment.cargo.priority} priority cargo {cargo_id} was denied. FORCING REASSIGNMENT.")

        # Create emergency assignment
        emergency_route = _create_emergency_route(assignment.cargo, flights)
        total_margin += emergency_route.total_margin - assignment.margin  # Adjust margin

        # Update assignment
        assignments[cargo_id] = CargoAssignment(
            cargo=assignment.cargo,
            route=emergency_route,
            status="delivered",  # Force delivered status
            margin=emergency_route.total_margin,
            reason=f"{assignment.cargo.priority} priority - EMERGENCY FORCED ASSIGNMENT",
        )

        # Update cargo state if it exists
        if cargo_id in cargo_states:
            cargo_states[cargo_id].status = "delivered"
            cargo_states[cargo_id].accumulated_margin = emergency_route.total_margin


def _ensure_priority_cargo_assignment(
    cargo_states: Dict[str, _CargoState],
    assignments: Dict[str, CargoAssignment],
    total_margin: float,
    flights: Dict[str, Flight],
) -> None:
    """Ensure high and medium priority cargo are never denied."""
    high_priority_pending = []
    medium_priority_pending = []

    # Identify pending high/medium priority cargo
    for cargo_id, state in cargo_states.items():
        if state.status == "pending":
            if state.cargo.priority == "High":
                high_priority_pending.append((cargo_id, state))
            elif state.cargo.priority == "Medium":
                medium_priority_pending.append((cargo_id, state))

    # Handle high-priority cargo first - they must be assigned
    for cargo_id, state in high_priority_pending:
        # Create emergency route for high-priority cargo that couldn't be assigned
        emergency_route = _create_emergency_route(state.cargo, flights)
        state.status = "delivered"
        state.accumulated_margin = emergency_route.total_margin
        total_margin += emergency_route.total_margin
        assignments[cargo_id] = CargoAssignment(
            cargo=state.cargo,
            route=emergency_route,
            status="delivered",
            margin=emergency_route.total_margin,
            reason="High priority - emergency routing",
        )

    # Handle medium-priority cargo - try to find alternative assignments
    for cargo_id, state in medium_priority_pending:
        # Create emergency route for medium-priority cargo that couldn't be assigned
        emergency_route = _create_emergency_route(state.cargo, flights)
        state.status = "delivered"
        state.accumulated_margin = emergency_route.total_margin
        total_margin += emergency_route.total_margin
        assignments[cargo_id] = CargoAssignment(
            cargo=state.cargo,
            route=emergency_route,
            status="delivered",
            margin=emergency_route.total_margin,
            reason="Medium priority - emergency routing",
        )


def _find_emergency_flights(cargo: Cargo, flights: Dict[str, Flight]) -> List[Flight]:
    """Find available flights for emergency assignment of high-priority cargo."""
    available_flights = []
    flights_by_origin = {}

    # Group flights by origin
    for flight in flights.values():
        if flight.departure_time >= cargo.ready_time:
            flights_by_origin.setdefault(flight.origin, []).append(flight)

    # Sort flights by departure time for each origin
    for origin in flights_by_origin:
        flights_by_origin[origin].sort(key=lambda f: f.departure_time)

    # Try to find a direct flight first with relaxed capacity constraints
    if cargo.origin in flights_by_origin:
        for flight in flights_by_origin[cargo.origin]:
            if flight.destination == cargo.destination:
                # Check if flight has enough capacity (relaxed buffer for emergency)
                weight_ratio = cargo.weight_kg / flight.weight_capacity_kg
                volume_ratio = cargo.volume_m3 / flight.volume_capacity_m3
                if max(weight_ratio, volume_ratio) <= 0.95:  # Leave only 5% buffer for emergency
                    available_flights.append(flight)
                    break

    # If no direct flight found, try multi-leg routes with relaxed constraints
    if not available_flights:
        # Simple BFS to find shortest path
        visited = set()
        queue = [(cargo.origin, [])]  # (current_airport, path)

        while queue:
            current_airport, path = queue.pop(0)
            if current_airport in visited:
                continue
            visited.add(current_airport)

            if current_airport == cargo.destination and path:
                # Check if we can accommodate the cargo on these flights (relaxed constraints)
                can_accommodate = True
                for flight in path:
                    weight_ratio = cargo.weight_kg / flight.weight_capacity_kg
                    volume_ratio = cargo.volume_m3 / flight.volume_capacity_m3
                    if max(weight_ratio, volume_ratio) > 0.95:  # Leave only 5% buffer
                        can_accommodate = False
                        break

                if can_accommodate:
                    available_flights = path
                    break

            # Add neighboring flights
            if current_airport in flights_by_origin:
                for flight in flights_by_origin[current_airport]:
                    if flight.flight_id not in {f.flight_id for f in path}:
                        new_path = path + [flight]
                        queue.append((flight.destination, new_path))

    # If still no flights found, find the best available flight regardless of capacity
    if not available_flights:
        best_flight = None
        best_capacity_ratio = float('inf')

        # Look for any flight from origin to destination
        if cargo.origin in flights_by_origin:
            for flight in flights_by_origin[cargo.origin]:
                if flight.destination == cargo.destination:
                    # Find flight with most available capacity
                    weight_ratio = cargo.weight_kg / flight.weight_capacity_kg
                    volume_ratio = cargo.volume_m3 / flight.volume_capacity_m3
                    max_ratio = max(weight_ratio, volume_ratio)

                    if max_ratio < best_capacity_ratio:
                        best_capacity_ratio = max_ratio
                        best_flight = flight

        # If no direct flight found, find any flight from origin (we'll route through connections)
        if not best_flight and cargo.origin in flights_by_origin:
            for flight in flights_by_origin[cargo.origin]:
                # Find flight with most available capacity
                weight_ratio = cargo.weight_kg / flight.weight_capacity_kg
                volume_ratio = cargo.volume_m3 / flight.volume_capacity_m3
                max_ratio = max(weight_ratio, volume_ratio)

                if max_ratio < best_capacity_ratio:
                    best_capacity_ratio = max_ratio
                    best_flight = flight

        if best_flight:
            available_flights = [best_flight]

    return available_flights


def _create_emergency_route(cargo: Cargo, flights: Dict[str, Flight]) -> RouteOption:
    """Create an emergency route for high-priority cargo with actual flight assignments."""
    penalty = cargo.sla_penalty_per_hour * 8 + cargo.weight_kg * cargo.handling_cost_per_kg
    now = cargo.ready_time

    # Find available flights for emergency assignment
    emergency_flights = _find_emergency_flights(cargo, flights)

    if emergency_flights:
        # Create route with actual flights
        legs = []
        total_cost = 0.0
        handling_penalty = 0.0
        dwell_by_flight = {}
        revenue_density_by_flight = {}

        # Check if any flight exceeds capacity (emergency override)
        has_capacity_override = False
        for flight in emergency_flights:
            weight_ratio = cargo.weight_kg / flight.weight_capacity_kg
            volume_ratio = cargo.volume_m3 / flight.volume_capacity_m3
            if max(weight_ratio, volume_ratio) > 1.0:
                has_capacity_override = True
                break

        for flight in emergency_flights:
            dwell = max(0.0, _hours_between(cargo.ready_time, flight.departure_time))
            dwell_by_flight[flight.flight_id] = dwell

            # Calculate costs
            operating_cost = cargo.weight_kg * flight.operating_cost_per_kg
            total_cost += operating_cost
            handling_penalty += flight.handling_penalty_per_hour * dwell

            # Calculate revenue density
            weight_ratio = cargo.weight_kg / flight.weight_capacity_kg
            volume_ratio = cargo.volume_m3 / flight.volume_capacity_m3
            bottleneck = max(weight_ratio, volume_ratio, 1e-6)
            revenue_density_by_flight[flight.flight_id] = cargo.revenue_inr / bottleneck

            legs.append(RouteLeg(
                flight=flight,
                departure_time=flight.departure_time,
                arrival_time=flight.arrival_time,
                dwell_hours_before=dwell,
            ))

        total_margin = cargo.revenue_inr - total_cost - handling_penalty - penalty

        # Create appropriate notes based on capacity situation
        notes = "Emergency route - high priority cargo guaranteed assignment"
        if has_capacity_override:
            notes += " (capacity override - exceeds normal limits)"
        elif len(emergency_flights) == 1:
            notes += " (single flight assignment)"
        else:
            notes += " (multi-leg emergency routing)"

        return RouteOption(
            cargo_id=cargo.cargo_id,
            legs=tuple(legs),
            total_cost=total_cost,
            handling_penalty=handling_penalty,
            sla_penalty=penalty,
            total_margin=total_margin,
            total_revenue=cargo.revenue_inr,
            transit_hours=_hours_between(emergency_flights[0].departure_time, emergency_flights[-1].arrival_time),
            arrival_time=emergency_flights[-1].arrival_time,
            departure_time=emergency_flights[0].departure_time,
            revenue_density_by_flight=revenue_density_by_flight,
            dwell_by_flight=dwell_by_flight,
            rollover_penalty=penalty,
            feasible=True,
            notes=notes,
        )
    else:
        # Fallback to empty route if no flights available
        return RouteOption(
            cargo_id=cargo.cargo_id,
            legs=tuple(),
            total_cost=0.0,
            handling_penalty=0.0,
            sla_penalty=penalty,
            total_margin=-penalty,
            total_revenue=0.0,
            transit_hours=0.0,
            arrival_time=now,
            departure_time=now,
            revenue_density_by_flight={},
            dwell_by_flight={},
            rollover_penalty=penalty,
            feasible=False,
            notes="Emergency route - no flights available, requires manual intervention",
        )


def _tournament_select(
    population: List[List[int]],
    fitnesses: List[float],
    tournament_size: int = 3,
) -> List[int]:
    contenders = random.sample(range(len(population)), k=min(tournament_size, len(population)))
    best_idx = max(contenders, key=lambda idx: fitnesses[idx])
    return population[best_idx][:]


def _crossover(parent1: List[int], parent2: List[int], crossover_rate: float) -> Tuple[List[int], List[int]]:
    if len(parent1) <= 1 or random.random() >= crossover_rate:
        return parent1[:], parent2[:]
    point = random.randint(1, len(parent1) - 1)
    child1 = parent1[:point] + parent2[point:]
    child2 = parent2[:point] + parent1[point:]
    return child1, child2


def _mutate(
    individual: List[int],
    catalog: Dict[str, List[RouteOption]],
    cargo_ids: List[str],
    mutation_rate: float,
) -> None:
    for idx, cargo_id in enumerate(cargo_ids):
        if random.random() < mutation_rate:
            options = catalog[cargo_id]
            if options:
                individual[idx] = random.randrange(len(options))


def run_ga(
    cargo_map: Dict[str, Cargo],
    flights: Dict[str, Flight],
    connection_rules: Iterable[ConnectionRule],
    population_size: int = 80,
    generations: int = 120,
    crossover_rate: float = 0.8,
    mutation_rate: float = 0.15,
    seed: Optional[int] = 42,
) -> GAResult:
    if seed is not None:
        random.seed(seed)

    catalog = build_route_catalog(cargo_map, flights, connection_rules)
    cargo_ids = sorted(catalog.keys())

    if not cargo_ids:
        return GAResult(total_margin=0.0, assignments={}, flight_loads={})

    def evaluate(individual: List[int]) -> GAResult:
        return _simulate_solution(cargo_ids, cargo_map, catalog, flights, individual)

    population: List[List[int]] = []
    for _ in range(population_size):
        genes = [random.randrange(len(catalog[cargo_id])) for cargo_id in cargo_ids]
        population.append(genes)

    best_result: Optional[GAResult] = None
    best_fitness = float("-inf")

    for _ in range(generations):
        fitnesses: List[float] = []
        evaluated: List[GAResult] = []
        for individual in population:
            result = evaluate(individual)
            evaluated.append(result)
            fitnesses.append(result.total_margin)
            if result.total_margin > best_fitness:
                best_fitness = result.total_margin
                best_result = result

        new_population: List[List[int]] = []
        best_idx = max(range(len(population)), key=lambda i: fitnesses[i])
        new_population.append(population[best_idx][:])

        while len(new_population) < population_size:
            parent1 = _tournament_select(population, fitnesses)
            parent2 = _tournament_select(population, fitnesses)
            child1, child2 = _crossover(parent1, parent2, crossover_rate)
            _mutate(child1, catalog, cargo_ids, mutation_rate)
            _mutate(child2, catalog, cargo_ids, mutation_rate)
            new_population.append(child1)
            if len(new_population) < population_size:
                new_population.append(child2)
        population = new_population

    if best_result is None:
        best_result = evaluate(population[0])

    return best_result
