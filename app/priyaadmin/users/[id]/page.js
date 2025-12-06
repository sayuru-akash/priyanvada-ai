"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Avatar,
  Grid,
  Chip,
  Divider,
  Breadcrumbs,
  Link as MuiLink,
  Button,
} from "@mui/material";
import Link from "next/link";
import { fetchUserDetails, fetchUserChats } from "../details-actions";
import DataGrid from "@/components/admin/DataGrid";
import PersonIcon from "@mui/icons-material/Person";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import VisibilityIcon from "@mui/icons-material/Visibility";
import ImageIcon from "@mui/icons-material/Image";

export default function UserDetailPage({ params }) {
  const [userId, setUserId] = useState(null);
  const [userData, setUserData] = useState(null);
  const [chats, setChats] = useState([]);
  const [loadingUser, setLoadingUser] = useState(true);
  const [loadingChats, setLoadingChats] = useState(false);

  // Pagination state
  const [page, setPage] = useState(0);
  const [totalChats, setTotalChats] = useState(0);

  // Unwrap params
  useEffect(() => {
    Promise.resolve(params).then((p) => setUserId(p.id));
  }, [params]);

  // Load User Profile
  useEffect(() => {
    if (userId) {
      fetchUserDetails(userId).then((res) => {
        if (res.success) setUserData(res.data);
        setLoadingUser(false);
      });
    }
  }, [userId]);

  // Load User Chats (paginated)
  useEffect(() => {
    if (userId) {
      const loadChats = async () => {
        setLoadingChats(true);
        const offset = page * 10;
        const res = await fetchUserChats(userId, offset, 10);
        if (res.success) {
          setChats(res.data);
          setTotalChats(res.count);
        }
        setLoadingChats(false);
      };
      loadChats();
    }
  }, [userId, page]);

  if (loadingUser) return <Box p={4}>Loading user profile...</Box>;
  if (!userData) return <Box p={4}>User not found.</Box>;

  const { user, stats } = userData;

  const columns = [
    {
      id: "character_avatar",
      label: "Character",
      width: 60,
      format: (val, row) => (
        <Avatar
          src={val || row.character_avatar}
          alt={row.character_name}
          variant="rounded"
        />
      ),
    },
    { id: "character_name", label: "Name", minWidth: 150 },
    {
      id: "title",
      label: "Title",
      minWidth: 150,
      format: (val) => (
        <Typography variant="body2">{val || "Untitled Chat"}</Typography>
      ),
    },
    {
      id: "message_count",
      label: "Msgs",
      format: (val) => (
        <Chip label={val || 0} size="small" variant="outlined" />
      ),
    },
    {
      id: "has_images",
      label: "Media",
      align: "center",
      format: (val) =>
        val ? (
          <Chip
            icon={<ImageIcon />}
            label="Images"
            size="small"
            color="secondary"
          />
        ) : (
          "-"
        ),
    },
    {
      id: "updated_at",
      label: "Last Active",
      minWidth: 180,
      format: (value) => new Date(value).toLocaleString(),
    },
    {
      id: "actions",
      label: "Actions",
      align: "right",
      format: (_, row) => (
        <Button
          size="small"
          startIcon={<VisibilityIcon />}
          component={Link}
          href={`/priyaadmin/chats/${row.id}`}
        >
          Log
        </Button>
      ),
    },
  ];

  return (
    <Box>
      {/* Header */}
      <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 3 }}>
        <MuiLink component={Link} href="/priyaadmin/users" color="inherit">
          Users
        </MuiLink>
        <Typography color="text.primary">
          {user.full_name || user.email}
        </Typography>
      </Breadcrumbs>

      <Box
        sx={{ display: "flex", flexDirection: "column", gap: 4, width: "100%" }}
      >
        {/* Profile Card - Full Width */}
        <Paper sx={{ p: 4, width: "100%" }}>
          <Box
            sx={{
              display: "flex",
              flexDirection: { xs: "column", md: "row" },
              alignItems: "center",
              gap: 4,
            }}
          >
            {/* Avatar & Basic Info */}
            <Box
              sx={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                minWidth: 200,
              }}
            >
              <Avatar
                src={user.avatar_url}
                sx={{
                  width: 100,
                  height: 100,
                  mb: 2,
                  bgcolor: "primary.main",
                  fontSize: 36,
                }}
              >
                {user.full_name ? (
                  user.full_name[0]
                ) : (
                  <PersonIcon fontSize="inherit" />
                )}
              </Avatar>
              <Chip
                label={user.username || "Guest"}
                size="small"
                variant="outlined"
              />
            </Box>

            <Divider
              orientation="vertical"
              flexItem
              sx={{ display: { xs: "none", md: "block" } }}
            />

            {/* Details */}
            <Box sx={{ flex: 1, textAlign: { xs: "center", md: "left" } }}>
              <Typography variant="h4" fontWeight="bold" gutterBottom>
                {user.full_name || "No Name"}
              </Typography>
              <Typography variant="h6" color="text.secondary" gutterBottom>
                {user.email}
              </Typography>

              <Box
                sx={{
                  mt: 2,
                  display: "flex",
                  gap: 3,
                  justifyContent: { xs: "center", md: "flex-start" },
                  flexWrap: "wrap",
                }}
              >
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                  >
                    USER ID
                  </Typography>
                  <Typography variant="body2">{user.id}</Typography>
                </Box>
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                  >
                    JOINED
                  </Typography>
                  <Typography variant="body2">
                    {new Date(user.created_at).toLocaleDateString()}
                  </Typography>
                </Box>
                <Box>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    display="block"
                  >
                    STATUS
                  </Typography>
                  <Chip
                    label="Active"
                    color="success"
                    size="small"
                    sx={{ height: 20 }}
                  />
                </Box>
              </Box>
            </Box>

            {/* Stats Grid */}
            <Grid
              container
              spacing={2}
              sx={{
                bgcolor: "background.default",
                p: 2,
                borderRadius: 2,
                border: "1px solid",
                borderColor: "divider",
                mt: { xs: 3, md: 0 },
                width: { xs: "100%", md: "auto" },
                minWidth: { md: 300 },
              }}
            >
              <Grid
                item
                xs={6}
                md={6}
                sx={{
                  textAlign: "center",
                  borderRight: "1px solid",
                  borderColor: "divider",
                }}
              >
                <Typography variant="h4" color="primary.main" fontWeight="bold">
                  {stats.total_chats}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", lineHeight: 1.2 }}
                >
                  Total Chats
                </Typography>
              </Grid>
              <Grid item xs={6} md={6} sx={{ textAlign: "center" }}>
                <Typography variant="h4" color="warning.main" fontWeight="bold">
                  {stats.total_messages}
                </Typography>
                <Typography
                  variant="caption"
                  color="text.secondary"
                  sx={{ display: "block", lineHeight: 1.2 }}
                >
                  Total Messages
                </Typography>
              </Grid>
            </Grid>
          </Box>
        </Paper>

        {/* Data Hungry Chats Table - Full Width */}
        <Box sx={{ width: "100%" }}>
          <DataGrid
            title="Conversation History"
            columns={columns}
            rows={chats}
            loading={loadingChats}
            rowCount={totalChats}
            page={page}
            pageSize={10}
            onPageChange={setPage}
            searchPlaceholder="Filter chats..."
          />
        </Box>
      </Box>
    </Box>
  );
}
