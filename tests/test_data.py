import pytest
import pandas as pd
from src.data.generator import SyntheticDataGenerator
from src.data.loader import DataLoader


def test_synthetic_data_generator():
    gen = SyntheticDataGenerator(seed=42)
    df = gen.generate_dataset()
    geojson = gen.generate_zone_polygons()

    assert isinstance(df, pd.DataFrame)
    assert len(df) == 12 * 180  # 12 zones * 180 days
    assert df["zone_id"].nunique() == 12
    assert "incident_occurred" in df.columns
    assert "rainfall_mm" in df.columns
    assert len(geojson) == 12


def test_data_loader(tmp_path):
    loader = DataLoader()
    df = loader.load_raw_signals()
    valid, issues = loader.validate_dataset(df)

    assert len(df) > 0
    assert valid is True
    assert len(issues) == 0
