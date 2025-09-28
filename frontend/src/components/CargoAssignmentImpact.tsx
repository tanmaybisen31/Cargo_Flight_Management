import { useState, useMemo } from "react";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Grid,
  Paper,
  Chip,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableRow,
  LinearProgress,
  Alert,
  Divider,
  List,
  ListItem,
  ListItemText,
  ListItemIcon
} from "@mui/material";
import {
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  Flight as FlightIcon,
  LocalShipping as CargoIcon,
  MonetizationOn as RevenueIcon,
  Schedule as TimeIcon,
  CheckCircle as CheckIcon,
  Warning as WarningIcon
} from "@mui/icons-material";
import type { RecommendationOption, CargoRecommendation } from "../api/types";

interface CargoAssignmentImpactProps {
  selectedOption: RecommendationOption;
  cargoRecommendation: CargoRecommendation;
  onClose?: () => void;
}

interface ImpactMetrics {
  revenueImpact: number;
  costImpact: number;
  netBenefit: number;
  timeImpact: number;
  riskLevel: string;
  feasibilityScore: number;
  affectedFlights: string[];
  alternativeRoutes: string[];
}

export function CargoAssignmentImpact({ 
  selectedOption, 
  cargoRecommendation 
}: CargoAssignmentImpactProps) {
  const formatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  });

  const impactMetrics = useMemo((): ImpactMetrics => {
    const revenueImpact = selectedOption.recovery;
    const costImpact = selectedOption.cost;
    const netBenefit = revenueImpact - costImpact;
    
    // Simulate affected flights and routes based on option type
    const affectedFlights = selectedOption.type === "charter_flight" 
      ? ["CHR-001", "CHR-002"] 
      : selectedOption.type === "alternative_routing"
      ? ["AI-101", "AI-205", "AI-308"]
      : ["AI-101"];
      
    const alternativeRoutes = selectedOption.type === "alternative_routing"
      ? ["DEL-BOM-MAA", "DEL-HYD-MAA", "DEL-CCU-MAA"]
      : selectedOption.type === "charter_flight"
      ? ["Direct Charter Route"]
      : ["Original Route"];

    return {
      revenueImpact,
      costImpact,
      netBenefit,
      timeImpact: selectedOption.time_hours,
      riskLevel: selectedOption.risk,
      feasibilityScore: selectedOption.feasibility,
      affectedFlights,
      alternativeRoutes
    };
  }, [selectedOption]);

  const getRiskColor = (risk: string) => {
    switch (risk.toLowerCase()) {
      case "low": return "success";
      case "medium": return "warning";
      case "high": return "error";
      default: return "default";
    }
  };

  const getImpactIcon = (value: number) => {
    return value > 0 ? <TrendingUpIcon color="success" /> : <TrendingDownIcon color="error" />;
  };

  return (
    <Card sx={{ borderRadius: 3, boxShadow: "0 8px 32px rgba(0,0,0,0.1)" }}>
      <CardHeader
        title={`Cargo Assignment Impact Analysis`}
        subheader={`${cargoRecommendation.cargo_id} - ${selectedOption.type.replace('_', ' ').toUpperCase()}`}
        sx={{
          bgcolor: "#f8f9fa",
          "& .MuiCardHeader-title": {
            fontWeight: 600,
            color: "#5D688A"
          }
        }}
      />
      
      <CardContent>
        {/* Impact Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 3 }}>
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2, textAlign: "center", bgcolor: "#e8f5e8" }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", mb: 1 }}>
                <RevenueIcon sx={{ color: "#4CAF50", mr: 1 }} />
                {getImpactIcon(impactMetrics.revenueImpact)}
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: "#4CAF50" }}>
                {formatter.format(impactMetrics.revenueImpact)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Revenue Recovery
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2, textAlign: "center", bgcolor: "#fff3e0" }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", mb: 1 }}>
                <WarningIcon sx={{ color: "#FF9800", mr: 1 }} />
                {getImpactIcon(-impactMetrics.costImpact)}
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: "#FF9800" }}>
                {formatter.format(impactMetrics.costImpact)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Implementation Cost
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2, textAlign: "center", bgcolor: impactMetrics.netBenefit > 0 ? "#e8f5e8" : "#ffebee" }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", mb: 1 }}>
                <TrendingUpIcon sx={{ color: impactMetrics.netBenefit > 0 ? "#4CAF50" : "#F44336", mr: 1 }} />
                {getImpactIcon(impactMetrics.netBenefit)}
              </Box>
              <Typography variant="h6" sx={{ 
                fontWeight: 700, 
                color: impactMetrics.netBenefit > 0 ? "#4CAF50" : "#F44336" 
              }}>
                {formatter.format(impactMetrics.netBenefit)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Net Benefit
              </Typography>
            </Paper>
          </Grid>
          
          <Grid item xs={12} md={3}>
            <Paper sx={{ p: 2, textAlign: "center", bgcolor: "#f3e5f5" }}>
              <Box sx={{ display: "flex", alignItems: "center", justifyContent: "center", mb: 1 }}>
                <TimeIcon sx={{ color: "#9C27B0", mr: 1 }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 700, color: "#9C27B0" }}>
                {impactMetrics.timeImpact}h
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Implementation Time
              </Typography>
            </Paper>
          </Grid>
        </Grid>

        {/* Risk Assessment */}
        <Alert 
          severity={getRiskColor(impactMetrics.riskLevel) as any}
          sx={{ mb: 3 }}
        >
          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
            Risk Assessment: {impactMetrics.riskLevel} Risk
          </Typography>
          <Typography variant="body2">
            {selectedOption.impact}
          </Typography>
        </Alert>

        <Grid container spacing={3}>
          {/* Feasibility Score */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Implementation Feasibility
                </Typography>
                <Box sx={{ display: "flex", alignItems: "center", gap: 2, mb: 1 }}>
                  <LinearProgress
                    variant="determinate"
                    value={impactMetrics.feasibilityScore * 100}
                    sx={{ 
                      flex: 1, 
                      height: 8, 
                      borderRadius: 4,
                      bgcolor: "#f0f0f0",
                      "& .MuiLinearProgress-bar": {
                        bgcolor: impactMetrics.feasibilityScore > 0.7 ? "#4CAF50" : 
                               impactMetrics.feasibilityScore > 0.4 ? "#FF9800" : "#F44336"
                      }
                    }}
                  />
                  <Typography variant="body1" sx={{ fontWeight: 600, minWidth: 40 }}>
                    {(impactMetrics.feasibilityScore * 100).toFixed(0)}%
                  </Typography>
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Based on current capacity, resources, and operational constraints
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Affected Flights */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Affected Flights
                </Typography>
                <Box sx={{ display: "flex", gap: 1, flexWrap: "wrap", mb: 2 }}>
                  {impactMetrics.affectedFlights.map((flight, index) => (
                    <Chip
                      key={index}
                      icon={<FlightIcon />}
                      label={flight}
                      variant="outlined"
                      size="small"
                      sx={{ 
                        borderColor: "#5D688A",
                        color: "#5D688A"
                      }}
                    />
                  ))}
                </Box>
                <Typography variant="body2" color="text.secondary">
                  Flights that will be impacted by this solution
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          {/* Alternative Routes */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Route Options
                </Typography>
                <List dense>
                  {impactMetrics.alternativeRoutes.map((route, index) => (
                    <ListItem key={index} sx={{ px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <CargoIcon fontSize="small" color="primary" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={route}
                        primaryTypographyProps={{ variant: "body2" }}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>

          {/* Implementation Steps */}
          <Grid item xs={12} md={6}>
            <Card variant="outlined">
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2, fontWeight: 600 }}>
                  Implementation Steps
                </Typography>
                <List dense>
                  {selectedOption.actions.map((action, index) => (
                    <ListItem key={index} sx={{ px: 0 }}>
                      <ListItemIcon sx={{ minWidth: 32 }}>
                        <CheckIcon fontSize="small" color="success" />
                      </ListItemIcon>
                      <ListItemText 
                        primary={action}
                        primaryTypographyProps={{ variant: "body2" }}
                      />
                    </ListItem>
                  ))}
                </List>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3 }} />

        {/* Financial Impact Summary */}
        <Paper sx={{ p: 3, bgcolor: "#f8f9fa" }}>
          <Typography variant="h6" sx={{ mb: 2, fontWeight: 600, color: "#5D688A" }}>
            Financial Impact Summary
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12} sm={4}>
              <Typography variant="body2" color="text.secondary">
                Original Revenue at Risk
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 600, color: "#F44336" }}>
                {formatter.format(cargoRecommendation.revenue_at_risk)}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="body2" color="text.secondary">
                Potential Recovery
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 600, color: "#4CAF50" }}>
                {formatter.format(impactMetrics.revenueImpact)}
              </Typography>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Typography variant="body2" color="text.secondary">
                Recovery Rate
              </Typography>
              <Typography variant="h6" sx={{ fontWeight: 600, color: "#2196F3" }}>
                {((impactMetrics.revenueImpact / cargoRecommendation.revenue_at_risk) * 100).toFixed(1)}%
              </Typography>
            </Grid>
          </Grid>
        </Paper>
      </CardContent>
    </Card>
  );
}