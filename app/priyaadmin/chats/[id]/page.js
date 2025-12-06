"use client";

import { useState, useEffect } from "react";
import {
  Box,
  Paper,
  Typography,
  Avatar,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Chip,
  Divider,
  Breadcrumbs,
  Link as MuiLink,
  TextField,
  InputAdornment,
  FormControlLabel,
  Checkbox,
  LinearProgress,
} from "@mui/material";
import Link from "next/link";
import { fetchChatMetadata, fetchChatMessages } from "../../chats/actions"; // Progressive loading actions
import PersonIcon from "@mui/icons-material/Person";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import SearchIcon from "@mui/icons-material/Search";

// Use a workaround because params are promises in newer Next.js versions for client components?
// Actually params prop in page.js is standard.
// However, since this is 'use client', we receive params directly.
// In Next.js 15, params is asynchronous in some contexts, but usually passed as prop.
// Let's use `use` from react if needed, or just standard prop access which works in Page components mostly.

export default function ChatDetailPage({ params }) {
  const [chatId, setChatId] = useState(null);

  const [metadata, setMetadata] = useState(null);
  const [messages, setMessages] = useState([]);

  const [loadingMeta, setLoadingMeta] = useState(true);
  const [loadingMsgs, setLoadingMsgs] = useState(false);

  // Filters
  const [searchTerm, setSearchTerm] = useState("");
  const [filterImages, setFilterImages] = useState(false);

  useEffect(() => {
    // Unwrap params safely
    Promise.resolve(params).then((p) => {
      setChatId(p.id);
    });
  }, [params]);

  useEffect(() => {
    if (chatId) {
      setLoadingMeta(true);
      fetchChatMetadata(chatId).then((res) => {
        if (res.success) {
          setMetadata(res.data);
          setLoadingMeta(false);

          // Start loading messages
          setLoadingMsgs(true);
          fetchChatMessages(chatId).then((msgRes) => {
            if (msgRes.success) {
              setMessages(msgRes.data || []);
            }
            setLoadingMsgs(false);
          });
        } else {
          setLoadingMeta(false);
        }
      });
    }
  }, [chatId]);

  if (loadingMeta) return <Box p={4}>Loading chat details...</Box>;
  if (!metadata) return <Box p={4}>Chat not found.</Box>;

  // Filter Logic
  const filteredMessages = messages.filter((msg) => {
    // Image Check using the same logic we use for rendering to be consistent
    let hasImages = false;
    if (msg.images && msg.images !== "null") {
      if (Array.isArray(msg.images) && msg.images.length > 0) hasImages = true;
      else if (typeof msg.images === "string" && msg.images.trim().length > 0)
        hasImages = true;
    }

    if (filterImages && !hasImages) return false;

    if (searchTerm) {
      const content = (msg.content || "").toLowerCase();
      if (!content.includes(searchTerm.toLowerCase())) return false;
    }

    return true;
  });

  return (
    <Box>
      {/* Header */}
      <Box mb={3}>
        <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 2 }}>
          <MuiLink component={Link} href="/priyaadmin/chats" color="inherit">
            Chats
          </MuiLink>
          <Typography color="text.primary">
            Session {metadata.id.substring(0, 8)}...
          </Typography>
        </Breadcrumbs>

        <Paper
          sx={{ p: 3, display: "flex", alignItems: "center", gap: 3, mb: 3 }}
        >
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Link
              href={`/priyaadmin/users/${metadata.user_id}`}
              style={{
                textDecoration: "none",
                color: "inherit",
                display: "flex",
                alignItems: "center",
                gap: 16,
              }}
            >
              <Avatar src={metadata.user?.avatar_url}>
                <PersonIcon />
              </Avatar>
              <Box>
                <Typography variant="subtitle2" color="text.secondary">
                  User
                </Typography>
                <Typography
                  variant="h6"
                  sx={{ "&:hover": { textDecoration: "underline" } }}
                >
                  {metadata.user?.email || "Guest"}
                </Typography>
              </Box>
            </Link>
          </Box>
          <Divider orientation="vertical" flexItem />
          <Box sx={{ display: "flex", alignItems: "center", gap: 2 }}>
            <Avatar src={metadata.character_avatar} variant="rounded">
              <SmartToyIcon />
            </Avatar>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">
                Character
              </Typography>
              <Typography variant="h6">{metadata.character_name}</Typography>
            </Box>
          </Box>
        </Paper>
      </Box>

      {/* Chat Log */}
      <Paper sx={{ p: 0, overflow: "hidden" }}>
        <Box
          sx={{
            p: 2,
            bgcolor: "#1a1a1a",
            borderBottom: "1px solid #333",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 2,
          }}
        >
          <Typography variant="subtitle1">
            Transcript (
            {loadingMsgs ? metadata.message_count : filteredMessages.length}{" "}
            messages)
          </Typography>

          <Box display="flex" gap={2} alignItems="center">
            <FormControlLabel
              control={
                <Checkbox
                  checked={filterImages}
                  onChange={(e) => setFilterImages(e.target.checked)}
                  size="small"
                  disabled={loadingMsgs}
                />
              }
              label={<Typography variant="body2">Images Only</Typography>}
            />
            <TextField
              size="small"
              placeholder="Search transcript..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              sx={{ width: 200 }}
              disabled={loadingMsgs}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon
                      fontSize="small"
                      sx={{ color: "text.secondary" }}
                    />
                  </InputAdornment>
                ),
              }}
            />
          </Box>
        </Box>

        {loadingMsgs ? (
          <Box
            p={4}
            display="flex"
            flexDirection="column"
            gap={2}
            alignItems="center"
          >
            <Typography variant="body2" color="text.secondary">
              Loading {metadata.message_count} messages...
            </Typography>
            <LinearProgress
              color="secondary"
              sx={{ width: "100%", maxWidth: 400 }}
            />
          </Box>
        ) : (
          <List
            sx={{
              maxHeight: "70vh",
              overflow: "auto",
              p: 3,
              bgcolor: "#0a0a0a",
            }}
          >
            {filteredMessages.map((msg, idx) => {
              let images = [];
              // Robust Image Parsing
              if (msg.images && msg.images !== "null") {
                if (Array.isArray(msg.images)) {
                  images = msg.images;
                } else if (typeof msg.images === "string") {
                  const trimmed = msg.images.trim();
                  if (trimmed.startsWith("[") || trimmed.startsWith("{")) {
                    try {
                      const parsed = JSON.parse(trimmed);
                      if (Array.isArray(parsed)) images = parsed;
                      else images = [parsed]; // parsed could be object or string
                    } catch (e) {
                      // If JSON parse fails, usually means malformed string or comma separated
                      images = trimmed
                        .split(",")
                        .map((s) => s.trim())
                        .filter(Boolean);
                    }
                  } else {
                    // Plain string or comma separated
                    images = trimmed
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean);
                  }
                }
              }

              // Normalize: Handle { url: ... } objects from Cloudinary
              images = images
                .map((img) => {
                  if (typeof img === "string") return img;
                  if (typeof img === "object" && img && img.url) return img.url;
                  return null;
                })
                .filter(Boolean);

              return (
                <ListItem
                  key={msg.id || idx}
                  alignItems="flex-start"
                  sx={{
                    mb: 2,
                    flexDirection: msg.role === "user" ? "row-reverse" : "row",
                    gap: 2,
                  }}
                >
                  <ListItemAvatar>
                    <Avatar
                      src={
                        msg.role === "user"
                          ? metadata.user?.avatar_url
                          : metadata.character_avatar
                      }
                      sx={{
                        bgcolor:
                          msg.role === "user"
                            ? "primary.main"
                            : "secondary.main",
                        width: 32,
                        height: 32,
                      }}
                    >
                      {msg.role === "user" ? (
                        <PersonIcon fontSize="small" />
                      ) : (
                        <SmartToyIcon fontSize="small" />
                      )}
                    </Avatar>
                  </ListItemAvatar>
                  <Paper
                    sx={{
                      p: 2,
                      maxWidth: "80%",
                      bgcolor: msg.role === "user" ? "#1e3a8a" : "#27272a",
                      borderRadius: 4,
                      borderTopRightRadius: msg.role === "user" ? 0 : 16,
                      borderTopLeftRadius: msg.role === "user" ? 16 : 0,
                    }}
                  >
                    <ListItemText
                      primary={
                        <Typography
                          variant="body1"
                          sx={{ whiteSpace: "pre-wrap" }}
                        >
                          {(() => {
                            if (!searchTerm || !msg.content) return msg.content;
                            // Escape regex special characters in search term to prevent crashes
                            const escapedSearch = searchTerm.replace(
                              /[.*+?^${}()|[\]\\]/g,
                              "\\$&"
                            );
                            const parts = msg.content.split(
                              new RegExp(`(${escapedSearch})`, "gi")
                            );
                            return parts.map((part, index) =>
                              part.toLowerCase() ===
                              searchTerm.toLowerCase() ? (
                                <Box
                                  component="span"
                                  key={index}
                                  sx={{
                                    bgcolor: "#fde047",
                                    color: "black",
                                    fontWeight: "bold",
                                    borderRadius: "2px",
                                    px: "2px",
                                  }}
                                >
                                  {part}
                                </Box>
                              ) : (
                                part
                              )
                            );
                          })()}
                        </Typography>
                      }
                      secondary={
                        <Typography
                          variant="caption"
                          sx={{
                            color: "rgba(255,255,255,0.4)",
                            mt: 1,
                            display: "block",
                          }}
                        >
                          {new Date(msg.timestamp).toLocaleString()}
                        </Typography>
                      }
                    />
                    {images.length > 0 && (
                      <Box mt={2} display="flex" gap={1} flexWrap="wrap">
                        {images.map((img, i) => (
                          <Box
                            key={i}
                            component="img"
                            src={img}
                            alt="Generated"
                            sx={{
                              maxWidth: "100%",
                              maxHeight: 300,
                              borderRadius: 2,
                              border: "1px solid rgba(255,255,255,0.1)",
                            }}
                          />
                        ))}
                      </Box>
                    )}
                  </Paper>
                </ListItem>
              );
            })}
            {filteredMessages.length === 0 && (
              <Typography color="text.secondary" align="center" py={4}>
                {searchTerm || filterImages
                  ? "No matching messages."
                  : "No messages in this session."}
              </Typography>
            )}
          </List>
        )}
      </Paper>
    </Box>
  );
}
