import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Divider,
  FormControl,
  InputLabel,
  MenuItem,
  Select,
  SelectChangeEvent,
  Slider,
  Stack,
  TextField,
  Typography
} from "@mui/material";
import { useState } from "react";
import type { DisruptionRequest } from "../api/types";

interface DisruptionFormProps {
  flights: string[];
  onRun: (events: DisruptionRequest[]) => void;
  loading: boolean;
}

export function DisruptionForm({ flights, onRun, loading }: DisruptionFormProps) {
  const [delayFlight, setDelayFlight] = useState("None");
  const [delayMinutes, setDelayMinutes] = useState(0);
  const [cancelFlights, setCancelFlights] = useState<string[]>([]);
  const [swapFlight, setSwapFlight] = useState("None");
  const [swapWeight, setSwapWeight] = useState<string>("");
  const [swapVolume, setSwapVolume] = useState<string>("");

  const handleSubmit = () => {
    const events: DisruptionRequest[] = [];
    if (delayFlight !== "None" && delayMinutes > 0) {
      events.push({
        event_type: "delay",
        flight_id: delayFlight,
        delay_minutes: delayMinutes
      });
    }
    cancelFlights.forEach((flight) =>
      events.push({
        event_type: "cancel",
        flight_id: flight
      })
    );
    if (swapFlight !== "None" && (swapWeight || swapVolume)) {
      events.push({
        event_type: "swap",
        flight_id: swapFlight,
        new_weight_capacity_kg: swapWeight ? Number(swapWeight) : undefined,
        new_volume_capacity_m3: swapVolume ? Number(swapVolume) : undefined
      });
    }
    onRun(events);
  };

  const handleCancelSelect = (event: SelectChangeEvent<string[]>) => {
    const value = event.target.value;
    setCancelFlights(typeof value === "string" ? value.split(",") : value);
  };

  return (
    <Card elevation={3} sx={{ borderRadius: 2 }}>
      <CardHeader
        title="What-if Scenario"
        subheader="Model delays, cancellations, and aircraft swaps"
      />
      <Divider />
      <CardContent>
        <Stack spacing={3}>
          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <FormControl fullWidth>
              <InputLabel>Delay flight</InputLabel>
              <Select
                label="Delay flight"
                value={delayFlight}
                onChange={(event) => setDelayFlight(event.target.value)}
              >
                <MenuItem value="None">None</MenuItem>
                {flights.map((flight) => (
                  <MenuItem value={flight} key={flight}>
                    {flight}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <Box sx={{ flex: 1 }}>
              <Typography variant="caption" sx={{ color: "text.secondary" }}>
                Delay (minutes)
              </Typography>
              <Slider
                value={delayMinutes}
                onChange={(_, value) => setDelayMinutes(value as number)}
                valueLabelDisplay="auto"
                step={15}
                marks
                min={0}
                max={360}
              />
            </Box>
          </Stack>

          <FormControl fullWidth>
            <InputLabel>Cancel flights</InputLabel>
            <Select
              label="Cancel flights"
              value={cancelFlights}
              multiple
              renderValue={(selected) => selected.join(", ") || "None"}
              onChange={handleCancelSelect}
            >
              {flights.map((flight) => (
                <MenuItem value={flight} key={flight}>
                  {flight}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Stack direction={{ xs: "column", sm: "row" }} spacing={2}>
            <FormControl fullWidth>
              <InputLabel>Swap aircraft</InputLabel>
              <Select
                label="Swap aircraft"
                value={swapFlight}
                onChange={(event) => setSwapFlight(event.target.value)}
              >
                <MenuItem value="None">None</MenuItem>
                {flights.map((flight) => (
                  <MenuItem value={flight} key={flight}>
                    {flight}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            <TextField
              label="Weight capacity (kg)"
              type="number"
              value={swapWeight}
              onChange={(event) => setSwapWeight(event.target.value)}
              fullWidth
              inputProps={{ min: 0, step: 500 }}
            />
            <TextField
              label="Volume capacity (m³)"
              type="number"
              value={swapVolume}
              onChange={(event) => setSwapVolume(event.target.value)}
              fullWidth
              inputProps={{ min: 0, step: 5 }}
            />
          </Stack>

          <Button
            variant="contained"
            size="large"
            onClick={handleSubmit}
            disabled={loading}
            sx={{
              background: "#5D688A",
              "&:hover": {
                background: "#4F5A73"
              }
            }}
          >
            {loading ? "Running..." : "Run Scenario"}
          </Button>
        </Stack>
      </CardContent>
    </Card>
  );
}
