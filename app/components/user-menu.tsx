"use client";

import { useSession, signOut } from "next-auth/react";
import { useState, useRef, useEffect } from "react";

export function UserMenu() {
  const { data: session, status } = useSession();
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open]);

  if (status === "loading") {
    return (
      <div className="h-8 w-8 animate-pulse rounded-full bg-gray-800" />
    );
  }

  if (!session?.user) return null;

  const { name, email, image } = session.user;

  return (
    <div ref={menuRef} className="relative">
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-2 rounded-lg px-2 py-1.5 transition-colors hover:bg-gray-800"
      >
        {image ? (
          <img
            src={image}
            alt=""
            className="h-7 w-7 rounded-full"
            referrerPolicy="no-referrer"
          />
        ) : (
          <div className="flex h-7 w-7 items-center justify-center rounded-full bg-blue-600 text-xs font-medium text-white">
            {(name ?? email ?? "?").charAt(0).toUpperCase()}
          </div>
        )}
        <span className="hidden text-sm text-gray-300 sm:block">
          {name ?? email}
        </span>
      </button>

      {open && (
        <div className="absolute right-0 z-50 mt-1 w-56 rounded-lg border border-gray-700 bg-gray-900 py-1 shadow-xl">
          <div className="border-b border-gray-700 px-4 py-2.5">
            {name && (
              <p className="text-sm font-medium text-white">{name}</p>
            )}
            {email && (
              <p className="text-xs text-gray-400">{email}</p>
            )}
          </div>
          <button
            onClick={() => signOut({ callbackUrl: "/auth/signin" })}
            className="w-full px-4 py-2 text-left text-sm text-gray-300 transition-colors hover:bg-gray-800 hover:text-white"
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
