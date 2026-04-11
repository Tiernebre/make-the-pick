import { useEffect } from "react";

const BASE_TITLE = "Make The Pick";

export function usePageTitle(title: string | undefined): void {
  useEffect(() => {
    if (!title) return;
    const previous = document.title;
    document.title = `${title} · ${BASE_TITLE}`;
    return () => {
      document.title = previous;
    };
  }, [title]);
}
