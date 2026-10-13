// The venue's 3D character. While it talks it stays still (no dancing): a soft glow and sound waves by its head show that it is speaking.
export function TalkingMascot({ src, speaking, className = "", height }: { src: string; speaking: boolean; className?: string; /** height in pixels (when not given by the class) */ height?: number }) {
  return (
    <span className="relative inline-flex shrink-0 self-end">
      <img src={src} alt="" decoding="async" style={height ? { height, width: "auto" } : undefined} className={`${className} object-contain drop-shadow-2xl ${speaking ? "mascot-talk" : "mascot-idle"}`} />
      {speaking && (
        <span className="mascot-waves" aria-hidden="true">
          <i /><i /><i /><i />
        </span>
      )}
    </span>
  );
}
