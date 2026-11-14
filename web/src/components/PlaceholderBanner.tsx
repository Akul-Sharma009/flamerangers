import { messages } from "../api/messages";

/** Shown on every view while /meta says placeholder: true. */
export function PlaceholderBanner({ placeholder }: { placeholder: boolean }) {
  if (!placeholder) return null;
  return (
    <div className="banner" role="status">
      {messages.notes.placeholder}
    </div>
  );
}
