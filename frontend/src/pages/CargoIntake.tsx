import { useState } from "react";
import { Container, CssBaseline, ThemeProvider, Typography, Alert, Box, CircularProgress } from "@mui/material";
import { professionalTheme } from "../styles/theme";
import { Navbar } from "../components/Navbar";
import { CargoInput } from "../components/CargoInput";
import { runSample } from "../api/client";

const theme = professionalTheme;

export function CargoIntake() {
  const [optimizationLoading, setOptimizationLoading] = useState(false);
  const [info, setInfo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleCargoAdded = () => {
    setInfo("Cargo added to portfolio. Optimization will run now.");
    setTimeout(() => setInfo(null), 3000);
  };

  const handleRunOptimization = async () => {
    setOptimizationLoading(true);
    setError(null);
    try {
      await runSample();
      setInfo("Optimization completed with the latest cargo included.");
      setTimeout(() => setInfo(null), 3000);
    } catch (e) {
      console.error(e);
      setError("Failed to run optimization. Please try again.");
    } finally {
      setOptimizationLoading(false);
    }
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Navbar />
      <Container maxWidth="xl" sx={{ py: 4 }}>
        <Typography variant="h4" sx={{ mb: 4, color: "#5D688A", fontWeight: 700 }}>
          Cargo Intake
        </Typography>

        {info && (
          <Alert severity="info" sx={{ mb: 2 }}>
            {info}
          </Alert>
        )}
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <CargoInput
          onCargoAdded={handleCargoAdded}
          onRunOptimization={handleRunOptimization}
          isLoading={optimizationLoading}
        />

        {optimizationLoading && (
          <Box sx={{ display: "flex", justifyContent: "center", py: 4 }}>
            <CircularProgress size={48} thickness={4} />
          </Box>
        )}
      </Container>
    </ThemeProvider>
  );
}

export default CargoIntake;