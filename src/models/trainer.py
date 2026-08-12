import os
import joblib
import numpy as np
import pandas as pd
from typing import Dict, Tuple
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline
from sklearn.linear_model import LogisticRegression
from sklearn.ensemble import RandomForestClassifier, HistGradientBoostingClassifier
from sklearn.calibration import CalibratedClassifierCV
from sklearn.metrics import (
    precision_score,
    recall_score,
    f1_score,
    roc_auc_score,
    average_precision_score,
    confusion_matrix,
    roc_curve,
    precision_recall_curve,
)
from src.config import MODEL_DIR, RANDOM_SEED
from src.features.pipeline import FeatureEngineeringPipeline


class ModelTrainer:
    """
    Supervised Machine Learning trainer comparing Logistic Regression, Random Forest,
    and HistGradientBoostingClassifier using time-aware temporal train/val/test splits.
    Calibrates risk probabilities and selects best model optimizing Recall & ROC-AUC.
    """

    def __init__(self, seed: int = RANDOM_SEED):
        self.seed = seed
        self.raw_models = {
            "Logistic Regression": Pipeline([
                ("scaler", StandardScaler()),
                ("clf", LogisticRegression(max_iter=2000, random_state=self.seed))
            ]),
            "Random Forest": RandomForestClassifier(n_estimators=120, max_depth=8, random_state=self.seed),
            "Gradient Boosting": HistGradientBoostingClassifier(max_iter=100, max_depth=6, random_state=self.seed),
        }
        self.best_model_name = None
        self.best_model = None
        self.feature_names = []

    def time_aware_split(
        self, df: pd.DataFrame, train_ratio: float = 0.75, val_ratio: float = 0.25
    ) -> Tuple[pd.DataFrame, pd.DataFrame]:
        """
        Splits dataset chronologically into Train (75%) and Test (25%).
        """
        df_sorted = df.sort_values(by="date").reset_index(drop=True)
        unique_dates = df_sorted["date"].unique()
        n_dates = len(unique_dates)

        train_idx = int(n_dates * train_ratio)

        train_dates = unique_dates[:train_idx]
        test_dates = unique_dates[train_idx:]

        train_df = df_sorted[df_sorted["date"].isin(train_dates)].copy()
        test_df = df_sorted[df_sorted["date"].isin(test_dates)].copy()

        return train_df, test_df

    def train_and_evaluate(self, df: pd.DataFrame) -> Tuple[Dict, pd.DataFrame]:
        """
        Executes feature pipeline, performs time-aware split, trains candidate models with 3-fold cross-validated calibration,
        evaluates metrics, and selects top performing model.
        """
        pipeline = FeatureEngineeringPipeline()
        df_transformed = pipeline.fit_transform(df)
        self.feature_names = pipeline.feature_names

        train_df, test_df = self.time_aware_split(df_transformed)

        X_train = train_df[self.feature_names]
        y_train = train_df["incident_occurred"]

        X_test = test_df[self.feature_names]
        y_test = test_df["incident_occurred"]

        eval_results = {}
        trained_models = {}

        best_score = -1.0

        for name, clf in self.raw_models.items():
            # Wrap estimator in CalibratedClassifierCV with cv=3
            calibrated_clf = CalibratedClassifierCV(estimator=clf, cv=3)
            calibrated_clf.fit(X_train, y_train)

            # Predict on Test set
            y_probs = calibrated_clf.predict_proba(X_test)[:, 1]
            y_preds = (y_probs >= 0.40).astype(int)  # Lower threshold slightly to prioritize Recall

            # Compute evaluation metrics
            prec = precision_score(y_test, y_preds, zero_division=0)
            rec = recall_score(y_test, y_preds, zero_division=0)
            f1 = f1_score(y_test, y_preds, zero_division=0)
            roc_auc = roc_auc_score(y_test, y_probs) if len(np.unique(y_test)) > 1 else 0.5
            pr_auc = average_precision_score(y_test, y_probs) if len(np.unique(y_test)) > 1 else 0.5
            cm = confusion_matrix(y_test, y_preds).tolist()

            # Generate ROC curve data for UI charts
            fpr, tpr, _ = roc_curve(y_test, y_probs)
            p_curve, r_curve, _ = precision_recall_curve(y_test, y_probs)

            eval_results[name] = {
                "precision": round(float(prec), 3),
                "recall": round(float(rec), 3),
                "f1": round(float(f1), 3),
                "roc_auc": round(float(roc_auc), 3),
                "pr_auc": round(float(pr_auc), 3),
                "confusion_matrix": cm,
                "roc_curve": {"fpr": np.round(fpr, 3).tolist(), "tpr": np.round(tpr, 3).tolist()},
                "pr_curve": {"precision": np.round(p_curve, 3).tolist(), "recall": np.round(r_curve, 3).tolist()},
            }

            trained_models[name] = calibrated_clf

            # Selection metric combining Recall (0.6 weight) and ROC-AUC (0.4 weight)
            selection_score = 0.6 * rec + 0.4 * roc_auc
            if selection_score > best_score:
                best_score = selection_score
                self.best_model_name = name
                self.best_model = calibrated_clf

        # Feature Importance calculation for selected best model
        feature_importance = self._extract_feature_importance(self.best_model)

        eval_results["selected_model"] = self.best_model_name
        eval_results["feature_importance"] = feature_importance

        # Save model artifact
        self.save_model(pipeline)

        return eval_results, df_transformed

    def _extract_feature_importance(self, calibrated_model) -> Dict:
        """
        Extracts feature importances averaged across calibrated fold estimators.
        """
        feature_importance = {}
        try:
            importances_list = []
            for calibrated_classifier in calibrated_model.calibrated_classifiers_:
                est = calibrated_classifier.estimator
                if hasattr(est, "named_steps") and "clf" in est.named_steps:
                    base = est.named_steps["clf"]
                    if hasattr(base, "coef_"):
                        importances_list.append(np.abs(base.coef_[0]))
                elif hasattr(est, "feature_importances_"):
                    importances_list.append(est.feature_importances_)
                elif hasattr(est, "coef_"):
                    importances_list.append(np.abs(est.coef_[0]))

            if importances_list:
                avg_imp = np.mean(importances_list, axis=0)
                feature_importance = {
                    feat: round(float(imp), 4)
                    for feat, imp in sorted(zip(self.feature_names, avg_imp), key=lambda x: x[1], reverse=True)
                }
        except Exception:
            pass
        return feature_importance

    def save_model(self, pipeline: FeatureEngineeringPipeline):
        """
        Serializes trained model and feature pipeline.
        """
        artifact = {
            "model_name": self.best_model_name,
            "model": self.best_model,
            "pipeline": pipeline,
            "feature_names": self.feature_names,
        }
        os.makedirs(MODEL_DIR, exist_ok=True)
        model_path = MODEL_DIR / "best_model.joblib"
        joblib.dump(artifact, model_path)
        print(f"Saved trained best model ('{self.best_model_name}') to: {model_path}")

    @staticmethod
    def load_model():
        """
        Loads serialized model artifact from disk.
        """
        model_path = MODEL_DIR / "best_model.joblib"
        if not model_path.exists():
            raise FileNotFoundError(f"Model file not found at {model_path}. Run training pipeline first.")
        return joblib.load(model_path)
