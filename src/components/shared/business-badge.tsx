import { Badge } from "@/components/ui/badge";

interface BusinessBadgeProps {
  business: string | null;
}

export function BusinessBadge({ business }: BusinessBadgeProps) {
  // null means shared (no specific brand assigned)
  if (!business || business === "shared") {
    return (
      <>
        <Badge className="bg-arcys-50 text-arcys-700 hover:bg-arcys-50">{"Arcy's"}</Badge>
        <Badge className="bg-bale-50 text-bale-700 hover:bg-bale-50">Bale</Badge>
      </>
    );
  }
  const isArcys = business === "arcys";
  return (
    <Badge
      className={
        isArcys
          ? "bg-arcys-50 text-arcys-700 hover:bg-arcys-50"
          : "bg-bale-50 text-bale-700 hover:bg-bale-50"
      }
    >
      {isArcys ? "Arcy's" : "Bale"}
    </Badge>
  );
}
