"use client";

import { Box, CssBaseline, ThemeProvider, createTheme } from "@mui/material";
import AdminSidebar from "@/components/admin/AdminSidebar";

// Create a dark theme instance for the admin panel
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
    h4: {
      fontWeight: 700,
    },
    h5: {
      fontWeight: 600,
    },
    h6: {
      fontWeight: 600,
    },
  },
  shape: {
    borderRadius: 12,
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: "none",
          borderRadius: 8,
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: "none",
          border: "1px solid #333",
        },
      },
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: "1px solid #333",
        },
        head: {
          color: "#a1a1aa",
          fontWeight: 600,
          backgroundColor: "#111111",
        },
      },
    },
  },
});

export default function AdminLayout({ children }) {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Box
        sx={{
          display: "flex",
          minHeight: "100vh",
          bgcolor: "background.default",
        }}
      >
        <AdminSidebar />
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            ml: { xs: 0, md: "260px" }, // No margin on mobile
            p: { xs: 2, md: 4 },
            minWidth: 0, // Prevent flex child from overflowing
            overflowX: "hidden", // Changed from auto to hidden to prevent double scrollbars
          }}
        >
          {children}
        </Box>
      </Box>
    </ThemeProvider>
  );
}
