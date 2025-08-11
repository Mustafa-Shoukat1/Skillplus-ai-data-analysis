import asyncio
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from core.database import get_async_db
from models.database import GraphTemplate

# Default ECharts templates for different graph types
DEFAULT_GRAPH_TEMPLATES = [
    {
        "graph_type": "bar_chart",
        "graph_name": "Bar Chart",
        "category": "skill-analysis",
        "description": "Vertical bar chart for comparing categorical data",
        "echart_code": """{
  "title": {
    "text": "Skills Analysis",
    "left": "center",
    "textStyle": {
      "color": "#333",
      "fontSize": 16
    }
  },
  "tooltip": {
    "trigger": "axis",
    "axisPointer": {
      "type": "shadow"
    }
  },
  "grid": {
    "left": "3%",
    "right": "4%",
    "bottom": "3%",
    "containLabel": true
  },
  "xAxis": {
    "type": "category",
    "data": ["JavaScript", "Python", "React", "SQL", "Node.js"],
    "axisLabel": {
      "rotate": 45
    }
  },
  "yAxis": {
    "type": "value",
    "name": "Skill Level"
  },
  "series": [{
    "name": "Skills",
    "type": "bar",
    "data": [85, 90, 78, 82, 75],
    "itemStyle": {
      "color": "#3b82f6"
    }
  }]
}"""
    },
    {
        "graph_type": "horizontal_bar",
        "graph_name": "Horizontal Bar Chart",
        "category": "skill-analysis",
        "description": "Horizontal bar chart for skill comparisons",
        "echart_code": """{
  "title": {
    "text": "Skills Comparison",
    "left": "center"
  },
  "tooltip": {
    "trigger": "axis",
    "axisPointer": {
      "type": "shadow"
    }
  },
  "grid": {
    "left": "3%",
    "right": "4%",
    "bottom": "3%",
    "containLabel": true
  },
  "xAxis": {
    "type": "value",
    "name": "Proficiency Level"
  },
  "yAxis": {
    "type": "category",
    "data": ["JavaScript", "Python", "React", "SQL", "Node.js"]
  },
  "series": [{
    "name": "Skills",
    "type": "bar",
    "data": [85, 90, 78, 82, 75],
    "itemStyle": {
      "color": "#10b981"
    }
  }]
}"""
    },
    {
        "graph_type": "line_chart",
        "graph_name": "Line Chart",
        "category": "gap-analysis",
        "description": "Line chart for tracking progress over time",
        "echart_code": """{
  "title": {
    "text": "Skills Progress Over Time",
    "left": "center"
  },
  "tooltip": {
    "trigger": "axis"
  },
  "legend": {
    "data": ["Current Skills", "Target Skills"],
    "top": "bottom"
  },
  "grid": {
    "left": "3%",
    "right": "4%",
    "bottom": "15%",
    "containLabel": true
  },
  "xAxis": {
    "type": "category",
    "data": ["Q1", "Q2", "Q3", "Q4"]
  },
  "yAxis": {
    "type": "value",
    "name": "Skill Level"
  },
  "series": [{
    "name": "Current Skills",
    "type": "line",
    "data": [65, 72, 78, 85],
    "itemStyle": {
      "color": "#3b82f6"
    },
    "smooth": true
  }, {
    "name": "Target Skills",
    "type": "line",
    "data": [90, 90, 90, 90],
    "itemStyle": {
      "color": "#ef4444"
    },
    "lineStyle": {
      "type": "dashed"
    },
    "smooth": true
  }]
}"""
    },
    {
        "graph_type": "pie_chart",
        "graph_name": "Pie Chart",
        "category": "skill-analysis",
        "description": "Pie chart for skill distribution",
        "echart_code": """{
  "title": {
    "text": "Skills Distribution",
    "left": "center"
  },
  "tooltip": {
    "trigger": "item",
    "formatter": "{a} <br/>{b}: {c} ({d}%)"
  },
  "legend": {
    "orient": "vertical",
    "left": "left",
    "data": ["Frontend", "Backend", "Database", "DevOps", "Testing"]
  },
  "series": [{
    "name": "Skills",
    "type": "pie",
    "radius": "50%",
    "data": [
      {"value": 35, "name": "Frontend"},
      {"value": 30, "name": "Backend"},
      {"value": 15, "name": "Database"},
      {"value": 12, "name": "DevOps"},
      {"value": 8, "name": "Testing"}
    ],
    "emphasis": {
      "itemStyle": {
        "shadowBlur": 10,
        "shadowOffsetX": 0,
        "shadowColor": "rgba(0, 0, 0, 0.5)"
      }
    }
  }]
}"""
    },
    {
        "graph_type": "radar_chart",
        "graph_name": "Radar Chart",
        "category": "gap-analysis",
        "description": "Radar chart for multi-dimensional skill analysis",
        "echart_code": """{
  "title": {
    "text": "Skills Gap Analysis",
    "left": "center"
  },
  "legend": {
    "data": ["Current Level", "Required Level"],
    "top": "bottom"
  },
  "radar": {
    "indicator": [
      {"name": "JavaScript", "max": 100},
      {"name": "Python", "max": 100},
      {"name": "React", "max": 100},
      {"name": "SQL", "max": 100},
      {"name": "Node.js", "max": 100},
      {"name": "DevOps", "max": 100}
    ]
  },
  "series": [{
    "name": "Skills Analysis",
    "type": "radar",
    "data": [
      {
        "value": [85, 90, 78, 82, 75, 60],
        "name": "Current Level",
        "itemStyle": {
          "color": "#3b82f6"
        }
      },
      {
        "value": [95, 95, 90, 90, 85, 80],
        "name": "Required Level",
        "itemStyle": {
          "color": "#ef4444"
        }
      }
    ]
  }]
}"""
    },
    {
        "graph_type": "scatter_plot",
        "graph_name": "Scatter Plot",
        "category": "gap-analysis",
        "description": "Scatter plot for correlation analysis",
        "echart_code": """{
  "title": {
    "text": "Skills vs Performance",
    "left": "center"
  },
  "tooltip": {
    "trigger": "item",
    "formatter": "Skill Level: {c[0]}<br/>Performance: {c[1]}"
  },
  "grid": {
    "left": "3%",
    "right": "4%",
    "bottom": "3%",
    "containLabel": true
  },
  "xAxis": {
    "type": "value",
    "name": "Skill Level",
    "min": 0,
    "max": 100
  },
  "yAxis": {
    "type": "value",
    "name": "Performance Score",
    "min": 0,
    "max": 100
  },
  "series": [{
    "name": "Skills vs Performance",
    "type": "scatter",
    "data": [
      [85, 88],
      [90, 92],
      [78, 75],
      [82, 85],
      [75, 78],
      [95, 98],
      [70, 72],
      [88, 90]
    ],
    "symbolSize": 8,
    "itemStyle": {
      "color": "#8b5cf6"
    }
  }]
}"""
    },
    {
        "graph_type": "heatmap",
        "graph_name": "Heatmap",
        "category": "skill-analysis",
        "description": "Heatmap for skill matrix visualization",
        "echart_code": """{
  "title": {
    "text": "Skills Heatmap",
    "left": "center"
  },
  "tooltip": {
    "position": "top"
  },
  "grid": {
    "height": "50%",
    "top": "10%"
  },
  "xAxis": {
    "type": "category",
    "data": ["JavaScript", "Python", "React", "SQL", "Node.js"],
    "splitArea": {
      "show": true
    }
  },
  "yAxis": {
    "type": "category",
    "data": ["Employee A", "Employee B", "Employee C", "Employee D"],
    "splitArea": {
      "show": true
    }
  },
  "visualMap": {
    "min": 0,
    "max": 100,
    "calculable": true,
    "orient": "horizontal",
    "left": "center",
    "bottom": "15%",
    "inRange": {
      "color": ["#50a3ba", "#eac736", "#d94e5d"]
    }
  },
  "series": [{
    "name": "Skill Level",
    "type": "heatmap",
    "data": [
      [0, 0, 85],
      [0, 1, 90],
      [0, 2, 78],
      [0, 3, 82],
      [1, 0, 75],
      [1, 1, 88],
      [1, 2, 92],
      [1, 3, 80],
      [2, 0, 95],
      [2, 1, 70],
      [2, 2, 85],
      [2, 3, 88],
      [3, 0, 82],
      [3, 1, 85],
      [3, 2, 75],
      [3, 3, 90],
      [4, 0, 78],
      [4, 1, 82],
      [4, 2, 88],
      [4, 3, 85]
    ],
    "label": {
      "show": true
    },
    "emphasis": {
      "itemStyle": {
        "shadowBlur": 10,
        "shadowColor": "rgba(0, 0, 0, 0.5)"
      }
    }
  }]
}"""
    },
    {
        "graph_type": "gauge_chart",
        "graph_name": "Gauge Chart",
        "category": "skill-analysis",
        "description": "Gauge chart for individual skill measurement",
        "echart_code": """{
  "title": {
    "text": "Overall Skill Level",
    "left": "center"
  },
  "series": [{
    "name": "Skill Level",
    "type": "gauge",
    "progress": {
      "show": true
    },
    "detail": {
      "valueAnimation": true,
      "formatter": "{value}%"
    },
    "data": [{
      "value": 85,
      "name": "Current Level"
    }],
    "axisLine": {
      "lineStyle": {
        "width": 30,
        "color": [
          [0.3, "#fd666d"],
          [0.7, "#37a2da"],
          [1, "#67e0e3"]
        ]
      }
    },
    "pointer": {
      "itemStyle": {
        "color": "auto"
      }
    },
    "axisTick": {
      "distance": -30,
      "splitNumber": 5,
      "lineStyle": {
        "width": 2,
        "color": "#999"
      }
    },
    "splitLine": {
      "distance": -30,
      "length": 30,
      "lineStyle": {
        "width": 4,
        "color": "#999"
      }
    },
    "axisLabel": {
      "color": "auto",
      "distance": 40,
      "fontSize": 20
    }
  }]
}"""
    }
]

async def seed_graph_templates():
    """Seed the database with default graph templates"""
    try:
        async with get_async_db() as db:
            for template_data in DEFAULT_GRAPH_TEMPLATES:
                # Check if template already exists
                result = await db.execute(
                    select(GraphTemplate).where(
                        GraphTemplate.graph_type == template_data["graph_type"]
                    )
                )
                existing = result.scalar_one_or_none()
                
                if not existing:
                    template = GraphTemplate(**template_data)
                    db.add(template)
                    print(f"Added graph template: {template_data['graph_name']}")
                else:
                    print(f"Graph template already exists: {template_data['graph_name']}")
            
            await db.commit()
            print("Graph templates seeding completed successfully!")
            
    except Exception as e:
        print(f"Error seeding graph templates: {e}")

if __name__ == "__main__":
    asyncio.run(seed_graph_templates())
