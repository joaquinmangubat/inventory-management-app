import { Badge } from "@/components/ui/badge";

interface BusinessBadgeProps {
  business: string | null;
}

export function BusinessBadge({ business }: BusinessBadgeProps) {
  // null means shared (no specific brand assigned)
  if (!business || business === "shared") {
    return (
      <>
        <Badge className="bg-arcys-50 text-arcys-700 hover:bg-arcys-50">{"Brand A"}</Badge>
        <Badge className="bg-green-50 text-green-700 hover:bg-green-50">Brand B</Badge>
      </>
    );
  }
  const isBrandA = business === "arcys";
  return (
    <Badge
      className={
        isBrandA
          ? "bg-arcys-50 text-arcys-700 hover:bg-arcys-50"
          : "bg-bale-50 text-bale-700 hover:bg-bale-50"
      }
    >
      {isBrandA ? "Brand A" : "Brand B"}
    </Badge>
  );
}
