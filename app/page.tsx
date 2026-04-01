import HomeHeader from "./home/components/HomeHeader";
import StudioWorkspace from "./home/StudioWorkspace";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-[var(--bg)] text-[var(--fg)]">
      <HomeHeader />

      <main className="mx-auto w-full max-w-[90rem] px-5 pb-16 pt-8 sm:px-8">
        <StudioWorkspace />
      </main>
    </div>
  );
}
