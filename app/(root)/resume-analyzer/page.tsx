"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import LogoutButton from "@/components/LogoutButton";
import Link from "next/link";
import { ArrowLeft, Upload, FileText, Download } from "lucide-react";

interface ResumeAnalysis {
  summary: string;
  strengths: string[];
  weaknesses: string[];
  suggestedQuestions: string[];
  recommendations: string[];
}

export default function ResumeAnalyzer() {
  const [file, setFile] = useState<File | null>(null);
  const [jobDescFile, setJobDescFile] = useState<File | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<ResumeAnalysis | null>(null);
  const [matchResult, setMatchResult] = useState<string | null>(null);
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [matchedSkills, setMatchedSkills] = useState<string[] | null>(null);
  const [missingSkills, setMissingSkills] = useState<string[] | null>(null);
  const [sectionMatches, setSectionMatches] = useState<any[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [resumeImprovementTips, setResumeImprovementTips] = useState<string[] | null>(null);
  const [missingKeywords, setMissingKeywords] = useState<string[] | null>(null);
  const [atsScore, setAtsScore] = useState<number | null>(null);
  const [atsSections, setAtsSections] = useState<string[] | null>(null);
  const [languageTone, setLanguageTone] = useState<string | null>(null);
  const [grammarSpelling, setGrammarSpelling] = useState<string | null>(null);
  const [jobDescriptionSummary, setJobDescriptionSummary] = useState<string | null>(null);
  const [topJobRequirements, setTopJobRequirements] = useState<string[] | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const ext = selectedFile.name.split('.').pop()?.toLowerCase();
      if (ext !== 'docx') {
        setError('Please upload a DOCX file (Word document, .docx extension)');
        setFile(null);
        return;
      }
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError('File size must be less than 5MB');
        setFile(null);
        return;
      }
      setFile(selectedFile);
      setError(null);
    }
  };

  const handleJobDescFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      const ext = selectedFile.name.split('.').pop()?.toLowerCase();
      if (ext !== 'docx') {
        setError('Please upload a DOCX file (Word document, .docx extension) for the job description');
        setJobDescFile(null);
        return;
      }
      if (selectedFile.size > 5 * 1024 * 1024) {
        setError('Job description file size must be less than 5MB');
        setJobDescFile(null);
        return;
      }
      setJobDescFile(selectedFile);
      setError(null);
    }
  };

  const analyzeResume = async () => {
    if (!file) return;
    setIsAnalyzing(true);
    setError(null);
    setMatchResult(null);
    try {
      const formData = new FormData();
      formData.append('resume', file);
      if (jobDescFile) {
        formData.append('jobDescription', jobDescFile);
      }
      const response = await fetch('/api/resume-analyzer', {
        method: 'POST',
        body: formData,
      });
      if (!response.ok) {
        throw new Error('Failed to analyze resume');
      }
      const data = await response.json();
      setAnalysis(data);
      if (data.matchResult) setMatchResult(data.matchResult);
      if (typeof data.matchScore === 'number') setMatchScore(data.matchScore);
      if (Array.isArray(data.matchedSkills)) setMatchedSkills(data.matchedSkills);
      if (Array.isArray(data.missingSkills)) setMissingSkills(data.missingSkills);
      if (Array.isArray(data.sectionMatches)) setSectionMatches(data.sectionMatches);
      if (Array.isArray(data.resumeImprovementTips)) setResumeImprovementTips(data.resumeImprovementTips);
      if (Array.isArray(data.missingKeywords)) setMissingKeywords(data.missingKeywords);
      if (typeof data.atsScore === 'number') setAtsScore(data.atsScore);
      if (Array.isArray(data.atsSections)) setAtsSections(data.atsSections);
      if (typeof data.languageTone === 'string') setLanguageTone(data.languageTone);
      if (typeof data.grammarSpelling === 'string') setGrammarSpelling(data.grammarSpelling);
      if (typeof data.jobDescriptionSummary === 'string') setJobDescriptionSummary(data.jobDescriptionSummary);
      if (Array.isArray(data.topJobRequirements)) setTopJobRequirements(data.topJobRequirements);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const downloadAnalysis = () => {
    if (!analysis) return;

    let content = `RESUME & JOB DESCRIPTION ANALYSIS REPORT\n\n`;
    if (matchResult) {
      content += `RESUME & JOB DESCRIPTION MATCH:\n${matchResult}\n\n`;
    }
    if (typeof matchScore === 'number') {
      content += `MATCH SCORE: ${matchScore}%\n`;
    }
    if (matchedSkills && matchedSkills.length > 0) {
      content += `SKILLS MATCHED: ${matchedSkills.join(', ')}\n`;
    }
    if (missingSkills && missingSkills.length > 0) {
      content += `SKILLS MISSING: ${missingSkills.join(', ')}\n`;
    }
    if (sectionMatches && sectionMatches.length > 0) {
      content += `SECTION MATCHING:\n`;
      sectionMatches.forEach((item) => {
        content += `- ${item.requirement}: ${item.matchedSections?.join(', ') || 'No match'}\n`;
      });
    }
    if (resumeImprovementTips && resumeImprovementTips.length > 0) {
      content += `\nRESUME IMPROVEMENT TIPS:\n`;
      resumeImprovementTips.forEach((tip, idx) => {
        content += `- ${tip}\n`;
      });
    }
    if (missingKeywords && missingKeywords.length > 0) {
      content += `\nMISSING KEYWORDS:\n`;
      missingKeywords.forEach((kw, idx) => {
        content += `- ${kw}\n`;
      });
    }
    if (typeof atsScore === 'number' || (atsSections && atsSections.length > 0)) {
      content += `\nATS SIMULATION:\n`;
      if (typeof atsScore === 'number') content += `ATS Score: ${atsScore}/100\n`;
      if (atsSections && atsSections.length > 0) content += `ATS Sections: ${atsSections.join(', ')}\n`;
    }
    if (languageTone || grammarSpelling) {
      content += `\nLANGUAGE & TONE ANALYSIS:\n`;
      if (languageTone) content += `Professionalism & Tone: ${languageTone}\n`;
      if (grammarSpelling) content += `Grammar & Spelling: ${grammarSpelling}\n`;
    }
    if (jobDescriptionSummary || (topJobRequirements && topJobRequirements.length > 0)) {
      content += `\nJOB DESCRIPTION INSIGHTS:\n`;
      if (jobDescriptionSummary) content += `Summary: ${jobDescriptionSummary}\n`;
      if (topJobRequirements && topJobRequirements.length > 0) {
        content += `Top 5 Requirements:\n`;
        topJobRequirements.forEach((req, idx) => {
          content += `- ${req}\n`;
        });
      }
    }
    // Original analysis results
    content += `\nANALYSIS RESULTS\n----------------\n`;
    content += `SUMMARY:\n${analysis.summary}\n\n`;
    content += `STRENGTHS:\n${analysis.strengths.map((strength, index) => `${index + 1}. ${strength}`).join('\n')}\n\n`;
    content += `AREAS FOR IMPROVEMENT:\n${analysis.weaknesses.map((weakness, index) => `${index + 1}. ${weakness}`).join('\n')}\n\n`;
    content += `SUGGESTED INTERVIEW QUESTIONS:\n${analysis.suggestedQuestions.map((question, index) => `${index + 1}. ${question}`).join('\n')}\n\n`;
    content += `RECOMMENDATIONS:\n${analysis.recommendations.map((rec, index) => `${index + 1}. ${rec}`).join('\n')}\n`;

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resume-analysis.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <>
      <LogoutButton />
      <div className="max-w-4xl mx-auto p-6">
        {/* Header - moved to top */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="ghost" asChild>
            <Link href="/">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Dashboard
            </Link>
          </Button>
          <div>
            <h1 className="text-3xl font-bold">Resume Analyzer</h1>
            <p className="text-muted-foreground">
              Upload your resume for AI-powered analysis and interview question suggestions
            </p>
          </div>
        </div>
        {/* Upload Section */}
        <div className="card-cta mb-8">
          <div className="flex flex-col gap-6 max-w-lg">
            <h2>Upload Your Resume</h2>
            <p className="text-lg">
              Get personalized feedback and interview questions based on your experience
            </p>
            <div className="space-y-4">
              <div>
                <Label htmlFor="resume-upload">Resume (DOCX preferred, PDF temporarily disabled)</Label>
                <Input
                  id="resume-upload"
                  type="file"
                  accept=".docx"
                  onChange={handleFileChange}
                  className="mt-2"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Please upload your resume in DOCX format for the best analysis results.
                </p>
              </div>
              <div>
                <Label htmlFor="jobdesc-upload">Job Description (DOCX)</Label>
                <Input
                  id="jobdesc-upload"
                  type="file"
                  accept=".docx"
                  onChange={handleJobDescFileChange}
                  className="mt-2"
                />
                <p className="text-sm text-muted-foreground mt-1">
                  Optionally upload a job description in DOCX format to match your resume against a specific role.
                </p>
              </div>
              {error && (
                <p className="text-red-500 text-sm">{error}</p>
              )}
              <Button 
                onClick={analyzeResume} 
                disabled={!file || isAnalyzing}
                className="btn-primary"
              >
                {isAnalyzing ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Analyzing...
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    Analyze Resume
                  </>
                )}
              </Button>
            </div>
          </div>
          <div className="flex items-center justify-center">
            <Upload className="w-32 h-32 text-muted-foreground/50" />
          </div>
        </div>

        {/* Analysis Results */}
        {analysis && (
          <div className="space-y-6">
            <div className="flex items-center justify-end">
              <Button onClick={downloadAnalysis} variant="outline">
                <Download className="w-4 h-4 mr-2" />
                Download Report
              </Button>
            </div>
            {/* ATS Score & Sections */}
            {(atsScore !== null || (atsSections && atsSections.length > 0)) && (
              <div className="card">
                <h3 className="text-xl font-semibold mb-3">ATS Simulation</h3>
                {typeof atsScore === 'number' && (
                  <div className="mb-2">
                    <span className="font-bold">ATS Score:</span> {atsScore}/100
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                      <div className="bg-purple-500 h-2.5 rounded-full" style={{ width: `${atsScore}%` }}></div>
                    </div>
                  </div>
                )}
                {atsSections && atsSections.length > 0 && (
                  <div className="mb-2">
                    <span className="font-bold">ATS Sections:</span> {atsSections.join(', ')}
                  </div>
                )}
              </div>
            )}
            {/* Language & Tone Analysis */}
            {(languageTone || grammarSpelling) && (
              <div className="card">
                <h3 className="text-xl font-semibold mb-3">Language & Tone Analysis</h3>
                {languageTone && (
                  <div className="mb-2">
                    <span className="font-bold">Professionalism & Tone:</span> {languageTone}
                  </div>
                )}
                {grammarSpelling && (
                  <div className="mb-2">
                    <span className="font-bold">Grammar & Spelling:</span> {grammarSpelling}
                  </div>
                )}
              </div>
            )}
            {/* Job Description Insights */}
            {(jobDescriptionSummary || (topJobRequirements && topJobRequirements.length > 0)) && (
              <div className="card">
                <h3 className="text-xl font-semibold mb-3">Job Description Insights</h3>
                {jobDescriptionSummary && (
                  <div className="mb-2">
                    <span className="font-bold">Summary:</span> {jobDescriptionSummary}
                  </div>
                )}
                {topJobRequirements && topJobRequirements.length > 0 && (
                  <div className="mb-2">
                    <span className="font-bold">Top 5 Requirements:</span>
                    <ul className="list-disc ml-6">
                      {topJobRequirements.map((req, idx) => (
                        <li key={idx}>{req}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            {/* Resume Improvement Tips */}
            {resumeImprovementTips && resumeImprovementTips.length > 0 && (
              <div className="card">
                <h3 className="text-xl font-semibold mb-3">Resume Improvement Tips</h3>
                <ul className="list-disc ml-6">
                  {resumeImprovementTips.map((tip, idx) => (
                    <li key={idx} className="text-blue-600">{tip}</li>
                  ))}
                </ul>
              </div>
            )}
            {/* Missing Keywords */}
            {missingKeywords && missingKeywords.length > 0 && (
              <div className="card">
                <h3 className="text-xl font-semibold mb-3">Missing Keywords</h3>
                <ul className="list-disc ml-6">
                  {missingKeywords.map((kw, idx) => (
                    <li key={idx} className="text-red-600">{kw}</li>
                  ))}
                </ul>
              </div>
            )}
            {matchResult && (
              <div className="card">
                <h3 className="text-xl font-semibold mb-3">Resume & Job Description Match</h3>
                <p className="text-muted-foreground">{matchResult}</p>
              </div>
            )}
            {/* Match Breakdown Section */}
            {(matchScore !== null || (matchedSkills && matchedSkills.length) || (missingSkills && missingSkills.length) || (sectionMatches && sectionMatches.length)) && (
              <div className="card">
                <h3 className="text-xl font-semibold mb-3">Detailed Match Breakdown</h3>
                {typeof matchScore === 'number' && (
                  <div className="mb-2">
                    <span className="font-bold">Match Score:</span> {matchScore}%
                    <div className="w-full bg-gray-200 rounded-full h-2.5 mt-1">
                      <div className="bg-blue-500 h-2.5 rounded-full" style={{ width: `${matchScore}%` }}></div>
                    </div>
                  </div>
                )}
                {matchedSkills && matchedSkills.length > 0 && (
                  <div className="mb-2">
                    <span className="font-bold">Matched Skills:</span>
                    <ul className="list-disc ml-6">
                      {matchedSkills.map((skill, idx) => (
                        <li key={idx} className="text-green-600">{skill}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {missingSkills && missingSkills.length > 0 && (
                  <div className="mb-2">
                    <span className="font-bold">Missing Skills:</span>
                    <ul className="list-disc ml-6">
                      {missingSkills.map((skill, idx) => (
                        <li key={idx} className="text-red-600">{skill}</li>
                      ))}
                    </ul>
                  </div>
                )}
                {sectionMatches && sectionMatches.length > 0 && (
                  <div className="mb-2">
                    <span className="font-bold">Section Matching:</span>
                    <ul className="list-disc ml-6">
                      {sectionMatches.map((item, idx) => (
                        <li key={idx}>
                          <span className="font-semibold">{item.requirement}:</span> {item.matchedSections?.join(', ') || 'No match'}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}
            <div className="flex items-center justify-between">
              <h2>Analysis Results</h2>
            </div>

            {/* Summary */}
            <div className="card">
              <h3 className="text-xl font-semibold mb-3">Summary</h3>
              <p className="text-muted-foreground">{analysis.summary}</p>
            </div>

            {/* Strengths */}
            <div className="card">
              <h3 className="text-xl font-semibold mb-3">Key Strengths</h3>
              <ul className="space-y-2">
                {analysis.strengths.map((strength, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-green-500 mt-1">✓</span>
                    <span>{strength}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Areas for Improvement */}
            <div className="card">
              <h3 className="text-xl font-semibold mb-3">Areas for Improvement</h3>
              <ul className="space-y-2">
                {analysis.weaknesses.map((weakness, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-yellow-500 mt-1">⚠</span>
                    <span>{weakness}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Suggested Questions */}
            <div className="card">
              <h3 className="text-xl font-semibold mb-3">Suggested Interview Questions</h3>
              <ul className="space-y-2">
                {analysis.suggestedQuestions.map((question, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-blue-500 font-medium min-w-[20px]">{index + 1}.</span>
                    <span>{question}</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Recommendations */}
            <div className="card">
              <h3 className="text-xl font-semibold mb-3">Recommendations</h3>
              <ul className="space-y-2">
                {analysis.recommendations.map((rec, index) => (
                  <li key={index} className="flex items-start gap-2">
                    <span className="text-purple-500 mt-1">💡</span>
                    <span>{rec}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </>
  );
} 