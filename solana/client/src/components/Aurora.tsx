/**
 * Animated aurora background — three slow-drifting blurred gradient blobs fixed
 * behind the app for depth and motion. Purely decorative (aria-hidden), GPU
 * friendly (transform/opacity only), and motion-reduced users get a static
 * version via the `motion-reduce` utilities.
 */
export function Aurora() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden="true">
      <div className="absolute -left-[10%] -top-[15%] h-[42rem] w-[42rem] rounded-full bg-brand-500/30 blur-3xl animate-blob motion-reduce:animate-none dark:bg-brand-500/25" />
      <div className="absolute -right-[12%] top-[8%] h-[36rem] w-[36rem] rounded-full bg-accent/20 blur-3xl animate-blob [animation-delay:-6s] motion-reduce:animate-none" />
      <div className="absolute bottom-[-18%] left-[28%] h-[40rem] w-[40rem] rounded-full bg-sky-500/15 blur-3xl animate-blob [animation-delay:-12s] motion-reduce:animate-none" />
    </div>
  );
}
