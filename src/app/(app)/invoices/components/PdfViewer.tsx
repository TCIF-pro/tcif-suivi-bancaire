export function PdfViewer({ url, fileName }: { url: string; fileName: string }) {
  return (
    <div className="flex flex-col gap-2">
      <iframe
        src={url}
        title={fileName}
        className="h-[70vh] w-full rounded-xl border border-border bg-surface shadow-card"
      />
      <a
        href={url}
        download={fileName}
        className="self-start text-sm text-muted hover:text-accent"
      >
        Télécharger le PDF
      </a>
    </div>
  );
}
