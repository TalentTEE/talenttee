export function Spinner({ size = 'md', text }: { size?: 'sm' | 'md' | 'lg'; text?: string }) {
  const sizeMap = { sm: 'text-lg', md: 'text-3xl', lg: 'text-5xl' };
  return (
    <div className="flex items-center gap-3">
      <span className={`material-symbols-outlined ${sizeMap[size]} text-muted-foreground animate-spin`}>
        progress_activity
      </span>
      {text && <span className="text-base text-muted-foreground">{text}</span>}
    </div>
  );
}

export function FullPageSpinner({ text = 'Loading...' }: { text?: string }) {
  return (
    <div className="flex-1 flex flex-col items-center justify-center gap-4 min-h-[50vh]">
      <span className="material-symbols-outlined text-5xl text-muted-foreground animate-spin">
        progress_activity
      </span>
      <p className="text-base text-muted-foreground">{text}</p>
    </div>
  );
}
