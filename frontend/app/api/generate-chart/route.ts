import { type NextRequest, NextResponse } from "next/server"

const OPENAI_API_KEY =
  "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"

export async function POST(request: NextRequest) {
  try {
    const { prompt, data, chartType } = await request.json()

    const systemPrompt = `You are an expert data visualization developer. Generate complete HTML/CSS/JavaScript code for interactive charts based on employee performance data.

Requirements:
- Use Chart.js or D3.js for visualizations
- Include performance thresholds: 0-50% (red, immediate action), 50-60% (orange, push), 60%+ (green, good)
- Make charts responsive and interactive
- Include proper styling and animations
- Return only the complete HTML code that can be rendered directly
- Use CDN links for libraries
- Include tooltips and legends
- Make the chart fit in a 600x400px container

Data sample: ${JSON.stringify(data.slice(0, 3))}

Generate a ${chartType} chart based on this prompt: ${prompt}`

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: prompt },
        ],
        max_tokens: 2000,
        temperature: 0.7,
      }),
    })

    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.statusText}`)
    }

    const result = await response.json()
    const chartCode = result.choices[0]?.message?.content

    // Generate insights
    const insightsResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${OPENAI_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4",
        messages: [
          {
            role: "system",
            content:
              "You are a data analyst. Provide 2-3 key insights based on the employee performance data in 1-2 sentences.",
          },
          {
            role: "user",
            content: `Analyze this employee data and provide insights: ${JSON.stringify(data.slice(0, 10))}`,
          },
        ],
        max_tokens: 200,
        temperature: 0.5,
      }),
    })

    const insightsResult = await insightsResponse.json()
    const insights = insightsResult.choices[0]?.message?.content

    return NextResponse.json({
      success: true,
      chartCode,
      insights,
    })
  } catch (error) {
    console.error("Error generating chart:", error)
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
