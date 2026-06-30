"use client";
import { useEffect } from "react";

export default function ErrorBoundary({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global Error Caught:", error);
  }, [error]);

  return (
    <div className="p-10">
      <h2 className="text-red-500 text-2xl font-bold">Something went wrong!</h2>
      <pre className="mt-4 p-4 bg-gray-100 text-red-700 whitespace-pre-wrap text-sm border">
        {error.message}
        {"\n\n"}
        {error.stack}
      </pre>
      <button
        className="mt-4 px-4 py-2 bg-black text-white rounded"
        onClick={() => reset()}
      >
        Try again
      </button>
    </div>
  );
}
