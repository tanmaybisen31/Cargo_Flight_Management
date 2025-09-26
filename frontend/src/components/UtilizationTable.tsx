import {
  Box,
  Card,
  CardContent,
  CardHeader,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography
} from "@mui/material";
import type { FlightAssignment } from "../api/types";

interface UtilizationTableProps {
  flights: Record<string, FlightAssignment>;
}

function UtilizationBar({ value }: { value: number }) {
  return (
    <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
      <Box sx={{ flex: 1 }}>
        <LinearProgress
          variant="determinate"
          value={Math.min(100, value)}
          sx={{ height: 8, borderRadius: 6, bgcolor: "grey.200" }}
        />
      </Box>
      <Typography variant="caption" sx={{ width: 48, textAlign: "right" }}>
        {value.toFixed(1)}%
      </Typography>
    </Box>
  );
}

export function UtilizationTable({ flights }: UtilizationTableProps) {
  const rows = Object.entries(flights).map(([flightId, flight]) => {
    const totalWeight = flight.assigned.reduce((sum, cargo) => sum + cargo.weight_kg, 0);
    const totalVolume = flight.assigned.reduce((sum, cargo) => sum + cargo.volume_m3, 0);
    const weightUtil = (totalWeight / flight.weight_capacity_kg) * 100;
    const volumeUtil = (totalVolume / flight.volume_capacity_m3) * 100;
    const bottleneck = weightUtil >= volumeUtil ? "Weight" : "Volume";

    return {
      flightId,
      ...flight,
      totalWeight,
      totalVolume,
      weightUtil,
      volumeUtil,
      bottleneck
    };
  });

  return (
    <Card
      elevation={4}
      sx={{
        borderRadius: 3,
        background: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(10px)"
      }}
    >
      <CardHeader
        title={
          <Typography variant="h6" sx={{ fontWeight: 700, color: "#647FBC" }}>
            Flight Capacity Overview
          </Typography>
        }
        subheader={
          <Typography variant="body2" sx={{ color: "#666" }}>
            Weight and volume utilization across active flights
          </Typography>
        }
        sx={{ pb: 2 }}
      />
      <CardContent sx={{ p: 0 }}>
        <Table size="small">
          <TableHead>
            <TableRow sx={{ backgroundColor: "#f8f9fa" }}>
              <TableCell sx={{ fontWeight: 600, color: "#647FBC" }}>Flight</TableCell>
              <TableCell sx={{ fontWeight: 600, color: "#647FBC" }}>Schedule</TableCell>
              <TableCell sx={{ fontWeight: 600, color: "#647FBC" }}>Assignments</TableCell>
              <TableCell sx={{ fontWeight: 600, color: "#647FBC" }}>Weight Utilisation</TableCell>
              <TableCell sx={{ fontWeight: 600, color: "#647FBC" }}>Volume Utilisation</TableCell>
              <TableCell align="right" sx={{ fontWeight: 600, color: "#647FBC" }}>Bottleneck</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.flightId}
                hover
                sx={{
                  "&:hover": {
                    backgroundColor: "rgba(100, 127, 188, 0.08)"
                  }
                }}
              >
                <TableCell>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600, color: "#333" }}>
                    {row.flightId}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "#666" }}>
                    {row.origin} → {row.destination}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">
                    {new Date(row.departure).toLocaleString()} →
                  </Typography>
                  <Typography variant="body2">
                    {new Date(row.arrival).toLocaleString()}
                  </Typography>
                </TableCell>
                <TableCell>
                  <Typography variant="body2">{row.assigned.length} cargo</Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {row.totalWeight.toLocaleString()} kg · {row.totalVolume.toFixed(1)} m³
                  </Typography>
                </TableCell>
                <TableCell>
                  <UtilizationBar value={row.weightUtil} />
                </TableCell>
                <TableCell>
                  <UtilizationBar value={row.volumeUtil} />
                </TableCell>
                <TableCell align="right">
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {row.bottleneck}
                  </Typography>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
