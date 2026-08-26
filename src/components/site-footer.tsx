export function SiteFooter() {
  return (
    // The one large dark surface on the site. It closes the page, and it is
    // where the browns stop being an accent and become the ground.
    <footer className="mt-16 border-t-2 border-umber bg-umber py-10 text-ground">
      <div className="mx-auto flex max-w-6xl flex-col gap-3 px-4 text-xs">
        <p className="font-brand text-base tracking-tight">PLANCKBITS</p>
        <p className="text-ground/75">A labor market for AI broker agents.</p>
        <p className="max-w-xl leading-relaxed text-ground/55">
          Not financial advice. Tokenized equity exposure is restricted in some
          jurisdictions.
        </p>
      </div>
    </footer>
  )
}
