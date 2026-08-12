import sys
from src.data.generator import SyntheticDataGenerator
from src.data.loader import DataLoader
from src.features.pipeline import FeatureEngineeringPipeline
from src.anomaly.detector import AnomalyDetectionEngine
from src.models.trainer import ModelTrainer
from src.evaluation.early_warning import EarlyWarningEvaluator


def main():
    print("=" * 60)
    print("CIVIC-PULSE Data Science & Model Training Pipeline")
    print("=" * 60)

    # 1. Generate Data
    print("\n[Step 1] Generating reproducible synthetic dataset...")
    gen = SyntheticDataGenerator()
    df = gen.generate_dataset()
    geojson_data = gen.generate_zone_polygons()
    gen.save_to_sqlite_and_csv(df, geojson_data)
    print(f"Generated {len(df)} records across {df['zone_id'].nunique()} zones.")

    # 2. Feature Engineering
    print("\n[Step 2] Executing leakage-safe feature engineering pipeline...")
    pipeline = FeatureEngineeringPipeline()
    df_transformed = pipeline.fit_transform(df)
    print(f"Engineered {len(pipeline.feature_names)} features.")

    # 3. Anomaly Detection Comparison
    print("\n[Step 3] Running dual anomaly detection (Statistical Z-score vs Isolation Forest)...")
    anomaly_engine = AnomalyDetectionEngine()
    df_transformed, anomaly_metrics = anomaly_engine.fit_detect(df_transformed)
    print(f"Isolation Forest Anomalies Detected: {anomaly_metrics['iso_total_anomalies']}")
    print(f"Statistical Z-Score Anomalies Detected: {anomaly_metrics['stat_total_anomalies']}")

    # 4. Train Supervised Risk Models
    print("\n[Step 4] Training & evaluating machine learning models (Time-Aware Split)...")
    trainer = ModelTrainer()
    eval_metrics, df_trans = trainer.train_and_evaluate(df)
    
    print("\nModel Benchmark Evaluation Results:")
    for m_name in ["Logistic Regression", "Random Forest", "Gradient Boosting"]:
        res = eval_metrics[m_name]
        print(f" - {m_name:20s} | Precision: {res['precision']:.3f} | Recall: {res['recall']:.3f} | F1: {res['f1']:.3f} | ROC-AUC: {res['roc_auc']:.3f}")
    
    print(f"\nSelected Optimal Model: {eval_metrics['selected_model']}")

    # 5. Early Warning Lead Time Evaluation
    print("\n[Step 5] Evaluating Early Warning Lead Time metrics...")
    evaluator = EarlyWarningEvaluator()
    # Compute predictions for all rows
    X_all = df_transformed[trainer.feature_names]
    df_transformed["risk_score"] = trainer.best_model.predict_proba(X_all)[:, 1] * 100.0
    lead_stats = evaluator.evaluate_lead_times(df_transformed)

    print(f" - Average Lead Time : {lead_stats['average_lead_time_days']:.1f} days ({lead_stats['average_lead_time_hours']:.1f} hours)")
    print(f" - Detection Rate    : {lead_stats['detection_rate_percent']}")
    print(f" - False Alarm Rate   : {lead_stats['false_alarm_rate_percent']}")

    print("\n" + "=" * 60)
    print("CIVIC-PULSE Pipeline Completed Successfully!")
    print("=" * 60)


if __name__ == "__main__":
    main()
