export default function CoachLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-navy/5 via-white to-purple/5">
      {children}
    </div>
  );
}
