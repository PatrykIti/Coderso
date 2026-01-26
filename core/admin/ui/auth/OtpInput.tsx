import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

type OtpInputProps = {
  length?: number;
  groupSize?: number;
  className?: string;
};

export function OtpInput({
  length = 6,
  groupSize = 3,
  className,
}: OtpInputProps) {
  const inputs = Array.from({ length }, (_, index) => index);
  return (
    <div className={cn("flex items-center justify-center gap-2", className)}>
      {inputs.map((index) => {
        const showDivider =
          groupSize > 0 && (index + 1) % groupSize === 0 && index < length - 1;
        return (
          <div key={index} className="flex items-center gap-2">
            <Input
              inputMode="numeric"
              maxLength={1}
              pattern="[0-9]*"
              className="h-12 w-10 text-center text-lg font-semibold"
              aria-label={`Digit ${index + 1}`}
            />
            {showDivider ? (
              <span className="text-muted-foreground">-</span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}
