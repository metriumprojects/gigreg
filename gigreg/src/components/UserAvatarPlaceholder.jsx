export default function UserAvatarPlaceholder({
  className = "w-full h-full text-[#1A2B49]",
  strokeWidth = 1.5,
  fill = "white",
  ...props
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={fill}
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      {...props}
    >
      <circle cx="12" cy="6.5" r="4.5" vectorEffect="non-scaling-stroke" />
      <rect x="2" y="14" width="20" height="8" rx="4" vectorEffect="non-scaling-stroke" />
    </svg>
  );
}
