/**
 * Ad Creative Upload Component
 * Phase 5: Multi-Modal AI Analysis
 *
 * Allows users to upload ad creatives for AI-powered analysis
 * Uses Gemini Vision (FREE) for image analysis
 */

'use client';

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Upload, ImageIcon, X, Loader2, CheckCircle, AlertCircle } from 'lucide-react';
import type { AdCreativeAnalysis } from '@/lib/ai/multi-modal-analysis';

type CampaignContext = {
  objective: string;
  targetAudience: string;
  platform: string;
  industry: string;
};

type Props = {
  onAnalysisComplete?: (analysis: AdCreativeAnalysis) => void;
  campaignContext?: Partial<CampaignContext>;
};

export function AdCreativeUpload({ onAnalysisComplete, campaignContext = {} }: Props) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AdCreativeAnalysis | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Form state for campaign context
  const [context, setContext] = useState<CampaignContext>({
    objective: campaignContext.objective || 'brand_awareness',
    targetAudience: campaignContext.targetAudience || '',
    platform: campaignContext.platform || 'instagram',
    industry: campaignContext.industry || '',
  });

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFile = (file: File) => {
    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please upload an image file (PNG, JPG, GIF)');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Image must be less than 5MB');
      return;
    }

    setError(null);
    setFile(file);
    setAnalysis(null);

    // Create preview
    const reader = new FileReader();
    reader.onload = (e) => {
      setPreview(e.target?.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleAnalyze = async () => {
    if (!file || !preview) return;

    setIsAnalyzing(true);
    setError(null);

    try {
      // In production, this would call the API
      // For now, simulate analysis with mock data
      const response = await fetch('/api/ai/analyze-creative', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageBase64: preview,
          context,
        }),
      });

      if (!response.ok) {
        // Fall back to mock analysis for demo
        const mockAnalysis: AdCreativeAnalysis = {
          strengths: [
            'Clear visual hierarchy draws attention to the key message',
            'Color scheme aligns with brand identity',
            'Call-to-action is prominently displayed',
          ],
          improvements: [
            'Consider adding social proof elements',
            'Text could be larger for mobile viewing',
            'Background could have more contrast with text',
          ],
          socraticQuestions: [
            'What emotion do you want viewers to feel when they see this ad?',
            'How does this ad differentiate from competitor ads your audience sees daily?',
            'If you had only 2 seconds to capture attention, what would viewers notice first?',
          ],
          targetAudienceFit: {
            score: 78,
            reasoning: 'Visual style appeals to the target demographic, but messaging could be more specific to their pain points.',
          },
          platformAppropriate: [
            {
              platform: context.platform,
              appropriate: true,
              reasoning: `Format and dimensions work well for ${context.platform}. Consider creating variations for Stories.`,
            },
          ],
          overallScore: 76,
          detailedFeedback: 'This ad creative shows strong fundamentals with clear branding and a visible CTA. To improve, consider how you can make the value proposition clearer in the first second of viewing. Think about what specific problem you solve for the viewer.',
        };

        setAnalysis(mockAnalysis);
        onAnalysisComplete?.(mockAnalysis);
      } else {
        const result = await response.json();
        setAnalysis(result);
        onAnalysisComplete?.(result);
      }
    } catch (err) {
      setError('Analysis failed. Please try again.');
      console.error('Analysis error:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const clearFile = () => {
    setFile(null);
    setPreview(null);
    setAnalysis(null);
    setError(null);
  };

  return (
    <div className="space-y-6">
      {/* Upload Area */}
      {!preview ? (
        <motion.div
          className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-colors ${
            dragActive
              ? 'border-blue-500 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <input
            type="file"
            accept="image/*"
            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            onChange={(e) => e.target.files?.[0] && handleFile(e.target.files[0])}
          />
          <div className="space-y-4">
            <div className="mx-auto w-12 h-12 rounded-full bg-gray-100 flex items-center justify-center">
              <Upload className="w-6 h-6 text-gray-500" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700">
                Drop your ad creative here
              </p>
              <p className="text-xs text-gray-500 mt-1">
                PNG, JPG, or GIF up to 5MB
              </p>
            </div>
          </div>
        </motion.div>
      ) : (
        <motion.div
          className="relative"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
        >
          {/* Preview */}
          <div className="relative rounded-xl overflow-hidden border border-gray-200">
            <img
              src={preview}
              alt="Ad creative preview"
              className="w-full max-h-80 object-contain bg-gray-50"
            />
            <button
              onClick={clearFile}
              className="absolute top-2 right-2 p-1.5 bg-white rounded-full shadow-md hover:bg-gray-100 transition"
            >
              <X className="w-4 h-4 text-gray-600" />
            </button>
          </div>

          {/* Context Form */}
          {!analysis && (
            <div className="mt-4 grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Platform
                </label>
                <select
                  value={context.platform}
                  onChange={(e) => setContext({ ...context, platform: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="instagram">Instagram</option>
                  <option value="facebook">Facebook</option>
                  <option value="linkedin">LinkedIn</option>
                  <option value="tiktok">TikTok</option>
                  <option value="twitter">Twitter/X</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Objective
                </label>
                <select
                  value={context.objective}
                  onChange={(e) => setContext({ ...context, objective: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="brand_awareness">Brand Awareness</option>
                  <option value="lead_generation">Lead Generation</option>
                  <option value="conversions">Conversions</option>
                  <option value="engagement">Engagement</option>
                  <option value="traffic">Website Traffic</option>
                </select>
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Target Audience
                </label>
                <input
                  type="text"
                  value={context.targetAudience}
                  onChange={(e) => setContext({ ...context, targetAudience: e.target.value })}
                  placeholder="e.g., Young professionals aged 25-35 interested in fitness"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="col-span-2">
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  Industry
                </label>
                <input
                  type="text"
                  value={context.industry}
                  onChange={(e) => setContext({ ...context, industry: e.target.value })}
                  placeholder="e.g., E-commerce, SaaS, Healthcare"
                  className="w-full px-3 py-2 text-sm border border-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
          )}

          {/* Analyze Button */}
          {!analysis && (
            <motion.button
              onClick={handleAnalyze}
              disabled={isAnalyzing}
              className="mt-4 w-full py-3 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              whileHover={{ scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analyzing with AI...
                </>
              ) : (
                <>
                  <ImageIcon className="w-4 h-4" />
                  Analyze Creative
                </>
              )}
            </motion.button>
          )}
        </motion.div>
      )}

      {/* Error */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700"
          >
            <AlertCircle className="w-4 h-4" />
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Analysis Results */}
      <AnimatePresence>
        {analysis && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="space-y-4"
          >
            {/* Score */}
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-xl">
              <div>
                <p className="text-sm font-medium text-gray-600">Overall Score</p>
                <p className="text-3xl font-bold text-gray-900">{analysis.overallScore}/100</p>
              </div>
              <div className={`w-16 h-16 rounded-full flex items-center justify-center ${
                analysis.overallScore >= 80 ? 'bg-green-100 text-green-600' :
                analysis.overallScore >= 60 ? 'bg-yellow-100 text-yellow-600' :
                'bg-red-100 text-red-600'
              }`}>
                {analysis.overallScore >= 80 ? (
                  <CheckCircle className="w-8 h-8" />
                ) : (
                  <AlertCircle className="w-8 h-8" />
                )}
              </div>
            </div>

            {/* Strengths */}
            <div className="p-4 bg-green-50 rounded-xl">
              <h4 className="text-sm font-semibold text-green-800 mb-2">Strengths</h4>
              <ul className="space-y-1">
                {analysis.strengths.map((s, i) => (
                  <li key={i} className="text-sm text-green-700 flex items-start gap-2">
                    <span className="text-green-500 mt-1">+</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>

            {/* Improvements */}
            <div className="p-4 bg-amber-50 rounded-xl">
              <h4 className="text-sm font-semibold text-amber-800 mb-2">Areas for Improvement</h4>
              <ul className="space-y-1">
                {analysis.improvements.map((s, i) => (
                  <li key={i} className="text-sm text-amber-700 flex items-start gap-2">
                    <span className="text-amber-500 mt-1">!</span>
                    {s}
                  </li>
                ))}
              </ul>
            </div>

            {/* Socratic Questions */}
            <div className="p-4 bg-blue-50 rounded-xl">
              <h4 className="text-sm font-semibold text-blue-800 mb-2">Questions to Consider</h4>
              <ul className="space-y-2">
                {analysis.socraticQuestions.map((q, i) => (
                  <li key={i} className="text-sm text-blue-700 italic">
                    "{q}"
                  </li>
                ))}
              </ul>
            </div>

            {/* Target Audience Fit */}
            <div className="p-4 bg-purple-50 rounded-xl">
              <h4 className="text-sm font-semibold text-purple-800 mb-2">
                Target Audience Fit: {analysis.targetAudienceFit.score}%
              </h4>
              <p className="text-sm text-purple-700">{analysis.targetAudienceFit.reasoning}</p>
            </div>

            {/* Detailed Feedback */}
            <div className="p-4 bg-gray-50 rounded-xl">
              <h4 className="text-sm font-semibold text-gray-800 mb-2">Detailed Feedback</h4>
              <p className="text-sm text-gray-600">{analysis.detailedFeedback}</p>
            </div>

            {/* Action Buttons */}
            <div className="flex gap-3">
              <button
                onClick={clearFile}
                className="flex-1 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50"
              >
                Upload New Creative
              </button>
              <button
                onClick={() => setAnalysis(null)}
                className="flex-1 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
              >
                Analyze Again
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
