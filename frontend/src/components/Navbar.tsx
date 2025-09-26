import { AppBar, Toolbar, Typography, Button, Box, Avatar } from "@mui/material";
import { Link, useLocation } from "react-router-dom";
import { BusinessCenter, Analytics, TrendingUp, Flight, Dashboard, Assessment, AddCircle } from "@mui/icons-material";

export function Navbar() {
  const location = useLocation();

  const navItems = [
    { path: "/cargo-intake", label: "Cargo Intake", icon: <AddCircle /> },
    { path: "/", label: "Dashboard", icon: <Dashboard /> },
    { path: "/flight-capacity", label: "Flight Capacity", icon: <Flight /> },
    { path: "/revenue", label: "Revenue Analysis", icon: <Analytics /> },
    { path: "/revenue-recovery", label: "Revenue Recovery", icon: <TrendingUp /> },
    { path: "/disruptions", label: "Disruptions", icon: <Assessment /> }
  ];

  return (
    <AppBar
      position="static"
      elevation={0}
      sx={{
        background: "linear-gradient(135deg, #1e3a8a 0%, #1e40af 100%)",
        borderBottom: "1px solid rgba(255,255,255,0.1)",
        backdropFilter: "blur(10px)"
      }}
    >
      <Toolbar sx={{ py: 1 }}>
        <Box sx={{ display: "flex", alignItems: "center", flexGrow: 1 }}>
          <Avatar
            sx={{
              bgcolor: "rgba(255,255,255,0.1)",
              mr: 2,
              width: 40,
              height: 40
            }}
          >
            <BusinessCenter sx={{ color: "white" }} />
          </Avatar>
          <Typography
            variant="h6"
            component="div"
            sx={{
              fontWeight: 700,
              letterSpacing: "0.5px",
              color: "white",
              fontSize: "1.1rem"
            }}
          >
            Revenue Management System
          </Typography>
        </Box>
        <Box sx={{ display: "flex", gap: 0.5 }}>
          {navItems.map((item) => (
            <Button
              key={item.path}
              color="inherit"
              component={Link}
              to={item.path}
              startIcon={item.icon}
              sx={{
                borderRadius: 3,
                px: 2.5,
                py: 1,
                fontWeight: 600,
                fontSize: "0.875rem",
                transition: "all 0.2s ease-in-out",
                backgroundColor: location.pathname === item.path ? "rgba(255, 255, 255, 0.15)" : "transparent",
                backdropFilter: "blur(10px)",
                border: location.pathname === item.path ? "1px solid rgba(255, 255, 255, 0.2)" : "1px solid transparent",
                "&:hover": {
                  backgroundColor: "rgba(255, 255, 255, 0.2)",
                  transform: "translateY(-1px)",
                  boxShadow: "0 4px 12px rgba(0,0,0,0.15)"
                }
              }}
            >
              {item.label}
            </Button>
          ))}
        </Box>
      </Toolbar>
    </AppBar>
  );
}