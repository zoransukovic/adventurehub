"use client";
export default function StarRating({ value, onChange, size="md" }: { value: number; onChange?: (v:number)=>void; size?: "sm"|"md"|"lg" }) {
  const s = { sm:"text-base", md:"text-2xl", lg:"text-4xl" }[size];
  return (
    <div className="flex gap-1">
      {[1,2,3,4,5].map(i => (
        <button key={i} type="button" onClick={() => onChange?.(i)} className={`${s} leading-none ${onChange ? "cursor-pointer" : "cursor-default"} ${i <= value ? "text-amber-400" : "text-gray-200"}`}>★</button>
      ))}
    </div>
  );
}
