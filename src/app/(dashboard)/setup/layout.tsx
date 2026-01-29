export default function SetupLayout({
  children,
}: {
  children: React.ReactNode
}) {
  // Setup page has no navigation - just the content
  return <>{children}</>
}
