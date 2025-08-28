from langchain_core.prompts import ChatPromptTemplate, PromptTemplate
EXECUTIVE_PROMPT = ChatPromptTemplate.from_template("""
You are a C-level executive analyst reviewing comprehensive employee assessment data across multiple business units.

COMPREHENSIVE DATA ANALYSIS:
Statistical Overview: {statistical_summary}
Department Performance: {department_benchmarks}
Competency Analytics: {competency_analytics}
Performance Correlations: {performance_correlations}

KEY BUSINESS METRICS:
- Organization Size: {total_employees} employees across {department_count} departments
- Performance Distribution: {performance_distribution}
- Competency Variance: {competency_variance}
- Risk Indicators: {risk_indicators}

IMPORTANT: Provide strategic executive insights in JSON format:
{{
    "total_employees": <number>,
    "average_performance": <number between 0-100>,
    "top_performing_department": "<department name>",
    "areas_of_concern": ["<strategic concern 1>", "<strategic concern 2>"],
    "trend_analysis": "<improving|declining|stable|volatile>",
    "key_recommendations": ["<strategic recommendation 1>", "<strategic recommendation 2>", "<strategic recommendation 3>"],
    "performance_distribution": {{"high_performers": <number>, "core_performers": <number>, "developing_performers": <number>}},
    "department_performance_ranking": [{{"department": "<name>", "avg_score": <number>, "employee_count": <number>, "rank": <number>}}],
    "performance_variance": <number>,
    "competency_strength_areas": ["<strength 1>", "<strength 2>", "<strength 3>"],
    "risk_indicators": {{"high_turnover_risk": <number>, "skill_gap_severity": "<high|medium|low>", "performance_decline": <number>}},
    "roi_metrics": {{"training_effectiveness": <number>, "performance_improvement": <number>, "talent_retention": <number>}}
}}

Focus on strategic business impact and organizational capability assessment.
""")

HR_PROMPT = ChatPromptTemplate.from_template("""
You are a Chief Human Resources Officer analyzing workforce performance and talent management data.

WORKFORCE ANALYTICS:
Employee Demographics: {employee_demographics}
Performance Segmentation: {performance_segmentation}
Competency Analysis: {competency_breakdown}
Department Insights: {department_analysis}
Talent Metrics: {talent_metrics}

PERFORMANCE DISTRIBUTION:
{performance_distributions}

SKILL GAP ANALYSIS:
{skill_gap_analysis}

TOP AND BOTTOM PERFORMERS:
{top_bottom_performers}

IMPORTANT: Provide comprehensive HR analytics in JSON format:
{{
    "workforce_analytics": {{"total_assessed": <number>, "departments": <number>, "avg_tenure_estimate": <number>, "performance_spread": <number>}},
    "performance_gaps": [{{"competency": "<skill area>", "gap_percentage": <number>, "affected_employees": <number>, "business_impact": "<high|medium|low>"}}],
    "training_priorities": ["<priority 1>", "<priority 2>", "<priority 3>"],
    "retention_risk": {{"high_risk_count": <number>, "medium_risk_count": <number>, "low_risk_count": <number>, "critical_skills_at_risk": ["<skill 1>", "<skill 2>"]}},
    "diversity_metrics": {{"department_balance": <number>, "performance_equity": <number>, "opportunity_distribution": <number>}},
    "recommended_actions": ["<action 1>", "<action 2>", "<action 3>"],
    "talent_segmentation": {{"high_potential": <number>, "solid_performers": <number>, "development_needed": <number>}},
    "succession_planning": {{"leadership_ready": <number>, "emerging_leaders": <number>, "development_pipeline": <number>}},
    "compensation_benchmarks": {{"performance_pay_alignment": <number>, "merit_increase_recommendations": <number>}},
    "engagement_indicators": {{"satisfaction_proxy": <number>, "development_participation": <number>}},
    "turnover_predictions": {{"voluntary_risk": <number>, "skill_flight_risk": <number>, "retention_strategies_needed": <number>}},
    "skill_gap_analysis": [Use the provided skill gap analysis data to populate this field with detailed competency gaps by department],
    "top_5_bottom_5": [Use the provided top_bottom_performers data to populate this field with the exact structure provided]
}}

Focus on talent optimization and workforce development strategies. Use the skill gap analysis to identify critical training needs and departmental development priorities. Include the top 5 and bottom 5 performers data exactly as provided in the top_bottom_performers field.
""")

TEAM_PROMPT = ChatPromptTemplate.from_template("""
You are a senior organizational development consultant analyzing team effectiveness and leadership capabilities.

TEAM PERFORMANCE DATA:
Leadership Assessment: {leadership_analysis}
Collaboration Metrics: {collaboration_data}
Cross-Functional Analysis: {cross_functional_insights}
Team Dynamics: {team_dynamics_data}
Performance Correlations: {team_correlations}

LEADERSHIP EFFECTIVENESS:
{leadership_effectiveness_data}

IMPORTANT: Provide comprehensive team management insights in JSON format:
{{
    "team_performance_ranking": [{{"team_name": "<department>", "avg_performance": <number>, "team_size": <number>, "performance_consistency": <number>, "rank": <number>}}],
    "collaboration_metrics": {{"cross_team_synergy": <number>, "communication_effectiveness": <number>, "knowledge_sharing": <number>}},
    "leadership_effectiveness": {{"strategic_thinking": <number>, "people_development": <number>, "decision_making": <number>, "change_management": <number>}},
    "team_dynamics": ["<insight 1>", "<insight 2>", "<insight 3>"],
    "management_recommendations": ["<recommendation 1>", "<recommendation 2>", "<recommendation 3>"],
    "cross_functional_analysis": {{"department_collaboration": <number>, "project_effectiveness": <number>, "resource_optimization": <number>}},
    "leadership_pipeline": {{"ready_now": <number>, "ready_in_1_year": <number>, "high_potential": <number>}},
    "team_productivity_metrics": {{"efficiency_score": <number>, "quality_indicators": <number>, "innovation_index": <number>}},
    "conflict_resolution_effectiveness": {{"resolution_capability": <number>, "prevention_measures": <number>}},
    "innovation_indicators": {{"creative_problem_solving": <number>, "change_adaptability": <number>, "continuous_improvement": <number>}}
}}

Focus on organizational effectiveness and leadership development.
""")

SKILL_PROMPT = ChatPromptTemplate.from_template("""
You are a Chief Learning Officer analyzing organizational competencies and skill development needs.

COMPETENCY ASSESSMENT RESULTS:
Skill Matrix Analysis: {competency_matrix}
Performance Benchmarks: {skill_benchmarks}
Gap Analysis: {skill_gap_analysis}
Learning Effectiveness: {learning_metrics}
Future Skills Assessment: {future_skills_data}

INDUSTRY BENCHMARKS:
{benchmark_comparison}

IMPORTANT: Provide comprehensive skills analysis in JSON format:
{{
    "competency_analysis": {{"technical_skills": <number>, "leadership_competencies": <number>, "customer_service": <number>, "problem_solving": <number>}},
    "skill_gaps": [{{"skill_area": "<competency>", "current_proficiency": <number>, "target_proficiency": <number>, "gap_severity": "<critical|high|medium|low>", "employees_affected": <number>}}],
    "development_pathways": {{"leadership_track": ["<pathway 1>", "<pathway 2>"], "technical_track": ["<pathway 1>", "<pathway 2>"], "customer_service_track": ["<pathway 1>", "<pathway 2>"]}},
    "benchmark_comparison": {{"above_industry": <number>, "at_industry": <number>, "below_industry": <number>}},
    "upskilling_priorities": ["<priority 1>", "<priority 2>", "<priority 3>"],
    "competency_matrix": {{"Back_Office": {{"communication": <number>, "problem_solving": <number>, "time_management": <number>}}, "Call_Center": {{"customer_service": <number>, "emotional_intelligence": <number>}}, "Leaders": {{"strategic_thinking": <number>, "decision_making": <number>}}, "Retail": {{"customer_handling": <number>, "teamwork": <number>}}}},
    "skill_trend_analysis": {{"communication_skills": "<improving|declining|stable>", "leadership_skills": "<improving|declining|stable>", "technical_skills": "<improving|declining|stable>"}},
    "critical_skill_shortages": [{{"skill": "<skill name>", "shortage_level": "<critical|high|medium>", "business_impact": "<high|medium|low>"}}],
    "learning_effectiveness": {{"training_completion": <number>, "skill_application": <number>, "performance_improvement": <number>}},
    "future_skill_requirements": ["<future skill 1>", "<future skill 2>", "<future skill 3>"]
}}

Focus on strategic skill development and organizational learning capabilities.
""")
