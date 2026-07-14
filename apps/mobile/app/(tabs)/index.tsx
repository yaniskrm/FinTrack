import { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useTransactions } from "@/hooks/useTransactions";
import { TransactionItem } from "@/components/TransactionItem";
import { TransactionForm } from "@/components/TransactionForm";
import { calculateTotals, formatCurrency } from "@fintrack/core";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import type { Transaction } from "@fintrack/core";

function getCurrentMonthRange(): { from: string; to: string } {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().slice(0, 10);
  const to = new Date(now.getFullYear(), now.getMonth() + 1, 0).toISOString().slice(0, 10);
  return { from, to };
}

const MONTH_RANGE = getCurrentMonthRange();

const MONTH_LABEL = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
}).format(new Date());

export default function DashboardScreen() {
  const [showForm, setShowForm] = useState(false);

  // All-time transactions for balance
  const { data: allTransactions = [] } = useTransactions();
  // This month only for monthly totals
  const { data: monthTransactions = [] } = useTransactions(MONTH_RANGE);

  const { totalIncome, totalExpenses, netBalance } = calculateTotals(
    allTransactions as unknown as Transaction[],
  );
  const monthTotals = calculateTotals(monthTransactions as unknown as Transaction[]);

  const recentTransactions = allTransactions.slice(0, 5);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        <ScrollView
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {/* Header */}
          <View style={styles.header}>
            <View>
              <Text style={styles.greeting}>Bonjour 👋</Text>
              <Text style={styles.subtitle}>Voici votre tableau de bord</Text>
            </View>
          </View>

          {/* Balance card */}
          <View style={styles.balanceCard}>
            <Text style={styles.balanceLabel}>Solde total</Text>
            <Text style={[styles.balanceAmount, { color: netBalance >= 0 ? "#10B981" : "#EF4444" }]}>
              {formatCurrency(netBalance, "EUR")}
            </Text>
            <View style={styles.balanceRow}>
              <View style={styles.balanceStat}>
                <Text style={styles.balanceStatLabel}>↑ Revenus</Text>
                <Text style={[styles.balanceStatValue, { color: "#10B981" }]}>
                  {formatCurrency(totalIncome, "EUR")}
                </Text>
              </View>
              <View style={styles.balanceDivider} />
              <View style={styles.balanceStat}>
                <Text style={styles.balanceStatLabel}>↓ Dépenses</Text>
                <Text style={[styles.balanceStatValue, { color: "#EF4444" }]}>
                  {formatCurrency(totalExpenses, "EUR")}
                </Text>
              </View>
            </View>
          </View>

          {/* This month summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ce mois — {MONTH_LABEL}</Text>
            <View style={styles.monthCards}>
              <View style={[styles.monthCard, { backgroundColor: "#D1FAE5" }]}>
                <Text style={styles.monthCardLabel}>Revenus</Text>
                <Text style={[styles.monthCardValue, { color: "#065F46" }]}>
                  {formatCurrency(monthTotals.totalIncome, "EUR")}
                </Text>
              </View>
              <View style={[styles.monthCard, { backgroundColor: "#FEE2E2" }]}>
                <Text style={styles.monthCardLabel}>Dépenses</Text>
                <Text style={[styles.monthCardValue, { color: "#991B1B" }]}>
                  {formatCurrency(monthTotals.totalExpenses, "EUR")}
                </Text>
              </View>
            </View>
          </View>

          {/* Recent transactions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Récentes</Text>
            {recentTransactions.length === 0 ? (
              <View style={styles.emptyRecent}>
                <Text style={styles.emptyRecentText}>
                  Aucune transaction — appuyez sur + pour commencer
                </Text>
              </View>
            ) : (
              <View style={styles.recentList}>
                {recentTransactions.map((tx) => (
                  <TransactionItem key={tx.id} transaction={tx} />
                ))}
              </View>
            )}
          </View>
        </ScrollView>

        {/* FAB */}
        <Pressable
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
          onPress={() => setShowForm(true)}
        >
          <Text style={styles.fabIcon}>+</Text>
        </Pressable>

        <TransactionForm visible={showForm} onClose={() => setShowForm(false)} />
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#F9FAFB",
  },
  scrollContent: {
    paddingBottom: 100,
    gap: 24,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingTop: 8,
  },
  greeting: {
    fontSize: 24,
    fontWeight: "700",
    color: "#111827",
  },
  subtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    marginTop: 2,
  },
  balanceCard: {
    marginHorizontal: 16,
    backgroundColor: "#6366F1",
    borderRadius: 20,
    padding: 24,
    gap: 8,
  },
  balanceLabel: {
    fontSize: 14,
    color: "#C7D2FE",
  },
  balanceAmount: {
    fontSize: 40,
    fontWeight: "700",
    color: "#fff",
  },
  balanceRow: {
    flexDirection: "row",
    marginTop: 8,
    backgroundColor: "rgba(255,255,255,0.15)",
    borderRadius: 12,
    padding: 12,
    gap: 12,
  },
  balanceStat: {
    flex: 1,
    alignItems: "center",
    gap: 4,
  },
  balanceDivider: {
    width: 1,
    backgroundColor: "rgba(255,255,255,0.3)",
  },
  balanceStatLabel: {
    fontSize: 12,
    color: "rgba(255,255,255,0.7)",
  },
  balanceStatValue: {
    fontSize: 15,
    fontWeight: "600",
    color: "#fff",
  },
  section: {
    gap: 12,
    paddingHorizontal: 16,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  monthCards: {
    flexDirection: "row",
    gap: 12,
  },
  monthCard: {
    flex: 1,
    borderRadius: 14,
    padding: 16,
    gap: 4,
  },
  monthCardLabel: {
    fontSize: 13,
    color: "#374151",
  },
  monthCardValue: {
    fontSize: 20,
    fontWeight: "700",
  },
  recentList: {
    backgroundColor: "#fff",
    borderRadius: 16,
    overflow: "hidden",
  },
  emptyRecent: {
    backgroundColor: "#fff",
    borderRadius: 16,
    padding: 24,
    alignItems: "center",
  },
  emptyRecentText: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
  },
  fab: {
    position: "absolute",
    bottom: 32,
    right: 24,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: "#6366F1",
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#6366F1",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 8,
  },
  fabPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
  fabIcon: {
    fontSize: 28,
    color: "#fff",
    lineHeight: 32,
  },
});
