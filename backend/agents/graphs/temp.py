import re

code_str = """```
option = {
  tooltip: {
    trigger: 'axis',
    axisPointer: {
      type: 'shadow'
    }
  },
  grid: {
    left: '3%',
    right: '4%',
    bottom: '3%',
    containLabel: true
  },
  xAxis: [
    {
      type: 'category',
      data: ["الفلاحي", "الصلتيه", "اليزيدي", "المسرورس", "المعشري"],
      axisTick: {
        alignWithLabel: true
      }
    }
  ],
  yAxis: [
    {
      type: 'value'
    }
  ],
  series: [
    {
      name: 'Communication Skills Score',
      type: 'bar',
      barWidth: '60%',
      data: [5, 5, 4, 4, 4]
    }
  ]
};
```"""

# Remove triple backticks
cleaned = re.sub(r"^```|```$", "", code_str.strip(), flags=re.MULTILINE)

# Remove "option =" and any leading/trailing spaces or semicolons
cleaned = re.sub(r"^\s*option\s*=\s*", "", cleaned.strip())
cleaned = cleaned.rstrip(";").strip()

print(cleaned)
