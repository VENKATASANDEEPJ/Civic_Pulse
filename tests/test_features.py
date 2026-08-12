import pytest
import pandas as pd
from src.data.generator import SyntheticDataGenerator
from src.features.pipeline import FeatureEngineeringPipeline


def test_feature_engineering_pipeline():
    gen = SyntheticDataGenerator(seed=42)
    df_raw = gen.generate_dataset()

    pipeline = FeatureEngineeringPipeline()
    df_feat = pipeline.fit_transform(df_raw)

    assert len(df_feat) == len(df_raw)
    assert len(pipeline.feature_names) >= 15
    assert "complaint_velocity" in df_feat.columns
    assert "rainfall_anomaly_zscore" in df_feat.columns
    assert "neighbor_risk_lag" in df_feat.columns
    assert "infra_stress_score" in df_feat.columns
    
    # Check no NaN values exist in engineered features
    assert df_feat[pipeline.feature_names].isnull().sum().sum() == 0
