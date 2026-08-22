import Link from "next/link";
import { hasSession } from "@/lib/server/proxy";

const NAV_LINKS = [
  { href: "/#how", label: "How it works" },
  { href: "/#logic", label: "Core logic" },
  { href: "/#stack", label: "Tech stack" },
  { href: "/#github", label: "Open source" },
];

export default async function SiteNavbar() {
  const authed = await hasSession();
  const github = process.env.NEXT_PUBLIC_GITHUB_URL;

  return (
    <header className="fixed top-0 inset-x-0 z-50 bg-[#0a0a0b]/85 backdrop-blur border-b border-[#2a2a2e]">
      <nav className="mx-auto flex h-16 max-w-[1200px] items-center justify-between px-6">
        {/* Logo -> / */}
        <Link href="/" className="flex items-center gap-2 group">
          <span className="text-[#8b5cf6] transition group-hover:rotate-90 inline-block">
            ◆
          </span>
          <span className="text-sm font-semibold tracking-wide text-[#f5f5f7]">
            VaultKey
          </span>
        </Link>

        <div className="hidden md:flex items-center gap-7">
          {NAV_LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-xs uppercase tracking-[0.12em] text-[#a1a1aa] hover:text-[#8b5cf6] transition"
            >
              {l.label}
            </Link>
          ))}
          {github ? (
            <a
              href={github}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs uppercase tracking-[0.12em] text-[#a1a1aa] hover:text-[#8b5cf6] transition"
            >
              GitHub ↗
            </a>
          ) : null}
        </div>

        <div className="flex items-center gap-3">
          {authed ? (
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-2 rounded-md bg-[#8b5cf6] hover:bg-[#7c3aed] px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-white transition"
            >
              <span className="text-[10px]">◆</span> Go to Dashboard
            </Link>
          ) : (
            <>
              <Link
                href="/login"
                className="rounded-md border border-[#2a2a2e] px-4 py-2 text-xs font-medium uppercase tracking-[0.1em] text-[#a1a1aa] hover:text-[#f5f5f7] hover:border-[#52525b] transition"
              >
                Sign in
              </Link>
              <Link
                href="/test"
                className="hidden sm:inline-flex items-center gap-2 rounded-md bg-[#8b5cf6] hover:bg-[#7c3aed] px-4 py-2 text-xs font-semibold uppercase tracking-[0.1em] text-white transition"
              >
                <span className="text-[10px]">◆</span> Run the test
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}