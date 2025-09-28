import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Typography,
  Chip,
  Alert
} from "@mui/material";
import type { PlanResponse, FlightCargoSummary } from "../api/types";

interface DisruptionImpactProps {
  originalData: PlanResponse;
  disruptedData: PlanResponse;
}

function getRemovedAssignments(original: Record<string, FlightCargoSummary[]>, disrupted: Record<string, FlightCargoSummary[]>) {
  const removed: { flightId: string; cargo: FlightCargoSummary }[] = [];

  for (const [flightId, origAssigned] of Object.entries(original)) {
    const disruptedAssigned = disrupted[flightId] || [];
    const origCargoIds = new Set(origAssigned.map(c => c.cargo_id));
    const disruptedCargoIds = new Set(disruptedAssigned.map(c => c.cargo_id));

    for (const cargo of origAssigned) {
      if (!disruptedCargoIds.has(cargo.cargo_id)) {
        removed.push({ flightId, cargo });
      }
    }
  }

  return removed;
}

const formatter = new Intl.NumberFormat("en-IN", {
  style: "currency",
  currency: "INR",
  maximumFractionDigits: 0
});

export function DisruptionImpact({ originalData, disruptedData }: DisruptionImpactProps) {
  const marginDelta = disruptedData.summary.total_margin - originalData.summary.total_margin;
  const deliveredDelta = disruptedData.summary.delivered - originalData.summary.delivered;
  const rolledDelta = disruptedData.summary.rolled - originalData.summary.rolled;
  const deniedDelta = disruptedData.summary.denied - originalData.summary.denied;

  const removedAssignments = getRemovedAssignments(
    Object.fromEntries(Object.entries(originalData.flights).map(([id, f]) => [id, f.assigned])),
    Object.fromEntries(Object.entries(disruptedData.flights).map(([id, f]) => [id, f.assigned]))
  );

  return (
    <Box sx={{ display: "flex", flexDirection: "column", gap: 3 }}>
      {/* Impact Summary */}
      <Card elevation={4} sx={{
        borderRadius: 3,
        background: "rgba(255, 255, 255, 0.95)",
        backdropFilter: "blur(10px)"
      }}>
        <CardHeader
          title={
            <Typography variant="h6" sx={{ fontWeight: 700, color: "#647FBC" }}>
              Disruption Impact Summary
            </Typography>
          }
          subheader={
            <Typography variant="body2" sx={{ color: "#666" }}>
              Changes caused by the applied disruptions
            </Typography>
          }
          sx={{ pb: 2 }}
        />
        <CardContent>
          <Box sx={{ display: "flex", flexWrap: "wrap", gap: 2 }}>
            <Chip
              label={`Margin: ${formatter.format(marginDelta)}`}
              color={marginDelta < 0 ? "error" : "success"}
              variant="outlined"
            />
            <Chip
              label={`Delivered: ${deliveredDelta}`}
              color={deliveredDelta < 0 ? "error" : "success"}
              variant="outlined"
            />
            <Chip
              label={`Rolled: ${rolledDelta}`}
              color={rolledDelta > 0 ? "warning" : "default"}
              variant="outlined"
            />
            <Chip
              label={`Denied: ${deniedDelta}`}
              color={deniedDelta > 0 ? "error" : "default"}
              variant="outlined"
            />
          </Box>
        </CardContent>
      </Card>

      {/* Removed Assignments */}
      {removedAssignments.length > 0 && (
        <Card elevation={4} sx={{
          borderRadius: 3,
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(10px)"
        }}>
          <CardHeader
            title={
              <Typography variant="h6" sx={{ fontWeight: 700, color: "#647FBC" }}>
                Removed Assignments
              </Typography>
            }
            subheader={
              <Typography variant="body2" sx={{ color: "#666" }}>
                Cargo that were unassigned due to disruptions
              </Typography>
            }
            sx={{ pb: 2 }}
          />
          <CardContent sx={{ p: 0 }}>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Flight</TableCell>
                  <TableCell>Cargo ID</TableCell>
                  <TableCell>Weight (kg)</TableCell>
                  <TableCell>Volume (m³)</TableCell>
                  <TableCell>Revenue</TableCell>
                  <TableCell>Priority</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {removedAssignments.map(({ flightId, cargo }, index) => (
                  <TableRow key={`${flightId}-${cargo.cargo_id}-${index}`} hover>
                    <TableCell>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {flightId}
                      </Typography>
                    </TableCell>
                    <TableCell>{cargo.cargo_id}</TableCell>
                    <TableCell>{cargo.weight_kg.toLocaleString()}</TableCell>
                    <TableCell>{cargo.volume_m3.toFixed(1)}</TableCell>
                    <TableCell>{formatter.format(cargo.revenue)}</TableCell>
                    <TableCell>
                      <Chip
                        label={cargo.priority}
                        size="small"
                        color={cargo.priority === "high" ? "error" : cargo.priority === "medium" ? "warning" : "default"}
                      />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Alerts */}
      {disruptedData.alerts.length > 0 && (
        <Card elevation={4} sx={{
          borderRadius: 3,
          background: "rgba(255, 255, 255, 0.95)",
          backdropFilter: "blur(10px)"
        }}>
          <CardHeader
            title={
              <Typography variant="h6" sx={{ fontWeight: 700, color: "#647FBC" }}>
                Alerts
              </Typography>
            }
            subheader={
              <Typography variant="body2" sx={{ color: "#666" }}>
                System alerts generated by the disruptions
              </Typography>
            }
            sx={{ pb: 2 }}
          />
          <CardContent>
            <Box sx={{ display: "flex", flexDirection: "column", gap: 1 }}>
              {disruptedData.alerts.map((alert, index) => (
                <Alert
                  key={index}
                  severity={alert.severity === "critical" ? "error" : alert.severity}
                  sx={{ mb: 1 }}
                >
                  <Typography variant="body2">
                    <strong>{alert.type}:</strong> {alert.message}
                    {alert.cargo_id && ` (Cargo: ${alert.cargo_id})`}
                    {alert.flight_id && ` (Flight: ${alert.flight_id})`}
                    {alert.margin_delta && ` (Margin Δ: ${formatter.format(alert.margin_delta)})`}
                  </Typography>
                </Alert>
              ))}
            </Box>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}