"use client";

import { useRef, useState } from "react";
import { Loader2, Paperclip, X } from "lucide-react";

interface FileUploadProps {
  label?: string;
  scope: "materials" | "submissions";
  value: string;
  onChange: (fileUrl: string) => void;
  disabled?: boolean;
}

export default function FileUpload({
  label = "Unggah Berkas",
  scope,
  value,
  onChange,
  disabled = false,
}: FileUploadProps) {
  const [error, setError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const startUpload = async (file: File) => {
    setError(null);
    setIsUploading(true);

    try {
      const body = new FormData();
      body.append("file", file);
      body.append("scope", scope);

      const response = await fetch("/api/upload", {
        method: "POST",
        body,
      });

      const json = (await response.json()) as { fileUrl?: string; error?: string };
      if (!response.ok || !json.fileUrl) {
        throw new Error(json.error || "Unggah gagal.");
      }

      onChange(json.fileUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unggah gagal.");
    } finally {
      setIsUploading(false);
      if (inputRef.current) {
        inputRef.current.value = "";
      }
    }
  };

  return (
    <div className="space-y-2">
      <label className="mb-1 block text-sm font-medium text-slate-700 dark:text-slate-200">{label}</label>
      <div className="flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept=".pdf,.doc,.docx,.txt"
          disabled={disabled || isUploading}
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (!file) return;
            void startUpload(file);
          }}
          className="block w-full max-w-sm text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-blue-600 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-blue-700 dark:text-slate-300"
        />
        {isUploading && (
          <span className="inline-flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            Sedang mengunggah...
          </span>
        )}
      </div>

      {value && (
        <div className="flex items-center gap-2 rounded-lg bg-slate-50 px-3 py-2 text-sm dark:bg-slate-900">
          <Paperclip className="h-4 w-4 text-slate-500" />
          <span className="truncate text-slate-700 dark:text-slate-200">{value}</span>
          <button
            type="button"
            onClick={() => onChange("")}
            className="ml-auto rounded-md p-1 text-slate-500 hover:bg-slate-200 dark:hover:bg-slate-700"
            aria-label="Hapus file"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      )}

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700 dark:border-red-900/40 dark:bg-red-900/20 dark:text-red-300">
          {error}
        </p>
      )}
    </div>
  );
}
