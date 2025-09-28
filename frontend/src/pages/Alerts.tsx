import { useState, useEffect } from "react";
import { Box, Container, CssBaseline, ThemeProvider, createTheme, Alert, CircularProgress } from "@mui/material";
import { runSample } from "../api/client";
import type { PlanResponse } from "../api/types";
import { AlertsPanel } from "../components/AlertsPanel";
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

export function Alerts() {
  const [data, setData] = useState<PlanResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        setError(null);
        const response = await runSample();
        setData(response);
      } catch (err) {
        console.error(err);
        setError("Failed to load alerts data. Please ensure the backend is running.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

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
          <Box>
            <AlertsPanel alerts={data.alerts} />
          </Box>
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