import { useState, useEffect } from "react";
import { Box, Container, CssBaseline, ThemeProvider, Alert, CircularProgress, Typography, Grid } from "@mui/material";
import dayjs, { Dayjs } from "dayjs";
import { runSample } from "../api/client";
import type { PlanResponse, RecommendationOption, CargoRecommendation } from "../api/types";
import { AIRecommendations } from "../components/AIRecommendations";
import { CargoAssignmentImpact } from "../components/CargoAssignmentImpact";
import { OptionAIAssistant } from "../components/OptionAIAssistant";
import { DateFilter } from "../components/DateFilter";
import { Navbar } from "../components/Navbar";
import { professionalTheme } from "../styles/theme";

const theme = professionalTheme;

export function AIRecommendationsPage() {
  const [data, setData] = useState<PlanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<Dayjs | null>(null);
  const [selectedOption, setSelectedOption] = useState<RecommendationOption | null>(null);
  const [selectedCargoRec, setSelectedCargoRec] = useState<CargoRecommendation | null>(null);
  const [assistantOption, setAssistantOption] = useState<RecommendationOption | null>(null);
  const [assistantCargoRec, setAssistantCargoRec] = useState<CargoRecommendation | null>(null);
  const [assistantOpen, setAssistantOpen] = useState(false);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await runSample();
        setData(response);
      } catch (err) {
        console.error(err);
        setError("Failed to load AI recommendations data. Please ensure the backend is running.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleDateChange = (date: Dayjs | null) => {
    setSelectedDate(date);
  };

  const handleClearFilter = () => {
    setSelectedDate(null);
  };

  const handleOptionSelect = (option: RecommendationOption, cargoRec: CargoRecommendation) => {
    setSelectedOption(option);
    setSelectedCargoRec(cargoRec);
  };

  const handleOptionAssistant = (option: RecommendationOption, cargoRec: CargoRecommendation) => {
    setAssistantOption(option);
    setAssistantCargoRec(cargoRec);
    setAssistantOpen(true);
  };

  const handleCloseAssistant = () => {
    setAssistantOpen(false);
    setAssistantOption(null);
    setAssistantCargoRec(null);
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
          Revenue Recovery Solutions
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
            <Grid item xs={12} lg={6}>
              <Typography variant="h5" sx={{ mb: 3, color: "#1e3a8a", fontWeight: 600 }}>
                AI Recommendations
              </Typography>
              {data.ai_recommendations && data.ai_recommendations.recommendations.length > 0 ? (
                <AIRecommendations
                  recommendations={data.ai_recommendations}
                  onOptionSelect={handleOptionSelect}
                  onOptionAssistant={handleOptionAssistant}
                />
              ) : (
                <Alert severity="success" sx={{ mb: 3 }}>
                  <strong>Great news!</strong> All cargo has been successfully placed. No AI recommendations needed at this time.
                </Alert>
              )}
            </Grid>

            <Grid item xs={12} lg={6}>
              <Typography variant="h5" sx={{ mb: 3, color: "#1e3a8a", fontWeight: 600 }}>
                Impact Analysis
              </Typography>
              {selectedOption && selectedCargoRec ? (
                <CargoAssignmentImpact
                  selectedOption={selectedOption}
                  cargoRecommendation={selectedCargoRec}
                />
              ) : (
                <Alert severity="info">
                  <strong>Select an option</strong> from the AI recommendations to see detailed impact analysis side-by-side.
                </Alert>
              )}
            </Grid>
          </Grid>
        )}

        {!data && !loading && !error && (
          <Alert severity="info" sx={{ mb: 3 }}>
            No data available for AI recommendations.
          </Alert>
        )}

        {/* Option AI Assistant Modal */}
        {assistantOption && assistantCargoRec && (
          <OptionAIAssistant
            open={assistantOpen}
            onClose={handleCloseAssistant}
            option={assistantOption}
            cargoRecommendation={assistantCargoRec}
          />
        )}
      </Container>
    </ThemeProvider>
  );
}