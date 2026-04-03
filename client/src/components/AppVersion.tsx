/**
 * Tiny build label from client/package.json via Vite (see vite.config.ts).
 */
export default function AppVersion() {
  const label = import.meta.env.VITE_APP_VERSION ?? '';
  if (!label) return null;

  return (
    <div
      aria-hidden
      className="dark:text-warm-mid"
      style={{
        position: 'fixed',
        bottom: 'max(10px, env(safe-area-inset-bottom, 10px))',
        right: 'max(10px, env(safe-area-inset-right, 10px))',
        zIndex: 50,
        fontSize: 10,
        lineHeight: 1,
        letterSpacing: '0.02em',
        color: 'rgba(107, 91, 78, 0.42)',
        fontWeight: 500,
        pointerEvents: 'none',
        userSelect: 'none',
      }}
    >
      {label}
    </div>
  );
}
