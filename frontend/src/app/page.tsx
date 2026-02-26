import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-8">
      <h1 className="text-4xl font-bold tracking-tight text-terminal-green text-glow">
        Portfolio Intelligence
      </h1>
      <p className="mt-4 text-lg text-terminal-green-dim">
        AI-powered portfolio analysis and insights
      </p>
      <Link
        href="/dashboard"
        className="mt-8 border border-terminal-green text-terminal-green px-8 py-3
          uppercase tracking-widest text-sm font-bold
          hover:bg-terminal-green hover:text-terminal-bg
          transition-colors duration-150"
      >
        Enter Terminal
      </Link>
    </main>
  );
}
