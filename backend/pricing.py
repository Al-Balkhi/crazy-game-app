"""Session time and pricing calculations."""

import math
from datetime import datetime
from typing import Optional

from models import DeviceType

MIN_BILLABLE_MINUTES = 30
BILLING_INCREMENT_MINUTES = 15


def hourly_rate_for_session(device_type: DeviceType, session_type: str) -> float:
    price_map = {
        "dual": device_type.dual_price,
        "triple": device_type.triple_price,
        "quad": device_type.quad_price,
    }
    return float(price_map.get(session_type, 0.0))


def calc_booked_session_price(
    device_type: DeviceType,
    session_type: str,
    duration_minutes: int,
) -> float:
    """Full price for the booked duration (hourly rate × hours)."""
    rate = hourly_rate_for_session(device_type, session_type)
    return round(rate * (duration_minutes / 60), 2)


def minutes_between(start_time: datetime, end_time: datetime) -> int:
    elapsed_seconds = max(0, (end_time - start_time).total_seconds())
    return int(math.ceil(elapsed_seconds / 60))


def billable_minutes(actual_minutes: int, booked_minutes: int) -> int:
    """Round up to 15-minute blocks, apply 30-minute minimum, never exceed booked time."""
    if actual_minutes <= 0:
        return 0
    increments = math.ceil(actual_minutes / BILLING_INCREMENT_MINUTES)
    billed = increments * BILLING_INCREMENT_MINUTES
    billed = max(MIN_BILLABLE_MINUTES, billed)
    return min(billed, booked_minutes)


def calc_actual_session_price(
    booked_price: float,
    booked_minutes: int,
    actual_minutes: int,
) -> float:
    """
    Prorate when the session ends before the booked duration.
    Full booked price when actual usage meets or exceeds booked time.
    """
    if booked_minutes <= 0 or booked_price <= 0:
        return booked_price

    billed = billable_minutes(actual_minutes, booked_minutes)
    if billed >= booked_minutes:
        return booked_price

    return round(booked_price * (billed / booked_minutes), 2)


def resolve_session_charge(
    booked_price: float,
    booked_minutes: int,
    start_time: datetime,
    end_time: datetime,
) -> tuple[float, int, int]:
    """
    Returns (final_session_price, actual_minutes_elapsed, billable_minutes).
    """
    actual = minutes_between(start_time, end_time)
    billed = billable_minutes(actual, booked_minutes)
    final_price = calc_actual_session_price(booked_price, booked_minutes, actual)
    return final_price, actual, billed


def billable_minutes_open(actual_minutes: int) -> int:
    """Open session: 15-minute blocks, 30-minute minimum, no booked cap."""
    if actual_minutes <= 0:
        return MIN_BILLABLE_MINUTES
    increments = math.ceil(actual_minutes / BILLING_INCREMENT_MINUTES)
    billed = increments * BILLING_INCREMENT_MINUTES
    return max(MIN_BILLABLE_MINUTES, billed)


def min_open_session_price(device_type: DeviceType, session_type: str) -> float:
    """Minimum charge when an open session ends (30 minutes at session-type rate)."""
    rate = hourly_rate_for_session(device_type, session_type)
    return round(rate * (MIN_BILLABLE_MINUTES / 60), 2)


def resolve_open_session_charge(
    device_type: DeviceType,
    session_type: str,
    start_time: datetime,
    end_time: datetime,
) -> tuple[float, int, int]:
    """Bill open session by actual time at the session-type hourly rate."""
    actual = minutes_between(start_time, end_time)
    billed = billable_minutes_open(actual)
    rate = hourly_rate_for_session(device_type, session_type)
    final_price = round(rate * (billed / 60), 2)
    return final_price, actual, billed
