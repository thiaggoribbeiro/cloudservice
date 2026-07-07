export function EmptyState({ title, description }: { title: string; description: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-24 text-center">
      <div
        className="manifest-tab flex h-12 w-16 items-end justify-center bg-brand-pale pb-2"
        aria-hidden
      >
        <div className="h-2 w-2 rounded-[1px] bg-brand-primary/70" />
      </div>
      <h3 className="text-xl text-brand-black">{title}</h3>
      <p className="max-w-xs text-sm text-brand-gray">{description}</p>
    </div>
  );
}
