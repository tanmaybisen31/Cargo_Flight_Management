import { useState, useEffect } from "react";
import { Box, Container, CssBaseline, Grid, ThemeProvider, createTheme, Alert, CircularProgress } from "@mui/material";
import { runSample, runPlan } from "../api/client";
import type { DisruptionRequest, PlanResponse } from "../api/types";
import { DisruptionForm } from "../components/DisruptionForm";
import { DisruptionImpact } from "../components/DisruptionImpact";
import { Navbar } from "../components/Navbar";

const theme = createTheme({
  palette: {
    background: {
      default: "#E7F2EF"
    },
    primary: {
      main: "#5D688A"
    },
    secondary: {
      main: "#5D688A"
    }
  },
  typography: {
    fontFamily: "Inter, system-ui"
  }
});

export function Disruptions() {
  const [data, setData] = useState<PlanResponse | null>(null);
  const [originalData, setOriginalData] = useState<PlanResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await runSample();
        setData(response);
        setOriginalData(response);
      } catch (err) {
        console.error(err);
        setError("Failed to load disruption data. Please ensure the backend is running.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const handleRunScenario = async (events: DisruptionRequest[]) => {
    try {
      setLoading(true);
      setError(null);
      const response = await runPlan({ events, write_outputs: false });
      setData(response);
    } catch (err) {
      console.error(err);
      setError("Failed to run scenario. Please check your connection.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Navbar />
      <Container maxWidth="xl" sx={{ py: 4 }}>
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
            <Grid item xs={12} md={4}>
              <DisruptionForm
                flights={Object.keys(data.flights)}
                onRun={handleRunScenario}
                loading={loading}
              />
            </Grid>
            <Grid item xs={12} md={8}>
              {originalData && <DisruptionImpact originalData={originalData} disruptedData={data} />}
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