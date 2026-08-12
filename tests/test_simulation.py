import pytest
from src.data.generator import SyntheticDataGenerator
from src.features.pipeline import FeatureEngineeringPipeline
from src.models.trainer import ModelTrainer
from src.simulation.simulator import CounterfactualSimulator


def test_counterfactual_simulator():
    gen = SyntheticDataGenerator(seed=42)
    df = gen.generate_dataset()
    
    trainer = ModelTrainer(seed=42)
    trainer.train_and_evaluate(df)
    artifact = trainer.load_model()

    simulator = CounterfactualSimulator(artifact)
    base_rec = df.iloc[0].to_dict()

    # Simulate intervention: 40% complaint reduction + drainage inspection
    res = simulator.simulate_intervention(
        base_record=base_rec,
        complaint_reduction_pct=40.0,
        drainage_inspection_active=True,
    )

    assert "baseline_risk_score" in res
    assert "simulated_risk_score" in res
    assert "risk_score_delta" in res
    assert res["simulation_label"] == "Scenario Simulation / Model-based What-if Analysis"
