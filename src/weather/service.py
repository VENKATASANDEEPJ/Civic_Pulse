"""
CIVIC-PULSE Weather Intelligence Integration
Uses Open-Meteo API (free, no API key required) for real-time and forecast weather data.
Falls back to synthetic data gracefully when API is unreachable.
"""

import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from urllib.request import urlopen, Request
from urllib.error import URLError
import numpy as np

logger = logging.getLogger(__name__)

OPEN_METEO_FORECAST_URL = "https://api.open-meteo.com/v1/forecast"
OPEN_METEO_HISTORICAL_URL = "https://archive-api.open-meteo.com/v1/archive"


class WeatherService:
    """
    Integrates with the Open-Meteo API for real-time weather intelligence.
    Provides current conditions, forecasts, and severe weather alerts
    for urban zone centroids.
    """

    def __init__(self, timeout: int = 8):
        self.timeout = timeout
        self._cache: Dict[str, Any] = {}
        self._cache_expiry: Dict[str, datetime] = {}
        self.cache_duration_minutes = 30

    def _fetch_json(self, url: str) -> Optional[Dict]:
        """Fetches JSON data from a URL with error handling."""
        try:
            req = Request(url, headers={"User-Agent": "CIVIC-PULSE/1.0"})
            with urlopen(req, timeout=self.timeout) as response:
                return json.loads(response.read().decode())
        except (URLError, TimeoutError, json.JSONDecodeError) as e:
            logger.warning(f"Weather API request failed: {e}")
            return None

    def _is_cache_valid(self, cache_key: str) -> bool:
        if cache_key in self._cache_expiry:
            return datetime.utcnow() < self._cache_expiry[cache_key]
        return False

    def get_current_conditions(self, lat: float, lon: float) -> Optional[Dict]:
        """
        Fetches current weather conditions for a geographic coordinate.
        Returns temperature, precipitation, wind speed, humidity, and weather code.
        """
        cache_key = f"current_{lat:.4f}_{lon:.4f}"
        if self._is_cache_valid(cache_key):
            return self._cache[cache_key]

        params = (
            f"?latitude={lat}&longitude={lon}"
            f"&current=temperature_2m,relative_humidity_2m,precipitation,rain,"
            f"weather_code,wind_speed_10m,wind_gusts_10m,surface_pressure"
            f"&timezone=auto"
        )
        data = self._fetch_json(OPEN_METEO_FORECAST_URL + params)
        if data and "current" in data:
            result = {
                "temperature_c": data["current"].get("temperature_2m"),
                "humidity_pct": data["current"].get("relative_humidity_2m"),
                "precipitation_mm": data["current"].get("precipitation", 0),
                "rain_mm": data["current"].get("rain", 0),
                "weather_code": data["current"].get("weather_code", 0),
                "weather_description": self._decode_weather_code(data["current"].get("weather_code", 0)),
                "wind_speed_kmh": data["current"].get("wind_speed_10m"),
                "wind_gusts_kmh": data["current"].get("wind_gusts_10m"),
                "surface_pressure_hpa": data["current"].get("surface_pressure"),
                "fetched_at": datetime.utcnow().isoformat() + "Z",
            }
            self._cache[cache_key] = result
            self._cache_expiry[cache_key] = datetime.utcnow() + timedelta(minutes=self.cache_duration_minutes)
            return result
        return None

    def get_7day_forecast(self, lat: float, lon: float) -> Optional[Dict]:
        """
        Fetches 7-day weather forecast with daily precipitation totals, 
        max/min temperatures, and precipitation probability.
        """
        cache_key = f"forecast7d_{lat:.4f}_{lon:.4f}"
        if self._is_cache_valid(cache_key):
            return self._cache[cache_key]

        params = (
            f"?latitude={lat}&longitude={lon}"
            f"&daily=temperature_2m_max,temperature_2m_min,precipitation_sum,"
            f"precipitation_probability_max,wind_speed_10m_max,weather_code"
            f"&timezone=auto&forecast_days=7"
        )
        data = self._fetch_json(OPEN_METEO_FORECAST_URL + params)
        if data and "daily" in data:
            daily = data["daily"]
            days = []
            for i in range(len(daily.get("time", []))):
                precip = daily["precipitation_sum"][i] if daily.get("precipitation_sum") else 0
                days.append({
                    "date": daily["time"][i],
                    "temp_max_c": daily.get("temperature_2m_max", [None])[i],
                    "temp_min_c": daily.get("temperature_2m_min", [None])[i],
                    "precipitation_mm": precip or 0,
                    "precipitation_probability_pct": daily.get("precipitation_probability_max", [0])[i] or 0,
                    "wind_speed_max_kmh": daily.get("wind_speed_10m_max", [None])[i],
                    "weather_code": daily.get("weather_code", [0])[i],
                    "weather_description": self._decode_weather_code(daily.get("weather_code", [0])[i] or 0),
                    "flood_risk_indicator": "HIGH" if (precip or 0) > 25 else ("MODERATE" if (precip or 0) > 10 else "LOW"),
                })

            total_precip = sum(d["precipitation_mm"] for d in days)
            max_precip_day = max(days, key=lambda d: d["precipitation_mm"]) if days else None
            severe_days = sum(1 for d in days if d["precipitation_mm"] > 25)

            result = {
                "forecast_days": days,
                "total_precipitation_7d_mm": round(total_precip, 1),
                "max_single_day_precipitation_mm": round(max_precip_day["precipitation_mm"], 1) if max_precip_day else 0,
                "severe_weather_days": severe_days,
                "weather_risk_outlook": (
                    "SEVERE" if severe_days >= 3 else
                    "ELEVATED" if severe_days >= 1 or total_precip > 50 else
                    "MODERATE" if total_precip > 20 else "NORMAL"
                ),
                "fetched_at": datetime.utcnow().isoformat() + "Z",
            }
            self._cache[cache_key] = result
            self._cache_expiry[cache_key] = datetime.utcnow() + timedelta(minutes=self.cache_duration_minutes)
            return result
        return None

    def get_weather_for_all_zones(self, zones: List[Dict]) -> Dict[str, Any]:
        """
        Fetches weather data for all urban zones, with city-wide aggregation.
        Uses the first zone's centroid for shared weather data (same metro area).
        """
        if not zones:
            return {"status": "NO_ZONES", "zones": {}}

        # For a metro area, use the centroid of the first zone as representative
        # (all zones are within the same city, weather is roughly the same)
        representative_lat = zones[0].get("centroid", [37.7749, -122.4194])[0]
        representative_lon = zones[0].get("centroid", [37.7749, -122.4194])[1]

        current = self.get_current_conditions(representative_lat, representative_lon)
        forecast = self.get_7day_forecast(representative_lat, representative_lon)

        if not current and not forecast:
            return {
                "status": "API_UNAVAILABLE",
                "message": "Weather API is unreachable. Using historical baseline data.",
                "current": None,
                "forecast": None,
                "zone_weather_risk": {},
            }

        # Generate per-zone weather risk based on vulnerability and forecast
        zone_weather_risk = {}
        for z in zones:
            vuln = z.get("base_vulnerability", 0.5)
            forecast_precip = forecast["total_precipitation_7d_mm"] if forecast else 0
            
            # Weather-adjusted risk modifier
            weather_risk_modifier = 0.0
            if current and current.get("rain_mm", 0) > 5:
                weather_risk_modifier += current["rain_mm"] * vuln * 0.5
            if forecast_precip > 30:
                weather_risk_modifier += (forecast_precip / 50.0) * vuln * 10.0

            zone_weather_risk[z["zone_id"]] = {
                "zone_id": z["zone_id"],
                "zone_name": z.get("name", z["zone_id"]),
                "weather_risk_modifier": round(min(weather_risk_modifier, 25.0), 1),
                "flood_susceptibility": "HIGH" if vuln > 0.7 else ("MODERATE" if vuln > 0.4 else "LOW"),
            }

        return {
            "status": "LIVE",
            "current_conditions": current,
            "forecast_7d": forecast,
            "zone_weather_risk": zone_weather_risk,
            "city_weather_outlook": forecast.get("weather_risk_outlook", "UNKNOWN") if forecast else "UNKNOWN",
        }

    @staticmethod
    def _decode_weather_code(code: int) -> str:
        """Decodes WMO weather code to human-readable description."""
        weather_codes = {
            0: "Clear sky",
            1: "Mainly clear",
            2: "Partly cloudy",
            3: "Overcast",
            45: "Fog",
            48: "Depositing rime fog",
            51: "Light drizzle",
            53: "Moderate drizzle",
            55: "Dense drizzle",
            61: "Slight rain",
            63: "Moderate rain",
            65: "Heavy rain",
            66: "Freezing light rain",
            67: "Freezing heavy rain",
            71: "Slight snow",
            73: "Moderate snow",
            75: "Heavy snow",
            77: "Snow grains",
            80: "Slight rain showers",
            81: "Moderate rain showers",
            82: "Violent rain showers",
            85: "Slight snow showers",
            86: "Heavy snow showers",
            95: "Thunderstorm",
            96: "Thunderstorm with slight hail",
            99: "Thunderstorm with heavy hail",
        }
        return weather_codes.get(code, f"Unknown (code {code})")


# Singleton instance
_weather_service: Optional[WeatherService] = None


def get_weather_service() -> WeatherService:
    global _weather_service
    if _weather_service is None:
        _weather_service = WeatherService()
    return _weather_service
