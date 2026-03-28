import { StyleSheet, Text, TouchableOpacity, View } from "react-native";
import * as Haptics from "expo-haptics";

interface AmountInputProps {
  value: string;
  onChange: (value: string) => void;
}

const KEYS = [
  ["1", "2", "3"],
  ["4", "5", "6"],
  ["7", "8", "9"],
  [".", "0", "⌫"],
] as const;

export function AmountInput({ value, onChange }: AmountInputProps) {
  function handleKey(key: string) {
    void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (key === "⌫") {
      onChange(value.slice(0, -1) || "0");
      return;
    }

    // Prevent multiple decimals
    if (key === "." && value.includes(".")) return;
    // Limit to 2 decimal places
    const parts = value.split(".");
    if (parts[1] !== undefined && parts[1].length >= 2) return;
    // Prevent leading zeros
    if (value === "0" && key !== ".") {
      onChange(key);
      return;
    }

    onChange(value + key);
  }

  const displayValue = value === "" ? "0" : value;

  return (
    <View style={styles.container}>
      <Text style={styles.amount}>
        {parseFloat(displayValue).toLocaleString("fr-FR", {
          minimumFractionDigits: displayValue.includes(".") ? displayValue.split(".")[1]?.length ?? 0 : 0,
          maximumFractionDigits: 2,
        })}
      </Text>

      <View style={styles.keypad}>
        {KEYS.map((row, rowIndex) => (
          <View key={rowIndex} style={styles.row}>
            {row.map((key) => (
              <TouchableOpacity
                key={key}
                style={[styles.key, key === "⌫" && styles.keyDelete]}
                onPress={() => handleKey(key)}
                activeOpacity={0.7}
              >
                <Text style={[styles.keyText, key === "⌫" && styles.keyDeleteText]}>
                  {key}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: 8,
  },
  amount: {
    fontSize: 48,
    fontWeight: "700",
    color: "#111827",
    textAlign: "center",
    paddingVertical: 8,
  },
  keypad: {
    gap: 8,
  },
  row: {
    flexDirection: "row",
    gap: 8,
  },
  key: {
    flex: 1,
    backgroundColor: "#F3F4F6",
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: "center",
    justifyContent: "center",
  },
  keyDelete: {
    backgroundColor: "#FEE2E2",
  },
  keyText: {
    fontSize: 22,
    fontWeight: "600",
    color: "#111827",
  },
  keyDeleteText: {
    color: "#EF4444",
  },
});
