import { useState } from "react";
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Chip,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Grid,
  Paper,
  LinearProgress,
  Button,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Alert
} from "@mui/material";
import {
  ExpandMore as ExpandMoreIcon,
  CheckCircle as CheckCircleIcon,
  Warning as WarningIcon,
  Error as ErrorIcon,
  TrendingUp as TrendingUpIcon,
  Flight as FlightIcon,
  Schedule as ScheduleIcon,
  MonetizationOn as MoneyIcon,
  Help as HelpIcon
} from "@mui/icons-material";
import type { AIRecommendations, CargoRecommendation, RecommendationOption } from "../api/types";

interface AIRecommendationsProps {
  recommendations: AIRecommendations;
  onOptionSelect?: (option: RecommendationOption, cargoRec: CargoRecommendation) => void;
  onOptionAssistant?: (option: RecommendationOption, cargoRec: CargoRecommendation) => void;
}

const riskColors = {
  Low: "success",
  Medium: "warning",
  High: "error"
} as const;

const optionTypeIcons = {
  charter_flight: <FlightIcon />,
  alternative_routing: <TrendingUpIcon />,
  capacity_upgrade: <FlightIcon />,
  delay_acceptance: <ScheduleIcon />,
  partial_shipment: <CheckCircleIcon />,
  customer_negotiation: <MoneyIcon />
};

const optionTypeLabels = {
  charter_flight: "Charter Flight",
  alternative_routing: "Alternative Routing",
  capacity_upgrade: "Capacity Upgrade",
  delay_acceptance: "Accept Delay",
  partial_shipment: "Partial Shipment",
  customer_negotiation: "Customer Negotiation"
};

export function AIRecommendations({ recommendations, onOptionSelect, onOptionAssistant }: AIRecommendationsProps) {
  const [selectedRecommendation, setSelectedRecommendation] = useState<CargoRecommendation | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  const handleViewDetails = (rec: CargoRecommendation) => {
    setSelectedRecommendation(rec);
    setDialogOpen(true);
  };

  const handleCloseDialog = () => {
    setDialogOpen(false);
    setSelectedRecommendation(null);
  };

  const formatter = new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0
  });

  if (!recommendations.recommendations.length) {
    return (
      <Card>
        <CardHeader title="AI Recommendations" />
        <CardContent>
          <Alert severity="success">
            All cargo has been successfully placed! No recommendations needed.
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card sx={{
        borderRadius: 3,
        background: "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
        border: "1px solid #e2e8f0",
        boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.1)"
      }}>
        <CardHeader
          title="AI Recommendations for Denied/Rolled Cargo"
          subheader={`${recommendations.summary.total_cargo_at_risk} cargo items need attention`}
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
        <CardContent>
          {/* Summary Cards */}
          <Grid container spacing={2} sx={{ mb: 3 }}>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{
                p: 2,
                textAlign: "center",
                background: "linear-gradient(135deg, #fef2f2 0%, #fee2e2 100%)",
                border: "1px solid #fecaca",
                borderRadius: 2,
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)"
              }}>
                <Typography variant="h6" sx={{ color: "#dc2626", fontWeight: 700, mb: 0.5 }}>
                  {recommendations.summary.total_cargo_at_risk}
                </Typography>
                <Typography variant="body2" sx={{ color: "#991b1b", fontWeight: 500 }}>
                  Cargo at Risk
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{
                p: 2,
                textAlign: "center",
                background: "linear-gradient(135deg, #fff7ed 0%, #fed7aa 100%)",
                border: "1px solid #fdba74",
                borderRadius: 2,
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)"
              }}>
                <Typography variant="h6" sx={{ color: "#ea580c", fontWeight: 700, mb: 0.5 }}>
                  {formatter.format(recommendations.summary.total_revenue_at_risk)}
                </Typography>
                <Typography variant="body2" sx={{ color: "#c2410c", fontWeight: 500 }}>
                  Revenue at Risk
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{
                p: 2,
                textAlign: "center",
                background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
                border: "1px solid #fcd34d",
                borderRadius: 2,
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)"
              }}>
                <Typography variant="h6" sx={{ color: "#d97706", fontWeight: 700, mb: 0.5 }}>
                  {recommendations.summary.high_priority_count}
                </Typography>
                <Typography variant="body2" sx={{ color: "#92400e", fontWeight: 500 }}>
                  High Priority
                </Typography>
              </Paper>
            </Grid>
            <Grid item xs={12} sm={6} md={3}>
              <Paper sx={{
                p: 2,
                textAlign: "center",
                background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
                border: "1px solid #93c5fd",
                borderRadius: 2,
                boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)"
              }}>
                <Typography variant="h6" sx={{ color: "#2563eb", fontWeight: 700, mb: 0.5 }}>
                  {recommendations.summary.medium_priority_count}
                </Typography>
                <Typography variant="body2" sx={{ color: "#1d4ed8", fontWeight: 500 }}>
                  Medium Priority
                </Typography>
              </Paper>
            </Grid>
          </Grid>

          {/* Recommendations List */}
          <Box>
            {recommendations.recommendations.map((rec, index) => (
              <Accordion key={rec.cargo_id} sx={{ mb: 1 }}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                  <Box sx={{ display: "flex", alignItems: "center", gap: 2, width: "100%" }}>
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {rec.cargo_id}
                    </Typography>
                    <Chip 
                      label={rec.priority} 
                      size="small" 
                      color={rec.priority === "High" ? "error" : rec.priority === "Medium" ? "warning" : "default"}
                    />
                    <Typography variant="body2" color="text.secondary" sx={{ flex: 1 }}>
                      {rec.denial_reason}
                    </Typography>
                    <Typography variant="body2" sx={{ fontWeight: 600 }}>
                      {formatter.format(rec.revenue_at_risk)}
                    </Typography>
                  </Box>
                </AccordionSummary>
                <AccordionDetails>
                  {rec.recommended_option && (
                    <Box sx={{ mb: 2 }}>
                      <Typography variant="subtitle2" sx={{ mb: 1, color: "primary.main", fontWeight: 600 }}>
                        🎯 Recommended Solution
                      </Typography>
                      <Paper
                        sx={{
                          p: 2,
                          background: "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)",
                          border: "1px solid #3b82f6",
                          borderRadius: 2,
                          cursor: onOptionSelect ? "pointer" : "default",
                          boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                          "&:hover": onOptionSelect ? {
                            background: "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)",
                            transform: "translateY(-2px)",
                            boxShadow: "0 4px 12px rgba(59, 130, 246, 0.15)"
                          } : {}
                        }}
                        onClick={() => onOptionSelect && onOptionSelect(rec.recommended_option!, rec)}
                      >
                        <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                          {optionTypeIcons[rec.recommended_option.type as keyof typeof optionTypeIcons]}
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {optionTypeLabels[rec.recommended_option.type as keyof typeof optionTypeLabels]}
                          </Typography>
                          <Chip 
                            label={rec.recommended_option.risk} 
                            size="small" 
                            color={riskColors[rec.recommended_option.risk as keyof typeof riskColors]}
                          />
                        </Box>
                        <Typography variant="body2" sx={{ mb: 1 }}>
                          {rec.recommended_option.description}
                        </Typography>
                        <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                          {rec.recommended_option.impact}
                        </Typography>
                        
                        <Grid container spacing={2}>
                          <Grid item xs={6} sm={3}>
                            <Typography variant="caption" color="text.secondary">Cost</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {formatter.format(rec.recommended_option.cost)}
                            </Typography>
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <Typography variant="caption" color="text.secondary">Recovery</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600, color: "success.main" }}>
                              {formatter.format(rec.recommended_option.recovery)}
                            </Typography>
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <Typography variant="caption" color="text.secondary">Feasibility</Typography>
                            <Box sx={{ display: "flex", alignItems: "center", gap: 1 }}>
                              <LinearProgress 
                                variant="determinate" 
                                value={rec.recommended_option.feasibility * 100} 
                                sx={{ flex: 1, height: 6, borderRadius: 3 }}
                              />
                              <Typography variant="body2" sx={{ fontWeight: 600 }}>
                                {(rec.recommended_option.feasibility * 100).toFixed(0)}%
                              </Typography>
                            </Box>
                          </Grid>
                          <Grid item xs={6} sm={3}>
                            <Typography variant="caption" color="text.secondary">Time</Typography>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {rec.recommended_option.time_hours}h
                            </Typography>
                          </Grid>
                        </Grid>
                        {onOptionSelect && (
                          <Typography variant="caption" sx={{ display: "block", mt: 1, fontStyle: "italic", color: "primary.main" }}>
                            Click to view detailed impact analysis
                          </Typography>
                        )}
                      </Paper>
                    </Box>
                  )}

                  <Box sx={{ display: "flex", justifyContent: "space-between", alignItems: "center", mt: 2 }}>
                    <Typography variant="body2" color="text.secondary">
                      {rec.all_options.length} alternative options available
                    </Typography>
                    <Box sx={{ display: "flex", gap: 1 }}>
                      <Button
                        variant="outlined"
                        size="small"
                        onClick={() => handleViewDetails(rec)}
                      >
                        View All Options
                      </Button>
                      {onOptionSelect && rec.recommended_option && (
                        <Button
                          variant="contained"
                          size="small"
                          onClick={() => onOptionSelect(rec.recommended_option!, rec)}
                          sx={{ bgcolor: "#1e3a8a", "&:hover": { bgcolor: "#1e40af" } }}
                        >
                          Analyze Impact
                        </Button>
                      )}
                      {onOptionAssistant && rec.recommended_option && (
                        <Button
                          variant="outlined"
                          size="small"
                          startIcon={<HelpIcon />}
                          onClick={() => onOptionAssistant(rec.recommended_option!, rec)}
                          sx={{
                            borderColor: "#1e3a8a",
                            color: "#1e3a8a",
                            "&:hover": {
                              borderColor: "#1e40af",
                              bgcolor: "rgba(30, 58, 138, 0.04)"
                            }
                          }}
                        >
                          AI Assistant
                        </Button>
                      )}
                    </Box>
                  </Box>
                </AccordionDetails>
              </Accordion>
            ))}
          </Box>
        </CardContent>
      </Card>

      {/* Detailed Options Dialog */}
      <Dialog 
        open={dialogOpen} 
        onClose={handleCloseDialog} 
        maxWidth="md" 
        fullWidth
      >
        <DialogTitle>
          All Options for {selectedRecommendation?.cargo_id}
        </DialogTitle>
        <DialogContent>
          {selectedRecommendation && (
            <Box>
              <Alert severity="info" sx={{ mb: 2 }}>
                Revenue at Risk: {formatter.format(selectedRecommendation.revenue_at_risk)} | 
                Priority: {selectedRecommendation.priority} | 
                Reason: {selectedRecommendation.denial_reason}
              </Alert>

              {selectedRecommendation.all_options.map((option, index) => (
                <Paper
                  key={index}
                  sx={{
                    p: 2,
                    mb: 2,
                    border: option === selectedRecommendation.recommended_option ? "2px solid #3b82f6" : "1px solid #e2e8f0",
                    background: option === selectedRecommendation.recommended_option
                      ? "linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)"
                      : "linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)",
                    borderRadius: 2,
                    cursor: onOptionSelect ? "pointer" : "default",
                    boxShadow: "0 2px 4px rgba(0, 0, 0, 0.1)",
                    "&:hover": onOptionSelect ? {
                      background: option === selectedRecommendation.recommended_option
                        ? "linear-gradient(135deg, #dbeafe 0%, #bfdbfe 100%)"
                        : "linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)",
                      transform: "translateY(-1px)",
                      boxShadow: "0 4px 12px rgba(0, 0, 0, 0.15)"
                    } : {}
                  }}
                  onClick={() => onOptionSelect && onOptionSelect(option, selectedRecommendation)}
                >
                  <Box sx={{ display: "flex", alignItems: "center", gap: 1, mb: 1 }}>
                    {optionTypeIcons[option.type as keyof typeof optionTypeIcons]}
                    <Typography variant="subtitle1" sx={{ fontWeight: 600 }}>
                      {optionTypeLabels[option.type as keyof typeof optionTypeLabels]}
                    </Typography>
                    <Chip 
                      label={option.risk} 
                      size="small" 
                      color={riskColors[option.risk as keyof typeof riskColors]}
                    />
                    {option === selectedRecommendation.recommended_option && (
                      <Chip label="RECOMMENDED" size="small" color="primary" />
                    )}
                  </Box>
                  
                  <Typography variant="body2" sx={{ mb: 1 }}>
                    {option.description}
                  </Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                    {option.impact}
                  </Typography>

                  <Grid container spacing={2} sx={{ mb: 2 }}>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">Cost</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {formatter.format(option.cost)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">Recovery</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600, color: "success.main" }}>
                        {formatter.format(option.recovery)}
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">Feasibility</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {(option.feasibility * 100).toFixed(0)}%
                      </Typography>
                    </Grid>
                    <Grid item xs={6} sm={3}>
                      <Typography variant="caption" color="text.secondary">Time</Typography>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>
                        {option.time_hours}h
                      </Typography>
                    </Grid>
                  </Grid>

                  <Typography variant="subtitle2" sx={{ mb: 1 }}>
                    Required Actions:
                  </Typography>
                  <List dense>
                    {option.actions.map((action, actionIndex) => (
                      <ListItem key={actionIndex} sx={{ py: 0.5 }}>
                        <ListItemIcon sx={{ minWidth: 32 }}>
                          <CheckCircleIcon fontSize="small" color="primary" />
                        </ListItemIcon>
                        <ListItemText 
                          primary={action} 
                          primaryTypographyProps={{ variant: "body2" }}
                        />
                      </ListItem>
                    ))}
                  </List>
                  {onOptionSelect && (
                    <Typography variant="caption" sx={{ display: "block", mt: 1, fontStyle: "italic", color: "primary.main" }}>
                      Click to view detailed impact analysis
                    </Typography>
                  )}
                </Paper>
              ))}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Box sx={{ display: "flex", gap: 1, width: "100%", justifyContent: "space-between", alignItems: "center" }}>
            <Box sx={{ display: "flex", gap: 1 }}>
              {onOptionAssistant && selectedRecommendation && selectedRecommendation.all_options.map((option, index) => (
                <Button
                  key={index}
                  variant="outlined"
                  size="small"
                  startIcon={<HelpIcon />}
                  onClick={() => {
                    onOptionAssistant(option, selectedRecommendation);
                    handleCloseDialog();
                  }}
                  sx={{
                    borderColor: "#1e3a8a",
                    color: "#1e3a8a",
                    "&:hover": {
                      borderColor: "#1e40af",
                      bgcolor: "rgba(30, 58, 138, 0.04)"
                    }
                  }}
                >
                  AI Assistant - {optionTypeLabels[option.type as keyof typeof optionTypeLabels]}
                </Button>
              ))}
            </Box>
            <Button onClick={handleCloseDialog}>Close</Button>
          </Box>
        </DialogActions>
      </Dialog>
    </>
  );
}