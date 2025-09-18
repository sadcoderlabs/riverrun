import { BarChart2, Clock, ListOrdered, TrendingUp } from '@tamagui/lucide-icons';
import { Tabs } from 'expo-router';

export default function TabLayout() {
  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: '#00C097',
        tabBarInactiveTintColor: '#797b86',
        tabBarStyle: {
          borderTopWidth: 1,
          borderTopColor: '#e0e1e6',
        },
      }}
    >
      <Tabs.Screen
        name="trade"
        options={{
          title: 'Trade',
          tabBarLabel: 'Trade',
          tabBarIcon: ({ color, size }) => <TrendingUp size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="positions"
        options={{
          title: 'Positions',
          tabBarLabel: 'Positions',
          tabBarIcon: ({ color, size }) => <BarChart2 size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="orders"
        options={{
          title: 'Orders',
          tabBarLabel: 'Orders',
          tabBarIcon: ({ color, size }) => <ListOrdered size={size} color={color} />,
        }}
      />
      <Tabs.Screen
        name="history"
        options={{
          title: 'History',
          tabBarLabel: 'History',
          tabBarIcon: ({ color, size }) => <Clock size={size} color={color} />,
        }}
      />
    </Tabs>
  );
}
