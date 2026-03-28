import { Pressable, StyleSheet, Text, View } from "react-native";
import type { TransactionType } from "@fintrack/core";

interface TypeSelectorProps {
  value: TransactionType;
  onChange: (type: TransactionType) => void;
}

const TYPES: { value: TransactionType; label: string; color: string; bg: string }[] = [
  { value: "expense", label: "Dépense", color: "#EF4444", bg: "#FEE2E2" },
  { value: "income", label: "Revenu", color: "#10B981", bg: "#D1FAE5" },
  { value: "transfer", label: "Virement", color: "#6366F1", bg: "#EEF2FF" },
];

export function TypeSelector({ value, onChange }: TypeSelectorProps) {
  return (
    <View style={styles.container}>
      {TYPES.map((type) => {
        const isActive = value === type.value;
        return (
          <Pressable
            key={type.value}
            style={[
              styles.pill,
              isActive && { backgroundColor: type.bg, borderColor: type.color },
            ]}
            onPress={() => onChange(type.value)}
          >
            <Text style={[styles.label, isActive && { color: type.color, fontWeight: "600" }]}>
              {type.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    gap: 8,
  },
  pill: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    alignItems: "center",
    backgroundColor: "#F9FAFB",
  },
  label: {
    fontSize: 13,
    color: "#6B7280",
  },
});
