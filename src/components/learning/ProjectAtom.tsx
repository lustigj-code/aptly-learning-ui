/**
 * Project Atom Component
 * Handles project-based learning with file/image submissions
 * Integrates Phase 5: Multi-Modal AI for ad creative analysis
 */

'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { CheckCircle, Upload, Link2, FileText, Loader2, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import type { Atom, ProjectContent } from '@/types';
import { AdCreativeUpload } from '@/components/ai/AdCreativeUpload';
import type { AdCreativeAnalysis } from '@/lib/ai/multi-modal-analysis';

type ProjectAtomProps = {
  atom: Atom & { content: ProjectContent };
  onComplete: (xpEarned?: number) => void;
  coachAvailable?: boolean;
};

export function ProjectAtom({ atom, onComplete, coachAvailable = true }: ProjectAtomProps) {
  const { content } = atom;
  const [submission, setSubmission] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const [aiAnalysis, setAiAnalysis] = useState<AdCreativeAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Determine if this is a creative-type project that can use AI analysis
  const isCreativeProject = content.submissionType === 'file' &&
    (content.title.toLowerCase().includes('ad') ||
     content.title.toLowerCase().includes('creative') ||
     content.title.toLowerCase().includes('campaign') ||
     content.requirements.some(r => r.toLowerCase().includes('image') || r.toLowerCase().includes('visual')));

  const handleAIAnalysisComplete = (analysis: AdCreativeAnalysis) => {
    setAiAnalysis(analysis);
    // If AI gives a passing score, allow submission
    if (analysis.overallScore >= 60) {
      setError(null);
    }
  };

  const handleSubmit = async () => {
    if (content.submissionType !== 'file' && !submission.trim()) {
      setError('Please provide your submission');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // In production, would submit to API
      await new Promise(resolve => setTimeout(resolve, 1000));

      setIsCompleted(true);

      // Calculate XP based on AI analysis if available
      let xpEarned = 50; // Base XP for project
      if (aiAnalysis) {
        // Bonus XP based on AI score
        xpEarned += Math.floor(aiAnalysis.overallScore / 10) * 5;
      }

      onComplete(xpEarned);
    } catch (err) {
      setError('Failed to submit project. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isCompleted) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="bg-white rounded-2xl shadow-card p-8 text-center"
      >
        <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-success/10 flex items-center justify-center">
          <CheckCircle className="w-8 h-8 text-success" />
        </div>
        <h2 className="text-xl font-semibold text-navy mb-2">Project Submitted!</h2>
        <p className="text-rich-black/60">
          Great work! Your project has been submitted for review.
        </p>
        {aiAnalysis && (
          <div className="mt-4 p-4 bg-light-grey rounded-lg">
            <p className="text-sm text-rich-black/70">
              AI Analysis Score: <span className="font-bold text-teal">{aiAnalysis.overallScore}/100</span>
            </p>
          </div>
        )}
      </motion.div>
    );
  }

  return (
    <div className="bg-white rounded-2xl shadow-card p-6 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-xl font-semibold text-navy">{content.title}</h2>
        <p className="text-rich-black/60 mt-2">{content.description}</p>
      </div>

      {/* Requirements */}
      <div className="bg-light-grey rounded-xl p-4">
        <h3 className="text-sm font-semibold text-navy mb-3">Requirements</h3>
        <ul className="space-y-2">
          {content.requirements.map((req, i) => (
            <li key={i} className="flex items-start gap-2 text-sm text-rich-black/70">
              <span className="w-5 h-5 rounded-full bg-teal/10 text-teal flex items-center justify-center flex-shrink-0 text-xs font-medium">
                {i + 1}
              </span>
              {req}
            </li>
          ))}
        </ul>
      </div>

      {/* Rubric */}
      {content.rubric && content.rubric.length > 0 && (
        <div>
          <h3 className="text-sm font-semibold text-navy mb-3">Grading Rubric</h3>
          <div className="space-y-2">
            {content.rubric.map((item, i) => (
              <div key={i} className="flex items-center justify-between p-3 bg-light-grey rounded-lg">
                <p className="text-sm font-medium text-navy">{item.criterion}</p>
                <span className="text-sm font-medium text-teal">{item.weight}%</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submission Area */}
      <div className="border-t border-grey/20 pt-6">
        <h3 className="text-sm font-semibold text-navy mb-4">Your Submission</h3>

        {/* Creative Project - Use AI Upload */}
        {isCreativeProject ? (
          <div className="space-y-4">
            <div className="flex items-center gap-2 p-3 bg-purple/5 border border-purple/20 rounded-lg">
              <span className="text-purple text-sm">
                This project supports AI-powered creative analysis
              </span>
            </div>
            <AdCreativeUpload
              onAnalysisComplete={handleAIAnalysisComplete}
              campaignContext={{
                objective: 'brand_awareness',
                platform: 'instagram',
              }}
            />
          </div>
        ) : content.submissionType === 'text' ? (
          /* Text Submission */
          <div>
            <textarea
              value={submission}
              onChange={(e) => setSubmission(e.target.value)}
              placeholder="Write your response here..."
              className="w-full h-48 px-4 py-3 border border-grey rounded-xl resize-none focus:ring-2 focus:ring-teal/30 focus:border-teal"
            />
          </div>
        ) : content.submissionType === 'link' ? (
          /* Link Submission */
          <div className="flex items-center gap-3">
            <Link2 className="w-5 h-5 text-grey" />
            <input
              type="url"
              value={submission}
              onChange={(e) => setSubmission(e.target.value)}
              placeholder="Paste your link here..."
              className="flex-1 px-4 py-3 border border-grey rounded-xl focus:ring-2 focus:ring-teal/30 focus:border-teal"
            />
          </div>
        ) : (
          /* File Submission (non-creative) */
          <div className="border-2 border-dashed border-grey rounded-xl p-8 text-center">
            <Upload className="w-8 h-8 text-grey mx-auto mb-3" />
            <p className="text-sm text-rich-black/60">
              Drag and drop your file here, or click to browse
            </p>
            <input
              type="file"
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.[0]) {
                  setSubmission(e.target.files[0].name);
                }
              }}
            />
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-error-light rounded-lg text-sm text-error">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}

      {/* Submit Button */}
      <Button
        onClick={handleSubmit}
        disabled={isSubmitting || (content.submissionType !== 'file' && !submission.trim())}
        className="w-full"
      >
        {isSubmitting ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin mr-2" />
            Submitting...
          </>
        ) : (
          'Submit Project'
        )}
      </Button>
    </div>
  );
}
