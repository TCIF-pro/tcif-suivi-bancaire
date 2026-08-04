export function PdfViewer({ url, fileName }: { url: string; fileName: string }) {
  return (
    <div className="flex flex-col gap-2">
      <iframe
        src={url}
        title={fileName}
        className="h-[70vh] w-full rounded-lg border border-foreground/10 bg-foreground/[0.03]"
      />
      <a
        href={url}
        download={fileName}
        className="self-start text-sm text-foreground/60 hover:text-accent"
      >
        Télécharger le PDF
      </a>
    </div>
  );
}
