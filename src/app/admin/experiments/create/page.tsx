'use client';

import { useState } from 'react';
import { useUser } from '@/store/userProfileStore';
import { useRouter } from 'next/navigation';
import { CreateExperimentForm } from '@/components/admin/CreateExperimentForm';
import { FlaskConical, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { auth } from '@/lib/firebase/config';

export default function CreateExperimentPage() {
  const { user, isLoading: userLoading } = useUser();
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (userLoading) {
    return (
      <div className="min-h-screen bg-light-grey p-8">
        <div className="max-w-4xl mx-auto space-y-6">
          <div className="h-8 bg-white/50 rounded-lg animate-pulse w-32" />
          <div className="h-96 bg-white rounded-xl animate-pulse" />
        </div>
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    router.push('/dashboard');
    return null;
  }

  const handleSubmit = async (formData: Parameters<typeof CreateExperimentForm>[0]['onSubmit'] extends (data: infer T) => unknown ? T : never) => {
    setIsSubmitting(true);
    try {
      const token = await auth?.currentUser?.getIdToken();

      // Transform form data to match API expected format
      const experimentData = {
        name: formData.name,
        description: formData.description,
        status: 'draft',
        startDate: formData.startDate ? new Date(formData.startDate) : new Date(),
        endDate: formData.endDate ? new Date(formData.endDate) : undefined,
        variants: {
          control: formData.controlConfig,
          treatment: formData.treatmentConfig,
        },
        allocation: formData.allocation,
        metrics: formData.metrics,
        sampleSize: {
          target: formData.sampleSizeTarget,
          current: { control: 0, treatment: 0 },
        },
        targetAudience: formData.targetAudience,
        targetCourses: formData.targetCourses,
      };

      const response = await fetch('/api/admin/experiments/create', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(experimentData),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create experiment');
      }

      const result = await response.json();
      router.push(`/admin/experiments/${result.experimentId}`);
    } catch (error) {
      console.error('Error creating experiment:', error);
      // In a real app, show a toast notification here
      alert('Failed to create experiment. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancel = () => {
    router.push('/admin/experiments');
  };

  return (
    <div className="min-h-screen bg-light-grey">
      {/* Header */}
      <header className="bg-white border-b border-grey">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <Link href="/admin/experiments" className="inline-flex items-center gap-2 text-sm text-rich-black/60 hover:text-navy mb-4">
            <ArrowLeft className="w-4 h-4" />
            Back to Experiments
          </Link>

          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-teal/10 rounded-xl flex items-center justify-center">
              <FlaskConical className="w-6 h-6 text-teal" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-navy">Create New Experiment</h1>
              <p className="text-sm text-rich-black/60">
                Set up a new A/B test to measure learning outcomes
              </p>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <CreateExperimentForm
          onSubmit={handleSubmit}
          onCancel={handleCancel}
          isLoading={isSubmitting}
        />
      </main>
    </div>
  );
}
