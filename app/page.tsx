import HomeHeader from "./home/components/HomeHeader";
import OverviewSection from "./home/components/OverviewSection";
import StudioWorkspace from "./home/StudioWorkspace";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      <HomeHeader />

      <main className="mx-auto max-w-5xl px-5 pb-20 pt-8 sm:px-10">
        <OverviewSection />
        <StudioWorkspace />
      </main>
    </div>
  );
}
