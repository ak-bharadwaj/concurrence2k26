"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Search,
  Filter,
  CheckCircle,
  XCircle,
  Clock,
  IndianRupee,
  Users,
  Calendar,
  Phone,
  Mail,
  Building2,
  GraduationCap,
  Trash2,
  LogOut,
  ChevronDown,
  ChevronUp,
  AlertCircle,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { events } from "@/lib/data";
import {
  updatePaymentStatus,
  deleteRegistration,
  signOut,
  type PaymentStatus,
} from "@/app/actions/admin";
import { cn } from "@/lib/utils";

interface Registration {
  id: string;
  registration_id: string;
  full_name: string;
  email: string;
  phone: string;
  college: string;
  department: string;
  year_of_study: string;
  selected_events: string[];
  transaction_id: string;
  total_fee: number;
  payment_status: PaymentStatus;
  admin_notes: string | null;
  verified_by: string | null;
  verified_at: string | null;
  created_at: string;
}

interface AdminDashboardProps {
  registrations: Registration[];
  userEmail: string;
}

export function AdminDashboard({
  registrations,
  userEmail,
}: AdminDashboardProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const filteredRegistrations = registrations.filter((reg) => {
    const matchesSearch =
      reg.full_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reg.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reg.registration_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reg.transaction_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      reg.phone.includes(searchQuery);

    const matchesStatus =
      statusFilter === "all" || reg.payment_status === statusFilter;

    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: registrations.length,
    pending: registrations.filter((r) => r.payment_status === "pending").length,
    verified: registrations.filter((r) => r.payment_status === "verified")
      .length,
    rejected: registrations.filter((r) => r.payment_status === "rejected")
      .length,
    totalRevenue: registrations
      .filter((r) => r.payment_status === "verified")
      .reduce((sum, r) => sum + r.total_fee, 0),
  };

  const handleStatusUpdate = async (
    registrationId: string,
    status: PaymentStatus
  ) => {
    setActionLoading(registrationId);
    startTransition(async () => {
      await updatePaymentStatus(registrationId, status);
      setActionLoading(null);
    });
  };

  const handleDelete = async (registrationId: string) => {
    if (!confirm("Are you sure you want to delete this registration?")) return;
    setActionLoading(registrationId);
    startTransition(async () => {
      await deleteRegistration(registrationId);
      setActionLoading(null);
    });
  };

  const handleSignOut = () => {
    startTransition(async () => {
      await signOut();
      router.push("/admin/login");
    });
  };

  const getEventName = (slug: string) => {
    return events.find((e) => e.slug === slug)?.name || slug;
  };

  const getStatusColor = (status: PaymentStatus) => {
    switch (status) {
      case "verified":
        return "bg-green-500/20 text-green-400 border-green-500/30";
      case "rejected":
        return "bg-red-500/20 text-red-400 border-red-500/30";
      default:
        return "bg-yellow-500/20 text-yellow-400 border-yellow-500/30";
    }
  };

  const getStatusIcon = (status: PaymentStatus) => {
    switch (status) {
      case "verified":
        return <CheckCircle className="w-4 h-4" />;
      case "rejected":
        return <XCircle className="w-4 h-4" />;
      default:
        return <Clock className="w-4 h-4" />;
    }
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <div className="sticky top-16 z-40 glass border-b border-white/10">
        <div className="container mx-auto px-4 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-foreground">
                Admin Dashboard
              </h1>
              <p className="text-sm text-muted-foreground">{userEmail}</p>
            </div>
            <Button
              variant="outline"
              onClick={handleSignOut}
              disabled={isPending}
              className="w-full sm:w-auto bg-transparent"
            >
              <LogOut className="w-4 h-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-neon-cyan/20 flex items-center justify-center">
                <Users className="w-5 h-5 text-neon-cyan" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stats.total}
                </p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                <Clock className="w-5 h-5 text-yellow-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stats.pending}
                </p>
                <p className="text-xs text-muted-foreground">Pending</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="glass-card p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                <CheckCircle className="w-5 h-5 text-green-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stats.verified}
                </p>
                <p className="text-xs text-muted-foreground">Verified</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="glass-card p-4"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-red-500/20 flex items-center justify-center">
                <XCircle className="w-5 h-5 text-red-400" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stats.rejected}
                </p>
                <p className="text-xs text-muted-foreground">Rejected</p>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-card p-4 col-span-2 lg:col-span-1"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-neon-purple/20 flex items-center justify-center">
                <IndianRupee className="w-5 h-5 text-neon-purple" />
              </div>
              <div>
                <p className="text-2xl font-bold text-foreground">
                  {stats.totalRevenue.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground">Revenue</p>
              </div>
            </div>
          </motion.div>
        </div>

        {/* Search and Filter */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              placeholder="Search by name, email, phone, ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white/5 border-white/10 h-11"
            />
          </div>
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full sm:w-48 bg-white/5 border-white/10 h-11">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="pending">Pending</SelectItem>
              <SelectItem value="verified">Verified</SelectItem>
              <SelectItem value="rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Registrations List */}
        <div className="space-y-3">
          {filteredRegistrations.length === 0 ? (
            <div className="glass-card p-8 text-center">
              <FileText className="w-12 h-12 mx-auto text-muted-foreground mb-3" />
              <p className="text-muted-foreground">No registrations found</p>
            </div>
          ) : (
            filteredRegistrations.map((reg, index) => (
              <motion.div
                key={reg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="glass-card overflow-hidden"
              >
                {/* Main row - clickable */}
                <button
                  type="button"
                  onClick={() =>
                    setExpandedId(expandedId === reg.id ? null : reg.id)
                  }
                  className="w-full p-4 flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 text-left hover:bg-white/5 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start sm:items-center gap-2 flex-wrap">
                      <h3 className="font-semibold text-foreground truncate">
                        {reg.full_name}
                      </h3>
                      <Badge
                        variant="outline"
                        className={cn("text-xs", getStatusColor(reg.payment_status))}
                      >
                        {getStatusIcon(reg.payment_status)}
                        <span className="ml-1 capitalize">
                          {reg.payment_status}
                        </span>
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1 truncate">
                      {reg.registration_id}
                    </p>
                    <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground flex-wrap">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3" />
                        {new Date(reg.created_at).toLocaleDateString()}
                      </span>
                      <span className="flex items-center gap-1">
                        <IndianRupee className="w-3 h-3" />
                        {reg.total_fee}
                      </span>
                      <span>{reg.selected_events.length} event(s)</span>
                    </div>
                  </div>
                  {expandedId === reg.id ? (
                    <ChevronUp className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  ) : (
                    <ChevronDown className="w-5 h-5 text-muted-foreground flex-shrink-0" />
                  )}
                </button>

                {/* Expanded details */}
                {expandedId === reg.id && (
                  <div className="px-4 pb-4 space-y-4 border-t border-white/10 pt-4">
                    {/* Contact Info */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div className="flex items-center gap-2 text-sm">
                        <Mail className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-foreground break-all">
                          {reg.email}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-foreground">{reg.phone}</span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <Building2 className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-foreground truncate">
                          {reg.college}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <GraduationCap className="w-4 h-4 text-muted-foreground flex-shrink-0" />
                        <span className="text-foreground">
                          {reg.department} - {reg.year_of_study}
                        </span>
                      </div>
                    </div>

                    {/* Events */}
                    <div>
                      <p className="text-sm font-medium text-foreground mb-2">
                        Registered Events:
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {reg.selected_events.map((slug) => (
                          <Badge
                            key={slug}
                            variant="secondary"
                            className="text-xs"
                          >
                            {getEventName(slug)}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Transaction Info */}
                    <div className="p-3 rounded-lg bg-white/5">
                      <p className="text-sm font-medium text-foreground mb-1">
                        Transaction Details
                      </p>
                      <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm">
                        <span className="text-muted-foreground">
                          ID: <span className="text-foreground font-mono">{reg.transaction_id}</span>
                        </span>
                        <span className="text-muted-foreground">
                          Amount:{" "}
                          <span className="text-neon-cyan font-semibold">
                            Rs. {reg.total_fee}
                          </span>
                        </span>
                      </div>
                    </div>

                    {/* Warning for pending payments */}
                    {reg.payment_status === "pending" && (
                      <div className="flex items-start gap-2 p-3 rounded-lg bg-yellow-500/10 border border-yellow-500/30">
                        <AlertCircle className="w-4 h-4 text-yellow-400 flex-shrink-0 mt-0.5" />
                        <p className="text-sm text-yellow-400">
                          Verify transaction ID and amount (Rs. {reg.total_fee})
                          before approving. Check if payment matches the total.
                        </p>
                      </div>
                    )}

                    {/* Admin notes */}
                    {reg.admin_notes && (
                      <div className="p-3 rounded-lg bg-white/5">
                        <p className="text-sm text-muted-foreground">
                          <span className="font-medium">Admin Notes:</span>{" "}
                          {reg.admin_notes}
                        </p>
                      </div>
                    )}

                    {/* Action Buttons */}
                    <div className="flex flex-wrap gap-2 pt-2">
                      {reg.payment_status !== "verified" && (
                        <Button
                          size="sm"
                          onClick={() =>
                            handleStatusUpdate(reg.registration_id, "verified")
                          }
                          disabled={actionLoading === reg.registration_id}
                          className="bg-green-600 hover:bg-green-700 text-white flex-1 sm:flex-none"
                        >
                          <CheckCircle className="w-4 h-4 mr-1" />
                          Verify
                        </Button>
                      )}
                      {reg.payment_status !== "rejected" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleStatusUpdate(reg.registration_id, "rejected")
                          }
                          disabled={actionLoading === reg.registration_id}
                          className="border-red-500/50 text-red-400 hover:bg-red-500/10 flex-1 sm:flex-none"
                        >
                          <XCircle className="w-4 h-4 mr-1" />
                          Reject
                        </Button>
                      )}
                      {reg.payment_status !== "pending" && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() =>
                            handleStatusUpdate(reg.registration_id, "pending")
                          }
                          disabled={actionLoading === reg.registration_id}
                          className="flex-1 sm:flex-none"
                        >
                          <Clock className="w-4 h-4 mr-1" />
                          Set Pending
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleDelete(reg.registration_id)}
                        disabled={actionLoading === reg.registration_id}
                        className="text-red-400 hover:bg-red-500/10 flex-1 sm:flex-none"
                      >
                        <Trash2 className="w-4 h-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                )}
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
