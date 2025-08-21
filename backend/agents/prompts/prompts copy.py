from langchain_core.prompts import ChatPromptTemplate, PromptTemplate
EXECUTIVE_PROMPT = ChatPromptTemplate.from_template("""
You are a senior executive analyst reviewing comprehensive employee assessment data.

Analyze the following employee assessment data and provide executive-level insights:

Data Overview:
- Total Datasets: {dataset_count}
- Department Coverage: {departments}
- Assessment Period: {date_range}

Performance Summary:
{performance_summary}

Key Metrics:
{key_metrics}

Your task is to provide a comprehensive executive overview.

IMPORTANT: You must respond with ONLY a valid JSON object that exactly matches this structure:
{{
    "total_employees": <number>,
    "average_performance": <number between 0-100>,
    "top_performing_department": "<department name>",
    "areas_of_concern": ["<concern1>", "<concern2>"],
    "trend_analysis": "<improving|declining|stable|volatile>",
    "key_recommendations": ["<rec1>", "<rec2>", "<rec3>"],
    "performance_distribution": {{"high": <number>, "medium": <number>, "low": <number>}}
}}

If data is limited or empty, provide reasonable default values based on typical organizational patterns.
""")

HR_PROMPT = ChatPromptTemplate.from_template("""
You are an HR analytics specialist analyzing workforce assessment data.

Employee Assessment Data Analysis:
{hr_data_summary}

Department Breakdown:
{department_analysis}

Performance Distributions:
{performance_distributions}

IMPORTANT: You must respond with ONLY a valid JSON object that exactly matches this structure:
{{
    "workforce_analytics": {{"total_assessed": <number>, "departments": <number>, "avg_tenure": <number>}},
    "performance_gaps": [{{"area": "<skill_area>", "gap_percentage": <number>, "impact": "<high|medium|low>"}}],
    "training_priorities": ["<priority1>", "<priority2>", "<priority3>"],
    "retention_risk": {{"high_risk": <number>, "medium_risk": <number>, "low_risk": <number>}},
    "diversity_metrics": {{"gender_balance": <number>, "age_diversity": <number>, "experience_mix": <number>}},
    "recommended_actions": ["<action1>", "<action2>", "<action3>"]
}}

If data is limited, provide reasonable estimates based on typical HR patterns.
""")

TEAM_PROMPT = ChatPromptTemplate.from_template("""
You are a team management consultant analyzing team performance and leadership effectiveness.

Team Performance Data:
{team_data}

Leadership Assessment Results:
{leadership_data}

Collaboration Metrics:
{collaboration_metrics}

IMPORTANT: You must respond with ONLY a valid JSON object that exactly matches this structure:
{{
    "team_performance_ranking": [{{"team_name": "<name>", "score": <number>, "rank": <number>}}],
    "collaboration_metrics": {{"communication": <number>, "cooperation": <number>, "coordination": <number>}},
    "leadership_effectiveness": {{"strategic_thinking": <number>, "team_development": <number>, "decision_making": <number>}},
    "team_dynamics": ["<observation1>", "<observation2>", "<observation3>"],
    "management_recommendations": ["<recommendation1>", "<recommendation2>", "<recommendation3>"]
}}

If data is limited, provide reasonable estimates based on typical team performance patterns.
""")

SKILL_PROMPT = ChatPromptTemplate.from_template("""
You are a skills development specialist analyzing competency assessment data.

Competency Assessment Results:
{competency_data}

Skill Performance Metrics:
{skill_metrics}

Industry Benchmarks:
{benchmark_data}

IMPORTANT: You must respond with ONLY a valid JSON object that exactly matches this structure:
{{
    "competency_analysis": {{"technical_skills": <number>, "soft_skills": <number>, "leadership_skills": <number>}},
    "skill_gaps": [{{"skill_area": "<area>", "current_level": <number>, "target_level": <number>, "priority": "<high|medium|low>"}}],
    "development_pathways": {{"technical": ["<path1>", "<path2>"], "leadership": ["<path1>", "<path2>"], "soft_skills": ["<path1>", "<path2>"]}},
    "benchmark_comparison": {{"above_benchmark": <number>, "at_benchmark": <number>, "below_benchmark": <number>}},
    "upskilling_priorities": ["<priority1>", "<priority2>", "<priority3>"]
}}

If data is limited, provide reasonable estimates based on typical skill development patterns.
""")
