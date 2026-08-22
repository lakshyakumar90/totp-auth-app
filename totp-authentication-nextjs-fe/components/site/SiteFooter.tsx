const SOCIALS = [
  { key: "NEXT_PUBLIC_GITHUB_URL", label: "GitHub" },
  { key: "NEXT_PUBLIC_LINKEDIN_URL", label: "LinkedIn" },
  { key: "NEXT_PUBLIC_TWITTER_URL", label: "Twitter" },
  { key: "NEXT_PUBLIC_PORTFOLIO_URL", label: "Portfolio" },
] as const;

export default function SiteFooter() {
  const links = SOCIALS.map((s) => ({
    label: s.label,
    url: process.env[s.key] ?? "",
  })).filter((s) => s.url);

  return (
    <footer className="border-t border-[#2a2a2e]">
      <div className="mx-auto max-w-[1200px] px-6 py-14">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6">
          <div>
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#6b6b70]">
              VaultKey · RFC 6238 offline authenticator
            </p>
            <p className="mt-2 text-xs text-[#6b6b70]">
              © {new Date().getFullYear()} — codes generated on your device,
              never on ours.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {links.length > 0 ? (
              links.map((l) => (
                <a
                  key={l.label}
                  href={l.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#a1a1aa] hover:text-[#8b5cf6] transition"
                >
                  {l.label} ↗
                </a>
              ))
            ) : (
              <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-[#6b6b70]">
                add NEXT_PUBLIC_* URLs to .env.local to show socials
              </span>
            )}
          </div>
        </div>
      </div>
    </footer>
  );
}