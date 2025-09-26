import { useMemo, useState, useEffect } from "react";
import {
  Box,
  Container,
  CssBaseline,
  ThemeProvider,
  createTheme,
  Alert,
  CircularProgress,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Chip,
  Paper
} from "@mui/material";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ScatterChart,
  Scatter
} from "recharts";
import dayjs, { Dayjs } from "dayjs";
import { runSample } from "../api/client";
import type { PlanResponse } from "../api/types";
import { DashboardCards } from "../components/DashboardCards";
import { CargoTable } from "../components/CargoTable";
import { RouteDetails } from "../components/RouteDetails";
import { Navbar } from "../components/Navbar";
import { DateFilter } from "../components/DateFilter";

import { professionalTheme } from "../styles/theme";

const theme = professionalTheme;

function computeFlightAverages(data: PlanResponse | null) {
  if (!data) {
    return { flightsUsed: 0, avgWeightUtil: 0, avgVolumeUtil: 0 };
  }
  const rows = Object.values(data.flights);
  if (rows.length === 0) {
    return { flightsUsed: 0, avgWeightUtil: 0, avgVolumeUtil: 0 };
  }
  let weightTotal = 0;
  let volumeTotal = 0;
  let used = 0;
  rows.forEach((flight) => {
    if (flight.assigned.length === 0) {
      return;
    }
    used += 1;
    const totalWeight = flight.assigned.reduce((sum, cargo) => sum + cargo.weight_kg, 0);
    const totalVolume = flight.assigned.reduce((sum, cargo) => sum + cargo.volume_m3, 0);
    weightTotal += (totalWeight / flight.weight_capacity_kg) * 100;
    volumeTotal += (totalVolume / flight.volume_capacity_m3) * 100;
  });

  if (used === 0) {
    return { flightsUsed: 0, avgWeightUtil: 0, avgVolumeUtil: 0 };
  }

  return {
    flightsUsed: used,
    avgWeightUtil: weightTotal / used,
    avgVolumeUtil: volumeTotal / used
  };
}

function computeCargoPlacementData(data: PlanResponse | null) {
  if (!data) return null;

  const cargoEntries = Object.entries(data.cargo);
  
  // Cargo status distribution
  const statusDistribution = cargoEntries.reduce((acc, [, cargo]) => {
    acc[cargo.status] = (acc[cargo.status] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const statusData = Object.entries(statusDistribution).map(([status, count]) => {
    let name = status.charAt(0).toUpperCase() + status.slice(1);
    let color = status === 'delivered' ? '#4CAF50' : status === 'rolled' ? '#FFC107' : '#F44336';
    if (status === 'delivered') {
      name = 'Approved';
    }
    return {
      name,
      value: count,
      color
    };
  });

  // Priority vs Status analysis
  const priorityStatusData = cargoEntries.reduce((acc, [, cargo]) => {
    const key = `${cargo.priority}-${cargo.status}`;
    if (!acc[key]) {
      acc[key] = {
        priority: cargo.priority,
        status: cargo.status,
        count: 0,
        totalRevenue: 0
      };
    }
    acc[key].count += 1;
    acc[key].totalRevenue += cargo.revenue_inr;
    return acc;
  }, {} as Record<string, any>);

  const priorityData = Object.values(priorityStatusData);

  // Flight capacity utilization
  const flightData = Object.entries(data.flights).map(([flightId, flight]) => {
    const totalWeight = flight.assigned.reduce((sum, cargo) => sum + cargo.weight_kg, 0);
    const totalVolume = flight.assigned.reduce((sum, cargo) => sum + cargo.volume_m3, 0);
    const weightUtil = (totalWeight / flight.weight_capacity_kg) * 100;
    const volumeUtil = (totalVolume / flight.volume_capacity_m3) * 100;
    
    return {
      flight_id: flightId,
      weightUtilization: Math.round(weightUtil),
      volumeUtilization: Math.round(volumeUtil),
      cargoCount: flight.assigned.length,
      route: `${flight.origin}-${flight.destination}`
    };
  }).filter(f => f.cargoCount > 0);

  return {
    statusData,
    priorityData,
    flightData
  };
}

export function Dashboard() {
  const [data, setData] = useState<PlanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [filteredData, setFilteredData] = useState<PlanResponse | null>(null);
  const [refreshKey, setRefreshKey] = useState(0);
  const [optimizationLoading, setOptimizationLoading] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await runSample();
        setData(response);
      } catch (err) {
        console.error(err);
        setError("Failed to load dashboard data. Please ensure the backend is running.");
      } finally {
        setLoading(false);
      }
    })();
  }, [refreshKey]);

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

    // Filter cargo and flights based on selected date
    // For demo purposes, we'll simulate date filtering
    const selectedDateStr = selectedDate.format("YYYY-MM-DD");
    
    // In a real implementation, you would filter based on actual dates in the data
    // For now, we'll show all data but could implement actual date filtering logic
    setFilteredData(data);
  }, [data, selectedDate]);

  const averages = useMemo(() => computeFlightAverages(filteredData), [filteredData]);
  const placementData = useMemo(() => computeCargoPlacementData(filteredData), [filteredData]);

  const handleDateChange = (date: Dayjs | null) => {
    setSelectedDate(date);
  };

  const handleClearFilter = () => {
    setSelectedDate(null);
  };

  const handleCargoAdded = () => {
    // Trigger a refresh of the dashboard data
    setRefreshKey(prev => prev + 1);
  };

  const handleRunOptimization = async () => {
    setOptimizationLoading(true);
    try {
      // Run optimization with current data
      await runSample();
      // Refresh the dashboard data
      setRefreshKey(prev => prev + 1);
    } catch (err) {
      console.error("Optimization failed:", err);
      setError("Failed to run optimization. Please try again.");
    } finally {
      setOptimizationLoading(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Navbar />
      <Container
        maxWidth="xl"
        sx={{
          py: 4,
          background: "#E7F2EF",
          minHeight: "100vh",
          borderRadius: "0 0 24px 24px"
        }}
      >
        <Typography variant="h4" sx={{ mb: 4, color: "#5D688A", fontWeight: 700 }}>
          Cargo Portfolio & Operations Dashboard
        </Typography>

        {refreshKey > 0 && (
          <Alert severity="info" sx={{ mb: 2 }}>
            Dashboard updated with latest cargo data. Use Cargo Intake to add more cargo and rerun optimization.
          </Alert>
        )}


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

        {filteredData && !loading && (
          <>
            <DashboardCards
              summary={filteredData.summary}
              flightsUsed={averages.flightsUsed}
              avgWeightUtil={averages.avgWeightUtil}
              avgVolumeUtil={averages.avgVolumeUtil}
            />

            {/* Cargo Portfolio Section */}
            <CargoTable
              cargo={filteredData.cargo}
              selected=""
              onSelect={() => {}}
            />

            {/* Note: Removed UtilizationTable as flight capacity overview is now in separate section */}
          </>
        )}

        {!filteredData && !loading && !error && (
          <Alert severity="info" sx={{ mb: 3 }}>
            No data available. Please check your connection and try refreshing the page.
          </Alert>
        )}
      </Container>
    </ThemeProvider>
  );
}