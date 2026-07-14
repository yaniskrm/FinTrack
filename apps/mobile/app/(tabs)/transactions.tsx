import { useCallback, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { useTransactions } from "@/hooks/useTransactions";
import { TransactionItem } from "@/components/TransactionItem";
import { TransactionForm } from "@/components/TransactionForm";
import type { TransactionRow } from "@/hooks/useTransactions";

export default function TransactionsScreen() {
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState("");

  // Simple debounce for search
  const handleSearch = useCallback((text: string) => {
    setSearch(text);
    const timer = setTimeout(() => setDebouncedSearch(text), 300);
    return () => clearTimeout(timer);
  }, []);

  const { data: transactions = [], isLoading, isError, refetch } = useTransactions({
    search: debouncedSearch,
  });

  const renderItem = useCallback(
    ({ item }: { item: TransactionRow }) => (
      <TransactionItem transaction={item} />
    ),
    [],
  );

  const keyExtractor = useCallback((item: TransactionRow) => item.id, []);

  const renderSeparator = useCallback(
    () => <View style={styles.separator} />,
    [],
  );

  const renderEmpty = useCallback(() => {
    if (isLoading) return null;
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyIcon}>📭</Text>
        <Text style={styles.emptyTitle}>
          {debouncedSearch ? "Aucun résultat" : "Aucune transaction"}
        </Text>
        <Text style={styles.emptySubtitle}>
          {debouncedSearch
            ? `Aucune transaction pour "${debouncedSearch}"`
            : "Appuyez sur + pour ajouter votre première transaction"}
        </Text>
      </View>
    );
  }, [isLoading, debouncedSearch]);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.container} edges={["top"]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.title}>Transactions</Text>
          <Text style={styles.count}>
            {isLoading ? "…" : `${String(transactions.length)} transaction${transactions.length !== 1 ? "s" : ""}`}
          </Text>
        </View>

        {/* Search bar */}
        <View style={styles.searchContainer}>
          <Text style={styles.searchIcon}>🔍</Text>
          <TextInput
            style={styles.searchInput}
            value={search}
            onChangeText={handleSearch}
            placeholder="Rechercher…"
            placeholderTextColor="#9CA3AF"
            returnKeyType="search"
            clearButtonMode="while-editing"
          />
        </View>

        {/* Error state */}
        {isError && (
          <Pressable style={styles.errorBanner} onPress={() => void refetch()}>
            <Text style={styles.errorText}>Erreur de chargement — Appuyer pour réessayer</Text>
          </Pressable>
        )}

        {/* Transaction list */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#6366F1" />
          </View>
        ) : (
          <FlatList
            data={transactions}
            renderItem={renderItem}
            keyExtractor={keyExtractor}
            ItemSeparatorComponent={renderSeparator}
            ListEmptyComponent={renderEmpty}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
          />
        )}

        {/* FAB */}
        <Pressable
          style={({ pressed }) => [styles.fab, pressed && styles.fabPressed]}
          onPress={() => setShowForm(true)}
        >
          <Text style={styles.fabIcon}>+</Text>
        </Pressable>

        {/* Form modal */}
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
  header: {
    flexDirection: "row",
    alignItems: "baseline",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: 8,
    paddingBottom: 12,
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#111827",
  },
  count: {
    fontSize: 14,
    color: "#9CA3AF",
  },
  searchContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginHorizontal: 16,
    marginBottom: 12,
    backgroundColor: "#fff",
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "#E5E7EB",
    paddingHorizontal: 12,
    gap: 8,
  },
  searchIcon: {
    fontSize: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: "#111827",
    paddingVertical: 12,
  },
  errorBanner: {
    backgroundColor: "#FEE2E2",
    marginHorizontal: 16,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
  },
  errorText: {
    color: "#991B1B",
    fontSize: 14,
    textAlign: "center",
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  listContent: {
    flexGrow: 1,
    backgroundColor: "#fff",
    borderRadius: 16,
    marginHorizontal: 16,
    overflow: "hidden",
  },
  separator: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: "#F3F4F6",
    marginLeft: 72,
  },
  empty: {
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 64,
    paddingHorizontal: 32,
    gap: 12,
  },
  emptyIcon: {
    fontSize: 48,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: "600",
    color: "#374151",
  },
  emptySubtitle: {
    fontSize: 14,
    color: "#9CA3AF",
    textAlign: "center",
    lineHeight: 20,
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
