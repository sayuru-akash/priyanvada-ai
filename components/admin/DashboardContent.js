"use client";

import { Grid, Typography, Box, Paper } from "@mui/material";
import ChatIcon from "@mui/icons-material/Chat";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import MessageIcon from "@mui/icons-material/Message";
import PeopleIcon from "@mui/icons-material/People";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import StatCard from "@/components/admin/StatCard";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
} from "recharts";

export default function DashboardContent({ stats }) {
  if (!stats)
    return (
      <Typography color="error">Failed to load dashboard data.</Typography>
    );

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography
          variant="h4"
          sx={{ color: "white", mb: 1, fontWeight: "bold" }}
        >
          Dashboard
        </Typography>
        <Typography variant="body1" sx={{ color: "text.secondary" }}>
          Real-time platform analytics
        </Typography>
      </Box>

      {/* KPI Cards */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Users"
            value={stats.totalUsers}
            icon={<PeopleIcon />}
            color="primary"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Conversations"
            value={stats.totalChats}
            icon={<ChatIcon />}
            color="success"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Total Messages"
            value={stats.totalMessages}
            icon={<MessageIcon />}
            color="warning"
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard
            title="Interested Leads"
            value={stats.totalLeads}
            icon={<MonetizationOnIcon />}
            color="info"
          />
        </Grid>
      </Grid>

      {/* Charts */}
      <Grid container spacing={3} mb={4}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: 400, bgcolor: "#1a1a1a" }}>
            <Typography variant="h6" mb={2}>
              User Growth (Last 30 Days)
            </Typography>
            <ResponsiveContainer width="100%" height="90%">
              <AreaChart data={stats.growth}>
                <defs>
                  <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8884d8" stopOpacity={0.8} />
                    <stop offset="95%" stopColor="#8884d8" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" stroke="#555" tick={{ fill: "#888" }} />
                <YAxis stroke="#555" tick={{ fill: "#888" }} />
                <CartesianGrid strokeDasharray="3 3" stroke="#333" />
                <Tooltip
                  contentStyle={{ backgroundColor: "#333", border: "none" }}
                />
                <Area
                  type="monotone"
                  dataKey="count"
                  stroke="#8884d8"
                  fillOpacity={1}
                  fill="url(#colorCount)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3, height: 400, bgcolor: "#1a1a1a" }}>
            <Typography variant="h6" mb={2}>
              Top Characters
            </Typography>
            <ResponsiveContainer width="100%" height="90%">
              <BarChart data={stats.topCharacters} layout="vertical">
                <XAxis type="number" stroke="#555" hide />
                <YAxis
                  dataKey="name"
                  type="category"
                  width={100}
                  stroke="#555"
                  tick={{ fill: "#eee", fontSize: 12 }}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: "#333", border: "none" }}
                  cursor={{ fill: "transparent" }}
                />
                <Bar
                  dataKey="sessions"
                  fill="#82ca9d"
                  barSize={20}
                  radius={[0, 4, 4, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
