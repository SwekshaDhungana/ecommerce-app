const LoadingSpinner = ({ variant = "inline" }) => {
  const wrapperClassName =
    variant === "fullScreen"
      ? "fixed inset-0 z-50 flex items-center justify-center bg-gray-900 text-emerald-400"
      : "flex items-center justify-center py-12 text-gray-300";

  return (
    <div className={wrapperClassName}>
      <div className="relative h-16 w-16">
        <div className="absolute inset-0 rounded-full border-2 border-current opacity-20" />
        <div className="absolute inset-0 animate-spin rounded-full border-2 border-current border-t-transparent" />
        <span className="sr-only">Loading</span>
      </div>
    </div>
  );
};

export default LoadingSpinner;
