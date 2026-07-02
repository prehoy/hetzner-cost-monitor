import Chart from "react-apexcharts";
import type { ApexOptions } from "apexcharts";

type Series = { key: string; points: { at: number; cost: number }[] };

const readVar = (name: string) =>
  getComputedStyle(document.documentElement).getPropertyValue(name).trim();

// Stacked columns of accrued spend per hour, grouped by the chosen dimension.
// Columns (not area) because Hetzner billing is discrete per-hour. Apex writes
// concrete SVG attrs, so CSS vars are resolved to hex here (house ChartUsage
// gotcha). Remounted on theme change via the `resolved` key in the parent.
export function CostChart({
  series,
  resolved,
  vatMultiplier,
}: {
  series: Series[];
  resolved: "light" | "dark";
  vatMultiplier: number;
}) {
  const palette = ["--c1", "--c2", "--c3", "--c4", "--c5", "--c6", "--c7"].map(readVar);
  const apexSeries = series.map((s) => ({
    name: s.key,
    data: s.points.map((p) => [p.at, +(p.cost * vatMultiplier).toFixed(5)] as [number, number]),
  }));

  const options: ApexOptions = {
    chart: {
      type: "bar",
      stacked: true,
      height: 300,
      background: "transparent",
      toolbar: { show: false },
      animations: { enabled: false },
      fontFamily: "Inter, sans-serif",
    },
    theme: { mode: resolved },
    colors: palette,
    dataLabels: { enabled: false },
    plotOptions: { bar: { columnWidth: "70%" } },
    stroke: { width: 0 },
    grid: { borderColor: readVar("--grid"), strokeDashArray: 3 },
    xaxis: {
      type: "datetime",
      axisBorder: { show: false },
      axisTicks: { show: false },
      labels: { style: { colors: readVar("--muted") } },
    },
    yaxis: {
      labels: {
        style: { colors: readVar("--muted") },
        formatter: (v) => "€" + v.toFixed(2),
      },
    },
    legend: { position: "top", horizontalAlign: "left", labels: { colors: readVar("--muted") } },
    tooltip: { theme: resolved, x: { format: "dd MMM HH:mm" } },
  };

  return <Chart key={resolved} options={options} series={apexSeries} type="bar" height={300} />;
}
