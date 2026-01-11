import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-8">
      <div className="w-16 h-16 bg-teal rounded-2xl flex items-center justify-center mb-6">
        <span className="text-2xl font-bold text-white">A</span>
      </div>
      <h1 className="text-2xl font-bold text-navy mb-2">Page Not Found</h1>
      <p className="text-rich-black/60 mb-6 text-center max-w-md">
        The page you&apos;re looking for doesn&apos;t exist or has been moved.
      </p>
      <Link
        href="/dashboard"
        className="px-6 py-3 bg-teal text-white font-medium rounded-xl hover:bg-teal/90 transition-colors"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
