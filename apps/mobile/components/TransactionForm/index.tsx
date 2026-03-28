import { useCallback, useState } from "react";
import {
  Alert,
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as Haptics from "expo-haptics";
import { useCreateTransaction } from "@/hooks/useMutateTransaction";
import { useExchangeRates } from "@/hooks/useExchangeRates";
import { useWorkspaceId } from "@/hooks/useTransactions";
import { validateTransaction, convertToEur, SUPPORTED_CURRENCIES } from "@fintrack/core";
import type { Currency, TransactionType } from "@fintrack/core";
import { AmountInput } from "./AmountInput";
import { TypeSelector } from "./TypeSelector";
import { CategoryPicker } from "./CategoryPicker";

interface TransactionFormProps {
  visible: boolean;
  onClose: () => void;
}

const DEFAULT_CURRENCY: Currency = "EUR";

export function TransactionForm({ visible, onClose }: TransactionFormProps) {
  const [amount, setAmount] = useState("0");
  const [label, setLabel] = useState("");
  const [type, setType] = useState<TransactionType>("expense");
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [currency, setCurrency] = useState<Currency>(DEFAULT_CURRENCY);
  const [date] = useState(() => new Date().toISOString().slice(0, 10));

  const { data: workspaceId } = useWorkspaceId();
  const { data: rates = [] } = useExchangeRates();
  const createMutation = useCreateTransaction();

  const reset = useCallback(() => {
    setAmount("0");
    setLabel("");
    setType("expense");
    setCategoryId(null);
    setCurrency(DEFAULT_CURRENCY);
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleSubmit = useCallback(async () => {
    const numericAmount = parseFloat(amount);

    const validation = validateTransaction({
      amount: numericAmount,
      currency,
      type,
      label: label.trim() || "Transaction",
      date,
    });

    if (!validation.valid) {
      Alert.alert("Formulaire invalide", validation.errors[0]);
      return;
    }

    if (!workspaceId) {
      Alert.alert("Erreur", "Espace de travail introuvable.");
      return;
    }

    const amount_eur = convertToEur(numericAmount, currency, rates);

    await createMutation.mutateAsync({
      workspace_id: workspaceId,
      amount: numericAmount,
      currency,
      amount_eur: Math.round(amount_eur * 100) / 100,
      type,
      label: label.trim() || "Transaction",
      date,
      category_id: categoryId,
    });

    void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    handleClose();
  }, [amount, currency, type, label, date, workspaceId, rates, categoryId, createMutation, handleClose]);

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={handleClose}
    >
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        {/* Handle bar */}
        <View style={styles.handleBar} />

        {/* Header */}
        <View style={styles.header}>
          <Pressable onPress={handleClose}>
            <Text style={styles.cancel}>Annuler</Text>
          </Pressable>
          <Text style={styles.title}>Nouvelle transaction</Text>
          <Pressable
            onPress={handleSubmit}
            disabled={createMutation.isPending}
            style={({ pressed }) => [styles.saveButton, pressed && styles.saveButtonPressed]}
          >
            <Text style={styles.saveText}>
              {createMutation.isPending ? "..." : "Ajouter"}
            </Text>
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* Type selector */}
          <TypeSelector value={type} onChange={setType} />

          {/* Currency selector */}
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.currencyRow}>
            {SUPPORTED_CURRENCIES.map((c) => (
              <Pressable
                key={c}
                style={[styles.currencyPill, currency === c && styles.currencyPillActive]}
                onPress={() => setCurrency(c)}
              >
                <Text style={[styles.currencyText, currency === c && styles.currencyTextActive]}>
                  {c}
                </Text>
              </Pressable>
            ))}
          </ScrollView>

          {/* Amount numpad */}
          <AmountInput value={amount} onChange={setAmount} />

          {/* Label */}
          <View style={styles.field}>
            <TextInput
              style={styles.labelInput}
              value={label}
              onChangeText={setLabel}
              placeholder="Libellé (ex: Carrefour, Salaire…)"
              placeholderTextColor="#9CA3AF"
              maxLength={100}
              returnKeyType="done"
            />
          </View>

          {/* Category */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Catégorie</Text>
            <CategoryPicker value={categoryId} onChange={setCategoryId} />
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
  handleBar: {
    width: 40,
    height: 4,
    backgroundColor: "#D1D5DB",
    borderRadius: 2,
    alignSelf: "center",
    marginTop: 12,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: "#E5E7EB",
  },
  cancel: {
    fontSize: 16,
    color: "#6B7280",
  },
  title: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111827",
  },
  saveButton: {
    backgroundColor: "#6366F1",
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  saveButtonPressed: {
    opacity: 0.8,
  },
  saveText: {
    color: "#fff",
    fontWeight: "600",
    fontSize: 15,
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
    gap: 20,
  },
  currencyRow: {
    flexGrow: 0,
  },
  currencyPill: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    marginRight: 8,
  },
  currencyPillActive: {
    borderColor: "#6366F1",
    backgroundColor: "#EEF2FF",
  },
  currencyText: {
    fontSize: 13,
    color: "#6B7280",
    fontWeight: "500",
  },
  currencyTextActive: {
    color: "#6366F1",
    fontWeight: "700",
  },
  field: {
    borderWidth: 1,
    borderColor: "#E5E7EB",
    borderRadius: 12,
    paddingHorizontal: 16,
    backgroundColor: "#F9FAFB",
  },
  labelInput: {
    fontSize: 16,
    color: "#111827",
    paddingVertical: 14,
  },
  section: {
    gap: 10,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: "600",
    color: "#6B7280",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
});
