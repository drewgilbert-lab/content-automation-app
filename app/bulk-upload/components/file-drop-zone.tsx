"use client";

import { useRef, useState } from "react";

interface FileDropZoneProps {
  onFilesSelected: (files: File[]) => void;
  disabled?: boolean;
  acceptedFormats?: string;
  multiple?: boolean;
}

const DEFAULT_ACCEPT = ".md,.pdf,.docx,.txt";

export function FileDropZone({
  onFilesSelected,
  disabled = false,
  acceptedFormats = DEFAULT_ACCEPT,
  multiple = true,
}: FileDropZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const handleClick = () => {
    if (disabled) return;
    inputRef.current?.click();
  };

  const handleFiles = (files: FileList | null) => {
    if (!files?.length) return;
    onFilesSelected(Array.from(files));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    handleFiles(e.target.files);
    e.target.value = "";
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (disabled) return;
    handleFiles(e.dataTransfer.files);
  };

  const acceptLabel = acceptedFormats.replace(/\./g, "").replace(/,/g, ", ");

  return (
    <div
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      className={`
        flex w-full cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed px-6 py-12
        transition-colors
        ${disabled ? "cursor-not-allowed opacity-50" : ""}
        ${isDragOver ? "border-blue-500 bg-gray-800/50" : "border-gray-700 bg-gray-900/50"}
      `}
    >
      <input
        ref={inputRef}
        type="file"
        multiple={multiple}
        accept={acceptedFormats}
        onChange={handleChange}
        disabled={disabled}
        className="hidden"
      />
      <p className="text-center text-white">Drop files here or click to browse</p>
      <p className="text-sm text-gray-400">Accepted: {acceptLabel}</p>
    </div>
  );
}
