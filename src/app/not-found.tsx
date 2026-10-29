import Link from "next/link";
export default function NotFound() {
  return (
    <main className="loading-shell">
      <h1>404</h1>
      <p>Здесь пока ничего нет · Nothing here yet</p>
      <Link href="/" className="button primary">
        Lowcal →
      </Link>
    </main>
  );
}
