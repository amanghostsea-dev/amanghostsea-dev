export default function Loading() {
  return (
    <div className="p-6 md:p-10 max-w-7xl mx-auto w-full space-y-6 animate-pulse">
      {/* Header skeleton */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="space-y-2">
          <div className="h-8 w-64 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
          <div className="h-4 w-96 max-w-full bg-slate-200 dark:bg-slate-700 rounded-lg"></div>
        </div>
        <div className="h-9 w-40 bg-slate-200 dark:bg-slate-700 rounded-xl"></div>
      </div>

      {/* Hero / Banner skeleton */}
      <div className="h-32 bg-slate-200 dark:bg-slate-700 rounded-3xl w-full"></div>

      {/* Stat cards skeleton */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="h-28 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
        <div className="h-28 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
        <div className="h-28 bg-slate-200 dark:bg-slate-700 rounded-2xl"></div>
      </div>

      {/* Content list / Table skeleton */}
      <div className="h-72 bg-slate-200 dark:bg-slate-700 rounded-3xl w-full"></div>
    </div>
  );
}
