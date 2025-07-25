"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Download, FileText } from "lucide-react"

export default function SampleCSVGenerator() {
  const generateSampleCSV = () => {
    const sampleData = [
      [
        "ID",
        "Name",
        "Department",
        "Overall Score",
        "Strengths",
        "Strength Scores",
        "Development Areas",
        "Development Scores",
        "Role",
        "Join Date",
        "Last Review",
      ],
      [
        "EMP001",
        "John Doe",
        "Engineering",
        "85",
        "Leadership;Communication",
        "90;80",
        "Time Management",
        "65",
        "Senior Developer",
        "2023-01-15",
        "2024-12-01",
      ],
      [
        "EMP002",
        "Jane Smith",
        "Marketing",
        "78",
        "Creativity;Analytics",
        "85;75",
        "Public Speaking;Project Management",
        "60;55",
        "Marketing Manager",
        "2023-03-20",
        "2024-11-15",
      ],
      [
        "EMP003",
        "Mike Johnson",
        "Sales",
        "92",
        "Negotiation;Customer Relations",
        "95;88",
        "Technical Knowledge",
        "70",
        "Sales Director",
        "2022-08-10",
        "2024-12-10",
      ],
      [
        "EMP004",
        "Sarah Wilson",
        "HR",
        "76",
        "Empathy;Organization",
        "80;72",
        "Data Analysis;Strategic Planning",
        "65;68",
        "HR Specialist",
        "2023-06-01",
        "2024-11-20",
      ],
      [
        "EMP005",
        "David Brown",
        "Engineering",
        "88",
        "Problem Solving;Innovation",
        "90;86",
        "Communication;Leadership",
        "70;75",
        "Tech Lead",
        "2022-11-30",
        "2024-12-05",
      ],
      [
        "EMP006",
        "Lisa Garcia",
        "Marketing",
        "82",
        "Brand Strategy;Social Media",
        "85;79",
        "Budget Management",
        "72",
        "Brand Manager",
        "2023-04-12",
        "2024-11-25",
      ],
      [
        "EMP007",
        "Tom Anderson",
        "Sales",
        "79",
        "Relationship Building;Presentation",
        "82;76",
        "Market Analysis;CRM Usage",
        "68;70",
        "Account Manager",
        "2023-07-18",
        "2024-12-02",
      ],
      [
        "EMP008",
        "Emily Davis",
        "HR",
        "84",
        "Recruitment;Training",
        "88;80",
        "Legal Compliance",
        "75",
        "HR Manager",
        "2022-12-05",
        "2024-11-30",
      ],
    ]

    const csvContent = sampleData.map((row) => row.join(",")).join("\n")
    const blob = new Blob([csvContent], { type: "text/csv" })
    const url = window.URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = "sample_employee_data.csv"
    document.body.appendChild(link)
    link.click()
    document.body.removeChild(link)
    window.URL.revokeObjectURL(url)
  }

  return (
    <Card className="bg-green-50 border-green-200">
      <CardHeader className="pb-3">
        <CardTitle className="text-sm flex items-center text-green-700">
          <FileText className="mr-2 h-4 w-4" />
          Need Sample Data?
        </CardTitle>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-green-600 mb-3">Download a sample CSV file to test the upload functionality</p>
        <Button onClick={generateSampleCSV} className="w-full bg-green-600 hover:bg-green-700 text-white" size="sm">
          <Download className="mr-2 h-4 w-4" />
          Download Sample CSV
        </Button>
      </CardContent>
    </Card>
  )
}
