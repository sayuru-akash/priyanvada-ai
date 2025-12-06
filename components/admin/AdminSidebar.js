"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import {
  Box,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  Divider,
  Avatar,
} from "@mui/material";
import DashboardIcon from "@mui/icons-material/Dashboard";
import PeopleIcon from "@mui/icons-material/People";
import ChatIcon from "@mui/icons-material/Chat";
import StorageIcon from "@mui/icons-material/Storage";
import SmartToyIcon from "@mui/icons-material/SmartToy";
import LogoutIcon from "@mui/icons-material/Logout";
import SecurityIcon from "@mui/icons-material/Security";
import MonetizationOnIcon from "@mui/icons-material/MonetizationOn";
import { adminLogout } from "@/app/priyaadmin/actions";
import { useRouter } from "next/navigation";

const MENU_ITEMS = [
  { text: "Dashboard", icon: <DashboardIcon />, path: "/priyaadmin" },
  { text: "Users", icon: <PeopleIcon />, path: "/priyaadmin/users" },
  { text: "Chats", icon: <ChatIcon />, path: "/priyaadmin/chats" },
  {
    text: "Characters",
    icon: <SmartToyIcon />,
    path: "/priyaadmin/characters",
  },
  { text: "Leads", icon: <MonetizationOnIcon />, path: "/priyaadmin/leads" },
  { text: "Database", icon: <StorageIcon />, path: "/priyaadmin/database" },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  const handleLogout = async () => {
    await adminLogout();
    router.push("/priyanvadaadminlogin");
  };

  return (
    <Box
      sx={{
        width: 260,
        height: "100vh",
        bgcolor: "#111111",
        borderRight: "1px solid #333",
        display: "flex",
        flexDirection: "column",
        position: "fixed",
        left: 0,
        top: 0,
        zIndex: 1200,
        display: { xs: "none", md: "flex" },
      }}
    >
      {/* Header */}
      <Box sx={{ p: 3, display: "flex", alignItems: "center", gap: 2 }}>
        <Avatar sx={{ bgcolor: "primary.main", width: 40, height: 40 }}>
          <SecurityIcon />
        </Avatar>
        <Box>
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 700, color: "white", lineHeight: 1.2 }}
          >
            Priyanvada AI
          </Typography>
          <Typography variant="caption" sx={{ color: "text.secondary" }}>
            Admin Console
          </Typography>
        </Box>
      </Box>

      <Divider sx={{ borderColor: "#333" }} />

      {/* Navigation */}
      <List sx={{ px: 2, py: 2, flex: 1 }}>
        {MENU_ITEMS.map((item) => {
          const isActive = pathname === item.path;
          return (
            <ListItem key={item.text} disablePadding sx={{ mb: 1 }}>
              <Link
                href={item.path}
                style={{ textDecoration: "none", width: "100%" }}
              >
                <ListItemButton
                  sx={{
                    borderRadius: 2,
                    bgcolor: isActive
                      ? "rgba(59, 130, 246, 0.15)"
                      : "transparent",
                    color: isActive ? "#60a5fa" : "#a1a1aa",
                    "&:hover": {
                      bgcolor: isActive
                        ? "rgba(59, 130, 246, 0.25)"
                        : "rgba(255, 255, 255, 0.05)",
                      color: isActive ? "#60a5fa" : "white",
                    },
                  }}
                >
                  <ListItemIcon
                    sx={{
                      minWidth: 40,
                      color: "inherit",
                    }}
                  >
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText
                    primary={item.text}
                    primaryTypographyProps={{
                      fontSize: "0.95rem",
                      fontWeight: isActive ? 600 : 400,
                    }}
                  />
                </ListItemButton>
              </Link>
            </ListItem>
          );
        })}
      </List>

      <Divider sx={{ borderColor: "#333" }} />

      {/* Footer / Logout */}
      <Box sx={{ p: 2 }}>
        <ListItemButton
          onClick={handleLogout}
          sx={{
            borderRadius: 2,
            color: "#ef4444",
            "&:hover": {
              bgcolor: "rgba(239, 68, 68, 0.1)",
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 40, color: "inherit" }}>
            <LogoutIcon />
          </ListItemIcon>
          <ListItemText primary="Logout" />
        </ListItemButton>
      </Box>
    </Box>
  );
}
