import { Card, CardContent, Grid, Typography, Box } from "@mui/material";
import type { PlanSummary } from "../api/types";

interface DashboardCardsProps {
  summary: PlanSummary;
  flightsUsed: number;
  avgWeightUtil: number;
  avgVolumeUtil: number;
}

const formatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

export function DashboardCards({
  summary,
  flightsUsed,
  avgWeightUtil,
  avgVolumeUtil
}: DashboardCardsProps) {
  const cards = [
    {
      label: "Total Margin",
      value: formatter.format(summary.total_margin),
      caption: "Net contribution across delivered cargo",
      background: "#f0fdf4",
      border: "#16a34a",
      textColor: "#166534",
      icon: "💰"
    },
    {
      label: "Flights Utilized",
      value: flightsUsed.toString(),
      caption: "Flights with active cargo assignments",
      background: "#eff6ff",
      border: "#2563eb",
      textColor: "#1e3a8a",
      icon: "✈️"
    },
    {
      label: "Avg Weight Util",
      value: `${avgWeightUtil.toFixed(1)}%`,
      caption: "Average weight capacity consumption",
      background: "#fffbeb",
      border: "#d97706",
      textColor: "#92400e",
      icon: "⚖️"
    },
    {
      label: "Avg Volume Util",
      value: `${avgVolumeUtil.toFixed(1)}%`,
      caption: "Average volume capacity consumption",
      background: "#fef2f2",
      border: "#dc2626",
      textColor: "#991b1b",
      icon: "📦"
    },
    {
      label: "Cargo Status",
      value: `${summary.delivered} / ${summary.rolled + summary.denied}`,
      caption: "Approved / Rolled out",
      background: "#faf5ff",
      border: "#7c3aed",
      textColor: "#581c87",
      icon: "📊",
      isStatus: true
    }
  ];

  return (
    <Grid container spacing={3} sx={{ mb: 4 }}>
      {cards.map((card) => (
        <Grid item xs={12} sm={6} md={4} lg={2.4} xl={2.4} key={card.label}>
          <Card
            elevation={3}
            sx={{
              borderRadius: 4,
              height: "100%",
              background: card.background,
              color: card.textColor,
              position: "relative",
              overflow: "hidden",
              transition: "all 0.2s ease-in-out",
              display: "flex",
              flexDirection: "column",
              border: `2px solid ${card.border}`,
              "&:hover": {
                transform: "translateY(-4px)",
                boxShadow: `0 20px 25px -5px ${card.border}20, 0 10px 10px -5px ${card.border}10`,
                border: `2px solid ${card.border}dd`
              }
            }}
          >
            <CardContent sx={{
              position: "relative",
              zIndex: 1,
              display: "flex",
              flexDirection: "column",
              flex: 1,
              justifyContent: "space-between",
              p: 3
            }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "space-between", mb: 2 }}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600, fontSize: "0.875rem", color: card.textColor }}>
                  {card.label}
                </Typography>
                <Typography variant="h4" sx={{ fontSize: "1.5rem", color: card.textColor }}>
                  {card.icon}
                </Typography>
              </Box>

              <Box sx={{ flex: 1, display: "flex", flexDirection: "column", justifyContent: "center" }}>
                <Typography
                  variant="h4"
                  sx={{
                    mb: 1,
                    fontWeight: 700,
                    fontSize: "1.75rem",
                    color: card.textColor
                  }}
                >
                  {card.value}
                </Typography>
                <Typography
                  variant="caption"
                  sx={{
                    lineHeight: 1.4,
                    fontSize: "0.75rem",
                    color: card.textColor,
                    opacity: 0.8
                  }}
                >
                  {card.caption}
                </Typography>
              </Box>

              {card.isStatus && (
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mt: 2 }}>
                  <Box sx={{
                    bgcolor: "rgba(255, 255, 255, 0.8)",
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 2,
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    color: card.textColor,
                    border: `1px solid ${card.border}40`
                  }}>
                    ✓ {summary.delivered}
                  </Box>
                  <Box sx={{
                    bgcolor: "rgba(255, 255, 255, 0.8)",
                    px: 1.5,
                    py: 0.5,
                    borderRadius: 2,
                    fontSize: "0.7rem",
                    fontWeight: 600,
                    color: card.textColor,
                    border: `1px solid ${card.border}40`
                  }}>
                    ⟳ {summary.rolled + summary.denied}
                  </Box>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
}
