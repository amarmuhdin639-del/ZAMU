export function SizeGuideTable() {
  const rows = [
    ['XS', '88–92', '71–75', '86–90'],
    ['S', '92–97', '76–81', '91–96'],
    ['M', '97–102', '81–86', '96–101'],
    ['L', '102–107', '86–94', '101–106'],
    ['XL', '107–112', '94–102', '106–111'],
    ['XXL', '112–119', '102–110', '111–116'],
  ]
  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Measurements in centimeters. Our streetwear fits run relaxed — if you are between sizes and want the baggy look, size up.
      </p>
      <div className="overflow-hidden rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-secondary text-left text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
              <th className="px-4 py-2.5">Size</th>
              <th className="px-4 py-2.5">Chest</th>
              <th className="px-4 py-2.5">Waist</th>
              <th className="px-4 py-2.5">Hips</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r[0]} className="border-t border-border">
                <td className="px-4 py-2.5 font-bold">{r[0]}</td>
                <td className="px-4 py-2.5">{r[1]}</td>
                <td className="px-4 py-2.5">{r[2]}</td>
                <td className="px-4 py-2.5">{r[3]}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground">
        Tip: baggy pants and oversized tees are designed to hang loose. Jerseys are true-to-size athletic fit.
      </p>
    </div>
  )
}
