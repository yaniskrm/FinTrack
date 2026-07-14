import { Alert, Pressable, StyleSheet, Text, View } from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import * as Haptics from "expo-haptics";
import { formatCurrency } from "@fintrack/core";
import { useDeleteTransaction } from "@/hooks/useMutateTransaction";
import type { TransactionRow } from "@/hooks/useTransactions";

interface TransactionItemProps {
  transaction: TransactionRow;
  onEdit?: (transaction: TransactionRow) => void;
}

const DELETE_THRESHOLD = -80;

export function TransactionItem({ transaction, onEdit }: TransactionItemProps) {
  const translateX = useSharedValue(0);
  const deleteOpacity = useSharedValue(0);
  const deleteMutation = useDeleteTransaction();

  function confirmDelete() {
    Alert.alert(
      "Supprimer la transaction",
      `Supprimer "${transaction.label}" ?`,
      [
        { text: "Annuler", style: "cancel", onPress: () => { translateX.value = withSpring(0); } },
        {
          text: "Supprimer",
          style: "destructive",
          onPress: () => {
            void Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
            void deleteMutation.mutateAsync(transaction.id);
          },
        },
      ],
    );
  }

  const panGesture = Gesture.Pan()
    .activeOffsetX([-10, 10])
    .onUpdate((e) => {
      // Only allow left swipe
      if (e.translationX > 0) return;
      translateX.value = Math.max(e.translationX, -100);
      deleteOpacity.value = Math.min(1, Math.abs(e.translationX) / 80);
    })
    .onEnd((e) => {
      if (e.translationX < DELETE_THRESHOLD) {
        runOnJS(confirmDelete)();
      } else {
        translateX.value = withSpring(0);
        deleteOpacity.value = withTiming(0);
      }
    });

  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: translateX.value }],
  }));

  const deleteStyle = useAnimatedStyle(() => ({
    opacity: deleteOpacity.value,
  }));

  const typeColor =
    transaction.type === "income"
      ? "#10B981"
      : transaction.type === "expense"
        ? "#EF4444"
        : "#6366F1";

  const sign = transaction.type === "income" ? "+" : transaction.type === "expense" ? "−" : "";

  const formattedDate = new Intl.DateTimeFormat("fr-FR", {
    day: "numeric",
    month: "short",
  }).format(new Date(transaction.date));

  return (
    <View style={styles.wrapper}>
      {/* Delete background */}
      <Animated.View style={[styles.deleteBackground, deleteStyle]}>
        <Text style={styles.deleteIcon}>🗑</Text>
      </Animated.View>

      <GestureDetector gesture={panGesture}>
        <Animated.View style={[styles.container, animatedStyle]}>
          <Pressable
            style={styles.content}
            onPress={() => onEdit?.(transaction)}
            onLongPress={() => {
              void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
              onEdit?.(transaction);
            }}
          >
            {/* Category icon */}
            <View style={[styles.iconContainer, { backgroundColor: (transaction.categories?.color ?? "#6366F1") + "18" }]}>
              <Text style={styles.icon}>
                {transaction.categories?.icon ?? "📦"}
              </Text>
            </View>

            {/* Label + date */}
            <View style={styles.info}>
              <Text style={styles.label} numberOfLines={1}>
                {transaction.label}
              </Text>
              <Text style={styles.meta}>
                {transaction.categories?.name ?? "Sans catégorie"} · {formattedDate}
              </Text>
            </View>

            {/* Amount */}
            <View style={styles.amountContainer}>
              <Text style={[styles.amount, { color: typeColor }]}>
                {sign}{formatCurrency(transaction.amount_eur, "EUR")}
              </Text>
              {transaction.currency !== "EUR" && (
                <Text style={styles.originalAmount}>
                  {formatCurrency(transaction.amount, transaction.currency as "EUR")}
                </Text>
              )}
            </View>
          </Pressable>
        </Animated.View>
      </GestureDetector>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    position: "relative",
    backgroundColor: "#fff",
  },
  deleteBackground: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 80,
    backgroundColor: "#FEE2E2",
    alignItems: "center",
    justifyContent: "center",
  },
  deleteIcon: {
    fontSize: 20,
  },
  container: {
    backgroundColor: "#fff",
  },
  content: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
  },
  icon: {
    fontSize: 20,
  },
  info: {
    flex: 1,
    gap: 2,
  },
  label: {
    fontSize: 15,
    fontWeight: "500",
    color: "#111827",
  },
  meta: {
    fontSize: 13,
    color: "#9CA3AF",
  },
  amountContainer: {
    alignItems: "flex-end",
    gap: 2,
  },
  amount: {
    fontSize: 16,
    fontWeight: "600",
  },
  originalAmount: {
    fontSize: 12,
    color: "#9CA3AF",
  },
});
