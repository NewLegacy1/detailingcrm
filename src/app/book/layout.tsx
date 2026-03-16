export default function BookLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen text-[var(--text)] overflow-x-hidden">
      {children}
    </div>
  )
}
