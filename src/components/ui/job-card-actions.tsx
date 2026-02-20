"use client";

import { useState, useRef, useEffect } from "react";
import Link from "next/link";
import { uiText } from "@/content/ui-text";

export function JobCardActions({ jobId }: { jobId: string }) {
    const [open, setOpen] = useState(false);
    const ref = useRef<HTMLDivElement>(null);

    // Close on outside click
    useEffect(() => {
        if (!open) return;
        function handle(e: MouseEvent) {
            if (ref.current && !ref.current.contains(e.target as Node)) {
                setOpen(false);
            }
        }
        document.addEventListener("mousedown", handle);
        return () => document.removeEventListener("mousedown", handle);
    }, [open]);

    return (
        <>
            {/* Mobile: ⋮ button + dropdown */}
            <div ref={ref} className="absolute top-2 right-2 sm:hidden">
                <button
                    type="button"
                    aria-label="More actions"
                    aria-expanded={open}
                    onClick={() => setOpen((v) => !v)}
                    className="flex h-7 w-7 items-center justify-center rounded-md border border-zinc-200 bg-zinc-50 text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors text-base leading-none"
                >
                    ⋮
                </button>
                {open && (
                    <div className="absolute right-0 top-full mt-1 z-10 min-w-[96px] overflow-hidden rounded-lg border border-zinc-200 bg-white shadow-md">
                        <Link
                            href={`/jobs/${jobId}/edit`}
                            className="flex items-center px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
                            onClick={() => setOpen(false)}
                        >
                            {uiText.dashboard.actions.edit}
                        </Link>
                        <div className="h-px bg-zinc-100" />
                        <Link
                            href={`/jobs/${jobId}/history`}
                            className="flex items-center px-3 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-50 hover:text-zinc-900 transition-colors"
                            onClick={() => setOpen(false)}
                        >
                            {uiText.dashboard.actions.history}
                        </Link>
                    </div>
                )}
            </div>

            {/* Desktop: inline button row (vertically centered by parent flex card) */}
            <div className="hidden sm:flex shrink-0 items-center gap-0.5 rounded-md border border-zinc-200 bg-zinc-50 p-0.5">
                <Link
                    href={`/jobs/${jobId}/edit`}
                    className="inline-flex items-center justify-center rounded px-2 py-1 text-[11px] font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
                >
                    {uiText.dashboard.actions.edit}
                </Link>
                <span className="h-3 w-px bg-zinc-200" aria-hidden="true" />
                <Link
                    href={`/jobs/${jobId}/history`}
                    className="inline-flex items-center justify-center rounded px-2 py-1 text-[11px] font-medium text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 transition-colors"
                >
                    {uiText.dashboard.actions.history}
                </Link>
            </div>
        </>
    );
}
