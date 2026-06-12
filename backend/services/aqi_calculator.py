"""
SmartAQ Campus — US EPA AQI Calculator
Standard breakpoint-based AQI calculation for PM2.5, PM10, NO2, SO2, CO.
"""


# EPA AQI breakpoint tables: (C_low, C_high, I_low, I_high)
BREAKPOINTS = {
    "pm25": [
        (0.0, 12.0, 0, 50),
        (12.1, 35.4, 51, 100),
        (35.5, 55.4, 101, 150),
        (55.5, 150.4, 151, 200),
        (150.5, 250.4, 201, 300),
        (250.5, 350.4, 301, 400),
        (350.5, 500.4, 401, 500),
    ],
    "pm10": [
        (0, 54, 0, 50),
        (55, 154, 51, 100),
        (155, 254, 101, 150),
        (255, 354, 151, 200),
        (355, 424, 201, 300),
        (425, 504, 301, 400),
        (505, 604, 401, 500),
    ],
    "no2": [
        (0, 53, 0, 50),
        (54, 100, 51, 100),
        (101, 360, 101, 150),
        (361, 649, 151, 200),
        (650, 1249, 201, 300),
        (1250, 1649, 301, 400),
        (1650, 2049, 401, 500),
    ],
    "so2": [
        (0, 35, 0, 50),
        (36, 75, 51, 100),
        (76, 185, 101, 150),
        (186, 304, 151, 200),
        (305, 604, 201, 300),
        (605, 804, 301, 400),
        (805, 1004, 401, 500),
    ],
    "co2": [
        # CO2 doesn't have a standard EPA AQI, we use a custom indoor scale (ppm)
        (0, 600, 0, 50),
        (601, 1000, 51, 100),
        (1001, 1500, 101, 150),
        (1501, 2000, 151, 200),
        (2001, 3000, 201, 300),
        (3001, 5000, 301, 400),
        (5001, 10000, 401, 500),
    ],
}

CATEGORIES = [
    (50, "Good", "#22c55e"),
    (100, "Moderate", "#eab308"),
    (150, "Unhealthy for Sensitive Groups", "#f97316"),
    (200, "Unhealthy", "#ef4444"),
    (300, "Very Unhealthy", "#a855f7"),
    (500, "Hazardous", "#7f1d1d"),
]


def _calc_sub_index(concentration: float, pollutant: str) -> int:
    """Calculate sub-index for a single pollutant using EPA linear interpolation."""
    bps = BREAKPOINTS.get(pollutant)
    if not bps:
        return 0

    for c_low, c_high, i_low, i_high in bps:
        if c_low <= concentration <= c_high:
            aqi = ((i_high - i_low) / (c_high - c_low)) * (concentration - c_low) + i_low
            return round(aqi)

    # If above the highest breakpoint, cap at 500
    if concentration > bps[-1][1]:
        return 500
    return 0


def get_category(aqi: int) -> tuple:
    """Return (category_name, color_hex) for a given AQI value."""
    for threshold, name, color in CATEGORIES:
        if aqi <= threshold:
            return name, color
    return "Hazardous", "#7f1d1d"


def calculate_aqi(pollutants: dict) -> dict:
    """
    Calculate overall AQI from a dict of pollutant concentrations.

    Args:
        pollutants: {"pm25": float, "pm10": float, "co2": float, "no2": float, "so2": float}

    Returns:
        {"aqi": int, "category": str, "color": str, "dominant_pollutant": str, "sub_indices": dict}
    """
    sub_indices = {}
    for pollutant, concentration in pollutants.items():
        if pollutant in BREAKPOINTS:
            sub_indices[pollutant] = _calc_sub_index(concentration, pollutant)

    if not sub_indices:
        return {
            "aqi": 0,
            "category": "Good",
            "color": "#22c55e",
            "dominant_pollutant": "none",
            "sub_indices": {},
        }

    overall_aqi = max(sub_indices.values())
    dominant = max(sub_indices, key=sub_indices.get)
    category, color = get_category(overall_aqi)

    return {
        "aqi": overall_aqi,
        "category": category,
        "color": color,
        "dominant_pollutant": dominant,
        "sub_indices": sub_indices,
    }
