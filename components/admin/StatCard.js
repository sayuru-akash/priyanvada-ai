"use client";

import { Paper, Box, Typography, Avatar } from "@mui/material";

export default function StatCard({
  title,
  value,
  subtext,
  icon,
  color = "primary",
}) {
  return (
    <Paper
      elevation={0}
      sx={{
        p: 3,
        height: "100%",
        bgcolor: "#111111",
        border: "1px solid #333",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        transition: "transform 0.2s, box-shadow 0.2s",
        "&:hover": {
          transform: "translateY(-2px)",
          boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
          borderColor: "#444",
        },
      }}
    >
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          mb: 2,
        }}
      >
        <Box>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            {title}
          </Typography>
          <Typography variant="h4" color="text.primary">
            {value}
          </Typography>
        </Box>
        <Avatar
          sx={{
            bgcolor: `${color}.main`,
            color: "white",
            width: 48,
            height: 48,
            opacity: 0.9,
          }}
        >
          {icon}
        </Avatar>
      </Box>
      {subtext && (
        <Typography variant="caption" color="text.secondary">
          {subtext}
        </Typography>
      )}

      {/* Decorative gradient blob */}
      <Box
        sx={{
          position: "absolute",
          top: -20,
          right: -20,
          width: 100,
          height: 100,
          borderRadius: "50%",
          bgcolor: `${color}.main`,
          opacity: 0.05,
          filter: "blur(30px)",
          zIndex: 0,
          pointerEvents: "none",
        }}
      />
    </Paper>
  );
}
