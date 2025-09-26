import {
  Avatar,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Divider,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Typography
} from "@mui/material";
import WarningAmberIcon from "@mui/icons-material/WarningAmber";
import InfoIcon from "@mui/icons-material/Info";
import ErrorOutlineIcon from "@mui/icons-material/ErrorOutline";
import type { AlertPayload } from "../api/types";

interface AlertsPanelProps {
  alerts: AlertPayload[];
}

const iconBySeverity = {
  info: <InfoIcon color="info" />,
  warning: <WarningAmberIcon color="warning" />,
  critical: <ErrorOutlineIcon color="error" />
};

export function AlertsPanel({ alerts }: AlertsPanelProps) {
  return (
    <Card elevation={3} sx={{ borderRadius: 2, height: "100%" }}>
      <CardHeader
        title="Operational Alerts"
        subheader={`Active notifications: ${alerts.length}`}
      />
      <Divider />
      <CardContent sx={{ p: 0 }}>
        {alerts.length === 0 ? (
          <Typography sx={{ p: 3 }} color="text.secondary">
            No alerts raised for this scenario.
          </Typography>
        ) : (
          <List>
            {alerts.map((alert, index) => (
              <ListItem key={`${alert.type}-${index}`} alignItems="flex-start">
                <ListItemAvatar>
                  <Avatar sx={{ bgcolor: "transparent" }}>
                    {iconBySeverity[alert.severity]}
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={
                    <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                      {alert.message}
                    </Typography>
                  }
                  secondary={
                    <Typography variant="caption" sx={{ color: "text.secondary" }}>
                      {alert.cargo_id ? `Cargo: ${alert.cargo_id} · ` : ""}
                      {alert.flight_id ? `Flight: ${alert.flight_id} · ` : ""}
                      {alert.status ? `Status: ${alert.status}` : ""}
                      {alert.margin_delta ? ` · Δ ₹${alert.margin_delta.toFixed(0)}` : ""}
                    </Typography>
                  }
                />
                <Chip
                  label={alert.severity.toUpperCase()}
                  size="small"
                  color={alert.severity === "critical" ? "error" : alert.severity === "warning" ? "warning" : "info"}
                  variant="outlined"
                />
              </ListItem>
            ))}
          </List>
        )}
      </CardContent>
    </Card>
  );
}
