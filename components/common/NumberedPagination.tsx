import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

type PageItem = number | "ellipsis-start" | "ellipsis-end";

type NumberedPaginationProps = {
  currentPage: number;
  totalPages: number;
  createHref: (page: number) => string;
  label?: string;
};

function getPageItems(currentPage: number, totalPages: number): PageItem[] {
  if (totalPages <= 7) {
    return Array.from({ length: totalPages }, (_, index) => index + 1);
  }

  const items: PageItem[] = [1];

  const start = Math.max(currentPage - 1, 2);
  const end = Math.min(currentPage + 1, totalPages - 1);

  if (start > 2) {
    items.push("ellipsis-start");
  }

  for (let page = start; page <= end; page += 1) {
    items.push(page);
  }

  if (end < totalPages - 1) {
    items.push("ellipsis-end");
  }

  items.push(totalPages);

  return items;
}

export function NumberedPagination({
  currentPage,
  totalPages,
  createHref,
  label = "Stránkovanie",
}: NumberedPaginationProps) {
  if (totalPages <= 1) {
    return null;
  }

  const safeCurrentPage = Math.min(Math.max(currentPage, 1), totalPages);
  const items = getPageItems(safeCurrentPage, totalPages);

  return (
    <nav
      aria-label={label}
      className="flex flex-col items-center justify-between gap-3 rounded-2xl border bg-white p-4 sm:flex-row"
    >
      <p className="text-sm text-slate-600">
        Strana {safeCurrentPage} z {totalPages}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {safeCurrentPage > 1 ? (
          <Link
            href={createHref(safeCurrentPage - 1)}
            className="inline-flex min-h-10 items-center gap-1 rounded-xl border px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <ChevronLeft className="size-4" />
            Predchádzajúca
          </Link>
        ) : (
          <span className="inline-flex min-h-10 cursor-not-allowed items-center gap-1 rounded-xl border px-3 py-2 text-sm font-semibold text-slate-400">
            <ChevronLeft className="size-4" />
            Predchádzajúca
          </span>
        )}

        {items.map((item) => {
          if (item === "ellipsis-start" || item === "ellipsis-end") {
            return (
              <span
                key={item}
                className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl px-2 text-sm text-slate-400"
              >
                …
              </span>
            );
          }

          const isActive = item === safeCurrentPage;

          return (
            <Link
              key={item}
              href={createHref(item)}
              aria-current={isActive ? "page" : undefined}
              className={cn(
                "inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl border px-3 py-2 text-sm font-semibold transition",
                isActive
                  ? "border-sky-600 bg-sky-600 text-white"
                  : "border-slate-200 text-slate-700 hover:bg-slate-50"
              )}
            >
              {item}
            </Link>
          );
        })}

        {safeCurrentPage < totalPages ? (
          <Link
            href={createHref(safeCurrentPage + 1)}
            className="inline-flex min-h-10 items-center gap-1 rounded-xl border px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Ďalšia
            <ChevronRight className="size-4" />
          </Link>
        ) : (
          <span className="inline-flex min-h-10 cursor-not-allowed items-center gap-1 rounded-xl border px-3 py-2 text-sm font-semibold text-slate-400">
            Ďalšia
            <ChevronRight className="size-4" />
          </span>
        )}
      </div>
    </nav>
  );
}