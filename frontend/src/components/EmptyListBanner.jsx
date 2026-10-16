export default function EmptyListBanner({ title, description, children }) {
  return (
    <div className="mb-4 rounded-lg border border-dashed bg-muted/40 px-4 py-6 text-center">
      <p className="text-sm font-medium text-foreground">{title}</p>
      {description && (
        <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      )}
      {children && <div className="mt-4 flex flex-wrap justify-center gap-2">{children}</div>}
    </div>
  );
}
