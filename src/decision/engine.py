from typing import Dict, List


class DecisionRecommendationEngine:
    """
    Translates machine learning risk predictions and SHAP feature drivers
    into actionable operational dispatch recommendations and response SLAs.
    """

    @staticmethod
    def generate_recommendation(risk_score: float, top_driver: str, zone_name: str) -> Dict:
        """
        Generates operational recommendation, urgency level, response SLA, and targeted actions.
        """
        if risk_score >= 80.0:
            level = "CRITICAL"
            urgency = "Immediate Emergency Dispatch"
            sla = "Within 12 Hours"
            action_title = "Deploy Emergency Maintenance & Infrastructure Teams"
            steps = [
                f"Dispatch quick-response hydro-vac drainage crews to high-risk conduits in {zone_name}.",
                "Activate temporary storm barrier units along low-lying culverts.",
                "Issue automated operational advisory to public works sector leads."
            ]
        elif risk_score >= 60.0:
            level = "HIGH"
            urgency = "Targeted Inspection & Clearing"
            sla = "Within 24-48 Hours"
            action_title = "Schedule Priority Field Operations"
            steps = [
                f"Inspect catch basins and main outflow pipes in {zone_name}.",
                "Clear accumulated solid waste and debris from reported choke points.",
                "Review maintenance backlog and escalate outstanding high-priority tickets."
            ]
        elif risk_score >= 30.0:
            level = "WATCH"
            urgency = "Elevated Monitoring"
            sla = "Within 72 Hours"
            action_title = "Increase Monitoring Frequency"
            steps = [
                f"Monitor weather radar and rain gauge telemetry over {zone_name}.",
                "Verify sensor calibration and pump station status.",
                "Standby secondary maintenance personnel for potential weather escalation."
            ]
        else:
            level = "LOW"
            urgency = "Routine Maintenance"
            sla = "Standard Operational Schedule"
            action_title = "Standard Monitoring"
            steps = [
                f"Continue routine municipal maintenance schedule for {zone_name}.",
                "Log routine complaint resolutions."
            ]

        return {
            "risk_score": round(risk_score, 1),
            "risk_level": level,
            "urgency": urgency,
            "sla": sla,
            "action_title": action_title,
            "recommended_steps": steps,
            "primary_driver_addressed": top_driver,
        }
