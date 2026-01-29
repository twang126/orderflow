"use client"

import { Inter } from "next/font/google"

const inter = Inter({ subsets: ["latin"] })

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <div className="flex flex-col items-center justify-center min-h-screen gap-4">
          <h2 className="text-xl font-semibold">Something went wrong!</h2>
          <p className="text-gray-500">{error.message}</p>
          <button
            onClick={() => reset()}
            className="px-4 py-2 bg-black text-white rounded-md hover:bg-gray-800"
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  )
}
