import { FlatList, Pressable, StyleSheet, Text, View } from "react-native";
import { useCategories } from "@/hooks/useCategories";
import type { CategoryRow } from "@/hooks/useCategories";

interface CategoryPickerProps {
  value: string | null;
  onChange: (categoryId: string | null) => void;
}

export function CategoryPicker({ value, onChange }: CategoryPickerProps) {
  const { data: categories = [] } = useCategories();

  return (
    <FlatList
      data={categories}
      horizontal
      showsHorizontalScrollIndicator={false}
      keyExtractor={(item) => item.id}
      contentContainerStyle={styles.list}
      renderItem={({ item }: { item: CategoryRow }) => {
        const isActive = value === item.id;
        return (
          <Pressable
            style={[
              styles.item,
              isActive && { borderColor: item.color, backgroundColor: item.color + "18" },
            ]}
            onPress={() => onChange(isActive ? null : item.id)}
          >
            <Text style={styles.icon}>{item.icon}</Text>
            <Text style={[styles.name, isActive && { color: item.color, fontWeight: "600" }]}>
              {item.name}
            </Text>
          </Pressable>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    gap: 8,
    paddingHorizontal: 2,
  },
  item: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: "#E5E7EB",
    backgroundColor: "#F9FAFB",
  },
  icon: {
    fontSize: 16,
  },
  name: {
    fontSize: 13,
    color: "#374151",
  },
});
