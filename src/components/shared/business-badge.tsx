import { Badge } from "@/components/ui/badge";

interface BusinessBadgeProps {
  business: string | null;
}

export function BusinessBadge({ business }: BusinessBadgeProps) {
  // null means shared (no specific brand assigned)
  if (!business || business === "shared") {
    return (
      <>
        <Badge className="bg-brand-a-50 text-brand-a-700 hover:bg-brand-a-50">Brand A</Badge>
        <Badge className="bg-brand-b-50 text-brand-b-700 hover:bg-brand-b-50">Brand B</Badge>
      </>
    );
  }
  const isBrandA = business === "business_a";
  return (
    <Badge
      className={
        isBrandA
          ? "bg-brand-a-50 text-brand-a-700 hover:bg-brand-a-50"
          : "bg-brand-b-50 text-brand-b-700 hover:bg-brand-b-50"
      }
    >
      {isBrandA ? "Brand A" : "Brand B"}
    </Badge>
  );
}
