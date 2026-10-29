"use client";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <main className="loading-shell">
      <h1>Lowcal</h1>
      <p>Не удалось открыть дневник. Попробуй ещё раз.</p>
      <button className="button primary" onClick={reset}>
        Попробовать снова · Try again
      </button>
    </main>
  );
}
