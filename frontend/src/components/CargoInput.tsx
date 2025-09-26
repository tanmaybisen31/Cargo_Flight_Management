import { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  TextField,
  Button,
  Typography,
  Grid,
  MenuItem,
  FormControl,
  InputLabel,
  Select,
  Alert,
  CircularProgress,
  Chip,
  Divider
} from "@mui/material";
import {
  Add as AddIcon,
  PlayArrow as RunIcon,
  Refresh as ResetIcon
} from "@mui/icons-material";
import dayjs from "dayjs";
import { addCargo } from "../api/client";

interface CargoInputProps {
  onCargoAdded: () => void;
  onRunOptimization: () => void;
  isLoading?: boolean;
}

interface CargoFormData {
  cargo_id: string;
  origin: string;
  destination: string;
  weight_kg: string;
  volume_m3: string;
  revenue_inr: string;
  priority: string;
  perishable: string;
  max_transit_hours: string;
  ready_time: string;
  due_by: string;
  handling_cost_per_kg: string;
  sla_penalty_per_hour: string;
}

const AIRPORT_CODES = ["IXR", "DEL", "BLR", "DXB", "BOM", "CCU", "MAA", "HYD", "AMD", "COK"];
const PRIORITY_OPTIONS = ["Low", "Medium", "High"];

export function CargoInput({ onCargoAdded, onRunOptimization, isLoading = false }: CargoInputProps) {
  const [formData, setFormData] = useState<CargoFormData>({
    cargo_id: "",
    origin: "",
    destination: "",
    weight_kg: "",
    volume_m3: "",
    revenue_inr: "",
    priority: "Medium",
    perishable: "false",
    max_transit_hours: "24",
    // Align defaults to dataset flight window (2025-03-01)
    ready_time: dayjs("2025-03-01T06:00").format("YYYY-MM-DDTHH:mm"),
    due_by: dayjs("2025-03-01T06:00").add(25, 'hour').format("YYYY-MM-DDTHH:mm"),
    handling_cost_per_kg: "3",
    sla_penalty_per_hour: "2000"
  });

  const [errors, setErrors] = useState<Partial<CargoFormData>>({});
  const [submitLoading, setSubmitLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const validateForm = (): boolean => {
    const newErrors: Partial<CargoFormData> = {};

    if (!formData.cargo_id.trim()) {
      newErrors.cargo_id = "Cargo ID is required";
    }

    if (!formData.origin) {
      newErrors.origin = "Origin is required";
    }

    if (!formData.destination) {
      newErrors.destination = "Destination is required";
    }

    if (!formData.weight_kg || parseFloat(formData.weight_kg) <= 0) {
      newErrors.weight_kg = "Weight must be greater than 0";
    }

    if (!formData.volume_m3 || parseFloat(formData.volume_m3) <= 0) {
      newErrors.volume_m3 = "Volume must be greater than 0";
    }

    if (!formData.revenue_inr || parseFloat(formData.revenue_inr) <= 0) {
      newErrors.revenue_inr = "Revenue must be greater than 0";
    }

    if (!formData.max_transit_hours || parseFloat(formData.max_transit_hours) <= 0) {
      newErrors.max_transit_hours = "Transit hours must be greater than 0";
    }

    if (!formData.handling_cost_per_kg || parseFloat(formData.handling_cost_per_kg) < 0) {
      newErrors.handling_cost_per_kg = "Handling cost cannot be negative";
    }

    if (!formData.sla_penalty_per_hour || parseFloat(formData.sla_penalty_per_hour) < 0) {
      newErrors.sla_penalty_per_hour = "SLA penalty cannot be negative";
    }

    const readyTime = dayjs(formData.ready_time);
    const dueTime = dayjs(formData.due_by);

    if (dueTime.isBefore(readyTime)) {
      newErrors.due_by = "Due time must be after ready time";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field: keyof CargoFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    setSubmitLoading(true);
    try {
      const cargoData = {
        cargo_id: formData.cargo_id.trim(),
        origin: formData.origin,
        destination: formData.destination,
        weight_kg: parseFloat(formData.weight_kg),
        volume_m3: parseFloat(formData.volume_m3),
        revenue_inr: parseFloat(formData.revenue_inr),
        priority: formData.priority,
        perishable: formData.perishable === "true",
        max_transit_hours: parseFloat(formData.max_transit_hours),
        ready_time: formData.ready_time,
        due_by: formData.due_by,
        handling_cost_per_kg: parseFloat(formData.handling_cost_per_kg),
        sla_penalty_per_hour: parseFloat(formData.sla_penalty_per_hour),
      };

      const response = await addCargo(cargoData);

      if (response.status === "success") {
        setSuccess(true);
        setTimeout(() => setSuccess(false), 3000);
        onCargoAdded();
        // Immediately run optimization so the new cargo is placed
        await Promise.resolve(onRunOptimization());
        // Reset form
        setFormData({
          cargo_id: "",
          origin: "",
          destination: "",
          weight_kg: "",
          volume_m3: "",
          revenue_inr: "",
          priority: "Medium",
          perishable: "false",
          max_transit_hours: "24",
          ready_time: dayjs("2025-03-01T06:00").format("YYYY-MM-DDTHH:mm"),
          due_by: dayjs("2025-03-01T06:00").add(25, 'hour').format("YYYY-MM-DDTHH:mm"),
          handling_cost_per_kg: "3",
          sla_penalty_per_hour: "2000"
        });
      } else {
        throw new Error(response.message || "Failed to add cargo");
      }
    } catch (error) {
      console.error("Error adding cargo:", error);
      alert(`Failed to add cargo: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleReset = () => {
    setFormData({
      cargo_id: "",
      origin: "",
      destination: "",
      weight_kg: "",
      volume_m3: "",
      revenue_inr: "",
      priority: "Medium",
      perishable: "false",
      max_transit_hours: "24",
      // Reset aligned to dataset window
      ready_time: dayjs("2025-03-01T06:00").format("YYYY-MM-DDTHH:mm"),
      due_by: dayjs("2025-03-01T06:00").add(25, 'hour').format("YYYY-MM-DDTHH:mm"),
      handling_cost_per_kg: "3",
      sla_penalty_per_hour: "2000"
    });
    setErrors({});
    setSuccess(false);
  };

  return (
    <Card sx={{
      borderRadius: 3,
      background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
      border: "1px solid #e2e8f0",
      boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)",
      mb: 3
    }}>
      <CardHeader
        title="Add New Cargo"
        subheader="Manually add cargo to the system and run optimization"
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

      <CardContent sx={{ p: 3 }}>
        {/* Information Section */}
        <Alert severity="info" sx={{ mb: 3 }}>
          <Typography variant="subtitle2" sx={{ mb: 1, fontWeight: 600 }}>
            How to use Cargo Intake:
          </Typography>
          <Typography variant="body2" sx={{ mb: 1 }}>
            1. Fill in all cargo details including weight, volume, revenue, and timing
          </Typography>
          <Typography variant="body2">
            2. Click "Add & Optimize" to save the cargo and immediately run optimization
          </Typography>
        </Alert>

        {success && (
          <Alert severity="success" sx={{ mb: 3 }}>
            Cargo added successfully! You can now run optimization to see the placement.
          </Alert>
        )}

        <form onSubmit={handleSubmit}>
          <Grid container spacing={3}>
            {/* Basic Information */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2, color: "#374151", fontWeight: 600 }}>
                Basic Information
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Cargo ID"
                value={formData.cargo_id}
                onChange={(e) => handleInputChange("cargo_id", e.target.value)}
                error={!!errors.cargo_id}
                helperText={errors.cargo_id}
                placeholder="e.g., C041"
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth error={!!errors.priority}>
                <InputLabel>Priority</InputLabel>
                <Select
                  value={formData.priority}
                  label="Priority"
                  onChange={(e) => handleInputChange("priority", e.target.value)}
                >
                  {PRIORITY_OPTIONS.map((priority) => (
                    <MenuItem key={priority} value={priority}>
                      <Chip
                        label={priority}
                        size="small"
                        color={priority === "High" ? "error" : priority === "Medium" ? "warning" : "default"}
                        variant="outlined"
                      />
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>

            {/* Route Information */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2, color: "#374151", fontWeight: 600 }}>
                Route Information
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth error={!!errors.origin}>
                <InputLabel>Origin Airport</InputLabel>
                <Select
                  value={formData.origin}
                  label="Origin Airport"
                  onChange={(e) => handleInputChange("origin", e.target.value)}
                >
                  {AIRPORT_CODES.map((code) => (
                    <MenuItem key={code} value={code}>
                      {code}
                    </MenuItem>
                  ))}
                </Select>
                {errors.origin && (
                  <Typography variant="caption" color="error" sx={{ mt: 1, ml: 2 }}>
                    {errors.origin}
                  </Typography>
                )}
              </FormControl>
            </Grid>

            <Grid item xs={12} md={6}>
              <FormControl fullWidth error={!!errors.destination}>
                <InputLabel>Destination Airport</InputLabel>
                <Select
                  value={formData.destination}
                  label="Destination Airport"
                  onChange={(e) => handleInputChange("destination", e.target.value)}
                >
                  {AIRPORT_CODES.map((code) => (
                    <MenuItem key={code} value={code}>
                      {code}
                    </MenuItem>
                  ))}
                </Select>
                {errors.destination && (
                  <Typography variant="caption" color="error" sx={{ mt: 1, ml: 2 }}>
                    {errors.destination}
                  </Typography>
                )}
              </FormControl>
            </Grid>

            {/* Cargo Specifications */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2, color: "#374151", fontWeight: 600 }}>
                Cargo Specifications
              </Typography>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Weight (kg)"
                type="number"
                value={formData.weight_kg}
                onChange={(e) => handleInputChange("weight_kg", e.target.value)}
                error={!!errors.weight_kg}
                helperText={errors.weight_kg}
                required
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Volume (m³)"
                type="number"
                value={formData.volume_m3}
                onChange={(e) => handleInputChange("volume_m3", e.target.value)}
                error={!!errors.volume_m3}
                helperText={errors.volume_m3}
                required
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Revenue (₹)"
                type="number"
                value={formData.revenue_inr}
                onChange={(e) => handleInputChange("revenue_inr", e.target.value)}
                error={!!errors.revenue_inr}
                helperText={errors.revenue_inr}
                required
              />
            </Grid>

            {/* Timing Information */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2, color: "#374151", fontWeight: 600 }}>
                Timing Information
              </Typography>
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Ready Time"
                type="datetime-local"
                value={formData.ready_time}
                onChange={(e) => handleInputChange("ready_time", e.target.value)}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>

            <Grid item xs={12} md={6}>
              <TextField
                fullWidth
                label="Due By"
                type="datetime-local"
                value={formData.due_by}
                onChange={(e) => handleInputChange("due_by", e.target.value)}
                error={!!errors.due_by}
                helperText={errors.due_by}
                InputLabelProps={{ shrink: true }}
                required
              />
            </Grid>

            {/* Cost Information */}
            <Grid item xs={12}>
              <Typography variant="h6" sx={{ mb: 2, color: "#374151", fontWeight: 600 }}>
                Cost Information
              </Typography>
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Max Transit Hours"
                type="number"
                value={formData.max_transit_hours}
                onChange={(e) => handleInputChange("max_transit_hours", e.target.value)}
                error={!!errors.max_transit_hours}
                helperText={errors.max_transit_hours}
                required
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="Handling Cost per kg (₹)"
                type="number"
                value={formData.handling_cost_per_kg}
                onChange={(e) => handleInputChange("handling_cost_per_kg", e.target.value)}
                error={!!errors.handling_cost_per_kg}
                helperText={errors.handling_cost_per_kg}
                required
              />
            </Grid>

            <Grid item xs={12} md={4}>
              <TextField
                fullWidth
                label="SLA Penalty per hour (₹)"
                type="number"
                value={formData.sla_penalty_per_hour}
                onChange={(e) => handleInputChange("sla_penalty_per_hour", e.target.value)}
                error={!!errors.sla_penalty_per_hour}
                helperText={errors.sla_penalty_per_hour}
                required
              />
            </Grid>

            {/* Additional Options */}
            <Grid item xs={12}>
              <FormControl fullWidth>
                <InputLabel>Perishable</InputLabel>
                <Select
                  value={formData.perishable}
                  label="Perishable"
                  onChange={(e) => handleInputChange("perishable", e.target.value)}
                >
                  <MenuItem value="false">No</MenuItem>
                  <MenuItem value="true">Yes</MenuItem>
                </Select>
              </FormControl>
            </Grid>

            {/* Action Buttons */}
            <Grid item xs={12}>
              <Divider sx={{ my: 2 }} />
              <Box sx={{ display: "flex", gap: 2, justifyContent: "flex-end" }}>
                <Button
                  type="button"
                  variant="outlined"
                  startIcon={<ResetIcon />}
                  onClick={handleReset}
                  disabled={submitLoading}
                >
                  Reset Form
                </Button>

                <Button
                  type="submit"
                  variant="contained"
                  startIcon={submitLoading ? <CircularProgress size={20} /> : <AddIcon />}
                  disabled={submitLoading || isLoading}
                  sx={{
                    background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
                    "&:hover": {
                      background: "linear-gradient(135deg, #059669 0%, #047857 100%)"
                    }
                  }}
                >
                  {submitLoading ? "Adding & Optimizing..." : "Add & Optimize"}
                </Button>

              </Box>
            </Grid>
          </Grid>
        </form>
      </CardContent>
    </Card>
  );
}