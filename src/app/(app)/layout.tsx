import Nav from "@/components/Nav";

export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-cream text-ink">
      <div className="md:flex md:min-h-screen">
        <Nav />
        <main className="flex-1 px-5 md:px-10 py-8 max-w-6xl mx-auto">{children}</main>
      </div>
    </div>
  );
}
