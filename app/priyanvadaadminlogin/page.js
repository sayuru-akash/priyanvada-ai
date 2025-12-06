"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Box,
  Button,
  Container,
  TextField,
  Typography,
  Paper,
  Alert,
  CircularProgress,
} from "@mui/material";
import { createTheme, ThemeProvider } from "@mui/material/styles";
import SecurityIcon from "@mui/icons-material/Security";
import LoginIcon from "@mui/icons-material/Login";
import { adminLogin } from "./actions";

// Create a dark theme instance
const darkTheme = createTheme({
  palette: {
    mode: "dark",
    primary: {
      main: "#3b82f6", // bright blue
    },
    background: {
      default: "#000000",
      paper: "#111111",
    },
    text: {
      primary: "#ffffff",
      secondary: "#a1a1aa",
    },
  },
  typography: {
    fontFamily:
      '"SF Display", -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          fontSize: "1rem",
          fontWeight: 600,
          padding: "10px 24px",
        },
      },
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          "& .MuiOutlinedInput-root": {
            "& fieldset": {
              borderColor: "#333",
            },
            "&:hover fieldset": {
              borderColor: "#555",
            },
          },
        },
      },
    },
  },
});

export default function AdminLogin() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const result = await adminLogin(username, password);

      if (result.success) {
        router.push("/priyaadmin");
      } else {
        setError(result.message || "Invalid credentials");
      }
    } catch (err) {
      setError("An unexpected error occurred");
    } finally {
      setLoading(false);
    }
  };

  return (
    <ThemeProvider theme={darkTheme}>
      <Box
        sx={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          bgcolor: "background.default",
          backgroundImage:
            "radial-gradient(circle at 50% 0%, #1a1a1a 0%, #000000 70%)",
        }}
      >
        <Container maxWidth="xs">
          <Paper
            elevation={24}
            sx={{
              p: 4,
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              bgcolor: "rgba(17, 17, 17, 0.8)",
              backdropFilter: "blur(20px)",
              border: "1px solid #333",
            }}
          >
            <Box
              sx={{
                width: 56,
                height: 56,
                borderRadius: "50%",
                bgcolor: "primary.main",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mb: 2,
                boxShadow: "0 0 20px rgba(59, 130, 246, 0.5)",
              }}
            >
              <SecurityIcon sx={{ color: "white", fontSize: 32 }} />
            </Box>

            <Typography
              component="h1"
              variant="h5"
              sx={{ fontWeight: 700, mb: 1 }}
            >
              Admin Access
            </Typography>

            <Typography variant="body2" color="text.secondary" sx={{ mb: 4 }}>
              Priyanvada AI Control Center
            </Typography>

            <Box
              component="form"
              onSubmit={handleSubmit}
              sx={{ width: "100%" }}
            >
              {error && (
                <Alert
                  severity="error"
                  sx={{
                    mb: 3,
                    borderRadius: 2,
                    bgcolor: "rgba(211, 47, 47, 0.1)",
                    color: "#ff8a80",
                  }}
                >
                  {error}
                </Alert>
              )}

              <TextField
                margin="normal"
                required
                fullWidth
                id="username"
                label="Username"
                name="username"
                autoComplete="off"
                autoFocus
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                sx={{ mb: 2 }}
              />

              <TextField
                margin="normal"
                required
                fullWidth
                name="password"
                label="Password"
                type="password"
                id="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                sx={{ mb: 4 }}
              />

              <Button
                type="submit"
                fullWidth
                variant="contained"
                disabled={loading}
                startIcon={!loading && <LoginIcon />}
                sx={{
                  py: 1.5,
                  position: "relative",
                  overflow: "hidden",
                  background:
                    "linear-gradient(45deg, #2563eb 30%, #3b82f6 90%)",
                }}
              >
                {loading ? (
                  <CircularProgress size={24} color="inherit" />
                ) : (
                  "Authenticate System"
                )}
              </Button>
            </Box>
          </Paper>

          <Typography
            variant="caption"
            align="center"
            sx={{
              display: "block",
              mt: 4,
              color: "text.secondary",
              opacity: 0.5,
            }}
          >
            Restricted Area • Authorized Personnel Only
          </Typography>
        </Container>
      </Box>
    </ThemeProvider>
  );
}
