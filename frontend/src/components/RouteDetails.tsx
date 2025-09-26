import {
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  Grid,
  Typography
} from "@mui/material";
import type { CargoAssignment } from "../api/types";

interface RouteDetailsProps {
  cargoId: string;
  assignment: CargoAssignment;
}

export function RouteDetails({ cargoId, assignment }: RouteDetailsProps) {
  return (
    <Card elevation={3} sx={{ borderRadius: 2 }}>
      <CardHeader
        title={`Route Plan · ${cargoId}`}
        subheader={`${assignment.origin} → ${assignment.destination}`}
        action={<Chip label={assignment.status.toUpperCase()} color="primary" />}
      />
      <Divider />
      <CardContent>
        <Typography variant="subtitle2" sx={{ mb: 2 }}>
          Margin: ₹{assignment.margin.toLocaleString("en-IN")} · Revenue: ₹
          {assignment.revenue_inr.toLocaleString("en-IN")}
        </Typography>
        {assignment.route.length === 0 ? (
          <Typography color="text.secondary">
            No flights assigned. Cargo denied or awaiting reassignment.
          </Typography>
        ) : (
          assignment.route.map((leg, index) => (
            <Grid container spacing={2} key={`${leg.flight_id}-${index}`} sx={{ mb: 2 }}>
              <Grid item xs={12} sm={3}>
                <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                  Leg {index + 1} · {leg.flight_id}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Dwell: {leg.dwell_hours_before.toFixed(1)} hrs
                </Typography>
              </Grid>
              <Grid item xs={12} sm={5}>
                <Typography variant="body2">
                  {leg.origin} → {leg.destination}
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  {new Date(leg.departure).toLocaleString()} → {" "}
                  {new Date(leg.arrival).toLocaleString()}
                </Typography>
              </Grid>
            </Grid>
          ))
        )}
      </CardContent>
    </Card>
  );
}
