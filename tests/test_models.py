import pytest
from src.data.generator import SyntheticDataGenerator
from src.features.pipeline import FeatureEngineeringPipeline
from src.models.trainer import ModelTrainer
from src.anomaly.detector import AnomalyDetectionEngine


def test_model_training_and_evaluation():
    gen = SyntheticDataGenerator(seed=42)
    df = gen.generate_dataset()

    trainer = ModelTrainer(seed=42)
    eval_results, df_transformed = trainer.train_and_evaluate(df)

    assert "selected_model" in eval_results
    assert eval_results["selected_model"] in ["Logistic Regression", "Random Forest", "Gradient Boosting"]
    
    selected_metrics = eval_results[eval_results["selected_model"]]
    assert selected_metrics["roc_auc"] > 0.70
    assert selected_metrics["recall"] > 0.50
    assert trainer.best_model is not None


def test_anomaly_detector():
    gen = SyntheticDataGenerator(seed=42)
    df = gen.generate_dataset()
    pipeline = FeatureEngineeringPipeline()
    df_trans = pipeline.fit_transform(df)

    anomaly_engine = AnomalyDetectionEngine()
    df_out, metrics = anomaly_engine.fit_detect(df_trans)

    assert "stat_anomaly_flag" in df_out.columns
    assert "iso_anomaly_flag" in df_out.columns
    assert "jaccard_overlap" in metrics
    assert metrics["iso_total_anomalies"] > 0
