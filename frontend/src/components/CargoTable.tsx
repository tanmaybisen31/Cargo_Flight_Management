import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography
} from "@mui/material";
import type { CargoAssignment } from "../api/types";

interface CargoTableProps {
  cargo: Record<string, CargoAssignment>;
  onSelect: (cargoId: string) => void;
  selected: string;
}

const statusColors: Record<string, "success" | "warning" | "default" | "error"> = {
  delivered: "success",
  rolled: "warning",
  denied: "error"
};

export function CargoTable({ cargo, onSelect, selected }: CargoTableProps) {
  const rows = Object.entries(cargo)
    .map(([cargoId, assignment]) => ({ cargoId, ...assignment }))
    .sort((a, b) => b.revenue_inr - a.revenue_inr);

  return (
    <Card elevation={3} sx={{
      borderRadius: 3,
      background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
      border: "1px solid #e2e8f0",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
    }}>
      <CardHeader
        title="Cargo Portfolio"
        subheader="Revenue density and fulfilment status"
        sx={{
          background: "linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)",
          borderBottom: "1px solid #cbd5e1",
          "& .MuiCardHeader-title": {
            color: "#1e293b",
            fontWeight: 600
          },
          "& .MuiCardHeader-subheader": {
            color: "#64748b"
          }
        }}
      />
      <CardContent sx={{ p: 0 }}>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Cargo</TableCell>
              <TableCell>Route</TableCell>
              <TableCell>Assigned Flights</TableCell>
              <TableCell>Priority</TableCell>
              <TableCell align="right">Revenue (₹)</TableCell>
              <TableCell align="right">Margin (₹)</TableCell>
              <TableCell>Status</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((row) => (
              <TableRow
                key={row.cargoId}
                hover
                selected={row.cargoId === selected}
                onClick={() => onSelect(row.cargoId)}
                sx={{ cursor: "pointer" }}
              >
                <TableCell>
                  <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                    {row.cargoId}
                  </Typography>
                  <Typography variant="caption" sx={{ color: "text.secondary" }}>
                    {row.weight_kg.toLocaleString()} kg · {row.volume_m3.toFixed(1)} m³
                  </Typography>
                </TableCell>
                <TableCell>
                  {row.origin} → {row.destination}
                </TableCell>
                <TableCell>
                  {row.route && row.route.length > 0 ? (
                    <Box>
                      {row.route.map((leg, index) => (
                        <Typography key={index} variant="body2" sx={{ fontFamily: 'monospace' }}>
                          {leg.flight_id}
                          {index < row.route.length - 1 && " → "}
                        </Typography>
                      ))}
                    </Box>
                  ) : (
                    <Typography variant="body2" sx={{ color: "text.secondary", fontStyle: "italic" }}>
                      {row.status === "denied" ? "Not assigned" : "No flights"}
                    </Typography>
                  )}
                </TableCell>
                <TableCell>
                  <Chip label={row.priority} size="small" color="primary" variant="outlined" />
                </TableCell>
                <TableCell align="right">
                  {row.revenue_inr.toLocaleString("en-IN")}
                </TableCell>
                <TableCell align="right">
                  {row.margin.toLocaleString("en-IN")}
                </TableCell>
                <TableCell>
                  <Chip
                    label={
                      row.status === 'delivered'
                        ? 'APPROVED'
                        : row.status === 'denied'
                          ? 'ROLLED OUT'
                          : 'ROLLED'
                    }
                    size="small"
                    color={statusColors[row.status] ?? "default"}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
