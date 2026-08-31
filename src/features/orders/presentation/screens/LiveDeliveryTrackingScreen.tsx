import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Linking, Alert, Platform, Dimensions, ScrollView, Animated } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { WebView } from 'react-native-webview';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { COLORS } from '../../../../shared/theme/colors';
import { SIZES } from '../../../../shared/theme/spacing';
import { YStack, XStack, Text } from '../../../../shared/ui/primitives/Stacks';
import AnimatedPressable from '../../../../shared/ui/components/AnimatedPressable';
import { OrdersRepository } from '../../infrastructure/OrdersRepository';
import { Order } from '../../domain/Order';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

type RouteParams = RouteProp<{ LiveDelivery: { orderId: string } }, 'LiveDelivery'>;

export default function LiveDeliveryTrackingScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const route = useRoute<RouteParams>();
  const { orderId } = route.params;

  const [order, setOrder] = useState<Order | null>(null);
  const [riderEta, setRiderEta] = useState(12); // minutes
  const [distanceKm, setDistanceKm] = useState('2.4');
  const webViewRef = useRef<WebView>(null);
  const pulseAnim = useRef(new Animated.Value(1)).current;

  // Real-time order listener
  useEffect(() => {
    const repo = new OrdersRepository();
    const unsubscribe = repo.subscribeToOrder(orderId, (updatedOrder) => {
      if (updatedOrder) setOrder(updatedOrder);
    });
    return () => unsubscribe();
  }, [orderId]);

  // Pulse animation for live ETA dot
  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, { toValue: 1.4, duration: 700, useNativeDriver: true }),
        Animated.timing(pulseAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
      ])
    ).start();
  }, [pulseAnim]);

  // Handle Call Delivery Partner
  const handleCallRider = () => {
    const phoneNumber = 'tel:+919876543210';
    Linking.canOpenURL(phoneNumber)
      .then((supported) => {
        if (supported) {
          Linking.openURL(phoneNumber);
        } else {
          Alert.alert('Call Rider', 'Contact SafaiKart Rider at +91 98765 43210');
        }
      })
      .catch(() => Alert.alert('Notice', 'Rider phone: +91 98765 43210'));
  };

  // Handle Chat with Rider
  const handleChatRider = () => {
    Alert.alert(
      'Message Rider',
      'Quick Instructions for Delivery Partner:\n\n• Please ring bell\n• Leave with guard\n• Call upon reaching',
      [{ text: 'Got it' }]
    );
  };

  // Leaflet HTML with OpenStreetMap and moving animated rider marker
  const mapHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
        <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
        <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
        <style>
          body, html, #map { margin: 0; padding: 0; width: 100%; height: 100%; background: #f0f4f1; }
          .custom-pin {
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            box-shadow: 0 4px 12px rgba(0,0,0,0.25);
            font-size: 20px;
          }
          .hub-pin {
            background: #1B3B22;
            width: 44px;
            height: 44px;
            border: 3px solid #FFF;
          }
          .home-pin {
            background: #0F9D58;
            width: 44px;
            height: 44px;
            border: 3px solid #FFF;
          }
          .rider-pin {
            background: #F4C73E;
            width: 50px;
            height: 50px;
            border: 3px solid #1B3B22;
            animation: pulse-ring 1.8s infinite;
          }
          @keyframes pulse-ring {
            0% { box-shadow: 0 0 0 0 rgba(244, 199, 62, 0.7); }
            70% { box-shadow: 0 0 0 16px rgba(244, 199, 62, 0); }
            100% { box-shadow: 0 0 0 0 rgba(244, 199, 62, 0); }
          }
          .leaflet-control-attribution { display: none !important; }
        </style>
      </head>
      <body>
        <div id="map"></div>
        <script>
          // Coordinates in India (Bhilai / Raipur / Durg Hub coordinates)
          var hubLat = 21.2155, hubLng = 81.3820; // SafaiKart Hub
          var destLat = 21.2330, destLng = 81.3390; // User Delivery Address
          
          var map = L.map('map', { zoomControl: false }).setView([21.224, 81.360], 14);

          // OpenStreetMap Tiles with CartoDB Voyager styling (clean & verified India bounds)
          L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
            maxZoom: 19,
            subdomains: 'abcd'
          }).addTo(map);

          // Hub Icon
          var hubIcon = L.divIcon({
            className: 'custom-pin hub-pin',
            html: '🧺',
            iconSize: [44, 44],
            iconAnchor: [22, 22]
          });
          L.marker([hubLat, hubLng], { icon: hubIcon }).addTo(map);

          // Destination Icon
          var homeIcon = L.divIcon({
            className: 'custom-pin home-pin',
            html: '🏠',
            iconSize: [44, 44],
            iconAnchor: [22, 22]
          });
          L.marker([destLat, destLng], { icon: homeIcon }).addTo(map);

          // Polyline route
          var routePoints = [
            [hubLat, hubLng],
            [21.2200, 81.3750],
            [21.2230, 81.3660],
            [21.2270, 81.3530],
            [21.2300, 81.3450],
            [destLat, destLng]
          ];
          
          var routeLine = L.polyline(routePoints, {
            color: '#1B3B22',
            weight: 5,
            opacity: 0.85,
            dashArray: '8, 8',
            lineJoin: 'round'
          }).addTo(map);

          map.fitBounds(routeLine.getBounds(), { padding: [60, 60] });

          // Rider Moving Marker
          var riderIcon = L.divIcon({
            className: 'custom-pin rider-pin',
            html: '🛵',
            iconSize: [50, 50],
            iconAnchor: [25, 25]
          });
          
          var riderMarker = L.marker(routePoints[1], { icon: riderIcon }).addTo(map);

          // Smooth simulation of delivery boy moving along route
          var step = 0;
          var numSteps = 500;
          
          function interpolate(p1, p2, frac) {
            return [
              p1[0] + (p2[0] - p1[0]) * frac,
              p1[1] + (p2[1] - p1[1]) * frac
            ];
          }

          function moveRider() {
            step = (step + 1) % (routePoints.length - 1);
            var startPt = routePoints[step];
            var endPt = routePoints[step + 1];
            var progress = 0;
            
            var moveInterval = setInterval(function() {
              progress += 0.02;
              if (progress >= 1) {
                clearInterval(moveInterval);
                setTimeout(moveRider, 1000);
              } else {
                var currentPos = interpolate(startPt, endPt, progress);
                riderMarker.setLatLng(currentPos);
              }
            }, 50);
          }

          setTimeout(moveRider, 1500);
        </script>
      </body>
    </html>
  `;

  return (
    <YStack flex={1} backgroundColor={COLORS.primaryBg}>
      
      {/* 1. Map View (Full Screen Background) */}
      <View style={StyleSheet.absoluteFill}>
        <WebView
          ref={webViewRef}
          originWhitelist={['*']}
          source={{ html: mapHtml }}
          style={{ flex: 1 }}
          javaScriptEnabled={true}
          domStorageEnabled={true}
          scrollEnabled={false}
        />
      </View>

      {/* 2. Top Floating Header Bar */}
      <XStack 
        position="absolute" 
        top={insets.top + 8} 
        left={16} 
        right={16} 
        justifyContent="space-between" 
        alignItems="center"
        zIndex={10}
      >
        <TouchableOpacity 
          onPress={() => navigation.goBack()} 
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: COLORS.white,
            alignItems: 'center',
            justifyContent: 'center',
            elevation: 4,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 6
          }}
        >
          <Ionicons name="arrow-back" size={22} color={COLORS.black} />
        </TouchableOpacity>

        {/* Live Tracking Chip */}
        <XStack 
          backgroundColor={COLORS.white} 
          paddingHorizontal={14} 
          paddingVertical={8} 
          borderRadius={20}
          alignItems="center"
          style={{
            elevation: 4,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 6
          }}
        >
          <Animated.View 
            style={{
              width: 8,
              height: 8,
              borderRadius: 4,
              backgroundColor: '#0F9D58',
              marginRight: 6,
              transform: [{ scale: pulseAnim }]
            }} 
          />
          <Text fontWeight="800" fontSize={13} color={COLORS.darkGreen}>LIVE TRACKING</Text>
        </XStack>

        {/* Support Help Button */}
        <TouchableOpacity 
          onPress={() => navigation.navigate('Support', { orderId })}
          style={{
            width: 44,
            height: 44,
            borderRadius: 22,
            backgroundColor: COLORS.white,
            alignItems: 'center',
            justifyContent: 'center',
            elevation: 4,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.15,
            shadowRadius: 6
          }}
        >
          <Ionicons name="help-buoy" size={22} color={COLORS.darkGreen} />
        </TouchableOpacity>
      </XStack>

      {/* 3. Zomato-style Floating Bottom Sheet */}
      <YStack 
        position="absolute" 
        bottom={0} 
        left={0} 
        right={0} 
        backgroundColor={COLORS.white}
        borderTopLeftRadius={24}
        borderTopRightRadius={24}
        paddingHorizontal={20}
        paddingTop={12}
        paddingBottom={insets.bottom > 0 ? insets.bottom + 8 : 20}
        style={{
          elevation: 15,
          shadowColor: '#000',
          shadowOffset: { width: 0, height: -4 },
          shadowOpacity: 0.15,
          shadowRadius: 12
        }}
      >
        {/* Drag Handle */}
        <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#E0E0E0', alignSelf: 'center', marginBottom: 12 }} />

        {/* ETA & Status Row */}
        <XStack justifyContent="space-between" alignItems="center" marginBottom={14}>
          <YStack>
            <XStack alignItems="center">
              <Text fontSize={22} fontWeight="900" color={COLORS.black}>Arriving in {riderEta} mins</Text>
            </XStack>
            <Text fontSize={13} color={COLORS.textSecondary} fontWeight="600" marginTop={2}>
              {distanceKm} km away • On time
            </Text>
          </YStack>
          <View style={{ backgroundColor: '#E8F5E9', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12, borderWidth: 1, borderColor: '#C8E6C9' }}>
            <Text fontSize={12} fontWeight="800" color={COLORS.darkGreen}>ON THE WAY 🛵</Text>
          </View>
        </XStack>

        {/* Step Progress Line */}
        <YStack marginBottom={16}>
          <View style={{ height: 4, backgroundColor: '#F0F0F0', borderRadius: 2, overflow: 'hidden' }}>
            <View style={{ width: '65%', height: '100%', backgroundColor: COLORS.darkGreen, borderRadius: 2 }} />
          </View>
          <XStack justifyContent="space-between" marginTop={6}>
            <Text fontSize={11} fontWeight="700" color={COLORS.darkGreen}>Assigned</Text>
            <Text fontSize={11} fontWeight="800" color={COLORS.darkGreen}>Out for Pickup / Delivery</Text>
            <Text fontSize={11} fontWeight="600" color={COLORS.textSecondary}>At Doorstep</Text>
          </XStack>
        </YStack>

        {/* Delivery Valet Profile Card */}
        <XStack 
          backgroundColor="#F9FAF9" 
          padding={14} 
          borderRadius={16} 
          alignItems="center" 
          justifyContent="space-between"
          borderWidth={1}
          borderColor="#EAEAEA"
          marginBottom={14}
        >
          <XStack alignItems="center" flex={1}>
            {/* Rider Avatar */}
            <YStack 
              width={48} 
              height={48} 
              borderRadius={24} 
              backgroundColor="#E8F5E9" 
              justifyContent="center" 
              alignItems="center"
              marginRight={12}
              borderWidth={2}
              borderColor={COLORS.darkGreen}
            >
              <Text fontSize={22}>👨‍✈️</Text>
            </YStack>
            <YStack flex={1}>
              <XStack alignItems="center">
                <Text fontSize={15} fontWeight="800" color={COLORS.black} marginRight={4}>Rahul Sharma</Text>
                <Ionicons name="shield-checkmark" size={16} color="#0F9D58" />
              </XStack>
              <Text fontSize={12} color={COLORS.textSecondary} marginTop={2} fontWeight="600">
                ★ 4.9 (600+ deliveries) • Express Valet
              </Text>
            </YStack>
          </XStack>

          {/* Action Buttons: Call & Chat */}
          <XStack>
            <TouchableOpacity 
              onPress={handleChatRider} 
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: '#FFF',
                borderWidth: 1,
                borderColor: '#E0E0E0',
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 8
              }}
            >
              <Ionicons name="chatbubble-ellipses" size={18} color={COLORS.darkGreen} />
            </TouchableOpacity>

            <TouchableOpacity 
              onPress={handleCallRider} 
              style={{
                width: 40,
                height: 40,
                borderRadius: 20,
                backgroundColor: COLORS.darkGreen,
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <Ionicons name="call" size={18} color={COLORS.white} />
            </TouchableOpacity>
          </XStack>
        </XStack>

        {/* Destination Address Snippet */}
        {order?.addressSnapshot && (
          <XStack alignItems="center" marginBottom={8} paddingHorizontal={4}>
            <Ionicons name="location-sharp" size={16} color={COLORS.darkGreen} style={{ marginRight: 8 }} />
            <Text fontSize={12} color={COLORS.textSecondary} numberOfLines={1} flex={1}>
              Delivering to: <Text fontWeight="700" color={COLORS.black}>{order.addressSnapshot.line1}, {order.addressSnapshot.city}</Text>
            </Text>
          </XStack>
        )}
      </YStack>

    </YStack>
  );
}
