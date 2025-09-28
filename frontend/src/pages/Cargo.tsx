import { useState, useEffect } from "react";
import {
  Box,
  Container,
  CssBaseline,
  Grid,
  ThemeProvider,
  Alert,
  CircularProgress,
  Card,
  CardContent,
  CardHeader,
  Typography,
  LinearProgress,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  Paper
} from "@mui/material";
import dayjs, { Dayjs } from "dayjs";
import { runSample } from "../api/client";
import type { PlanResponse } from "../api/types";
import { Navbar } from "../components/Navbar";
import { DateFilter } from "../components/DateFilter";
import { professionalTheme } from "../styles/theme";

const theme = professionalTheme;

export function Cargo() {
  const [data, setData] = useState<PlanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [filteredData, setFilteredData] = useState<PlanResponse | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await runSample();
        setData(response);
      } catch (err) {
        console.error(err);
        setError("Failed to load flight capacity data. Please ensure the backend is running.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Filter data based on selected date
  useEffect(() => {
    if (!data) {
      setFilteredData(null);
      return;
    }

    if (!selectedDate) {
      setFilteredData(data);
      return;
    }

    // For demo purposes, we'll show all data but could implement actual date filtering logic
    setFilteredData(data);
  }, [data, selectedDate]);

  const handleDateChange = (date: Dayjs | null) => {
    setSelectedDate(date);
  };

  const handleClearFilter = () => {
    setSelectedDate(null);
  };

  const getUtilizationColor = (util: number) => {
    if (util >= 90) return 'error';
    if (util >= 70) return 'warning';
    return 'success';
  };

  const formatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  });

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Navbar />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography variant="h4" sx={{ mb: 4, color: "#5D688A", fontWeight: 700 }}>
          Flight Capacity Overview
        </Typography>

        {/* Date Filter */}
        <DateFilter
          selectedDate={selectedDate}
          onDateChange={handleDateChange}
          onClearFilter={handleClearFilter}
        />

        {loading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress size={64} thickness={4} />
          </Box>
        )}

        {error && (
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        )}

        {data && !loading && (
          <Grid container spacing={3}>
            {/* Summary Cards */}
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent sx={{ textAlign: "center" }}>
                  <Typography variant="h6" color="primary" gutterBottom>
                    Total Flights
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: "#5D688A" }}>
                    {Object.keys(data.flights).length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent sx={{ textAlign: "center" }}>
                  <Typography variant="h6" color="primary" gutterBottom>
                    Active Flights
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: "#4CAF50" }}>
                    {Object.values(data.flights).filter(f => f.assigned.length > 0).length}
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent sx={{ textAlign: "center" }}>
                  <Typography variant="h6" color="primary" gutterBottom>
                    Avg Weight Util
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: "#FF9800" }}>
                    {(Object.values(data.flights)
                      .filter(f => f.assigned.length > 0)
                      .reduce((acc, f) => {
                        const totalWeight = f.assigned.reduce((sum, c) => sum + c.weight_kg, 0);
                        return acc + (totalWeight / f.weight_capacity_kg) * 100;
                      }, 0) / Object.values(data.flights).filter(f => f.assigned.length > 0).length || 0
                    ).toFixed(3)}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>
            <Grid item xs={12} md={3}>
              <Card>
                <CardContent sx={{ textAlign: "center" }}>
                  <Typography variant="h6" color="primary" gutterBottom>
                    Avg Volume Util
                  </Typography>
                  <Typography variant="h4" sx={{ fontWeight: 700, color: "#9C27B0" }}>
                    {(Object.values(data.flights)
                      .filter(f => f.assigned.length > 0)
                      .reduce((acc, f) => {
                        const totalVolume = f.assigned.reduce((sum, c) => sum + c.volume_m3, 0);
                        return acc + (totalVolume / f.volume_capacity_m3) * 100;
                      }, 0) / Object.values(data.flights).filter(f => f.assigned.length > 0).length || 0
                    ).toFixed(3)}%
                  </Typography>
                </CardContent>
              </Card>
            </Grid>

            {/* Detailed Flight Capacity Table */}
            <Grid item xs={12}>
              <Card>
                <CardHeader
                  title="Detailed Flight Capacity Analysis"
                  subheader="Real-time capacity utilization and performance metrics"
                />
                <CardContent sx={{ p: 0 }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Flight</TableCell>
                        <TableCell>Route</TableCell>
                        <TableCell>Assigned Cargo</TableCell>
                        <TableCell align="right">Weight Utilization</TableCell>
                        <TableCell align="right">Volume Utilization</TableCell>
                        <TableCell align="right">Revenue</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {Object.entries(data.flights).map(([flightId, flight]) => {
                        const totalWeight = flight.assigned.reduce((sum, cargo) => sum + cargo.weight_kg, 0);
                        const totalVolume = flight.assigned.reduce((sum, cargo) => sum + cargo.volume_m3, 0);
                        const totalRevenue = flight.assigned.reduce((sum, cargo) => sum + cargo.revenue, 0);

                        const weightUtil = (totalWeight / flight.weight_capacity_kg) * 100;
                        const volumeUtil = (totalVolume / flight.volume_capacity_m3) * 100;

                        return (
                          <TableRow key={flightId} hover>
                            <TableCell>
                              <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                                {flightId}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Typography variant="body2">
                                {flight.origin} → {flight.destination}
                              </Typography>
                              <Typography variant="caption" color="text.secondary">
                                {new Date(flight.departure).toLocaleTimeString()} - {new Date(flight.arrival).toLocaleTimeString()}
                              </Typography>
                            </TableCell>
                            <TableCell>
                              <Chip
                                label={`${flight.assigned.length} items`}
                                size="small"
                                color="primary"
                                variant="outlined"
                              />
                            </TableCell>
                            <TableCell align="right">
                              <Box sx={{ minWidth: 120 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {weightUtil.toFixed(1)}%
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {totalWeight.toLocaleString()}kg / {flight.weight_capacity_kg.toLocaleString()}kg
                                  </Typography>
                                </Box>
                                <LinearProgress
                                  variant="determinate"
                                  value={Math.min(weightUtil, 100)}
                                  color={getUtilizationColor(weightUtil)}
                                  sx={{ height: 6, borderRadius: 3 }}
                                />
                              </Box>
                            </TableCell>
                            <TableCell align="right">
                              <Box sx={{ minWidth: 120 }}>
                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 0.5 }}>
                                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                    {volumeUtil.toFixed(1)}%
                                  </Typography>
                                  <Typography variant="caption" color="text.secondary">
                                    {totalVolume.toFixed(1)}m³ / {flight.volume_capacity_m3.toFixed(1)}m³
                                  </Typography>
                                </Box>
                                <LinearProgress
                                  variant="determinate"
                                  value={Math.min(volumeUtil, 100)}
                                  color={getUtilizationColor(volumeUtil)}
                                  sx={{ height: 6, borderRadius: 3 }}
                                />
                              </Box>
                            </TableCell>
                            <TableCell align="right">
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {formatter.format(totalRevenue)}
                              </Typography>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        )}

        {!data && !loading && !error && (
          <Alert severity="info" sx={{ mb: 3 }}>
            No data available. Please check your connection and try refreshing the page.
          </Alert>
        )}
      </Container>
    </ThemeProvider>
  );
}