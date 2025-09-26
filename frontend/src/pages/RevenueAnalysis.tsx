import { useState, useEffect, useMemo } from "react";
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
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  LinearProgress,
  Divider,
  Paper
} from "@mui/material";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  ScatterChart,
  Scatter,
  Area,
  AreaChart
} from "recharts";
import dayjs, { Dayjs } from "dayjs";
import { runSample } from "../api/client";
import type { PlanResponse, CargoAssignment, FlightAssignment } from "../api/types";
import { Navbar } from "../components/Navbar";
import { DateFilter } from "../components/DateFilter";
import { RevenueChatbot } from "../components/RevenueChatbot";
import { professionalTheme } from "../styles/theme";

const theme = professionalTheme;

const COLORS = ['#5D688A', '#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1'];

interface RevenueMetrics {
  totalRevenue: number;
  totalMargin: number;
  averageMargin: number;
  revenueByPriority: { priority: string; revenue: number; count: number }[];
  revenueByStatus: { status: string; revenue: number; count: number; color: string }[];
  flightUtilization: { flight_id: string; utilization: number; revenue: number; margin: number; capacity: number }[];
  routePerformance: { route: string; revenue: number; count: number; avgMargin: number }[];
  priorityDistribution: { priority: string; value: number; color: string }[];
  revenueEfficiency: { flight_id: string; revenuePerKg: number; revenuePerM3: number; totalRevenue: number }[];
}

function calculateRevenueMetrics(data: PlanResponse): RevenueMetrics {
  const cargoEntries = Object.entries(data.cargo);
  const flightEntries = Object.entries(data.flights);

  // Total revenue and margin
  const totalRevenue = cargoEntries.reduce((sum, [, cargo]) => sum + cargo.revenue_inr, 0);
  const deliveredCargo = cargoEntries.filter(([, cargo]) => cargo.status === "delivered");
  const totalMargin = deliveredCargo.reduce((sum, [, cargo]) => sum + cargo.margin, 0);
  const averageMargin = deliveredCargo.length > 0 ? totalMargin / deliveredCargo.length : 0;

  // Revenue by priority
  const priorityGroups = cargoEntries.reduce((acc, [, cargo]) => {
    if (!acc[cargo.priority]) {
      acc[cargo.priority] = { revenue: 0, count: 0 };
    }
    acc[cargo.priority].revenue += cargo.revenue_inr;
    acc[cargo.priority].count += 1;
    return acc;
  }, {} as Record<string, { revenue: number; count: number }>);

  const revenueByPriority = Object.entries(priorityGroups).map(([priority, data]) => ({
    priority,
    revenue: data.revenue,
    count: data.count
  }));

  // Revenue by status (Approved vs Rolled out)
  const deliveredAgg = cargoEntries.reduce(
    (acc, [, cargo]) => {
      if (cargo.status === "delivered") {
        acc.revenue += cargo.revenue_inr;
        acc.count += 1;
      }
      return acc;
    },
    { revenue: 0, count: 0 }
  );

  const rolledOutAgg = cargoEntries.reduce(
    (acc, [, cargo]) => {
      if (cargo.status === "rolled" || cargo.status === "denied") {
        acc.revenue += cargo.revenue_inr;
        acc.count += 1;
      }
      return acc;
    },
    { revenue: 0, count: 0 }
  );

  const revenueByStatus = [
    { status: "Approved", revenue: deliveredAgg.revenue, count: deliveredAgg.count, color: "#4CAF50" },
    { status: "Rolled out", revenue: rolledOutAgg.revenue, count: rolledOutAgg.count, color: "#F44336" }
  ];

  // Flight utilization
  const flightUtilization = flightEntries.map(([flightId, flight]) => {
    const totalWeight = flight.assigned.reduce((sum, cargo) => sum + cargo.weight_kg, 0);
    const totalVolume = flight.assigned.reduce((sum, cargo) => sum + cargo.volume_m3, 0);
    const totalRevenue = flight.assigned.reduce((sum, cargo) => sum + cargo.revenue, 0);
    const totalMargin = flight.assigned.reduce((sum, cargo) => sum + (data.cargo[cargo.cargo_id]?.margin || 0), 0);

    const weightUtil = (totalWeight / flight.weight_capacity_kg) * 100;
    const volumeUtil = (totalVolume / flight.volume_capacity_m3) * 100;
    const utilization = Math.max(weightUtil, volumeUtil);

    return {
      flight_id: flightId,
      utilization: Math.round(utilization),
      revenue: totalRevenue,
      margin: totalMargin,
      capacity: Math.round(Math.min(flight.weight_capacity_kg / 1000, flight.volume_capacity_m3))
    };
  }).filter(f => f.utilization > 0).sort((a, b) => a.flight_id.localeCompare(b.flight_id));

  // Route performance
  const routeGroups = cargoEntries.reduce((acc, [, cargo]) => {
    const route = `${cargo.origin}-${cargo.destination}`;
    if (!acc[route]) {
      acc[route] = { revenue: 0, count: 0, totalMargin: 0 };
    }
    acc[route].revenue += cargo.revenue_inr;
    acc[route].count += 1;
    acc[route].totalMargin += cargo.margin;
    return acc;
  }, {} as Record<string, { revenue: number; count: number; totalMargin: number }>);

  const routePerformance = Object.entries(routeGroups).map(([route, data]) => ({
    route,
    revenue: data.revenue,
    count: data.count,
    avgMargin: data.count > 0 ? data.totalMargin / data.count : 0
  })).sort((a, b) => b.revenue - a.revenue).slice(0, 10);

  // Priority distribution for pie chart
  const priorityDistribution = revenueByPriority.map((item, index) => ({
    priority: item.priority,
    value: item.revenue,
    color: COLORS[index % COLORS.length]
  }));

  // Revenue efficiency
  const revenueEfficiency = flightEntries.map(([flightId, flight]) => {
    const totalWeight = flight.assigned.reduce((sum, cargo) => sum + cargo.weight_kg, 0);
    const totalVolume = flight.assigned.reduce((sum, cargo) => sum + cargo.volume_m3, 0);
    const totalRevenue = flight.assigned.reduce((sum, cargo) => sum + cargo.revenue, 0);
    
    return {
      flight_id: flightId,
      revenuePerKg: totalWeight > 0 ? totalRevenue / totalWeight : 0,
      revenuePerM3: totalVolume > 0 ? totalRevenue / totalVolume : 0,
      totalRevenue
    };
  }).filter(f => f.totalRevenue > 0);

  return {
    totalRevenue,
    totalMargin,
    averageMargin,
    revenueByPriority,
    revenueByStatus,
    flightUtilization,
    routePerformance,
    priorityDistribution,
    revenueEfficiency
  };
}

export function RevenueAnalysis() {
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
        setError("Failed to load revenue analysis data. Please ensure the backend is running.");
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

  const metrics = useMemo(() => {
    return filteredData ? calculateRevenueMetrics(filteredData) : null;
  }, [filteredData]);

  const handleDateChange = (date: Dayjs | null) => {
    setSelectedDate(date);
  };

  const handleClearFilter = () => {
    setSelectedDate(null);
  };

  const formatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  });

  if (loading) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Navbar />
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Box sx={{ display: "flex", justifyContent: "center", py: 8 }}>
            <CircularProgress size={64} thickness={4} />
          </Box>
        </Container>
      </ThemeProvider>
    );
  }

  if (error) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Navbar />
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Alert severity="error" sx={{ mb: 3 }}>
            {error}
          </Alert>
        </Container>
      </ThemeProvider>
    );
  }

  if (!data || !metrics) {
    return (
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <Navbar />
        <Container maxWidth="xl" sx={{ py: 4 }}>
          <Alert severity="info" sx={{ mb: 3 }}>
            No data available for revenue analysis.
          </Alert>
        </Container>
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Navbar />
      <Container maxWidth="xl" sx={{ py: 4, background: "#E7F2EF", minHeight: "100vh" }}>
        <Typography variant="h4" sx={{ mb: 4, color: "#5D688A", fontWeight: 700 }}>
          Revenue Analysis & Performance Metrics
        </Typography>

        {/* Date Filter */}
        <DateFilter
          selectedDate={selectedDate}
          onDateChange={handleDateChange}
          onClearFilter={handleClearFilter}
        />

        {/* Key Metrics Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={3}>
            <Card sx={{
              background: "linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)",
              border: "1px solid #cbd5e1",
              borderRadius: 3,
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
            }}>
              <CardContent sx={{ textAlign: "center", p: 3 }}>
                <Typography variant="h6" sx={{ color: "#475569", fontWeight: 600, mb: 1 }}>
                  Total Revenue
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: "#1e293b" }}>
                  {formatter.format(metrics.totalRevenue)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card sx={{
              background: "linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)",
              border: "1px solid #bbf7d0",
              borderRadius: 3,
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
            }}>
              <CardContent sx={{ textAlign: "center", p: 3 }}>
                <Typography variant="h6" sx={{ color: "#166534", fontWeight: 600, mb: 1 }}>
                  Total Margin
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: "#15803d" }}>
                  {formatter.format(metrics.totalMargin)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card sx={{
              background: "linear-gradient(135deg, #fffbeb 0%, #fef3c7 100%)",
              border: "1px solid #fcd34d",
              borderRadius: 3,
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
            }}>
              <CardContent sx={{ textAlign: "center", p: 3 }}>
                <Typography variant="h6" sx={{ color: "#92400e", fontWeight: 600, mb: 1 }}>
                  Average Margin
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: "#d97706" }}>
                  {formatter.format(metrics.averageMargin)}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} md={3}>
            <Card sx={{
              background: "linear-gradient(135deg, #faf5ff 0%, #f3e8ff 100%)",
              border: "1px solid #d8b4fe",
              borderRadius: 3,
              boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
            }}>
              <CardContent sx={{ textAlign: "center", p: 3 }}>
                <Typography variant="h6" sx={{ color: "#7c3aed", fontWeight: 600, mb: 1 }}>
                  Margin Rate
                </Typography>
                <Typography variant="h4" sx={{ fontWeight: 700, color: "#a855f7" }}>
                  {((metrics.totalMargin / metrics.totalRevenue) * 100).toFixed(1)}%
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Grid container spacing={3}>
          {/* Revenue by Priority */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader title="Revenue by Priority" />
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metrics.revenueByPriority}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="priority" />
                    <YAxis tickFormatter={(value) => `₹${(value / 1000000).toFixed(1)}M`} />
                    <Tooltip formatter={(value) => [formatter.format(Number(value)), "Revenue"]} />
                    <Bar dataKey="revenue" fill="#5D688A" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Revenue Distribution Pie Chart */}
          <Grid item xs={12} md={6}>
            <Card>
              <CardHeader title="Revenue Distribution by Status" />
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <PieChart>
                    <Pie
                      data={metrics.revenueByStatus}
                      cx="50%"
                      cy="50%"
                      labelLine={false}
                      label={({ status, revenue }) => `${status}: ${formatter.format(revenue)}`}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="revenue"
                    >
                      {metrics.revenueByStatus.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => [formatter.format(Number(value)), "Revenue"]} />
                  </PieChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Revenue Trend vs Margin Trend */}
          <Grid item xs={12} md={8}>
            <Card>
              <CardHeader title="Revenue Trend vs Margin Trend" />
              <CardContent>
                <ResponsiveContainer width="100%" height={400}>
                  <LineChart data={metrics.flightUtilization}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="flight_id" />
                    <YAxis tickFormatter={(value) => `₹${(value / 1000).toFixed(0)}K`} />
                    <Tooltip
                      formatter={(value) => [formatter.format(Number(value))]}
                      labelFormatter={(label) => `Flight: ${label}`}
                    />
                    <Legend />
                    <Line type="monotone" dataKey="revenue" stroke="#5D688A" name="Revenue" />
                    <Line type="monotone" dataKey="margin" stroke="#82ca9d" name="Margin" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Top Routes Performance */}
          <Grid item xs={12} md={4}>
            <Card>
              <CardHeader title="Top Routes by Revenue" />
              <CardContent sx={{ p: 0 }}>
                <Table size="small">
                  <TableHead>
                    <TableRow>
                      <TableCell>Route</TableCell>
                      <TableCell align="right">Revenue</TableCell>
                      <TableCell align="right">Count</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {metrics.routePerformance.slice(0, 8).map((route) => (
                      <TableRow key={route.route}>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {route.route}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Typography variant="body2">
                            {formatter.format(route.revenue)}
                          </Typography>
                        </TableCell>
                        <TableCell align="right">
                          <Chip label={route.count} size="small" color="primary" variant="outlined" />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </Grid>

          {/* Revenue Efficiency Analysis */}
          <Grid item xs={12}>
            <Card>
              <CardHeader title="Revenue Efficiency by Flight" />
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={metrics.revenueEfficiency.slice(0, 10)}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="flight_id" />
                    <YAxis tickFormatter={(value) => `₹${value.toFixed(0)}`} />
                    <Tooltip 
                      formatter={(value) => [`₹${Number(value).toFixed(2)}`, "Revenue per Kg"]}
                    />
                    <Bar dataKey="revenuePerKg" fill="#82ca9d" name="Revenue per Kg" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          {/* Flight Performance Summary */}
          <Grid item xs={12}>
            <Card>
              <CardHeader title="Flight Performance Summary" />
              <CardContent>
                <Grid container spacing={2}>
                  {metrics.flightUtilization.map((flight) => (
                    <Grid item xs={12} sm={6} md={4} key={flight.flight_id}>
                      <Paper sx={{ p: 2, bgcolor: "#f5f5f5" }}>
                        <Typography variant="subtitle1" sx={{ fontWeight: 600, mb: 1 }}>
                          {flight.flight_id}
                        </Typography>
                        <Box sx={{ mb: 1 }}>
                          <Typography variant="body2" color="text.secondary">
                            Utilization: {flight.utilization}%
                          </Typography>
                          <LinearProgress 
                            variant="determinate" 
                            value={flight.utilization} 
                            sx={{ mt: 0.5, height: 6, borderRadius: 3 }}
                          />
                        </Box>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          Revenue: {formatter.format(flight.revenue)}
                        </Typography>
                      </Paper>
                    </Grid>
                  ))}
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* Revenue Management AI Assistant */}
          <Grid item xs={12}>
            <RevenueChatbot
              revenueData={metrics}
              cargoData={filteredData?.cargo}
            />
          </Grid>
        </Grid>
      </Container>
    </ThemeProvider>
  );
}